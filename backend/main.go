package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ginchat/models"
	"github.com/ginchat/routes"
	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	_ "github.com/ginchat/docs" // Import generated docs
)

// @title GinChat API
// @version 1.0
// @description A real-time chat application API built with Gin framework
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.ginchat.com/support
// @contact.email support@ginchat.com

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8080
// @BasePath /api
// @schemes http https

var (
	mysqlDB *gorm.DB
	mongoDB *mongo.Database
	logger  *logrus.Logger
)

func initLogger() {
	logger = logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})
	logger.SetOutput(os.Stdout)
	logger.SetLevel(logrus.InfoLevel)
}

func initMySQL() {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		os.Getenv("MYSQL_USER"),
		os.Getenv("MYSQL_PASSWORD"),
		os.Getenv("MYSQL_HOST"),
		os.Getenv("MYSQL_PORT"),
		os.Getenv("MYSQL_DATABASE"),
	)

	var err error
	mysqlDB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		logger.Fatalf("Failed to connect to MySQL: %v", err)
	}

	logger.Info("Connected to MySQL database")
}

func initMongoDB() {
	// Get database connection details from environment variables
	dbUser := os.Getenv("MONGO_USER")
	dbPassword := os.Getenv("MONGO_PASSWORD")
	dbHost := os.Getenv("MONGO_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}
	dbPort := os.Getenv("MONGO_PORT")
	if dbPort == "" {
		dbPort = "27017"
	}
	dbName := os.Getenv("MONGO_DATABASE")
	if dbName == "" {
		dbName = "ginchat"
	}

	// Create connection URI
	var mongoURI string
	if dbUser != "" && dbPassword != "" {
		// With authentication
		mongoURI = fmt.Sprintf("mongodb://%s:%s@%s:%s/%s",
			dbUser, dbPassword, dbHost, dbPort, dbName)
	} else {
		// Without authentication (local development)
		mongoURI = fmt.Sprintf("mongodb://%s:%s/%s",
			dbHost, dbPort, dbName)
	}

	logger.Infof("Connecting to MongoDB at %s:%s/%s", dbHost, dbPort, dbName)

	clientOptions := options.Client().ApplyURI(mongoURI)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		logger.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		logger.Fatalf("Failed to ping MongoDB: %v", err)
	}

	mongoDB = client.Database(dbName)
	logger.Info("Connected to MongoDB database")
}

func setupRouter() *gin.Engine {
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Swagger documentation
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	return r
}

func initDatabase() {
	// Auto migrate MySQL models
	if mysqlDB != nil {
		err := mysqlDB.AutoMigrate(&models.User{})
		if err != nil {
			logger.Fatalf("Failed to migrate MySQL models: %v", err)
		}
		logger.Info("MySQL models migrated successfully")
	}
}

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	}

	// Initialize components
	initLogger()

	// Initialize database connections
	initMySQL()
	initMongoDB()
	initDatabase()

	// Setup router
	r := setupRouter()

	// Setup routes
	routes.SetupRoutes(r, mysqlDB, mongoDB, logger)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	logger.Infof("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		logger.Fatalf("Failed to start server: %v", err)
	}
}
