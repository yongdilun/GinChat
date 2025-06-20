package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Chatroom represents a chat room in the system
type Chatroom struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name"`
	RoomCode    string             `bson:"room_code" json:"room_code"`
	Password    string             `bson:"password,omitempty" json:"-"` // Don't include in JSON response
	HasPassword bool               `bson:"has_password" json:"has_password"`
	CreatedBy   uint               `bson:"created_by" json:"created_by"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	Members     []ChatroomMember   `bson:"members" json:"members"`
}

// ChatroomResponse is a struct for returning chatroom data
type ChatroomResponse struct {
	ID          string           `json:"id" example:"60d5f8b8e6b5f0b3e8b4b5b3"` // The unique identifier of the chatroom
	Name        string           `json:"name" example:"General Chat"`           // The name of the chatroom
	RoomCode    string           `json:"room_code" example:"ABC123"`            // The room code for joining
	HasPassword bool             `json:"has_password" example:"true"`           // Whether the room has a password
	CreatedBy   uint             `json:"created_by" example:"1"`                // The ID of the user who created the chatroom
	CreatedAt   time.Time        `json:"created_at"`                            // The timestamp when the chatroom was created
	Members     []ChatroomMember `json:"members"`                               // The list of members in the chatroom
}

// ToResponse converts a Chatroom to a ChatroomResponse
func (c *Chatroom) ToResponse() ChatroomResponse {
	return ChatroomResponse{
		ID:          c.ID.Hex(),
		Name:        c.Name,
		RoomCode:    c.RoomCode,
		HasPassword: c.HasPassword,
		CreatedBy:   c.CreatedBy,
		CreatedAt:   c.CreatedAt,
		Members:     c.Members,
	}
}

// SetPassword hashes and sets the password for the chatroom
func (c *Chatroom) SetPassword(password string) error {
	if password == "" {
		c.Password = ""
		c.HasPassword = false
		return nil
	}

	// We'll use a simple approach for now - in production you'd want bcrypt
	c.Password = password // For now, store plaintext - will improve later
	c.HasPassword = true
	return nil
}

// CheckPassword verifies if the provided password matches the chatroom password
func (c *Chatroom) CheckPassword(password string) bool {
	if !c.HasPassword {
		return true // No password required
	}
	return c.Password == password // Simple comparison for now
}

// ChatroomWithLatestMessage represents a chatroom with its latest message for efficient sorting
type ChatroomWithLatestMessage struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name          string             `bson:"name" json:"name"`
	RoomCode      string             `bson:"room_code" json:"room_code"`
	HasPassword   bool               `bson:"has_password" json:"has_password"`
	CreatedBy     uint               `bson:"created_by" json:"created_by"`
	CreatedAt     time.Time          `bson:"created_at" json:"created_at"`
	Members       []ChatroomMember   `bson:"members" json:"members"`
	LatestMessage *Message           `bson:"latest_message,omitempty" json:"latest_message,omitempty"`
}

// ChatroomWithLatestMessageResponse is the response format for sorted chatrooms
type ChatroomWithLatestMessageResponse struct {
	ID            string             `json:"id"`
	Name          string             `json:"name"`
	RoomCode      string             `json:"room_code"`
	HasPassword   bool               `json:"has_password"`
	CreatedBy     uint               `json:"created_by"`
	CreatedAt     time.Time          `json:"created_at"`
	Members       []ChatroomMember   `json:"members"`
	LatestMessage *LatestMessageInfo `json:"last_message,omitempty"`
}

// LatestMessageInfo contains simplified latest message information
type LatestMessageInfo struct {
	Content    string    `json:"content"`
	Timestamp  time.Time `json:"timestamp"`
	SenderID   uint      `json:"sender_id"`
	SenderName string    `json:"sender_name"`
}

// ToResponse converts ChatroomWithLatestMessage to response format
func (c *ChatroomWithLatestMessage) ToResponse() ChatroomWithLatestMessageResponse {
	response := ChatroomWithLatestMessageResponse{
		ID:          c.ID.Hex(),
		Name:        c.Name,
		RoomCode:    c.RoomCode,
		HasPassword: c.HasPassword,
		CreatedBy:   c.CreatedBy,
		CreatedAt:   c.CreatedAt,
		Members:     c.Members,
	}

	// Add latest message info if available
	if c.LatestMessage != nil {
		content := c.LatestMessage.TextContent
		if content == "" && c.LatestMessage.MediaURL != "" {
			// Show media type if no text content
			switch c.LatestMessage.MessageType {
			case "picture", "text_and_picture":
				content = "[Image]"
			case "video", "text_and_video":
				content = "[Video]"
			case "audio", "text_and_audio":
				content = "[Audio]"
			default:
				content = "[Media]"
			}
		}
		if content == "" {
			content = "New message"
		}

		response.LatestMessage = &LatestMessageInfo{
			Content:    content,
			Timestamp:  c.LatestMessage.SentAt,
			SenderID:   c.LatestMessage.SenderID,
			SenderName: c.LatestMessage.SenderName,
		}
	}

	return response
}
