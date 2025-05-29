package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"

	"github.com/ginchat/models"
	"github.com/ginchat/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// PushTokenController handles push token operations
type PushTokenController struct {
	DB *gorm.DB
}

// PushTokenRequest represents the request structure for push token operations
type PushTokenRequest struct {
	Token      string                 `json:"token" binding:"required"`
	Platform   string                 `json:"platform" binding:"required"`
	DeviceInfo map[string]interface{} `json:"device_info"`
}

// NewPushTokenController creates a new PushTokenController
func NewPushTokenController(db *gorm.DB) *PushTokenController {
	return &PushTokenController{DB: db}
}

// RegisterPushToken registers a new push token for the user
// @Summary Register push token
// @Description Register a push notification token for the authenticated user
// @Tags push-tokens
// @Accept json
// @Produce json
// @Param request body PushTokenRequest true "Push token registration request"
// @Success 200 {object} map[string]string "Push token updated successfully"
// @Success 201 {object} map[string]string "Push token registered successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /auth/push-token [post]
// @Security BearerAuth
func (ptc *PushTokenController) RegisterPushToken(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req PushTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("DEBUG: Failed to bind JSON for user %d: %v", userID.(uint), err)
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.FormatValidationError(err)})
		return
	}

	// Debug: Log the registration attempt with more details
	log.Printf("DEBUG: Push token registration attempt - User ID: %v, Token length: %d, Platform: %s",
		userID, len(req.Token), req.Platform)
	log.Printf("DEBUG: Token preview: %s...", req.Token[:min(50, len(req.Token))])

	// FIXED: Only check for the correct Expo token format
	if !strings.HasPrefix(req.Token, "ExponentPushToken[") {
		log.Printf("DEBUG: Invalid token format for user %d. Expected 'ExponentPushToken[' prefix, got: %s...", 
			userID.(uint), req.Token[:min(50, len(req.Token))])
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid push token format",
			"message": "Push token length is invalid", // This matches your frontend error
		})
		return
	}

	// FIXED: More reasonable length validation for Expo tokens
	// Typical Expo tokens are around 185-220 characters
	if len(req.Token) < 150 || len(req.Token) > 300 {
		log.Printf("DEBUG: Invalid token length for user %d: %d characters (expected 150-300)", 
			userID.(uint), len(req.Token))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Push token length is invalid",
			"expected_range": "150-300 characters",
			"actual_length": len(req.Token),
		})
		return
	}

	// Additional validation: Check if token ends properly
	if !strings.HasSuffix(req.Token, "]") {
		log.Printf("DEBUG: Token doesn't end with ']' for user %d", userID.(uint))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid push token format",
			"message": "Push token length is invalid",
		})
		return
	}

	// Validate the inner token format
	if err := validateExpoTokenFormat(req.Token); err != nil {
		log.Printf("DEBUG: Token format validation failed for user %d: %v", userID.(uint), err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid push token format",
			"message": "Push token length is invalid",
			"details": err.Error(),
		})
		return
	}

	// Convert device info to JSON
	deviceInfoJSON, _ := json.Marshal(req.DeviceInfo)

	// Rest of your existing code remains the same...
	var existingToken models.PushToken
	result := ptc.DB.Where("user_id = ? AND token = ?", userID.(uint), req.Token).First(&existingToken)

	if result.Error == nil {
		// Token exists, first deactivate all other tokens for this user
		if err := ptc.DB.Model(&models.PushToken{}).Where("user_id = ? AND id != ?", userID.(uint), existingToken.ID).Update("is_active", false).Error; err != nil {
			log.Printf("DEBUG: Failed to deactivate other tokens for user %d: %v", userID.(uint), err)
		} else {
			log.Printf("DEBUG: Deactivated other tokens for user %d", userID.(uint))
		}

		// Reactivate and update this token
		existingToken.Platform = req.Platform
		existingToken.DeviceInfo = deviceInfoJSON
		existingToken.IsActive = true

		if err := ptc.DB.Save(&existingToken).Error; err != nil {
			log.Printf("DEBUG: Failed to update existing push token: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update push token"})
			return
		}

		log.Printf("DEBUG: Reactivated existing push token for user %d", userID.(uint))
		c.JSON(http.StatusOK, gin.H{"message": "Push token reactivated successfully"})
		return
	}

	// Token doesn't exist, deactivate all existing tokens for this user first
	if err := ptc.DB.Model(&models.PushToken{}).Where("user_id = ?", userID.(uint)).Update("is_active", false).Error; err != nil {
		log.Printf("DEBUG: Failed to deactivate existing tokens for user %d: %v", userID.(uint), err)
	} else {
		log.Printf("DEBUG: Deactivated all existing tokens for user %d", userID.(uint))
	}

	// Create new token
	pushToken := models.PushToken{
		UserID:     userID.(uint),
		Token:      req.Token,
		Platform:   req.Platform,
		DeviceInfo: deviceInfoJSON,
		IsActive:   true,
	}

	if err := ptc.DB.Create(&pushToken).Error; err != nil {
		log.Printf("DEBUG: Failed to create push token in database: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to register push token",
			"details": err.Error(),
		})
		return
	}

	log.Printf("DEBUG: Push token registered successfully for user %d", userID.(uint))
	c.JSON(http.StatusCreated, gin.H{"message": "Push token registered successfully"})
}

// Helper function to validate Expo token format
func validateExpoTokenFormat(token string) error {
	// Extract the inner token
	if !strings.HasPrefix(token, "ExponentPushToken[") || !strings.HasSuffix(token, "]") {
		return fmt.Errorf("invalid token wrapper format")
	}

	innerToken := token[18 : len(token)-1] // Remove "ExponentPushToken[" and "]"
	
	if len(innerToken) < 20 {
		return fmt.Errorf("inner token too short: %d characters", len(innerToken))
	}

	// Check for valid base64-like characters
	validChars := regexp.MustCompile(`^[A-Za-z0-9_-]+$`)
	if !validChars.MatchString(innerToken) {
		return fmt.Errorf("inner token contains invalid characters")
	}

	return nil
}

// Helper function for min (Go doesn't have built-in min for int)
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// UpdatePushToken updates an existing push token
// @Summary Update push token
// @Description Update an existing push notification token for the authenticated user
// @Tags push-tokens
// @Accept json
// @Produce json
// @Param request body PushTokenRequest true "Push token update request"
// @Success 200 {object} map[string]string "Push token updated successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Push token not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /auth/push-token [put]
// @Security BearerAuth
func (ptc *PushTokenController) UpdatePushToken(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req PushTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.FormatValidationError(err)})
		return
	}

	deviceInfoJSON, _ := json.Marshal(req.DeviceInfo)

	var pushToken models.PushToken
	if err := ptc.DB.Where("user_id = ? AND token = ?", userID.(uint), req.Token).First(&pushToken).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Push token not found"})
		return
	}

	pushToken.Platform = req.Platform
	pushToken.DeviceInfo = deviceInfoJSON
	pushToken.IsActive = true

	if err := ptc.DB.Save(&pushToken).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update push token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Push token updated successfully"})
}

// RemovePushToken deactivates push tokens for the user
// @Summary Remove push token
// @Description Deactivate all push notification tokens for the authenticated user
// @Tags push-tokens
// @Produce json
// @Success 200 {object} map[string]string "Push token removed successfully"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /auth/push-token [delete]
// @Security BearerAuth
func (ptc *PushTokenController) RemovePushToken(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Deactivate all tokens for this user
	if err := ptc.DB.Model(&models.PushToken{}).Where("user_id = ?", userID.(uint)).Update("is_active", false).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove push token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Push token removed successfully"})
}
