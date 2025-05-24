package services

import (
	"context"
	"errors"
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
