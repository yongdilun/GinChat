package controllers

import (
	"encoding/json"
	"net/http"

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
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.FormatValidationError(err)})
		return
	}

	// Convert device info to JSON
	deviceInfoJSON, _ := json.Marshal(req.DeviceInfo)

	// Check if token already exists for this user
	var existingToken models.PushToken
	result := ptc.DB.Where("user_id = ? AND token = ?", userID.(uint), req.Token).First(&existingToken)

	if result.Error == nil {
		// Token exists, update it
		existingToken.Platform = req.Platform
		existingToken.DeviceInfo = deviceInfoJSON
		existingToken.IsActive = true

		if err := ptc.DB.Save(&existingToken).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update push token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Push token updated successfully"})
		return
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register push token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Push token registered successfully"})
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
