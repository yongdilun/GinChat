package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Message represents a message in a chatroom
type Message struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ChatroomID  primitive.ObjectID `bson:"chatroom_id" json:"chatroom_id"`
	SenderID    uint               `bson:"sender_id" json:"sender_id"`
	SenderName  string             `bson:"sender_name" json:"sender_name"`
	MessageType string             `bson:"message_type" json:"message_type"` // text, picture, audio, video, etc.
	TextContent string             `bson:"text_content,omitempty" json:"text_content,omitempty"`
	MediaURL    string             `bson:"media_url,omitempty" json:"media_url,omitempty"`
	SentAt      time.Time          `bson:"sent_at" json:"sent_at"`
}

// MessageResponse is a struct for returning message data
type MessageResponse struct {
	ID          string    `json:"id"`
	ChatroomID  string    `json:"chatroom_id"`
	SenderID    uint      `json:"sender_id"`
	SenderName  string    `json:"sender_name"`
	MessageType string    `json:"message_type"`
	TextContent string    `json:"text_content,omitempty"`
	MediaURL    string    `json:"media_url,omitempty"`
	SentAt      time.Time `json:"sent_at"`
}

// ToResponse converts a Message to a MessageResponse
func (m *Message) ToResponse() MessageResponse {
	return MessageResponse{
		ID:          m.ID.Hex(),
		ChatroomID:  m.ChatroomID.Hex(),
		SenderID:    m.SenderID,
		SenderName:  m.SenderName,
		MessageType: m.MessageType,
		TextContent: m.TextContent,
		MediaURL:    m.MediaURL,
		SentAt:      m.SentAt,
	}
}
