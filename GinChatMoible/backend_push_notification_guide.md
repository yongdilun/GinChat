# Backend Push Notification Implementation Guide

## 1. Database Schema

Add a new table for storing push tokens:

```sql
CREATE TABLE push_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    platform ENUM('ios', 'android', 'web') NOT NULL,
    device_info JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token (token),
    INDEX idx_active (is_active)
);
```

## 2. Go Struct for Push Token

```go
// models/push_token.go
package models

import (
    "time"
    "encoding/json"
)

type PushToken struct {
    ID         uint            `json:"id" gorm:"primaryKey"`
    UserID     uint            `json:"user_id" gorm:"not null;index"`
    Token      string          `json:"token" gorm:"not null;unique;size:255"`
    Platform   string          `json:"platform" gorm:"not null;type:enum('ios','android','web')"`
    DeviceInfo json.RawMessage `json:"device_info" gorm:"type:json"`
    IsActive   bool            `json:"is_active" gorm:"default:true;index"`
    CreatedAt  time.Time       `json:"created_at"`
    UpdatedAt  time.Time       `json:"updated_at"`
    
    // Associations
    User User `json:"user" gorm:"foreignKey:UserID"`
}

type DeviceInfo struct {
    DeviceType  string `json:"device_type"`
    AppVersion  string `json:"app_version"`
    OSVersion   string `json:"os_version,omitempty"`
    DeviceModel string `json:"device_model,omitempty"`
}
```

## 3. Push Token Handlers

```go
// handlers/push_token.go
package handlers

import (
    "net/http"
    "encoding/json"
    "your-app/models"
    "your-app/services"
    
    "github.com/gin-gonic/gin"
)

type PushTokenRequest struct {
    Token      string                 `json:"token" binding:"required"`
    Platform   string                 `json:"platform" binding:"required"`
    DeviceInfo map[string]interface{} `json:"device_info"`
}

// RegisterPushToken registers a new push token for the user
func RegisterPushToken(c *gin.Context) {
    userID := c.GetUint("user_id") // From JWT middleware
    
    var req PushTokenRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    // Convert device info to JSON
    deviceInfoJSON, _ := json.Marshal(req.DeviceInfo)
    
    // Check if token already exists for this user
    var existingToken models.PushToken
    result := db.Where("user_id = ? AND token = ?", userID, req.Token).First(&existingToken)
    
    if result.Error == nil {
        // Token exists, update it
        existingToken.Platform = req.Platform
        existingToken.DeviceInfo = deviceInfoJSON
        existingToken.IsActive = true
        
        if err := db.Save(&existingToken).Error; err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update push token"})
            return
        }
        
        c.JSON(http.StatusOK, gin.H{"message": "Push token updated successfully"})
        return
    }
    
    // Create new token
    pushToken := models.PushToken{
        UserID:     userID,
        Token:      req.Token,
        Platform:   req.Platform,
        DeviceInfo: deviceInfoJSON,
        IsActive:   true,
    }
    
    if err := db.Create(&pushToken).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register push token"})
        return
    }
    
    c.JSON(http.StatusCreated, gin.H{"message": "Push token registered successfully"})
}

// UpdatePushToken updates an existing push token
func UpdatePushToken(c *gin.Context) {
    userID := c.GetUint("user_id")
    
    var req PushTokenRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    deviceInfoJSON, _ := json.Marshal(req.DeviceInfo)
    
    var pushToken models.PushToken
    if err := db.Where("user_id = ? AND token = ?", userID, req.Token).First(&pushToken).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Push token not found"})
        return
    }
    
    pushToken.Platform = req.Platform
    pushToken.DeviceInfo = deviceInfoJSON
    pushToken.IsActive = true
    
    if err := db.Save(&pushToken).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update push token"})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{"message": "Push token updated successfully"})
}

// RemovePushToken deactivates a push token
func RemovePushToken(c *gin.Context) {
    userID := c.GetUint("user_id")
    
    // Deactivate all tokens for this user
    if err := db.Model(&models.PushToken{}).Where("user_id = ?", userID).Update("is_active", false).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove push token"})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{"message": "Push token removed successfully"})
}
```

## 4. Push Notification Service

