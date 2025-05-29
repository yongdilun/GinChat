package models

import (
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// PushToken represents a push notification token for a user
type PushToken struct {
	ID         uint            `json:"id" gorm:"primaryKey"`
	UserID     uint            `json:"user_id" gorm:"not null;index;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Token      string          `json:"token" gorm:"not null;unique;size:1000"`
	Platform   string          `json:"platform" gorm:"not null;size:20"`
	DeviceInfo json.RawMessage `json:"device_info" gorm:"type:json"`
	IsActive   bool            `json:"is_active" gorm:"default:true;index"`
	CreatedAt  time.Time       `json:"created_at"`
	UpdatedAt  time.Time       `json:"updated_at"`
}

// DeviceInfo represents device information for push tokens
type DeviceInfo struct {
	DeviceType  string `json:"device_type"`
	AppVersion  string `json:"app_version"`
	OSVersion   string `json:"os_version,omitempty"`
	DeviceModel string `json:"device_model,omitempty"`
}

// BeforeCreate is a GORM hook that sets the timestamps before creating a record
func (pt *PushToken) BeforeCreate(tx *gorm.DB) error {
	now := time.Now()
	if pt.CreatedAt.IsZero() {
		pt.CreatedAt = now
	}
	if pt.UpdatedAt.IsZero() {
		pt.UpdatedAt = now
	}
	return nil
}

// BeforeUpdate is a GORM hook that sets the updated_at timestamp before updating a record
func (pt *PushToken) BeforeUpdate(tx *gorm.DB) error {
	pt.UpdatedAt = time.Now()
	return nil
}

// TableName specifies the table name for the PushToken model
func (PushToken) TableName() string {
	return "push_tokens"
}

// ValidateToken validates the push token format
func (pt *PushToken) ValidateToken() error {
	if len(pt.Token) < 50 || len(pt.Token) > 1000 {
		return fmt.Errorf("token length must be between 50 and 1000 characters")
	}
	return nil
}
