package controllers

import (
	"fmt"
	"math/rand"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ginchat/services"
	"github.com/ginchat/utils"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

// UserController handles user-related requests
type UserController struct {
	UserService *services.UserService
}

// NewUserController creates a new UserController
func NewUserController(db *gorm.DB, userService *services.UserService) *UserController {
	return &UserController{
		UserService: userService,
	}
}

// RegisterRequest represents the request body for user registration
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// LoginRequest represents the request body for user login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// Register godoc
// @Summary Register a new user
// @Description Register a new user with username, email and password
// @Tags auth
// @Accept json
// @Produce json
// @Param user body RegisterRequest true "User Registration Data"
// @Success 201 {object} map[string]interface{} "User created successfully"
// @Failure 400 {object} map[string]interface{} "Invalid input"
// @Failure 409 {object} map[string]interface{} "User already exists"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /auth/register [post]
func (uc *UserController) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.FormatValidationError(err)})
		return
	}

	// Validate password strength
	if err := validatePasswordStrength(req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Register user using the user service
	user, err := uc.UserService.Register(req.Username, req.Email, req.Password, "member")
	if err != nil {
		errMsg := err.Error()
		if errMsg == "user with this email already exists" || errMsg == "user with this username already exists" {
			c.JSON(http.StatusConflict, gin.H{"error": utils.FormatServiceError(err)})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		}
		return
	}

	// Generate JWT token
	token, err := utils.GenerateJWT(user.UserID, user.Username, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to complete registration. Please try again"})
		return
	}

	// Log the registration
	logUserActivity(c, user.UserID, "User registered")

	// Return user data and token
	c.JSON(http.StatusCreated, gin.H{
		"user":  uc.UserService.ToResponse(user),
		"token": token,
	})
}

// Login godoc
// @Summary Login a user
// @Description Login with email and password to get authentication token
// @Tags auth
// @Accept json
// @Produce json
// @Param user body LoginRequest true "User Login Data"
// @Success 200 {object} map[string]interface{} "Login successful"
// @Failure 400 {object} map[string]interface{} "Invalid input"
// @Failure 401 {object} map[string]interface{} "Invalid credentials"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /auth/login [post]
func (uc *UserController) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.FormatValidationError(err)})
		return
	}

	// Login user using the user service
	user, err := uc.UserService.Login(req.Email, req.Password)
	if err != nil {
		// Add a small delay to prevent timing attacks
		time.Sleep(time.Duration(100+rand.Intn(100)) * time.Millisecond)

		// Check for specific error types
		if err.Error() == "this user is already logged in on another device" {
			c.JSON(http.StatusConflict, gin.H{"error": utils.FormatServiceError(err)})
		} else {
			// Invalid credentials or other errors
			c.JSON(http.StatusUnauthorized, gin.H{"error": utils.FormatServiceError(err)})
		}
		return
	}

	// Generate JWT token
	token, err := utils.GenerateJWT(user.UserID, user.Username, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to complete login. Please try again"})
		return
	}

	// Log the login
	logUserActivity(c, user.UserID, "User logged in")

	// Return user data and token
	c.JSON(http.StatusOK, gin.H{
		"user":  uc.UserService.ToResponse(user),
		"token": token,
	})
}

// Logout godoc
// @Summary Logout a user
// @Description Logout the currently authenticated user
// @Tags auth
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {object} map[string]interface{} "Logout successful"
// @Failure 401 {object} map[string]interface{} "User not authenticated"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Router /auth/logout [post]
func (uc *UserController) Logout(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": utils.FormatAuthError(fmt.Errorf("user not authenticated"))})
		return
	}

	// Convert userID to uint
	userIDUint, ok := userID.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatAuthError(fmt.Errorf("invalid user ID"))})
		return
	}

	// Logout user using the user service
	err := uc.UserService.Logout(userIDUint)
	if err != nil {
		if err.Error() == "user not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": utils.FormatServiceError(err)})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// ForceLogout godoc
// @Summary Force logout a user from another device
// @Description Force logout a user by email (admin function or for handling multiple device login)
// @Tags auth
// @Accept json
// @Produce json
// @Param request body map[string]string true "Email of user to force logout"
// @Success 200 {object} map[string]interface{} "User force logged out successfully"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /auth/force-logout [post]
func (uc *UserController) ForceLogout(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.FormatValidationError(err)})
		return
	}

	// Find and force logout user by email using UserService
	user, err := uc.UserService.GetUserByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Force logout the user
	err = uc.UserService.Logout(user.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User force logged out successfully",
		"user_id": user.UserID,
		"email":   user.Email,
	})
}

// validatePasswordStrength checks if a password meets the minimum security requirements
func validatePasswordStrength(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("password must be at least 8 characters long")
	}

	// Check for at least one uppercase letter
	if !regexp.MustCompile(`[A-Z]`).MatchString(password) {
		return fmt.Errorf("password must include at least one uppercase letter (A-Z)")
	}

	// Check for at least one lowercase letter
	if !regexp.MustCompile(`[a-z]`).MatchString(password) {
		return fmt.Errorf("password must include at least one lowercase letter (a-z)")
	}

	// Check for at least one digit
	if !regexp.MustCompile(`[0-9]`).MatchString(password) {
		return fmt.Errorf("password must include at least one number (0-9)")
	}

	// Check for at least one special character
	if !regexp.MustCompile(`[^a-zA-Z0-9]`).MatchString(password) {
		return fmt.Errorf("password must include at least one special character")
	}

	// Check for common passwords
	commonPasswords := []string{"password", "123456", "qwerty", "admin", "welcome"}
	passwordLower := strings.ToLower(password)
	for _, common := range commonPasswords {
		if strings.Contains(passwordLower, common) {
			return fmt.Errorf("password is too common, please choose a more secure password")
		}
	}

	return nil
}

// logUserActivity logs user activities for auditing purposes
func logUserActivity(c *gin.Context, userID uint, activity string) {
	// Get client IP
	clientIP := c.ClientIP()

	// Get user agent
	userAgent := c.Request.UserAgent()

	// Log the activity
	logrus.WithFields(logrus.Fields{
		"user_id":    userID,
		"ip_address": clientIP,
		"user_agent": userAgent,
		"activity":   activity,
		"timestamp":  time.Now().Format(time.RFC3339),
	}).Info("User activity")
}
