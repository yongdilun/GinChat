package models

import (
	"time"
)

// ChatroomMember represents a user in a chatroom
type ChatroomMember struct {
	UserID   uint      `bson:"user_id" json:"user_id" example:"1"`         // The ID of the user
	Username string    `bson:"username" json:"username" example:"johndoe"` // The username of the user
	JoinedAt time.Time `bson:"joined_at" json:"joined_at"`                 // The timestamp when the user joined the chatroom
}
