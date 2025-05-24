package controllers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ginchat/models"
	"github.com/ginchat/services"
	"github.com/ginchat/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MessageReadStatusController handles HTTP requests related to message read status
type MessageReadStatusController struct {
	ReadStatusService *services.MessageReadStatusService
}

// NewMessageReadStatusController creates a new MessageReadStatusController
func NewMessageReadStatusController(readStatusService *services.MessageReadStatusService) *MessageReadStatusController {
	return &MessageReadStatusController{
		ReadStatusService: readStatusService,
	}
}

// MarkMessageAsReadRequest represents the request body for marking a message as read
type MarkMessageAsReadRequest struct {
	MessageID string `json:"message_id" binding:"required" example:"60d5f8b8e6b5f0b3e8b4b5b3"` // The ID of the message to mark as read
}

// MarkMessageAsRead handles marking a message as read by the authenticated user
// @Summary Mark a message as read
// @Description Mark a specific message as read by the authenticated user
// @Tags message-read-status
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param request body MarkMessageAsReadRequest true "Message ID to mark as read"
// @Success 200 {object} map[string]string "Message marked as read successfully"
// @Failure 400 {object} map[string]string "Invalid request body or message ID"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 404 {object} map[string]string "Message not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /messages/read [post]
func (c *MessageReadStatusController) MarkMessageAsRead(ctx *gin.Context) {
	var req MarkMessageAsReadRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": utils.FormatValidationError(err)})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Convert message ID to ObjectID
	messageObjectID, err := primitive.ObjectIDFromHex(req.MessageID)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID"})
		return
	}

	// Mark message as read
	err = c.ReadStatusService.MarkMessageAsRead(messageObjectID, userID.(uint))
	if err != nil {
		if err.Error() == "read status not found" {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Message not found or already read"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		return
	}

	// Send WebSocket notification about message read status update
	readStatus, err := c.ReadStatusService.GetMessageReadStatus(messageObjectID)
	if err == nil {
		// Get the message to find the chatroom
		var message models.Message
		err := c.ReadStatusService.MessageColl.FindOne(context.Background(), bson.M{"_id": messageObjectID}).Decode(&message)
		if err == nil {
			// Broadcast read status update to the chatroom
			BroadcastMessageReadGlobal(message.ChatroomID.Hex(), map[string]any{
				"message_id":  messageObjectID.Hex(),
				"read_status": readStatus,
			})

			// Get updated unread counts for all users in the chatroom
			chatroom, err := c.ReadStatusService.ChatroomService.GetChatroomByID(message.ChatroomID)
			if err == nil {
				for _, member := range chatroom.Members {
					unreadCounts, err := c.ReadStatusService.GetUnreadCountForUser(member.UserID)
					if err == nil {
						BroadcastUnreadCountUpdateGlobal(member.UserID, unreadCounts)
					}
				}
			}
		}
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Message marked as read successfully"})
}

// GetUserLastReadForChatroom gets the last read message for a user in a specific chatroom
// @Summary Get user's last read message for a chatroom
// @Description Get the last message that the authenticated user has read in a specific chatroom
// @Tags message-read-status
// @Produce json
// @Security ApiKeyAuth
// @Param id path string true "Chatroom ID"
// @Success 200 {object} models.UserLastReadResponse "User's last read message information"
// @Failure 400 {object} map[string]string "Invalid chatroom ID"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 404 {object} map[string]string "No read history found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /chatrooms/{id}/last-read [get]
func (c *MessageReadStatusController) GetUserLastReadForChatroom(ctx *gin.Context) {
	// Get chatroom ID from URL parameter
	chatroomIDStr := ctx.Param("id")
	chatroomID, err := primitive.ObjectIDFromHex(chatroomIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chatroom ID"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get user's last read message for the chatroom
	lastRead, err := c.ReadStatusService.GetUserLastReadForChatroom(chatroomID, userID.(uint))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		return
	}

	if lastRead == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "No read history found for this chatroom"})
		return
	}

	ctx.JSON(http.StatusOK, lastRead.ToResponse())
}

