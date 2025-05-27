package services

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/ginchat/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// MessageService handles business logic related to messages
type MessageService struct {
	MongoDB       *mongo.Database
	MsgColl       *mongo.Collection
	ChatSvc       *ChatroomService
	CloudinarySvc *CloudinaryService
	ReadStatusSvc *MessageReadStatusService
}

// NewMessageService creates a new MessageService
func NewMessageService(mongodb *mongo.Database, chatroomService *ChatroomService, cloudinaryService *CloudinaryService, readStatusService *MessageReadStatusService) *MessageService {
	return &MessageService{
		MongoDB:       mongodb,
		MsgColl:       mongodb.Collection("messages"),
		ChatSvc:       chatroomService,
		CloudinarySvc: cloudinaryService,
		ReadStatusSvc: readStatusService,
	}
}

// SendMessage sends a message to a chatroom
func (s *MessageService) SendMessage(chatroomID primitive.ObjectID, userID uint, username string, messageType, textContent, mediaURL string) (*models.Message, error) {
	// Check if chatroom exists and user is a member
	chatroom, err := s.ChatSvc.GetChatroomByID(chatroomID)
	if err != nil {
		return nil, err
	}

	// Check if user is a member of the chatroom
	if !s.ChatSvc.IsMember(chatroom, userID) {
		return nil, errors.New("user is not a member of this chatroom")
	}

	// Validate message type and required fields
	switch messageType {
	case "text":
		if textContent == "" {
			return nil, errors.New("text content is required for text messages")
		}
	case "picture", "audio", "video":
		if mediaURL == "" {
			return nil, errors.New("media URL is required for media messages")
		}
	case "text_and_picture", "text_and_audio", "text_and_video":
		if textContent == "" {
			return nil, errors.New("text content is required for combined messages")
		}
		if mediaURL == "" {
			return nil, errors.New("media URL is required for combined messages")
		}
	default:
		return nil, errors.New("invalid message type")
	}

	// Create new message
	message := models.Message{
		ID:          primitive.NewObjectID(),
		ChatroomID:  chatroomID,
		SenderID:    userID,
		SenderName:  username,
		MessageType: messageType,
		TextContent: textContent,
		MediaURL:    mediaURL,
		SentAt:      time.Now(),
		Edited:      false,
		EditedAt:    nil,
	}

	// Save message to MongoDB
	_, err = s.MsgColl.InsertOne(context.Background(), message)
	if err != nil {
		return nil, errors.New("failed to send message")
	}

	// Create read status entries for all chatroom members (except sender)
	if s.ReadStatusSvc != nil {
		err = s.ReadStatusSvc.CreateReadStatusForMessage(message.ID, chatroomID, userID)
		if err != nil {
			// Log error but don't fail the message sending
			// In production, you might want to queue this for retry
		}
	}

	return &message, nil
}

// GetMessages retrieves messages from a chatroom
func (s *MessageService) GetMessages(chatroomID primitive.ObjectID, userID uint, limit int) ([]models.Message, error) {
	// Check if chatroom exists and user is a member
	chatroom, err := s.ChatSvc.GetChatroomByID(chatroomID)
	if err != nil {
		return nil, err
	}

	// Check if user is a member of the chatroom
	if !s.ChatSvc.IsMember(chatroom, userID) {
		return nil, errors.New("user is not a member of this chatroom")
	}

	// Set default limit if not provided
	if limit <= 0 {
		limit = 50
	}

	// Find messages for the chatroom
	findOptions := options.Find().SetSort(bson.M{"sent_at": -1}).SetLimit(int64(limit))
	cursor, err := s.MsgColl.Find(context.Background(), bson.M{"chatroom_id": chatroomID}, findOptions)
	if err != nil {
		return nil, errors.New("failed to get messages")
	}
	defer cursor.Close(context.Background())

	// Decode messages
	var messages []models.Message
	if err := cursor.All(context.Background(), &messages); err != nil {
		return nil, errors.New("failed to decode messages")
	}

	return messages, nil
}

// GetMessagesWithReadStatus retrieves messages from a chatroom with read status information
func (s *MessageService) GetMessagesWithReadStatus(chatroomID primitive.ObjectID, userID uint, limit int) ([]models.MessageResponse, error) {
	// Get messages first
	messages, err := s.GetMessages(chatroomID, userID, limit)
	if err != nil {
		return nil, err
	}

	// Convert to response format with read status
	var messageResponses []models.MessageResponse
	for _, message := range messages {
		response := message.ToResponse()

		// Get read status for this message if read status service is available
		if s.ReadStatusSvc != nil {
			readStatus, err := s.ReadStatusSvc.GetMessageReadStatus(message.ID)
			if err == nil {
				response.ReadStatus = readStatus
			}
		}

		messageResponses = append(messageResponses, response)
	}

	return messageResponses, nil
}

