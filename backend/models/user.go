package models

import (
	"database/sql/driver"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// CustomTime is a custom time type that handles different database formats
type CustomTime struct {
	time.Time
}

// Scan implements the sql.Scanner interface
func (ct *CustomTime) Scan(value interface{}) error {
	if value == nil {
		ct.Time = time.Time{}
		return nil
	}

	switch v := value.(type) {
	case time.Time:
		ct.Time = v
		return nil
	case []byte:
		parsedTime, err := time.Parse("2006-01-02 15:04:05", string(v))
		if err != nil {
			// Try other formats if standard format fails
			parsedTime, err = time.Parse(time.RFC3339, string(v))
			if err != nil {
				return fmt.Errorf("cannot parse []byte to time: %v", err)
			}
		}
		ct.Time = parsedTime
		return nil
	case string:
		parsedTime, err := time.Parse("2006-01-02 15:04:05", v)
		if err != nil {
			// Try other formats if standard format fails
			parsedTime, err = time.Parse(time.RFC3339, v)
			if err != nil {
				return fmt.Errorf("cannot parse string to time: %v", err)
			}
		}
		ct.Time = parsedTime
		return nil
	default:
		return fmt.Errorf("cannot convert %T to time.Time", value)
	}
}

// Value implements the driver.Valuer interface
func (ct CustomTime) Value() (driver.Value, error) {
	if ct.Time.IsZero() {
		return nil, nil
	}
	return ct.Time, nil
}

// User represents a user in the system
type User struct {
	UserID      uint        `gorm:"primaryKey;autoIncrement" json:"user_id"`
	Username    string      `gorm:"size:50;not null;unique" json:"username"`
	Email       string      `gorm:"size:100;not null;unique" json:"email"`
	Password    string      `gorm:"size:255;not null" json:"-"` // Password is not exposed in JSON
	Role        string      `gorm:"size:50;default:member" json:"role"`
	IsLogin     bool        `gorm:"default:false" json:"is_login"`
	LastLoginAt *CustomTime `json:"last_login_at"`
	Heartbeat   *CustomTime `json:"heartbeat"`
	Status      string      `gorm:"type:enum('online','offline','away');default:'offline'" json:"status"`
	AvatarURL   string      `gorm:"size:255" json:"avatar_url"`
	CreatedAt   CustomTime  `json:"created_at"`
	UpdatedAt   CustomTime  `json:"updated_at"`
}

// BeforeCreate is a GORM hook that sets the timestamps before creating a record
func (u *User) BeforeCreate(tx *gorm.DB) error {
	now := CustomTime{Time: time.Now()}
	if u.CreatedAt.Time.IsZero() {
		u.CreatedAt = now
	}
	if u.UpdatedAt.Time.IsZero() {
		u.UpdatedAt = now
	}
	return nil
}

// BeforeUpdate is a GORM hook that sets the updated_at timestamp before updating a record
func (u *User) BeforeUpdate(tx *gorm.DB) error {
	u.UpdatedAt = CustomTime{Time: time.Now()}
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
