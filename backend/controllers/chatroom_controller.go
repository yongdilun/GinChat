package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ginchat/services"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"gorm.io/gorm"
)

// ChatroomController handles chatroom-related requests
type ChatroomController struct {
	ChatroomService *services.ChatroomService
}

// NewChatroomController creates a new ChatroomController
func NewChatroomController(db *gorm.DB, mongodb *mongo.Database) *ChatroomController {
	chatroomService := services.NewChatroomService(mongodb)
	return &ChatroomController{
		ChatroomService: chatroomService,
	}
}

// CreateChatroomRequest represents the request body for creating a chatroom
type CreateChatroomRequest struct {
	Name string `json:"name" binding:"required,min=3,max=100"`
}

// CreateChatroom handles chatroom creation
func (cc *ChatroomController) CreateChatroom(c *gin.Context) {
	var req CreateChatroomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	username, _ := c.Get("username")

	// Create chatroom using the service
	chatroom, err := cc.ChatroomService.CreateChatroom(req.Name, userID.(uint), username.(string))
	if err != nil {
		if err.Error() == "chatroom with this name already exists" {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// Return chatroom data
	c.JSON(http.StatusCreated, gin.H{
		"chatroom": chatroom.ToResponse(),
	})
}

// GetChatrooms handles getting all chatrooms
func (cc *ChatroomController) GetChatrooms(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get chatrooms using the service
	chatrooms, err := cc.ChatroomService.GetChatrooms()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Convert to response format
	var response []interface{}
	for _, chatroom := range chatrooms {
		response = append(response, chatroom.ToResponse())
	}

	c.JSON(http.StatusOK, gin.H{
		"chatrooms": response,
	})
}

// JoinChatroom handles joining a chatroom
func (cc *ChatroomController) JoinChatroom(c *gin.Context) {
	// Get chatroom ID from URL
	chatroomID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chatroom ID"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	username, _ := c.Get("username")

	// Join chatroom using the service
	err = cc.ChatroomService.JoinChatroom(chatroomID, userID.(uint), username.(string))
	if err != nil {
		if err.Error() == "chatroom not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if err.Error() == "user is already a member of this chatroom" {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Joined chatroom successfully"})
}
