package models

import (
	"time"
)

// ChatroomMember represents a user in a chatroom
type ChatroomMember struct {
	UserID   uint      `bson:"user_id" json:"user_id"`
	Username string    `bson:"username" json:"username"`
	JoinedAt time.Time `bson:"joined_at" json:"joined_at"`
}
