package services

import (
	"context"
	"errors"
	"math/rand"
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

// generateRoomCode generates a unique 6-character room code
func (s *ChatroomService) generateRoomCode() (string, error) {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const codeLength = 6

	for attempts := 0; attempts < 10; attempts++ {
		// Generate random code
		code := make([]byte, codeLength)
		for i := range code {
			code[i] = charset[rand.Intn(len(charset))]
		}
		roomCode := string(code)

		// Check if code already exists
		count, err := s.ChatColl.CountDocuments(context.Background(), bson.M{"room_code": roomCode})
		if err != nil {
			return "", err
		}

		if count == 0 {
			return roomCode, nil
		}
	}

	return "", errors.New("failed to generate unique room code after 10 attempts")
}

// CreateChatroom creates a new chatroom
func (s *ChatroomService) CreateChatroom(name string, userID uint, username string, password string) (*models.Chatroom, error) {
	// Check if chatroom with the same name already exists
	count, err := s.ChatColl.CountDocuments(context.Background(), bson.M{"name": name}, options.Count())
	if err != nil {
		return nil, errors.New("failed to check chatroom existence")
	}
	if count > 0 {
		return nil, errors.New("chatroom with this name already exists")
	}

	// Generate unique room code
	roomCode, err := s.generateRoomCode()
	if err != nil {
		return nil, errors.New("failed to generate room code")
	}

	// Create new chatroom
	chatroom := models.Chatroom{
		ID:        primitive.NewObjectID(),
		Name:      name,
		RoomCode:  roomCode,
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

	// Set password if provided
	err = chatroom.SetPassword(password)
	if err != nil {
		return nil, errors.New("failed to set password")
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

// GetUserChatrooms retrieves chatrooms that a user has joined
func (s *ChatroomService) GetUserChatrooms(userID uint) ([]models.Chatroom, error) {
	// Find chatrooms where the user is a member
	filter := bson.M{
		"members.user_id": userID,
	}

	cursor, err := s.ChatColl.Find(context.Background(), filter)
	if err != nil {
		return nil, errors.New("failed to get user chatrooms")
	}
	defer cursor.Close(context.Background())

	// Decode chatrooms
	var chatrooms []models.Chatroom
	if err := cursor.All(context.Background(), &chatrooms); err != nil {
		return nil, errors.New("failed to decode user chatrooms")
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

// GetChatroomByRoomCode retrieves a chatroom by room code
func (s *ChatroomService) GetChatroomByRoomCode(roomCode string) (*models.Chatroom, error) {
	var chatroom models.Chatroom
	err := s.ChatColl.FindOne(context.Background(), bson.M{"room_code": roomCode}).Decode(&chatroom)
	if err != nil {
		return nil, errors.New("chatroom not found")
	}
	return &chatroom, nil
}

// JoinChatroom adds a user to a chatroom (legacy method using ID)
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

// JoinChatroomByCode adds a user to a chatroom using room code and password
func (s *ChatroomService) JoinChatroomByCode(roomCode string, password string, userID uint, username string) (*models.Chatroom, error) {
	// Find chatroom by room code
	chatroom, err := s.GetChatroomByRoomCode(roomCode)
	if err != nil {
		return nil, errors.New("room not found")
	}

	// Check password if required
	if !chatroom.CheckPassword(password) {
		return nil, errors.New("incorrect password")
	}

	// Check if user is already a member
	for _, member := range chatroom.Members {
		if member.UserID == userID {
			return nil, errors.New("user is already a member of this chatroom")
		}
	}

	// Add user to chatroom members
	_, err = s.ChatColl.UpdateOne(
		context.Background(),
		bson.M{"_id": chatroom.ID},
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
		return nil, errors.New("failed to join chatroom")
	}

	// Return updated chatroom
	return s.GetChatroomByID(chatroom.ID)
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

// DeleteChatroom deletes a chatroom and all its messages (only creator can delete)
func (s *ChatroomService) DeleteChatroom(chatroomID primitive.ObjectID, userID uint, messageService *MessageService) error {
	// Check if chatroom exists
	chatroom, err := s.GetChatroomByID(chatroomID)
	if err != nil {
		return err
	}

	// Check if the user is the creator of the chatroom
	if chatroom.CreatedBy != userID {
		return errors.New("only the creator can delete this chatroom")
	}

	// Delete all messages in the chatroom (including media)
	if messageService != nil {
		err = messageService.DeleteAllMessagesInChatroom(chatroomID)
		if err != nil {
			return errors.New("failed to delete chatroom messages")
		}
	}

	// Delete the chatroom
	_, err = s.ChatColl.DeleteOne(context.Background(), bson.M{"_id": chatroomID})
	if err != nil {
		return errors.New("failed to delete chatroom")
	}

	return nil
}
