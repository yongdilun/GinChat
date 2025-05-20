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

// ChatroomService handles business logic related to chatrooms
type ChatroomService struct {
	MongoDB  *mongo.Database
	ChatColl *mongo.Collection
}

// NewChatroomService creates a new ChatroomService
func NewChatroomService(mongodb *mongo.Database) *ChatroomService {
	return &ChatroomService{
		MongoDB:  mongodb,
		ChatColl: mongodb.Collection("chatrooms"),
	}
}

// CreateChatroom creates a new chatroom
func (s *ChatroomService) CreateChatroom(name string, userID uint, username string) (*models.Chatroom, error) {
	// Check if chatroom with the same name already exists
	count, err := s.ChatColl.CountDocuments(context.Background(), bson.M{"name": name}, options.Count())
	if err != nil {
		return nil, errors.New("failed to check chatroom existence")
	}
	if count > 0 {
		return nil, errors.New("chatroom with this name already exists")
	}

	// Create new chatroom
	chatroom := models.Chatroom{
		ID:        primitive.NewObjectID(),
		Name:      name,
		CreatedBy: userID,
		CreatedAt: time.Now(),
		Members: []models.ChatroomMember{
			{
				UserID:   userID,
				Username: username,
				JoinedAt: time.Now(),
			},
		},
	}

	// Save chatroom to MongoDB
	_, err = s.ChatColl.InsertOne(context.Background(), chatroom)
	if err != nil {
		return nil, errors.New("failed to create chatroom")
	}

	return &chatroom, nil
}

// GetChatrooms retrieves all chatrooms
func (s *ChatroomService) GetChatrooms() ([]models.Chatroom, error) {
	// Find all chatrooms
	cursor, err := s.ChatColl.Find(context.Background(), bson.M{})
	if err != nil {
		return nil, errors.New("failed to get chatrooms")
	}
	defer cursor.Close(context.Background())

	// Decode chatrooms
	var chatrooms []models.Chatroom
	if err := cursor.All(context.Background(), &chatrooms); err != nil {
		return nil, errors.New("failed to decode chatrooms")
	}

	return chatrooms, nil
}

// GetChatroomByID retrieves a chatroom by ID
func (s *ChatroomService) GetChatroomByID(chatroomID primitive.ObjectID) (*models.Chatroom, error) {
	var chatroom models.Chatroom
	err := s.ChatColl.FindOne(context.Background(), bson.M{"_id": chatroomID}).Decode(&chatroom)
	if err != nil {
		return nil, errors.New("chatroom not found")
	}
	return &chatroom, nil
}

// JoinChatroom adds a user to a chatroom
func (s *ChatroomService) JoinChatroom(chatroomID primitive.ObjectID, userID uint, username string) error {
	// Check if chatroom exists
	chatroom, err := s.GetChatroomByID(chatroomID)
	if err != nil {
		return err
	}

	// Check if user is already a member
	for _, member := range chatroom.Members {
		if member.UserID == userID {
			return errors.New("user is already a member of this chatroom")
		}
	}

	// Add user to chatroom members
	_, err = s.ChatColl.UpdateOne(
		context.Background(),
		bson.M{"_id": chatroomID},
		bson.M{
			"$push": bson.M{
				"members": models.ChatroomMember{
					UserID:   userID,
					Username: username,
					JoinedAt: time.Now(),
				},
			},
		},
	)
	if err != nil {
		return errors.New("failed to join chatroom")
	}

	return nil
}

// LeaveChatroom removes a user from a chatroom
func (s *ChatroomService) LeaveChatroom(chatroomID primitive.ObjectID, userID uint) error {
	// Check if chatroom exists
	chatroom, err := s.GetChatroomByID(chatroomID)
	if err != nil {
		return err
	}

	// Check if user is a member
	isMember := false
	for _, member := range chatroom.Members {
		if member.UserID == userID {
			isMember = true
			break
		}
	}
	if !isMember {
		return errors.New("user is not a member of this chatroom")
	}

	// Remove user from chatroom members
	_, err = s.ChatColl.UpdateOne(
		context.Background(),
		bson.M{"_id": chatroomID},
		bson.M{
			"$pull": bson.M{
				"members": bson.M{"user_id": userID},
			},
		},
	)
	if err != nil {
		return errors.New("failed to leave chatroom")
	}

	return nil
}

// IsMember checks if a user is a member of a chatroom
func (s *ChatroomService) IsMember(chatroom *models.Chatroom, userID uint) bool {
	for _, member := range chatroom.Members {
		if member.UserID == userID {
			return true
		}
	}
	return false
}
