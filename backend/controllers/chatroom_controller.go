package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ginchat/services"
	"github.com/ginchat/utils"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"gorm.io/gorm"
)

// ChatroomController handles chatroom-related requests
type ChatroomController struct {
	ChatroomService *services.ChatroomService
	MessageService  *services.MessageService
}

// NewChatroomController creates a new ChatroomController
func NewChatroomController(db *gorm.DB, mongodb *mongo.Database) *ChatroomController {
	chatroomService := services.NewChatroomService(mongodb)
	userService := services.NewUserService(db)
	cloudinaryService, _ := services.NewCloudinaryService() // Ignore error for now, will be nil if not configured
	readStatusService := services.NewMessageReadStatusService(mongodb, chatroomService, userService)
	messageService := services.NewMessageService(mongodb, chatroomService, cloudinaryService, readStatusService)
	return &ChatroomController{
		ChatroomService: chatroomService,
		MessageService:  messageService,
	}
}

// CreateChatroomRequest represents the request body for creating a chatroom
type CreateChatroomRequest struct {
	Name     string `json:"name" binding:"required,min=3,max=100" example:"General Chat"` // The name of the chatroom
	Password string `json:"password" example:"secret123"`                                 // Optional password for the chatroom
}

// JoinChatroomByCodeRequest represents the request body for joining a chatroom by code
type JoinChatroomByCodeRequest struct {
	RoomCode string `json:"room_code" binding:"required,len=6" example:"ABC123"` // The 6-character room code
	Password string `json:"password" example:"secret123"`                        // Password if the room is protected
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
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.FormatValidationError(err)})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Please log in to continue"})
		return
	}
	username, _ := c.Get("username")

	// Create chatroom using the service
	chatroom, err := cc.ChatroomService.CreateChatroom(req.Name, userID.(uint), username.(string), req.Password)
	if err != nil {
		if err.Error() == "chatroom with this name already exists" {
			c.JSON(http.StatusConflict, gin.H{"error": utils.FormatServiceError(err)})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Please log in to continue"})
		return
	}

	// Get all chatrooms using the service
	chatrooms, err := cc.ChatroomService.GetChatrooms()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		return
	}

	// Convert to response format
	var response []any
	for _, chatroom := range chatrooms {
		response = append(response, chatroom.ToResponse())
	}

	c.JSON(http.StatusOK, gin.H{
		"chatrooms": response,
	})
}

// GetChatroomsByUserID handles getting user's joined chatrooms (legacy endpoint)
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

	// Check if client wants sorted results
	sorted := c.Query("sorted")
	if sorted == "true" {
		// Use optimized sorted method
		chatrooms, err := cc.ChatroomService.GetUserChatroomsSortedByLatestMessage(userID.(uint))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Convert to response format
		var response []any
		for _, chatroom := range chatrooms {
			response = append(response, chatroom.ToResponse())
		}

		c.JSON(http.StatusOK, gin.H{
			"chatrooms": response,
		})
		return
	}

	// Legacy method - get user's joined chatrooms using the service
	chatrooms, err := cc.ChatroomService.GetUserChatrooms(userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Convert to response format
	var response []any
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

// JoinChatroomByCode handles joining a chatroom using room code
// @Summary Join a chatroom by room code
// @Description Join a chatroom using its 6-character room code and optional password
// @Tags chatrooms
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param request body JoinChatroomByCodeRequest true "Room code and password"
// @Success 200 {object} map[string]models.ChatroomResponse "Joined chatroom successfully"
// @Failure 400 {object} map[string]string "Invalid request body"
// @Failure 401 {object} map[string]string "User not authenticated"
// @Failure 403 {object} map[string]string "Incorrect password"
// @Failure 404 {object} map[string]string "Room not found"
// @Failure 409 {object} map[string]string "User is already a member of this chatroom"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /chatrooms/join [post]
func (cc *ChatroomController) JoinChatroomByCode(c *gin.Context) {
	var req JoinChatroomByCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.FormatValidationError(err)})
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
	chatroom, err := cc.ChatroomService.JoinChatroomByCode(req.RoomCode, req.Password, userID.(uint), username.(string))
	if err != nil {
		switch err.Error() {
		case "room not found":
			c.JSON(http.StatusNotFound, gin.H{"error": "Room not found. Please check the room code."})
		case "incorrect password":
			c.JSON(http.StatusForbidden, gin.H{"error": "Incorrect password"})
		case "user is already a member of this chatroom":
			c.JSON(http.StatusConflict, gin.H{"error": "You are already a member of this chatroom"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Joined chatroom successfully",
		"chatroom": chatroom.ToResponse(),
	})
}

// DeleteChatroom handles deleting a chatroom
// @Summary Delete a chatroom
// @Description Delete a chatroom and all its messages (only creator can delete)
// @Tags chatrooms
// @Produce json
// @Param id path string true "Chatroom ID"
// @Success 200 {object} map[string]string "Chatroom deleted successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 404 {object} map[string]string "Chatroom not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Security BearerAuth
// @Router /api/chatrooms/{id} [delete]
func (cc *ChatroomController) DeleteChatroom(c *gin.Context) {
	// Get chatroom ID from URL
	chatroomID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide a valid chatroom ID"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Please log in to continue"})
		return
	}

	// Delete chatroom using the service
	err = cc.ChatroomService.DeleteChatroom(chatroomID, userID.(uint), cc.MessageService)
	if err != nil {
		switch err.Error() {
		case "chatroom not found":
			c.JSON(http.StatusNotFound, gin.H{"error": utils.FormatServiceError(err)})
		case "only the creator can delete this chatroom":
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete chatrooms that you created"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.FormatServiceError(err)})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Chatroom deleted successfully"})
}
