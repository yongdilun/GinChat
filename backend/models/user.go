package models

import (
	"time"

	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	UserID      uint       `gorm:"primaryKey;autoIncrement" json:"user_id"`
	Username    string     `gorm:"size:50;not null;unique" json:"username"`
	Email       string     `gorm:"size:100;not null;unique" json:"email"`
	Password    string     `gorm:"size:255;not null" json:"-"` // Password is not exposed in JSON
	Role        string     `gorm:"size:50;default:member" json:"role"`
	IsLogin     bool       `gorm:"default:false" json:"is_login"`
	LastLoginAt *time.Time `json:"last_login_at"`
	Heartbeat   *time.Time `json:"heartbeat"`
	Status      string     `gorm:"type:enum('online','offline','away');default:'offline'" json:"status"`
	AvatarURL   string     `gorm:"size:255" json:"avatar_url"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// BeforeCreate is a GORM hook that sets the timestamps before creating a record
func (u *User) BeforeCreate(tx *gorm.DB) error {
	now := time.Now()
	if u.CreatedAt.IsZero() {
		u.CreatedAt = now
	}
	if u.UpdatedAt.IsZero() {
		u.UpdatedAt = now
	}
	return nil
}

// BeforeUpdate is a GORM hook that sets the updated_at timestamp before updating a record
func (u *User) BeforeUpdate(tx *gorm.DB) error {
	u.UpdatedAt = time.Now()
	return nil
}

// TableName specifies the table name for the User model
func (User) TableName() string {
	return "users"
}

// UserResponse is a struct for returning user data without sensitive information
type UserResponse struct {
	UserID    uint      `json:"user_id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	AvatarURL string    `json:"avatar_url"`
	CreatedAt time.Time `json:"created_at"`
}
