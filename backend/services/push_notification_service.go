package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/ginchat/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"gorm.io/gorm"
)

// PushNotificationService handles push notification operations
type PushNotificationService struct {
	db      *gorm.DB
	mongodb *mongo.Database
}

// ExpoMessage represents the structure for Expo push notifications
type ExpoMessage struct {
	To       []string               `json:"to"`
	Title    string                 `json:"title"`
	Body     string                 `json:"body"`
	Data     map[string]interface{} `json:"data,omitempty"`
	Sound    string                 `json:"sound,omitempty"`
	Badge    *int                   `json:"badge,omitempty"`
	Priority string                 `json:"priority,omitempty"`
}

// ExpoResponse represents the response from Expo push API
type ExpoResponse struct {
	Data []struct {
		Status  string `json:"status"`
		ID      string `json:"id,omitempty"`
		Message string `json:"message,omitempty"`
		Details struct {
			Error string `json:"error,omitempty"`
		} `json:"details,omitempty"`
	} `json:"data"`
}

// NewPushNotificationService creates a new PushNotificationService
func NewPushNotificationService(db *gorm.DB, mongodb *mongo.Database) *PushNotificationService {
	return &PushNotificationService{
		db:      db,
		mongodb: mongodb,
	}
}

// SendMessageNotification sends a push notification for a new message
func (s *PushNotificationService) SendMessageNotification(
	chatroomID string,
	senderID uint,
	senderName string,
	messageContent string,
	chatroomName string,
) error {
	// Convert chatroomID string to ObjectID
	objID, err := primitive.ObjectIDFromHex(chatroomID)
	if err != nil {
		return fmt.Errorf("invalid chatroom ID: %w", err)
	}

	// Get chatroom from MongoDB to get members
	var chatroom models.Chatroom
	err = s.mongodb.Collection("chatrooms").FindOne(context.Background(), bson.M{"_id": objID}).Decode(&chatroom)
	if err != nil {
		return fmt.Errorf("failed to get chatroom: %w", err)
	}

	// Get all members except the sender
	var userIDs []uint
	for _, member := range chatroom.Members {
		if member.UserID != senderID {
			userIDs = append(userIDs, member.UserID)
		}
	}

	if len(userIDs) == 0 {
		return nil // No members to notify
	}

	// Get active push tokens for these users
	var pushTokens []models.PushToken
	if err := s.db.Where("user_id IN ? AND is_active = ?", userIDs, true).Find(&pushTokens).Error; err != nil {
		return fmt.Errorf("failed to get push tokens: %w", err)
	}

	if len(pushTokens) == 0 {
		log.Printf("No active push tokens found for chatroom %s", chatroomID)
		return nil // No active push tokens
	}

	// Prepare tokens
	var tokens []string
	for _, token := range pushTokens {
		tokens = append(tokens, token.Token)
	}

	// Prepare notification content
	title := fmt.Sprintf("New message in %s", chatroomName)
	body := fmt.Sprintf("%s: %s", senderName, messageContent)

	// Truncate body if too long
	if len(body) > 100 {
		body = body[:97] + "..."
	}

	// Send notification
	log.Printf("Sending push notification to %d tokens for chatroom %s", len(tokens), chatroomID)
	return s.sendExpoNotification(tokens, title, body, map[string]interface{}{
		"chatroomId": chatroomID,
		"senderId":   senderID,
		"type":       "new_message",
	})
}

// sendExpoNotification sends notification via Expo Push API
func (s *PushNotificationService) sendExpoNotification(
	tokens []string,
	title string,
	body string,
	data map[string]interface{},
) error {
	message := ExpoMessage{
		To:       tokens,
		Title:    title,
		Body:     body,
		Data:     data,
		Sound:    "default",
		Priority: "high",
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}

	resp, err := http.Post(
		"https://exp.host/--/api/v2/push/send",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return fmt.Errorf("failed to send notification: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("expo push API returned status %d", resp.StatusCode)
	}

	// Parse response to check for errors
	var expoResp ExpoResponse
	if err := json.NewDecoder(resp.Body).Decode(&expoResp); err != nil {
		log.Printf("Warning: Failed to parse Expo response: %v", err)
		return nil // Don't fail if we can't parse response
	}

	// Log any errors from Expo
	for _, result := range expoResp.Data {
		if result.Status == "error" {
			log.Printf("Expo push error: %s - %s", result.Message, result.Details.Error)
		}
	}

	log.Printf("Successfully sent push notification to %d tokens", len(tokens))
	return nil
}
