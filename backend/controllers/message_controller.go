package controllers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ginchat/models"
	"github.com/ginchat/services"
	"github.com/ginchat/utils"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"gorm.io/gorm"
)

// MessageController handles message-related requests
type MessageController struct {
	MessageService *services.MessageService
}

// NewMessageController creates a new MessageController
func NewMessageController(db *gorm.DB, mongodb *mongo.Database) *MessageController {
	chatroomService := services.NewChatroomService(mongodb)
	cloudinaryService, _ := services.NewCloudinaryService() // Ignore error for now, will be nil if not configured
	messageService := services.NewMessageService(mongodb, chatroomService, cloudinaryService)
	return &MessageController{
		MessageService: messageService,
	}
}

// SendMessageRequest represents the request body for sending a text message
type SendMessageRequest struct {
	MessageType string `json:"message_type" binding:"required,oneof=text picture audio video text_and_picture text_and_audio text_and_video" example:"text" enums:"text,picture,audio,video,text_and_picture,text_and_audio,text_and_video"` // Type of message: text, picture, audio, video, text_and_picture, text_and_audio, text_and_video
	TextContent string `json:"text_content" example:"Hello, how are you?"`                                                                                                                                                                   // Text content of the message (required for text, text_and_picture, text_and_audio, text_and_video)
	MediaURL    string `json:"media_url" example:"/media/images/abc123.jpg"`                                                                                                                                                                 // URL of the media (required for picture, audio, video, text_and_picture, text_and_audio, text_and_video)
}

// UpdateMessageRequest represents the request body for updating a message
type UpdateMessageRequest struct {
	TextContent string `json:"text_content" example:"Updated message content"`                                                  // New text content of the message
	MediaURL    string `json:"media_url" example:"https://res.cloudinary.com/your-cloud/image/upload/v123456789/new_image.jpg"` // New media URL (optional)
}

// SendMessage handles sending a message to a chatroom
// @Summary Send a message to a chatroom
// @Description Send a message of various types (text, picture, audio, video, or combinations) to a chatroom
// @Tags messages
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path string true "Chatroom ID" example:"60d5f8b8e6b5f0b3e8b4b5b3"
// @Param message body SendMessageRequest true "Message information"
// @Success 201 {object} map[string]models.MessageResponse "Message sent successfully"
// @Failure 400 {object} map[string]string "Invalid request body or chatroom ID"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 403 {object} map[string]string "User is not a member of this chatroom"
// @Failure 404 {object} map[string]string "Chatroom not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /chatrooms/{id}/messages [post]
// @Notes For media messages, first upload the media using the /api/media/upload endpoint, then use the returned media_url in this request
func (mc *MessageController) SendMessage(c *gin.Context) {
	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.FormatValidationError(err)})
		return
	}

	// Get chatroom ID from URL
	chatroomID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide a valid chat room ID"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Please log in to continue"})
		return
	}
	username, _ := c.Get("username")

	// Send message using the service
	message, err := mc.MessageService.SendMessage(chatroomID, userID.(uint), username.(string), req.MessageType, req.TextContent, req.MediaURL)
	if err != nil {
		switch err.Error() {
		case "chatroom not found":
			c.JSON(http.StatusNotFound, gin.H{"error": utils.FormatServiceError(err)})
		case "user is not a member of this chatroom":
			c.JSON(http.StatusForbidden, gin.H{"error": utils.FormatServiceError(err)})
		case "text content is required for text messages",
			"media URL is required for media messages",
			"text content is required for combined messages",
			"media URL is required for combined messages",
			"invalid message type":
			c.JSON(http.StatusBadRequest, gin.H{"error": utils.FormatServiceError(err)})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		}
		return
	}

	// Broadcast the new message to all connected clients
	messageResponse := message.ToResponse()

	// Check if GlobalWebSocketController is available
	if GlobalWebSocketController != nil {
		GlobalWebSocketController.BroadcastNewMessage(chatroomID.Hex(), messageResponse)
	} else {
		fmt.Println("Warning: GlobalWebSocketController is nil, cannot broadcast message")
	}

	// Return message data
	c.JSON(http.StatusCreated, gin.H{
		"message": messageResponse,
	})
}

