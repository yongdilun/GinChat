package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Chatroom represents a chat room in the system
type Chatroom struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"name" json:"name"`
	CreatedBy uint               `bson:"created_by" json:"created_by"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	Members   []ChatroomMember   `bson:"members" json:"members"`
}

// ChatroomResponse is a struct for returning chatroom data
type ChatroomResponse struct {
	ID        string           `json:"id" example:"60d5f8b8e6b5f0b3e8b4b5b3"` // The unique identifier of the chatroom
	Name      string           `json:"name" example:"General Chat"`           // The name of the chatroom
	CreatedBy uint             `json:"created_by" example:"1"`                // The ID of the user who created the chatroom
	CreatedAt time.Time        `json:"created_at"`                            // The timestamp when the chatroom was created
	Members   []ChatroomMember `json:"members"`                               // The list of members in the chatroom
}

// ToResponse converts a Chatroom to a ChatroomResponse
func (c *Chatroom) ToResponse() ChatroomResponse {
	return ChatroomResponse{
		ID:        c.ID.Hex(),
		Name:      c.Name,
		CreatedBy: c.CreatedBy,
		CreatedAt: c.CreatedAt,
		Members:   c.Members,
	}
}