// GetUnreadCountForUser gets unread message count for all chatrooms for the authenticated user
// @Summary Get unread message counts
// @Description Get unread message count for all chatrooms that the authenticated user has joined
// @Tags message-read-status
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {array} models.ChatroomUnreadCount "Unread message counts for each chatroom"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /messages/unread-counts [get]
func (c *MessageReadStatusController) GetUnreadCountForUser(ctx *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get unread counts for all chatrooms
	unreadCounts, err := c.ReadStatusService.GetUnreadCountForUser(userID.(uint))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		return
	}

	ctx.JSON(http.StatusOK, unreadCounts)
}

// GetLatestMessagesForChatrooms gets the latest message for each chatroom the user has joined
// @Summary Get latest messages for all chatrooms
// @Description Get the latest message for each chatroom that the authenticated user has joined
// @Tags message-read-status
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {array} models.LatestChatMessage "Latest messages for each chatroom"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /messages/latest [get]
func (c *MessageReadStatusController) GetLatestMessagesForChatrooms(ctx *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get latest messages for all chatrooms
	latestMessages, err := c.ReadStatusService.GetLatestMessageForChatrooms(userID.(uint))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		return
	}

	ctx.JSON(http.StatusOK, latestMessages)
}

// GetMessageReadStatus gets read status for a specific message
// @Summary Get message read status
// @Description Get read status information for a specific message (who has read it and when)
// @Tags message-read-status
// @Produce json
// @Security ApiKeyAuth
// @Param message_id path string true "Message ID"
// @Success 200 {array} models.ReadInfo "Read status information for the message"
// @Failure 400 {object} map[string]string "Invalid message ID"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /messages/{message_id}/read-status [get]
func (c *MessageReadStatusController) GetMessageReadStatus(ctx *gin.Context) {
	// Get message ID from URL parameter
	messageIDStr := ctx.Param("message_id")
	messageID, err := primitive.ObjectIDFromHex(messageIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID"})
		return
	}

	// Get user ID from context (set by auth middleware)
	_, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get read status for the message
	readStatus, err := c.ReadStatusService.GetMessageReadStatus(messageID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		return
	}

	ctx.JSON(http.StatusOK, readStatus)
}

// MarkMultipleMessagesAsRead handles marking multiple messages as read
// @Summary Mark multiple messages as read
// @Description Mark multiple messages as read by the authenticated user (useful for marking all messages in a chatroom as read)
// @Tags message-read-status
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param request body []string true "Array of message IDs to mark as read"
// @Success 200 {object} map[string]interface{} "Results of marking messages as read"
// @Failure 400 {object} map[string]string "Invalid request body"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /messages/read-multiple [post]
func (c *MessageReadStatusController) MarkMultipleMessagesAsRead(ctx *gin.Context) {
	var messageIDs []string
	if err := ctx.ShouldBindJSON(&messageIDs); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	successCount := 0
	errorCount := 0
	var errors []string

	// Mark each message as read
	for _, messageIDStr := range messageIDs {
		messageID, err := primitive.ObjectIDFromHex(messageIDStr)
		if err != nil {
			errorCount++
			errors = append(errors, "Invalid message ID: "+messageIDStr)
			continue
		}

		err = c.ReadStatusService.MarkMessageAsRead(messageID, userID.(uint))
		if err != nil {
			errorCount++
			errors = append(errors, "Failed to mark message "+messageIDStr+" as read: "+err.Error())
		} else {
			successCount++
		}
	}

	response := gin.H{
		"success_count": successCount,
		"error_count":   errorCount,
		"total":         len(messageIDs),
	}

	if len(errors) > 0 {
		response["errors"] = errors
	}

	ctx.JSON(http.StatusOK, response)
}

// GetMessageReadByWho gets detailed information about who has read a specific message
// @Summary Get detailed read status for a message
// @Description Get detailed information about who has read a specific message and when
// @Tags message-read-status
// @Produce json
// @Security ApiKeyAuth
// @Param message_id path string true "Message ID"
// @Success 200 {array} models.MessageReadStatusResponse "Detailed read status information"
// @Failure 400 {object} map[string]string "Invalid message ID"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /messages/{message_id}/read-by-who [get]
func (c *MessageReadStatusController) GetMessageReadByWho(ctx *gin.Context) {
	// Get message ID from URL parameter
	messageIDStr := ctx.Param("message_id")
	messageID, err := primitive.ObjectIDFromHex(messageIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID"})
		return
	}

	// Get user ID from context (set by auth middleware)
	_, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get detailed read status for the message
	readStatuses, err := c.ReadStatusService.GetMessageReadByWho(messageID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		return
	}

	ctx.JSON(http.StatusOK, readStatuses)
}

