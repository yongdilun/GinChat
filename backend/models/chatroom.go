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
	ID        string           `json:"id"`
	Name      string           `json:"name"`
	CreatedBy uint             `json:"created_by"`
	CreatedAt time.Time        `json:"created_at"`
	Members   []ChatroomMember `json:"members"`
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