// PaginatedMessagesResponse represents the response for paginated messages
type PaginatedMessagesResponse struct {
	Messages    []models.MessageResponse `json:"messages"`              // List of messages
	HasMore     bool                     `json:"has_more"`              // Whether there are more messages available
	NextCursor  *string                  `json:"next_cursor,omitempty"` // Cursor for next page (timestamp)
	UnreadCount int                      `json:"unread_count"`          // Total unread messages for this user in this chatroom
	TotalCount  int                      `json:"total_count"`           // Total messages in chatroom
}

// GetMessagesPaginated retrieves messages with smart pagination for mobile
func (s *MessageService) GetMessagesPaginated(chatroomID primitive.ObjectID, userID uint, limit int, beforeTime, afterTime *time.Time) (*PaginatedMessagesResponse, error) {
	// Check if chatroom exists and user is a member
	chatroom, err := s.ChatSvc.GetChatroomByID(chatroomID)
	if err != nil {
		return nil, err
	}

	// Check if user is a member of the chatroom
	if !s.ChatSvc.IsMember(chatroom, userID) {
		return nil, errors.New("user is not a member of this chatroom")
	}

	// Get unread count for this user in this chatroom
	unreadCount := 0
	if s.ReadStatusSvc != nil {
		count, _ := s.ReadStatusSvc.GetUnreadCountForChatroom(chatroomID, userID)
		unreadCount = int(count)
	}

	// Get total message count in chatroom
	totalCount, err := s.MsgColl.CountDocuments(context.Background(), bson.M{"chatroom_id": chatroomID})
	if err != nil {
		totalCount = 0
	}

	var messages []models.Message
	var hasMore bool
	var nextCursor *string

	// Smart loading logic: if unread > 50, load all unread messages + some read ones
	// Otherwise, load the standard 50 messages
	if unreadCount > 50 && beforeTime == nil && afterTime == nil {
		// Load all unread messages plus some recent read messages
		messages, hasMore, nextCursor, err = s.getUnreadAndRecentMessages(chatroomID, userID)
	} else {
		// Standard pagination
		messages, hasMore, nextCursor, err = s.getPaginatedMessages(chatroomID, limit, beforeTime, afterTime)
	}

	if err != nil {
		return nil, err
	}

	// Convert to response format with read status
	var messageResponses []models.MessageResponse
	for _, message := range messages {
		response := message.ToResponse()

		// Get read status for this message if read status service is available
		if s.ReadStatusSvc != nil {
			readStatus, err := s.ReadStatusSvc.GetMessageReadStatus(message.ID)
			if err == nil {
				response.ReadStatus = readStatus
			}
		}

		messageResponses = append(messageResponses, response)
	}

	return &PaginatedMessagesResponse{
		Messages:    messageResponses,
		HasMore:     hasMore,
		NextCursor:  nextCursor,
		UnreadCount: unreadCount,
		TotalCount:  int(totalCount),
	}, nil
}

// DeleteMessage deletes a message and its associated media
func (s *MessageService) DeleteMessage(messageID primitive.ObjectID, userID uint) error {
	// Find the message
	var message models.Message
	err := s.MsgColl.FindOne(context.Background(), bson.M{"_id": messageID}).Decode(&message)
	if err != nil {
		return errors.New("message not found")
	}

	// Check if the user is the sender of the message
	if message.SenderID != userID {
		return errors.New("user is not the sender of this message")
	}

	// Delete media from Cloudinary if exists
	if message.MediaURL != "" && s.CloudinarySvc != nil {
		err = s.CloudinarySvc.DeleteFile(message.MediaURL)
		if err != nil {
			// Log error but don't fail the deletion
			// In production, you might want to queue this for retry
			// For now, we'll continue with message deletion
		}
	}

	// Delete the message from database
	_, err = s.MsgColl.DeleteOne(context.Background(), bson.M{"_id": messageID})
	if err != nil {
		return errors.New("failed to delete message")
	}

	return nil
}

