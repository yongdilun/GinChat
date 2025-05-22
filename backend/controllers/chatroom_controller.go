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
	Name string `json:"name" binding:"required,min=3,max=100" example:"General Chat"` // The name of the chatroom
}

// CreateChatroom handles chatroom creation
// @Summary Create a new chatroom
// @Description Create a new chatroom with the authenticated user as the creator and first member
// @Tags chatrooms
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param chatroom body CreateChatroomRequest true "Chatroom information"
// @Success 201 {object} map[string]models.ChatroomResponse "Chatroom created successfully"
// @Failure 400 {object} map[string]string "Invalid request body"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 409 {object} map[string]string "Chatroom with this name already exists"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /chatrooms [post]
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
// @Summary Get all chatrooms
// @Description Retrieve a list of all available chatrooms
// @Tags chatrooms
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {object} map[string][]models.ChatroomResponse "List of chatrooms"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /chatrooms [get]
func (cc *ChatroomController) GetChatrooms(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get all chatrooms using the service
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

// GetChatroomsByUserID handles getting user's joined chatrooms
// @Summary Get user's joined chatrooms
// @Description Retrieve a list of chatrooms the authenticated user has joined
// @Tags chatrooms
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {object} map[string][]models.ChatroomResponse "List of user's chatrooms"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /chatrooms/user [get]
func (cc *ChatroomController) GetChatroomsByUserID(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get user's joined chatrooms using the service
	chatrooms, err := cc.ChatroomService.GetUserChatrooms(userID.(uint))
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

// GetChatroomByID handles getting a specific chatroom by ID
// @Summary Get a chatroom by ID
// @Description Retrieve a specific chatroom by its ID
// @Tags chatrooms
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path string true "Chatroom ID" example:"60d5f8b8e6b5f0b3e8b4b5b3"
// @Success 200 {object} map[string]models.ChatroomResponse "Chatroom details"
// @Failure 400 {object} map[string]string "Invalid chatroom ID"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 404 {object} map[string]string "Chatroom not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /chatrooms/{id} [get]
func (cc *ChatroomController) GetChatroomByID(c *gin.Context) {
	// Get chatroom ID from URL
	chatroomID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chatroom ID"})
		return
	}

	// Get user ID from context (set by auth middleware)
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get chatroom using the service
	chatroom, err := cc.ChatroomService.GetChatroomByID(chatroomID)
	if err != nil {
		if err.Error() == "chatroom not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// Optional: Check if user is a member of the chatroom
	// Comment out the following lines if you want to allow non-members to view chatroom info
	/*
		isMember := cc.ChatroomService.IsMember(chatroom, userID.(uint))
		if !isMember {
			c.JSON(http.StatusForbidden, gin.H{"error": "User is not a member of this chatroom"})
			return
		}
	*/

	// Return chatroom data
	c.JSON(http.StatusOK, gin.H{
		"chatroom": chatroom.ToResponse(),
	})
}

// JoinChatroom handles joining a chatroom
// @Summary Join a chatroom
// @Description Add the authenticated user as a member of the specified chatroom
// @Tags chatrooms
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path string true "Chatroom ID" example:"60d5f8b8e6b5f0b3e8b4b5b3"
// @Success 200 {object} map[string]string "Joined chatroom successfully"
// @Failure 400 {object} map[string]string "Invalid chatroom ID"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 404 {object} map[string]string "Chatroom not found"
// @Failure 409 {object} map[string]string "User is already a member of this chatroom"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /chatrooms/{id}/join [post]
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
