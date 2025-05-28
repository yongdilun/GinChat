package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

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
	MessageService          *services.MessageService
	PushNotificationService *services.PushNotificationService
}

// NewMessageController creates a new MessageController
func NewMessageController(db *gorm.DB, mongodb *mongo.Database) *MessageController {
	chatroomService := services.NewChatroomService(mongodb)
	userService := services.NewUserService(db)
	cloudinaryService, _ := services.NewCloudinaryService() // Ignore error for now, will be nil if not configured
	readStatusService := services.NewMessageReadStatusService(mongodb, chatroomService, userService)
	messageService := services.NewMessageService(mongodb, chatroomService, cloudinaryService, readStatusService)
	pushNotificationService := services.NewPushNotificationService(db)
	return &MessageController{
		MessageService:          messageService,
		PushNotificationService: pushNotificationService,
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
	MessageType string `json:"message_type" example:"text_and_picture"`                                                         // New message type (optional, will be auto-determined if not provided)
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

	// Broadcast the new message to all connected clients with read status
	messageResponse := message.ToResponse()

	// Get read status for the new message
	if mc.MessageService.ReadStatusSvc != nil {
		readStatus, err := mc.MessageService.ReadStatusSvc.GetMessageReadStatus(message.ID)
		if err == nil {
			messageResponse.ReadStatus = readStatus
		}
	}

	// Check if GlobalWebSocketController is available
	if GlobalWebSocketController != nil {
		// Get read status for the message (without auto-marking)
		if mc.MessageService.ReadStatusSvc != nil {
			readStatus, err := mc.MessageService.ReadStatusSvc.GetMessageReadStatus(message.ID)
			if err == nil {
				messageResponse.ReadStatus = readStatus
			}
		}

		GlobalWebSocketController.BroadcastNewMessage(chatroomID.Hex(), messageResponse)

		// Also send unread count updates to all chatroom members for sidebar updates
		chatroom, err := mc.MessageService.ChatSvc.GetChatroomByID(chatroomID)
		if err == nil {
			fmt.Printf("Sending unread count updates to %d chatroom members\n", len(chatroom.Members))
			for _, member := range chatroom.Members {
				// Skip the sender (they don't get unread count for their own message)
				if member.UserID != userID.(uint) {
					unreadCounts, err := mc.MessageService.ReadStatusSvc.GetUnreadCountForUser(member.UserID)
					if err == nil {
						fmt.Printf("Broadcasting unread count update to user %d\n", member.UserID)
						BroadcastUnreadCountUpdateGlobal(member.UserID, unreadCounts)
					} else {
						fmt.Printf("Failed to get unread counts for user %d: %v\n", member.UserID, err)
					}
				}
			}
		} else {
			fmt.Printf("Failed to get chatroom for unread count updates: %v\n", err)
		}
	} else {
		fmt.Println("Warning: GlobalWebSocketController is nil, cannot broadcast message")
	}

	// Send push notification in background
	if mc.PushNotificationService != nil {
		go func() {
			// Get chatroom for notification
			chatroom, err := mc.MessageService.ChatSvc.GetChatroomByID(chatroomID)
			if err != nil {
				fmt.Printf("Failed to get chatroom for push notification: %v\n", err)
				return
			}

			// Prepare message content for notification
			messageContent := req.TextContent
			if messageContent == "" {
				// For media messages without text, use a generic message
				switch req.MessageType {
				case "picture":
					messageContent = "📷 Photo"
				case "audio":
					messageContent = "🎵 Audio"
				case "video":
					messageContent = "🎥 Video"
				default:
					messageContent = "📎 Media"
				}
			}

			// Send notification
			err = mc.PushNotificationService.SendMessageNotification(
				chatroomID.Hex(),
				userID.(uint),
				username.(string),
				messageContent,
				chatroom.Name,
			)
			if err != nil {
				fmt.Printf("Failed to send push notification: %v\n", err)
			}
		}()
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

	// Get messages with read status using the service
	messages, err := mc.MessageService.GetMessagesWithReadStatus(chatroomID, userID.(uint), limit)
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

	c.JSON(http.StatusOK, gin.H{
		"messages": messages,
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
	message, err := mc.MessageService.UpdateMessage(messageID, userID.(uint), req.TextContent, req.MediaURL, req.MessageType)
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

	// Broadcast the message update to all connected clients
	messageResponse := message.ToResponse()

	// Get read status for the updated message
	if mc.MessageService.ReadStatusSvc != nil {
		readStatus, err := mc.MessageService.ReadStatusSvc.GetMessageReadStatus(message.ID)
		if err == nil {
			messageResponse.ReadStatus = readStatus
		}
	}

	// Check if GlobalWebSocketController is available
	if GlobalWebSocketController != nil {
		BroadcastMessageUpdatedGlobal(message.ChatroomID.Hex(), messageResponse)
	}

	c.JSON(http.StatusOK, gin.H{"message": messageResponse})
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

	// Get chatroom ID from URL for WebSocket broadcasting
	chatroomID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide a valid chatroom ID"})
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

	// Broadcast the message deletion to all connected clients
	if GlobalWebSocketController != nil {
		deleteData := map[string]any{
			"message_id":  messageID.Hex(),
			"chatroom_id": chatroomID.Hex(),
		}
		BroadcastMessageDeletedGlobal(chatroomID.Hex(), deleteData)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Message deleted successfully"})
}

// PaginatedMessagesRequest represents the request for paginated messages
type PaginatedMessagesRequest struct {
	Limit  int    `form:"limit" json:"limit" example:"50"`                     // Number of messages to retrieve (default: 50)
	Before string `form:"before" json:"before" example:"2024-01-01T12:00:00Z"` // Get messages before this timestamp (for pagination)
	After  string `form:"after" json:"after" example:"2024-01-01T12:00:00Z"`   // Get messages after this timestamp (for pagination)
}

// PaginatedMessagesResponse represents the response for paginated messages
type PaginatedMessagesResponse struct {
	Messages    []models.MessageResponse `json:"messages"`              // List of messages
	HasMore     bool                     `json:"has_more"`              // Whether there are more messages available
	NextCursor  *string                  `json:"next_cursor,omitempty"` // Cursor for next page (timestamp)
	UnreadCount int                      `json:"unread_count"`          // Total unread messages for this user in this chatroom
	TotalCount  int                      `json:"total_count"`           // Total messages in chatroom
}

// GetMessagesPaginated handles getting paginated messages from a chatroom for mobile
// @Summary Get paginated messages from a chatroom (Mobile optimized)
// @Description Retrieve messages with smart pagination - loads 50 initially, or all unread if >50 unread messages
// @Tags messages
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path string true "Chatroom ID" example:"60d5f8b8e6b5f0b3e8b4b5b3"
// @Param limit query int false "Maximum number of messages to retrieve" default(50) minimum(1) maximum(100)
// @Param before query string false "Get messages before this timestamp (ISO 8601)" example:"2024-01-01T12:00:00Z"
// @Param after query string false "Get messages after this timestamp (ISO 8601)" example:"2024-01-01T12:00:00Z"
// @Success 200 {object} PaginatedMessagesResponse "Paginated messages with metadata"
// @Failure 400 {object} map[string]string "Invalid request parameters"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 403 {object} map[string]string "User is not a member of this chatroom"
// @Failure 404 {object} map[string]string "Chatroom not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /chatrooms/{id}/messages/paginated [get]
func (mc *MessageController) GetMessagesPaginated(c *gin.Context) {
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

	// Parse query parameters
	var req PaginatedMessagesRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.FormatValidationError(err)})
		return
	}

	// Set default limit
	if req.Limit <= 0 {
		req.Limit = 50
	}
	if req.Limit > 100 {
		req.Limit = 100
	}

	// Parse timestamps if provided
	var beforeTime, afterTime *time.Time
	if req.Before != "" {
		if t, err := time.Parse(time.RFC3339, req.Before); err == nil {
			beforeTime = &t
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid 'before' timestamp format. Use ISO 8601 format."})
			return
		}
	}
	if req.After != "" {
		if t, err := time.Parse(time.RFC3339, req.After); err == nil {
			afterTime = &t
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid 'after' timestamp format. Use ISO 8601 format."})
			return
		}
	}

	// Get paginated messages using the service
	response, err := mc.MessageService.GetMessagesPaginated(chatroomID, userID.(uint), req.Limit, beforeTime, afterTime)
	if err != nil {
		switch err.Error() {
		case "chatroom not found":
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case "user is not a member of this chatroom":
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetChatroomMedia gets all media messages from a chatroom
// @Summary Get all media messages from a chatroom
// @Description Retrieves all messages with media (images, videos, audio) from a specific chatroom
// @Tags messages
// @Accept json
// @Produce json
// @Param id path string true "Chatroom ID"
// @Success 200 {object} map[string]interface{} "success"
// @Failure 400 {object} map[string]interface{} "error"
// @Failure 401 {object} map[string]interface{} "error"
// @Failure 403 {object} map[string]interface{} "error"
// @Failure 500 {object} map[string]interface{} "error"
// @Router /chatrooms/{id}/media [get]
// @Security BearerAuth
func (mc *MessageController) GetChatroomMedia(c *gin.Context) {
	// Get chatroom ID from URL parameter
	chatroomIDStr := c.Param("id")
	chatroomID, err := primitive.ObjectIDFromHex(chatroomIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chatroom ID"})
		return
	}

	// Get user ID from JWT token
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Check if chatroom exists and user is a member
	chatroom, err := mc.MessageService.ChatSvc.GetChatroomByID(chatroomID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chatroom not found"})
		return
	}

	// Check if user is a member of the chatroom
	if !mc.MessageService.ChatSvc.IsMember(chatroom, userID.(uint)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not a member of this chatroom"})
		return
	}

	// Get all media messages from the chatroom
	messages, err := mc.MessageService.GetChatroomMedia(chatroomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get media messages"})
		return
	}

	// Convert to response format
	var messageResponses []models.MessageResponse
	for _, message := range messages {
		// Convert message to response format manually
		response := message.ToResponse()

		// Get read status for the message
		if mc.MessageService.ReadStatusSvc != nil {
			readStatus, err := mc.MessageService.ReadStatusSvc.GetMessageReadStatus(message.ID)
			if err == nil {
				response.ReadStatus = readStatus
			}
		}

		messageResponses = append(messageResponses, response)
	}

	// Ensure messageResponses is never nil
	if messageResponses == nil {
		messageResponses = []models.MessageResponse{}
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": messageResponses,
		"count":    len(messageResponses),
	})
}