// GetMessages handles getting messages from a chatroom
// @Summary Get messages from a chatroom
// @Description Retrieve messages from a chatroom with optional limit parameter
// @Tags messages
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path string true "Chatroom ID" example:"60d5f8b8e6b5f0b3e8b4b5b3"
// @Param limit query int false "Maximum number of messages to retrieve" default(50) minimum(1) maximum(100)
// @Success 200 {object} map[string][]models.MessageResponse "List of messages"
// @Failure 400 {object} map[string]string "Invalid chatroom ID"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 403 {object} map[string]string "User is not a member of this chatroom"
// @Failure 404 {object} map[string]string "Chatroom not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /chatrooms/{id}/messages [get]
func (mc *MessageController) GetMessages(c *gin.Context) {
	// Get chatroom ID from URL
	chatroomID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chatroom ID"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get limit from query parameters
	limit := 50 // Default limit
	if limitParam := c.Query("limit"); limitParam != "" {
		// Try to parse the limit parameter
		parsedLimit, err := strconv.Atoi(limitParam)
		if err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// Get messages using the service
	messages, err := mc.MessageService.GetMessages(chatroomID, userID.(uint), limit)
	if err != nil {
		if err.Error() == "chatroom not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if err.Error() == "user is not a member of this chatroom" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// Convert to response format
	var response []models.MessageResponse
	for _, message := range messages {
		response = append(response, message.ToResponse())
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": response,
	})
}

// UpdateMessage handles updating a message
// @Summary Update a message
// @Description Update the content and/or media of an existing message (only sender can update)
// @Tags messages
// @Accept json
// @Produce json
// @Param id path string true "Chatroom ID"
// @Param messageId path string true "Message ID"
// @Param message body UpdateMessageRequest true "Updated message data"
// @Success 200 {object} map[string]interface{} "Updated message"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 404 {object} map[string]string "Message not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Security BearerAuth
// @Router /api/chatrooms/{id}/messages/{messageId} [put]
func (mc *MessageController) UpdateMessage(c *gin.Context) {
	var req UpdateMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.FormatValidationError(err)})
		return
	}

	// Get message ID from URL
	messageID, err := primitive.ObjectIDFromHex(c.Param("messageId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide a valid message ID"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Please log in to continue"})
		return
	}

	// Update message using the service
	message, err := mc.MessageService.UpdateMessage(messageID, userID.(uint), req.TextContent, req.MediaURL)
	if err != nil {
		switch err.Error() {
		case "message not found":
			c.JSON(http.StatusNotFound, gin.H{"error": utils.FormatServiceError(err)})
		case "user is not the sender of this message":
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only update your own messages"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": message.ToResponse()})
}

// DeleteMessage handles deleting a message
// @Summary Delete a message
// @Description Delete a message and its associated media (only sender can delete)
// @Tags messages
// @Produce json
// @Param id path string true "Chatroom ID"
// @Param messageId path string true "Message ID"
// @Success 200 {object} map[string]string "Message deleted successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 404 {object} map[string]string "Message not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Security BearerAuth
// @Router /api/chatrooms/{id}/messages/{messageId} [delete]
func (mc *MessageController) DeleteMessage(c *gin.Context) {
	// Get message ID from URL
	messageID, err := primitive.ObjectIDFromHex(c.Param("messageId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide a valid message ID"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Please log in to continue"})
		return
	}

	// Delete message using the service
	err = mc.MessageService.DeleteMessage(messageID, userID.(uint))
	if err != nil {
		switch err.Error() {
		case "message not found":
			c.JSON(http.StatusNotFound, gin.H{"error": utils.FormatServiceError(err)})
		case "user is not the sender of this message":
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own messages"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Message deleted successfully"})
}
