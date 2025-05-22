package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ginchat/controllers"
	"github.com/ginchat/middleware"
	"github.com/ginchat/services"
	"github.com/ginchat/utils"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/mongo"
	"gorm.io/gorm"
)

// SetupRoutes configures all the routes for the application
func SetupRoutes(r *gin.Engine, db *gorm.DB, mongodb *mongo.Database, logger *logrus.Logger) {
	// Create services
	userService := services.NewUserService(db)
	// Create chatroom and message services but comment them out until they're used
	// chatroomService := services.NewChatroomService(mongodb)
	// messageService := services.NewMessageService(mongodb, chatroomService)

	// Create controllers
	userController := controllers.NewUserController(db, userService)
	chatroomController := controllers.NewChatroomController(db, mongodb)
	messageController := controllers.NewMessageController(db, mongodb)
	// Use the messageService when the MessageController is updated to accept it
	// messageController := controllers.NewMessageController(db, messageService)
	websocketController := controllers.NewWebSocketController(logger)

	// Create media controller with Cloudinary
	mediaController := controllers.NewMediaController()

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// Swagger documentation is set up in main.go

	// API routes
	api := r.Group("/api")
	{
		// Auth routes (no auth required)
		auth := api.Group("/auth")
		{
			auth.POST("/register", userController.Register)
			auth.POST("/login", userController.Login)
		}

		// Protected routes (auth required)
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			// User routes
			protected.POST("/auth/logout", userController.Logout)

			// Chatroom routes
			protected.GET("/chatrooms", chatroomController.GetChatrooms)
			protected.GET("/chatrooms/user", chatroomController.GetChatroomsByUserID)
			protected.GET("/chatrooms/:id", chatroomController.GetChatroomByID)
			protected.POST("/chatrooms", chatroomController.CreateChatroom)
			protected.POST("/chatrooms/:id/join", chatroomController.JoinChatroom)

			// Message routes
			protected.GET("/chatrooms/:id/messages", messageController.GetMessages)
			protected.POST("/chatrooms/:id/messages", messageController.SendMessage)

			// Media routes
			protected.POST("/media/upload", mediaController.UploadMedia)
		}
		// WebSocket route OUTSIDE protected group
		api.GET("/ws", websocketController.HandleConnection)
	}

	// Debug route for WebSocket connection
	r.GET("/api/ws-debug", func(c *gin.Context) {
		token := c.Query("token")
		if token == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No token provided"})
			return
		}

		claims, err := utils.ValidateJWT(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token", "details": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":  "Token is valid",
			"user_id":  claims.UserID,
			"username": claims.Username,
		})
	})
}
