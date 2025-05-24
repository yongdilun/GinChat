package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/ginchat/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// MessageReadStatusService handles business logic related to message read status
type MessageReadStatusService struct {
	MongoDB          *mongo.Database
	ReadStatusColl   *mongo.Collection
	UserLastReadColl *mongo.Collection
	MessageColl      *mongo.Collection
	ChatroomColl     *mongo.Collection
	ChatroomService  *ChatroomService
	UserService      *UserService
}

// NewMessageReadStatusService creates a new MessageReadStatusService
func NewMessageReadStatusService(mongodb *mongo.Database, chatroomService *ChatroomService, userService *UserService) *MessageReadStatusService {
	return &MessageReadStatusService{
		MongoDB:          mongodb,
		ReadStatusColl:   mongodb.Collection("message_read_status"),
		UserLastReadColl: mongodb.Collection("user_last_read"),
		MessageColl:      mongodb.Collection("messages"),
		ChatroomColl:     mongodb.Collection("chatrooms"),
		ChatroomService:  chatroomService,
		UserService:      userService,
	}
}

// CreateReadStatusForMessage creates read status entries for all chatroom members when a message is sent
func (s *MessageReadStatusService) CreateReadStatusForMessage(messageID primitive.ObjectID, chatroomID primitive.ObjectID, senderID uint) error {
	// Get chatroom to find all members
	chatroom, err := s.ChatroomService.GetChatroomByID(chatroomID)
	if err != nil {
		return errors.New("failed to get chatroom")
	}

	// Create read status for each member except the sender
	var readStatuses []any
	now := time.Now()

	for _, member := range chatroom.Members {
		if member.UserID != senderID {
			readStatus := models.MessageReadStatus{
				ID:          primitive.NewObjectID(),
				MessageID:   messageID,
				ChatroomID:  chatroomID,
				SenderID:    senderID,
				RecipientID: member.UserID,
				IsRead:      false,
				ReadAt:      nil,
				CreatedAt:   now,
			}
			readStatuses = append(readStatuses, readStatus)
		}
	}

	// Insert all read statuses
	if len(readStatuses) > 0 {
		_, err = s.ReadStatusColl.InsertMany(context.Background(), readStatuses)
		if err != nil {
			return errors.New("failed to create read statuses")
		}
	}

	return nil
}

// MarkMessageAsRead marks a message as read by a specific user
func (s *MessageReadStatusService) MarkMessageAsRead(messageID primitive.ObjectID, userID uint) error {
	now := time.Now()

	// Update the read status
	filter := bson.M{
		"message_id":   messageID,
		"recipient_id": userID,
	}

	update := bson.M{
		"$set": bson.M{
			"is_read": true,
			"read_at": now,
		},
	}

	result, err := s.ReadStatusColl.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return errors.New("failed to mark message as read")
	}

	if result.MatchedCount == 0 {
		return errors.New("read status not found")
	}

	// Update user's last read message for the chatroom
	err = s.UpdateUserLastRead(messageID, userID)
	if err != nil {
		// Log error but don't fail the operation
		// This is not critical for the read status update
	}

	return nil
}

// UpdateUserLastRead updates the last read message for a user in a chatroom
func (s *MessageReadStatusService) UpdateUserLastRead(messageID primitive.ObjectID, userID uint) error {
	// Get the message to find the chatroom
	var message models.Message
	err := s.MessageColl.FindOne(context.Background(), bson.M{"_id": messageID}).Decode(&message)
	if err != nil {
		return errors.New("message not found")
	}

	now := time.Now()

	// Upsert user last read
	filter := bson.M{
		"chatroom_id": message.ChatroomID,
		"user_id":     userID,
	}

	update := bson.M{
		"$set": bson.M{
			"message_id": messageID,
			"read_at":    now,
			"updated_at": now,
		},
		"$setOnInsert": bson.M{
			"_id":         primitive.NewObjectID(),
			"chatroom_id": message.ChatroomID,
			"user_id":     userID,
		},
	}

	opts := options.Update().SetUpsert(true)
	_, err = s.UserLastReadColl.UpdateOne(context.Background(), filter, update, opts)
	if err != nil {
		return errors.New("failed to update user last read")
	}

	return nil
}