```go
// services/push_notification.go
package services

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "your-app/models"
    "gorm.io/gorm"
)

type PushNotificationService struct {
    db *gorm.DB
}

type ExpoMessage struct {
    To       []string               `json:"to"`
    Title    string                 `json:"title"`
    Body     string                 `json:"body"`
    Data     map[string]interface{} `json:"data,omitempty"`
    Sound    string                 `json:"sound,omitempty"`
    Badge    *int                   `json:"badge,omitempty"`
    Priority string                 `json:"priority,omitempty"`
}

type ExpoResponse struct {
    Data []struct {
        Status string `json:"status"`
        ID     string `json:"id,omitempty"`
        Message string `json:"message,omitempty"`
        Details struct {
            Error string `json:"error,omitempty"`
        } `json:"details,omitempty"`
    } `json:"data"`
}

func NewPushNotificationService(db *gorm.DB) *PushNotificationService {
    return &PushNotificationService{db: db}
}

// SendMessageNotification sends a push notification for a new message
func (s *PushNotificationService) SendMessageNotification(
    chatroomID string,
    senderID uint,
    senderName string,
    messageContent string,
    chatroomName string,
) error {
    // Get all active users in the chatroom except the sender
    var members []models.ChatroomMember
    if err := s.db.Where("chatroom_id = ? AND user_id != ?", chatroomID, senderID).Find(&members).Error; err != nil {
        return fmt.Errorf("failed to get chatroom members: %w", err)
    }
    
    if len(members) == 0 {
        return nil // No members to notify
    }
    
    // Get user IDs
    var userIDs []uint
    for _, member := range members {
        userIDs = append(userIDs, member.UserID)
    }
    
    // Get active push tokens for these users
    var pushTokens []models.PushToken
    if err := s.db.Where("user_id IN ? AND is_active = ?", userIDs, true).Find(&pushTokens).Error; err != nil {
        return fmt.Errorf("failed to get push tokens: %w", err)
    }
    
    if len(pushTokens) == 0 {
        return nil // No active push tokens
    }
    
    // Prepare tokens
    var tokens []string
    for _, token := range pushTokens {
        tokens = append(tokens, token.Token)
    }
    
    // Prepare notification content
    title := fmt.Sprintf("New message in %s", chatroomName)
    body := fmt.Sprintf("%s: %s", senderName, messageContent)
    
    // Truncate body if too long
    if len(body) > 100 {
        body = body[:97] + "..."
    }
    
    // Send notification
    return s.sendExpoNotification(tokens, title, body, map[string]interface{}{
        "chatroomId": chatroomID,
        "senderId":   senderID,
        "type":       "new_message",
    })
}

// sendExpoNotification sends notification via Expo Push API
func (s *PushNotificationService) sendExpoNotification(
    tokens []string,
    title string,
    body string,
    data map[string]interface{},
) error {
    message := ExpoMessage{
        To:       tokens,
        Title:    title,
        Body:     body,
        Data:     data,
        Sound:    "default",
        Priority: "high",
    }
    
    jsonData, err := json.Marshal(message)
    if err != nil {
        return fmt.Errorf("failed to marshal notification: %w", err)
    }
    
    resp, err := http.Post(
        "https://exp.host/--/api/v2/push/send",
        "application/json",
        bytes.NewBuffer(jsonData),
    )
    if err != nil {
        return fmt.Errorf("failed to send notification: %w", err)
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("expo API returned status: %d", resp.StatusCode)
    }
    
    var expoResp ExpoResponse
    if err := json.NewDecoder(resp.Body).Decode(&expoResp); err != nil {
        return fmt.Errorf("failed to decode response: %w", err)
    }
    
    // Log any errors from Expo
    for _, result := range expoResp.Data {
        if result.Status == "error" {
            fmt.Printf("Push notification error: %s - %s\n", result.Message, result.Details.Error)
        }
    }
    
    return nil
}
```

## 5. Routes

Add these routes to your router:

```go
// In your main router setup
authRoutes := router.Group("/auth")
authRoutes.Use(authMiddleware()) // Your JWT middleware
{
    authRoutes.POST("/push-token", handlers.RegisterPushToken)
    authRoutes.PUT("/push-token", handlers.UpdatePushToken)
    authRoutes.DELETE("/push-token", handlers.RemovePushToken)
}
```

## 6. Integration with Message Sending

In your message sending handler, add notification sending:

```go
// In your SendMessage handler, after saving the message
pushService := services.NewPushNotificationService(db)
go func() {
    // Send notification in background
    err := pushService.SendMessageNotification(
        chatroomID,
        senderID,
        senderName,
        messageContent,
        chatroomName,
    )
    if err != nil {
        log.Printf("Failed to send push notification: %v", err)
    }
}()
```

This implementation provides:
- Push token registration/management
- Expo push notification sending
- Background notification delivery
- Proper error handling
- Database integration with your existing schema
