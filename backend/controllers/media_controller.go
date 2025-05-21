package controllers

import (
	"log"
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/ginchat/services"
	"github.com/ginchat/utils"
)

// MediaController handles media-related requests
type MediaController struct {
	CloudinaryService *services.CloudinaryService
}

// NewMediaController creates a new MediaController
func NewMediaController() *MediaController {
	cloudinaryService, err := services.NewCloudinaryService()
	if err != nil {
		log.Printf("Error initializing Cloudinary service: %v", err)
		// Return a controller with nil service, we'll handle this in the handler
		return &MediaController{
			CloudinaryService: nil,
		}
	}
	return &MediaController{
		CloudinaryService: cloudinaryService,
	}
}

// UploadMediaRequest represents the request for uploading media
type UploadMediaRequest struct {
	MessageType string `form:"message_type" binding:"required,oneof=picture audio video text_and_picture text_and_audio text_and_video"` // Type of message
}

// UploadMedia handles uploading media files
// @Summary Upload a media file
// @Description Upload an image, audio, or video file for use in messages
// @Tags media
// @Accept multipart/form-data
// @Produce json
// @Security ApiKeyAuth
// @Param message_type formData string true "Message type (picture, audio, video, text_and_picture, text_and_audio, text_and_video)" Enums(picture, audio, video, text_and_picture, text_and_audio, text_and_video)
// @Param file formData file true "Media file to upload"
// @Success 201 {object} map[string]string "Media uploaded successfully"
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /media/upload [post]
func (mc *MediaController) UploadMedia(c *gin.Context) {
	// Check if Cloudinary service is initialized
	if mc.CloudinaryService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cloudinary service not initialized. Check your environment variables."})
		return
	}

	// Get user ID from context (set by auth middleware)
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse form
	var req UploadMediaRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get the file
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Determine media type from message type
	mediaType := utils.GetMediaTypeFromMessageType(req.MessageType)
	if mediaType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message type for media upload"})
		return
	}

	// Upload the file to Cloudinary
	mediaURL, err := mc.CloudinaryService.UploadFile(file, mediaType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return the media URL
	c.JSON(http.StatusCreated, gin.H{
		"media_url":    mediaURL,
		"file_name":    filepath.Base(mediaURL),
		"message_type": req.MessageType,
	})
}

// SetupMediaRoutes sets up routes for media handling
func SetupMediaRoutes(router *gin.Engine, mediaController *MediaController) {
	mediaGroup := router.Group("/api/media")
	{
		mediaGroup.POST("/upload", mediaController.UploadMedia)
	}
}