// UpdateMessage updates a message with new content and/or media
func (s *MessageService) UpdateMessage(messageID primitive.ObjectID, userID uint, textContent, newMediaURL, newMessageType string) (*models.Message, error) {
	// Find the message
	var message models.Message
	err := s.MsgColl.FindOne(context.Background(), bson.M{"_id": messageID}).Decode(&message)
	if err != nil {
		return nil, errors.New("message not found")
	}

	// Check if the user is the sender of the message
	if message.SenderID != userID {
		return nil, errors.New("user is not the sender of this message")
	}

	// If media URL is being changed, delete the old media from Cloudinary
	if message.MediaURL != "" && message.MediaURL != newMediaURL && s.CloudinarySvc != nil {
		err = s.CloudinarySvc.DeleteFile(message.MediaURL)
		if err != nil {
			// Log error but don't fail the update
			// In production, you might want to queue this for retry
		}
	}

	// Determine the new message type based on content
	finalMessageType := newMessageType
	if finalMessageType == "" {
		// Auto-determine message type based on content
		if textContent != "" && newMediaURL != "" {
			// Determine combined type based on media URL or existing type
			if strings.Contains(message.MessageType, "picture") || strings.Contains(newMessageType, "picture") {
				finalMessageType = "text_and_picture"
			} else if strings.Contains(message.MessageType, "audio") || strings.Contains(newMessageType, "audio") {
				finalMessageType = "text_and_audio"
			} else if strings.Contains(message.MessageType, "video") || strings.Contains(newMessageType, "video") {
				finalMessageType = "text_and_video"
			} else {
				finalMessageType = "text_and_picture" // Default for combined
			}
		} else if textContent != "" && newMediaURL == "" {
			finalMessageType = "text"
		} else if textContent == "" && newMediaURL != "" {
			// Determine media type based on URL or existing type
			if strings.Contains(message.MessageType, "picture") || strings.Contains(newMessageType, "picture") {
				finalMessageType = "picture"
			} else if strings.Contains(message.MessageType, "audio") || strings.Contains(newMessageType, "audio") {
				finalMessageType = "audio"
			} else if strings.Contains(message.MessageType, "video") || strings.Contains(newMessageType, "video") {
				finalMessageType = "video"
			} else {
				finalMessageType = "picture" // Default for media only
			}
		} else {
			// Keep original type if no content changes
			finalMessageType = message.MessageType
		}
	}

	// Prepare update fields
	updateFields := bson.M{
		"text_content": textContent,
		"message_type": finalMessageType,
		"edited":       true,
		"edited_at":    time.Now(),
	}

	// Update media URL
	if newMediaURL != "" {
		updateFields["media_url"] = newMediaURL
	} else {
		// If removing media, set to empty string
		updateFields["media_url"] = ""
	}

	// Update the message
	_, err = s.MsgColl.UpdateOne(
		context.Background(),
		bson.M{"_id": messageID},
		bson.M{"$set": updateFields},
	)
	if err != nil {
		return nil, errors.New("failed to update message")
	}

	// Get the updated message
	err = s.MsgColl.FindOne(context.Background(), bson.M{"_id": messageID}).Decode(&message)
	if err != nil {
		return nil, errors.New("failed to get updated message")
	}

	return &message, nil
}

// EditMessage edits only the text content of a message (legacy function for backward compatibility)
func (s *MessageService) EditMessage(messageID primitive.ObjectID, userID uint, textContent string) (*models.Message, error) {
	return s.UpdateMessage(messageID, userID, textContent, "", "")
}

// DeleteAllMessagesInChatroom deletes all messages in a chatroom and their associated media
func (s *MessageService) DeleteAllMessagesInChatroom(chatroomID primitive.ObjectID) error {
	// Find all messages in the chatroom
	cursor, err := s.MsgColl.Find(context.Background(), bson.M{"chatroom_id": chatroomID})
	if err != nil {
		return errors.New("failed to find messages")
	}
	defer cursor.Close(context.Background())

	// Delete media files from Cloudinary for each message
	if s.CloudinarySvc != nil {
		for cursor.Next(context.Background()) {
			var message models.Message
			if err := cursor.Decode(&message); err != nil {
				continue // Skip this message if decode fails
			}

			// Delete media if exists
			if message.MediaURL != "" {
				err = s.CloudinarySvc.DeleteFile(message.MediaURL)
				if err != nil {
					// Log error but continue with other deletions
					// In production, you might want to queue failed deletions for retry
				}
			}
		}
	}

	// Delete all messages from database
	_, err = s.MsgColl.DeleteMany(context.Background(), bson.M{"chatroom_id": chatroomID})
	if err != nil {
		return errors.New("failed to delete messages")
	}

	return nil
}