// MarkAllMessagesInChatroomAsRead marks all messages in a chatroom as read for the authenticated user
// @Summary Mark all messages in chatroom as read
// @Description Mark all unread messages in a specific chatroom as read for the authenticated user
// @Tags message-read-status
// @Produce json
// @Security ApiKeyAuth
// @Param id path string true "Chatroom ID"
// @Success 200 {object} map[string]string "All messages marked as read successfully"
// @Failure 400 {object} map[string]string "Invalid chatroom ID"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /chatrooms/{id}/mark-all-read [post]
func (c *MessageReadStatusController) MarkAllMessagesInChatroomAsRead(ctx *gin.Context) {
	// Get chatroom ID from URL parameter
	chatroomIDStr := ctx.Param("id")
	chatroomID, err := primitive.ObjectIDFromHex(chatroomIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chatroom ID"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get all unread messages before marking them as read
	unreadMessages, err := c.ReadStatusService.GetUnreadMessagesInChatroom(chatroomID, userID.(uint))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		return
	}

	// Mark all messages as read
	err = c.ReadStatusService.MarkAllMessagesInChatroomAsRead(chatroomID, userID.(uint))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		return
	}

	// Send WebSocket notifications for each message that was marked as read
	for _, message := range unreadMessages {
		readStatus, err := c.ReadStatusService.GetMessageReadStatus(message.ID)
		if err == nil {
			// Broadcast read status update for this specific message
			BroadcastMessageReadGlobal(chatroomID.Hex(), map[string]any{
				"message_id":  message.ID.Hex(),
				"read_status": readStatus,
				"user_id":     userID.(uint),
			})
		}
	}

	// Send WebSocket notification about unread count updates
	chatroom, err := c.ReadStatusService.ChatroomService.GetChatroomByID(chatroomID)
	if err == nil {
		// Get updated unread counts for all users in the chatroom
		for _, member := range chatroom.Members {
			unreadCounts, err := c.ReadStatusService.GetUnreadCountForUser(member.UserID)
			if err == nil {
				BroadcastUnreadCountUpdateGlobal(member.UserID, unreadCounts)
			}
		}
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "All messages marked as read successfully"})
}

// GetFirstUnreadMessageInChatroom gets the first unread message for the authenticated user in a chatroom
// @Summary Get first unread message in chatroom
// @Description Get the first unread message for the authenticated user in a specific chatroom
// @Tags message-read-status
// @Produce json
// @Security ApiKeyAuth
// @Param id path string true "Chatroom ID"
// @Success 200 {object} models.MessageResponse "First unread message"
// @Failure 400 {object} map[string]string "Invalid chatroom ID"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 404 {object} map[string]string "No unread messages found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /chatrooms/{id}/first-unread [get]
func (c *MessageReadStatusController) GetFirstUnreadMessageInChatroom(ctx *gin.Context) {
	// Get chatroom ID from URL parameter
	chatroomIDStr := ctx.Param("id")
	chatroomID, err := primitive.ObjectIDFromHex(chatroomIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chatroom ID"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get first unread message
	message, err := c.ReadStatusService.GetFirstUnreadMessageInChatroom(chatroomID, userID.(uint))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		return
	}

	if message == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "No unread messages found"})
		return
	}

	ctx.JSON(http.StatusOK, message.ToResponse())
}

// GetUnreadCountForChatroom gets unread message count for a specific chatroom
// @Summary Get unread count for specific chatroom
// @Description Get unread message count for the authenticated user in a specific chatroom
// @Tags message-read-status
// @Produce json
// @Security ApiKeyAuth
// @Param id path string true "Chatroom ID"
// @Success 200 {object} map[string]int64 "Unread message count"
// @Failure 400 {object} map[string]string "Invalid chatroom ID"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /chatrooms/{id}/unread-count [get]
func (c *MessageReadStatusController) GetUnreadCountForChatroom(ctx *gin.Context) {
	// Get chatroom ID from URL parameter
	chatroomIDStr := ctx.Param("id")
	chatroomID, err := primitive.ObjectIDFromHex(chatroomIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chatroom ID"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get unread count for the chatroom
	count, err := c.ReadStatusService.GetUnreadCountForChatroom(chatroomID, userID.(uint))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"unread_count": count})
}