// GetMessageReadStatus gets read status for a specific message
func (s *MessageReadStatusService) GetMessageReadStatus(messageID primitive.ObjectID) ([]models.ReadInfo, error) {
	// Find all read statuses for the message
	cursor, err := s.ReadStatusColl.Find(context.Background(), bson.M{"message_id": messageID})
	if err != nil {
		return nil, errors.New("failed to get read statuses")
	}
	defer cursor.Close(context.Background())

	var readStatuses []models.MessageReadStatus
	if err := cursor.All(context.Background(), &readStatuses); err != nil {
		return nil, errors.New("failed to decode read statuses")
	}

	// Convert to ReadInfo format with usernames
	var readInfos []models.ReadInfo
	for _, status := range readStatuses {
		// Get username from user service
		username := fmt.Sprintf("User %d", status.RecipientID) // Default fallback
		if s.UserService != nil {
			if user, err := s.UserService.GetUserByID(status.RecipientID); err == nil {
				username = user.Username
			}
		}

		readInfo := models.ReadInfo{
			UserID:   status.RecipientID,
			Username: username,
			IsRead:   status.IsRead,
			ReadAt:   status.ReadAt,
		}
		readInfos = append(readInfos, readInfo)
	}

	return readInfos, nil
}

// GetUserLastReadForChatroom gets the last read message for a user in a chatroom
func (s *MessageReadStatusService) GetUserLastReadForChatroom(chatroomID primitive.ObjectID, userID uint) (*models.UserLastRead, error) {
	var lastRead models.UserLastRead
	err := s.UserLastReadColl.FindOne(context.Background(), bson.M{
		"chatroom_id": chatroomID,
		"user_id":     userID,
	}).Decode(&lastRead)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil // No last read found
		}
		return nil, errors.New("failed to get user last read")
	}

	return &lastRead, nil
}

// GetUnreadCountForUser gets unread message count for all chatrooms for a user
func (s *MessageReadStatusService) GetUnreadCountForUser(userID uint) ([]models.ChatroomUnreadCount, error) {
	// First, let's get all chatrooms the user is a member of
	chatroomCursor, err := s.ChatroomColl.Find(context.Background(), bson.M{
		"members.user_id": userID,
	})
	if err != nil {
		return nil, errors.New("failed to get user chatrooms")
	}
	defer chatroomCursor.Close(context.Background())

	var userChatrooms []models.Chatroom
	if err := chatroomCursor.All(context.Background(), &userChatrooms); err != nil {
		return nil, errors.New("failed to decode user chatrooms")
	}

	var unreadCounts []models.ChatroomUnreadCount

	// For each chatroom, count unread messages
	for _, chatroom := range userChatrooms {
		count, err := s.ReadStatusColl.CountDocuments(context.Background(), bson.M{
			"chatroom_id":  chatroom.ID,
			"recipient_id": userID,
			"is_read":      false,
		})
		if err != nil {
			// Log error but continue with other chatrooms
			continue
		}

		// Add to results even if count is 0 (for debugging)
		unreadCount := models.ChatroomUnreadCount{
			ChatroomID:   chatroom.ID.Hex(),
			ChatroomName: chatroom.Name,
			UnreadCount:  count,
		}
		unreadCounts = append(unreadCounts, unreadCount)
	}

	return unreadCounts, nil
}

// GetLatestMessageForChatrooms gets the latest message for each chatroom the user has joined
func (s *MessageReadStatusService) GetLatestMessageForChatrooms(userID uint) ([]models.LatestChatMessage, error) {
	// Get user's joined chatrooms
	userChatrooms, err := s.ChatroomService.GetUserChatrooms(userID)
	if err != nil {
		return nil, errors.New("failed to get user chatrooms")
	}

	var latestMessages []models.LatestChatMessage

	for _, chatroom := range userChatrooms {
		// Get latest message for this chatroom
		var message models.Message
		opts := options.FindOne().SetSort(bson.D{{Key: "sent_at", Value: -1}})
		err := s.MessageColl.FindOne(context.Background(), bson.M{"chatroom_id": chatroom.ID}, opts).Decode(&message)

		if err != nil {
			if err == mongo.ErrNoDocuments {
				// No messages in this chatroom yet
				latestMessage := models.LatestChatMessage{
					ChatroomID:   chatroom.ID.Hex(),
					ChatroomName: chatroom.Name,
					MessageID:    "",
					SenderName:   "",
					MessageType:  "",
					TextContent:  "",
					MediaURL:     "",
					SentAt:       time.Time{},
					ReadStatus:   []models.ReadInfo{},
				}
				latestMessages = append(latestMessages, latestMessage)
				continue
			}
			return nil, errors.New("failed to get latest message")
		}

		// Get read status for this message
		readStatus, err := s.GetMessageReadStatus(message.ID)
		if err != nil {
			readStatus = []models.ReadInfo{} // Empty if failed to get read status
		}

		latestMessage := models.LatestChatMessage{
			ChatroomID:   chatroom.ID.Hex(),
			ChatroomName: chatroom.Name,
			MessageID:    message.ID.Hex(),
			SenderName:   message.SenderName,
			MessageType:  message.MessageType,
			TextContent:  message.TextContent,
			MediaURL:     message.MediaURL,
			SentAt:       message.SentAt,
			ReadStatus:   readStatus,
		}

		latestMessages = append(latestMessages, latestMessage)
	}

	return latestMessages, nil
}

