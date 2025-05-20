package services

import (
	"context"
	"errors"
	"time"

	"github.com/ginchat/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// MessageService handles business logic related to messages
type MessageService struct {
	MongoDB  *mongo.Database
	MsgColl  *mongo.Collection
	ChatSvc  *ChatroomService
}

// NewMessageService creates a new MessageService
func NewMessageService(mongodb *mongo.Database, chatroomService *ChatroomService) *MessageService {
	return &MessageService{
		MongoDB:  mongodb,
		MsgColl:  mongodb.Collection("messages"),
		ChatSvc:  chatroomService,
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
	}

	// Save message to MongoDB
	_, err = s.MsgColl.InsertOne(context.Background(), message)
	if err != nil {
		return nil, errors.New("failed to send message")
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

// DeleteMessage deletes a message
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

	// Delete the message
	_, err = s.MsgColl.DeleteOne(context.Background(), bson.M{"_id": messageID})
	if err != nil {
		return errors.New("failed to delete message")
	}

	return nil
}

// EditMessage edits a message
func (s *MessageService) EditMessage(messageID primitive.ObjectID, userID uint, textContent string) (*models.Message, error) {
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

	// Update the message
	_, err = s.MsgColl.UpdateOne(
		context.Background(),
		bson.M{"_id": messageID},
		bson.M{
			"$set": bson.M{
				"text_content": textContent,
				"edited":       true,
				"edited_at":    time.Now(),
			},
		},
	)
	if err != nil {
		return nil, errors.New("failed to edit message")
	}

	// Get the updated message
	err = s.MsgColl.FindOne(context.Background(), bson.M{"_id": messageID}).Decode(&message)
	if err != nil {
		return nil, errors.New("failed to get updated message")
	}

	return &message, nil
}
