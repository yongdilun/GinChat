package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ginchat/services"
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
	messageService := services.NewMessageService(mongodb, chatroomService)
	return &MessageController{
		MessageService: messageService,
	}
}

// SendMessageRequest represents the request body for sending a message
type SendMessageRequest struct {
	MessageType string `json:"message_type" binding:"required,oneof=text picture audio video text_and_picture text_and_audio text_and_video"`
	TextContent string `json:"text_content"`
	MediaURL    string `json:"media_url"`
}

// SendMessage handles sending a message to a chatroom
func (mc *MessageController) SendMessage(c *gin.Context) {
	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

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
	username, _ := c.Get("username")

	// Send message using the service
	message, err := mc.MessageService.SendMessage(chatroomID, userID.(uint), username.(string), req.MessageType, req.TextContent, req.MediaURL)
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

	// Return message data
	c.JSON(http.StatusCreated, gin.H{
		"message": message.ToResponse(),
	})
}

// GetMessages handles getting messages from a chatroom
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
	var response []interface{}
	for _, message := range messages {
		response = append(response, message.ToResponse())
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": response,
	})
}
