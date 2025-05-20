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
	MessageType string             `bson:"message_type" json:"message_type" example:"text" enums:"text,picture,audio,video,text_and_picture,text_and_audio,text_and_video"` // Type of message: text, picture, audio, video, text_and_picture, text_and_audio, text_and_video
	TextContent string             `bson:"text_content,omitempty" json:"text_content,omitempty" example:"Hello, how are you?"`                                              // Text content of the message
	MediaURL    string             `bson:"media_url,omitempty" json:"media_url,omitempty" example:"https://example.com/image.jpg"`                                          // URL of the media
	SentAt      time.Time          `bson:"sent_at" json:"sent_at"`                                                                                                          // Timestamp when the message was sent
}

// MessageResponse is a struct for returning message data
type MessageResponse struct {
	ID          string    `json:"id" example:"60d5f8b8e6b5f0b3e8b4b5b3"`                                                                       // Unique identifier of the message
	ChatroomID  string    `json:"chatroom_id" example:"60d5f8b8e6b5f0b3e8b4b5b4"`                                                              // ID of the chatroom where the message was sent
	SenderID    uint      `json:"sender_id" example:"1"`                                                                                       // ID of the user who sent the message
	SenderName  string    `json:"sender_name" example:"johndoe"`                                                                               // Username of the sender
	MessageType string    `json:"message_type" example:"text" enums:"text,picture,audio,video,text_and_picture,text_and_audio,text_and_video"` // Type of message
	TextContent string    `json:"text_content,omitempty" example:"Hello, how are you?"`                                                        // Text content of the message
	MediaURL    string    `json:"media_url,omitempty" example:"https://example.com/image.jpg"`                                                 // URL of the media
	SentAt      time.Time `json:"sent_at" example:"2023-01-01T12:00:00Z"`                                                                      // Timestamp when the message was sent
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