// GetMessageReadByWho gets detailed information about who has read a specific message
func (s *MessageReadStatusService) GetMessageReadByWho(messageID primitive.ObjectID) ([]models.MessageReadStatusResponse, error) {
	// Find all read statuses for the message
	cursor, err := s.ReadStatusColl.Find(context.Background(), bson.M{"message_id": messageID})
	if err != nil {
		return nil, errors.New("failed to get read statuses")
	}
	defer cursor.Close(context.Background())

	var readStatuses []models.MessageReadStatus
	if err := cursor.All(context.Background(), &readStatuses); err != nil {
		return nil, errors.New("failed to decode read statuses")
	}

	// Convert to response format
	var responses []models.MessageReadStatusResponse
	for _, status := range readStatuses {
		responses = append(responses, status.ToResponse())
	}

	return responses, nil
}

// MarkAllMessagesInChatroomAsRead marks all messages in a chatroom as read for a specific user
func (s *MessageReadStatusService) MarkAllMessagesInChatroomAsRead(chatroomID primitive.ObjectID, userID uint) error {
	now := time.Now()

	// Update all unread messages in the chatroom for this user
	filter := bson.M{
		"chatroom_id":  chatroomID,
		"recipient_id": userID,
		"is_read":      false,
	}

	update := bson.M{
		"$set": bson.M{
			"is_read": true,
			"read_at": now,
		},
	}

	_, err := s.ReadStatusColl.UpdateMany(context.Background(), filter, update)
	if err != nil {
		return errors.New("failed to mark messages as read")
	}

	// Get the latest message in the chatroom to update user's last read
	var latestMessage models.Message
	opts := options.FindOne().SetSort(bson.D{{Key: "sent_at", Value: -1}})
	err = s.MessageColl.FindOne(context.Background(), bson.M{"chatroom_id": chatroomID}, opts).Decode(&latestMessage)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			// No messages in chatroom, nothing to update
			return nil
		}
		return errors.New("failed to get latest message")
	}

	// Update user's last read to the latest message
	err = s.UpdateUserLastRead(latestMessage.ID, userID)
	if err != nil {
		// Log error but don't fail the operation
		// This is not critical for marking messages as read
	}

	return nil
}

// GetFirstUnreadMessageInChatroom gets the first unread message for a user in a chatroom
func (s *MessageReadStatusService) GetFirstUnreadMessageInChatroom(chatroomID primitive.ObjectID, userID uint) (*models.Message, error) {
	// Get user's last read message
	lastRead, err := s.GetUserLastReadForChatroom(chatroomID, userID)
	if err != nil {
		return nil, err
	}

	var filter bson.M
	if lastRead == nil {
		// User has never read any message, get the first message
		filter = bson.M{"chatroom_id": chatroomID}
	} else {
		// Get the first message after the last read message
		var lastReadMessage models.Message
		err = s.MessageColl.FindOne(context.Background(), bson.M{"_id": lastRead.MessageID}).Decode(&lastReadMessage)
		if err != nil {
			return nil, errors.New("failed to get last read message")
		}

		filter = bson.M{
			"chatroom_id": chatroomID,
			"sent_at":     bson.M{"$gt": lastReadMessage.SentAt},
		}
	}

	// Find the first unread message
	var message models.Message
	opts := options.FindOne().SetSort(bson.D{{Key: "sent_at", Value: 1}})
	err = s.MessageColl.FindOne(context.Background(), filter, opts).Decode(&message)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil // No unread messages
		}
		return nil, errors.New("failed to get first unread message")
	}

	return &message, nil
}

// GetUnreadCountForChatroom gets unread message count for a specific chatroom for a user
func (s *MessageReadStatusService) GetUnreadCountForChatroom(chatroomID primitive.ObjectID, userID uint) (int64, error) {
	count, err := s.ReadStatusColl.CountDocuments(context.Background(), bson.M{
		"chatroom_id":  chatroomID,
		"recipient_id": userID,
		"is_read":      false,
	})

	if err != nil {
		return 0, errors.New("failed to get unread count")
	}

	return count, nil
}