// getUnreadAndRecentMessages loads all unread messages plus some recent read messages
func (s *MessageService) getUnreadAndRecentMessages(chatroomID primitive.ObjectID, userID uint) ([]models.Message, bool, *string, error) {
	// Get all unread messages for this user
	unreadMessages, err := s.ReadStatusSvc.GetUnreadMessagesInChatroom(chatroomID, userID)
	if err != nil {
		return nil, false, nil, err
	}

	// Sort unread messages by sent_at (oldest first)
	sort.Slice(unreadMessages, func(i, j int) bool {
		return unreadMessages[i].SentAt.Before(unreadMessages[j].SentAt)
	})

	// Get some recent read messages to provide context (limit to 20)
	readLimit := 20
	filter := bson.M{
		"chatroom_id": chatroomID,
		"_id": bson.M{
			"$nin": func() []primitive.ObjectID {
				var unreadIDs []primitive.ObjectID
				for _, msg := range unreadMessages {
					unreadIDs = append(unreadIDs, msg.ID)
				}
				return unreadIDs
			}(),
		},
	}

	// Get recent read messages (newest first, then we'll reverse)
	cursor, err := s.MsgColl.Find(
		context.Background(),
		filter,
		options.Find().SetSort(bson.D{{Key: "sent_at", Value: -1}}).SetLimit(int64(readLimit)),
	)
	if err != nil {
		return nil, false, nil, errors.New("failed to get read messages")
	}
	defer cursor.Close(context.Background())

	var readMessages []models.Message
	if err := cursor.All(context.Background(), &readMessages); err != nil {
		return nil, false, nil, errors.New("failed to decode read messages")
	}

	// Combine read and unread messages
	allMessages := append(readMessages, unreadMessages...)

	// Sort all messages by sent_at (oldest first for proper chat order)
	sort.Slice(allMessages, func(i, j int) bool {
		return allMessages[i].SentAt.Before(allMessages[j].SentAt)
	})

	// Check if there are more messages available
	totalMessages, _ := s.MsgColl.CountDocuments(context.Background(), bson.M{"chatroom_id": chatroomID})
	hasMore := int64(len(allMessages)) < totalMessages

	// Set next cursor to the oldest message timestamp if there are more
	var nextCursor *string
	if hasMore && len(allMessages) > 0 {
		oldestTime := allMessages[0].SentAt.Format(time.RFC3339)
		nextCursor = &oldestTime
	}

	return allMessages, hasMore, nextCursor, nil
}

// getPaginatedMessages gets messages with standard pagination
func (s *MessageService) getPaginatedMessages(chatroomID primitive.ObjectID, limit int, beforeTime, afterTime *time.Time) ([]models.Message, bool, *string, error) {
	// Build filter
	filter := bson.M{"chatroom_id": chatroomID}

	// Add time-based filters
	if beforeTime != nil {
		filter["sent_at"] = bson.M{"$lt": *beforeTime}
	}
	if afterTime != nil {
		if filter["sent_at"] != nil {
			filter["sent_at"].(bson.M)["$gt"] = *afterTime
		} else {
			filter["sent_at"] = bson.M{"$gt": *afterTime}
		}
	}

	// Get messages (newest first, then we'll reverse for chat order)
	cursor, err := s.MsgColl.Find(
		context.Background(),
		filter,
		options.Find().SetSort(bson.D{{Key: "sent_at", Value: -1}}).SetLimit(int64(limit+1)), // +1 to check if there are more
	)
	if err != nil {
		return nil, false, nil, errors.New("failed to get messages")
	}
	defer cursor.Close(context.Background())

	var messages []models.Message
	if err := cursor.All(context.Background(), &messages); err != nil {
		return nil, false, nil, errors.New("failed to decode messages")
	}

	// Check if there are more messages
	hasMore := len(messages) > limit
	if hasMore {
		messages = messages[:limit] // Remove the extra message
	}

	// Reverse to get chronological order (oldest first)
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	// Set next cursor to the oldest message timestamp if there are more
	var nextCursor *string
	if hasMore && len(messages) > 0 {
		oldestTime := messages[0].SentAt.Format(time.RFC3339)
		nextCursor = &oldestTime
	}

	return messages, hasMore, nextCursor, nil
}
