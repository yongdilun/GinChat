package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MessageReadStatus represents the read status of a message for a specific user
type MessageReadStatus struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	MessageID  primitive.ObjectID `bson:"message_id" json:"message_id"`     // Reference to the message
	ChatroomID primitive.ObjectID `bson:"chatroom_id" json:"chatroom_id"`   // Reference to the chatroom
	SenderID   uint               `bson:"sender_id" json:"sender_id"`       // ID of the message sender
	RecipientID uint              `bson:"recipient_id" json:"recipient_id"` // ID of the user who should read the message
	IsRead     bool               `bson:"is_read" json:"is_read"`           // Whether the message has been read
	ReadAt     *time.Time         `bson:"read_at,omitempty" json:"read_at,omitempty"` // Timestamp when the message was read (nil if not read)
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`     // Timestamp when the read status was created
}

// MessageReadStatusResponse is a struct for returning message read status data
type MessageReadStatusResponse struct {
	ID          string     `json:"id" example:"60d5f8b8e6b5f0b3e8b4b5b3"`
	MessageID   string     `json:"message_id" example:"60d5f8b8e6b5f0b3e8b4b5b4"`
	ChatroomID  string     `json:"chatroom_id" example:"60d5f8b8e6b5f0b3e8b4b5b5"`
	SenderID    uint       `json:"sender_id" example:"1"`
	RecipientID uint       `json:"recipient_id" example:"2"`
	IsRead      bool       `json:"is_read" example:"true"`
	ReadAt      *time.Time `json:"read_at,omitempty" example:"2023-01-01T12:05:00Z"`
	CreatedAt   time.Time  `json:"created_at" example:"2023-01-01T12:00:00Z"`
}

// ToResponse converts a MessageReadStatus to a MessageReadStatusResponse
func (mrs *MessageReadStatus) ToResponse() MessageReadStatusResponse {
	return MessageReadStatusResponse{
		ID:          mrs.ID.Hex(),
		MessageID:   mrs.MessageID.Hex(),
		ChatroomID:  mrs.ChatroomID.Hex(),
		SenderID:    mrs.SenderID,
		RecipientID: mrs.RecipientID,
		IsRead:      mrs.IsRead,
		ReadAt:      mrs.ReadAt,
		CreatedAt:   mrs.CreatedAt,
	}
}

// UserLastRead represents the last read message for a user in a chatroom
type UserLastRead struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ChatroomID primitive.ObjectID `bson:"chatroom_id" json:"chatroom_id"`   // Reference to the chatroom
	UserID     uint               `bson:"user_id" json:"user_id"`           // ID of the user
	MessageID  primitive.ObjectID `bson:"message_id" json:"message_id"`     // ID of the last read message
	ReadAt     time.Time          `bson:"read_at" json:"read_at"`           // Timestamp when the message was read
	UpdatedAt  time.Time          `bson:"updated_at" json:"updated_at"`     // Timestamp when this record was last updated
}

// UserLastReadResponse is a struct for returning user last read data
type UserLastReadResponse struct {
	ID         string    `json:"id" example:"60d5f8b8e6b5f0b3e8b4b5b3"`
	ChatroomID string    `json:"chatroom_id" example:"60d5f8b8e6b5f0b3e8b4b5b4"`
	UserID     uint      `json:"user_id" example:"1"`
	MessageID  string    `json:"message_id" example:"60d5f8b8e6b5f0b3e8b4b5b5"`
	ReadAt     time.Time `json:"read_at" example:"2023-01-01T12:05:00Z"`
	UpdatedAt  time.Time `json:"updated_at" example:"2023-01-01T12:05:00Z"`
}

// ToResponse converts a UserLastRead to a UserLastReadResponse
func (ulr *UserLastRead) ToResponse() UserLastReadResponse {
	return UserLastReadResponse{
		ID:         ulr.ID.Hex(),
		ChatroomID: ulr.ChatroomID.Hex(),
		UserID:     ulr.UserID,
		MessageID:  ulr.MessageID.Hex(),
		ReadAt:     ulr.ReadAt,
		UpdatedAt:  ulr.UpdatedAt,
	}
}

// ChatroomUnreadCount represents unread message count for a user in a chatroom
type ChatroomUnreadCount struct {
	ChatroomID   string `json:"chatroom_id" example:"60d5f8b8e6b5f0b3e8b4b5b4"`
	ChatroomName string `json:"chatroom_name" example:"General Chat"`
	UnreadCount  int64  `json:"unread_count" example:"5"`
}

// LatestChatMessage represents the latest message in a chatroom
type LatestChatMessage struct {
	ChatroomID   string     `json:"chatroom_id" example:"60d5f8b8e6b5f0b3e8b4b5b4"`
	ChatroomName string     `json:"chatroom_name" example:"General Chat"`
	MessageID    string     `json:"message_id" example:"60d5f8b8e6b5f0b3e8b4b5b5"`
	SenderName   string     `json:"sender_name" example:"johndoe"`
	MessageType  string     `json:"message_type" example:"text"`
	TextContent  string     `json:"text_content,omitempty" example:"Hello, how are you?"`
	MediaURL     string     `json:"media_url,omitempty" example:"https://example.com/image.jpg"`
	SentAt       time.Time  `json:"sent_at" example:"2023-01-01T12:00:00Z"`
	ReadStatus   []ReadInfo `json:"read_status"` // Read status for each member
}

// ReadInfo represents read information for a specific user
type ReadInfo struct {
	UserID   uint       `json:"user_id" example:"1"`
	Username string     `json:"username" example:"johndoe"`
	IsRead   bool       `json:"is_read" example:"true"`
	ReadAt   *time.Time `json:"read_at,omitempty" example:"2023-01-01T12:05:00Z"`
}
