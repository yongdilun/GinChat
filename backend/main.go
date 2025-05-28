package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
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

// @securityDefinitions.apikey ApiKeyAuth
// @in header
// @name Authorization

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
	// Check if we have a full URI
	mysqlURI := os.Getenv("MYSQL_URI")
	var dsn string

	if mysqlURI != "" {
		// Parse the URI to extract components
		// Format: mysql://user:pass@host:port/dbname?params
		// We need to convert it to GORM format: user:pass@tcp(host:port)/dbname?params

		// Remove the mysql:// prefix
		cleanURI := strings.TrimPrefix(mysqlURI, "mysql://")

		// Split by @ to separate credentials from host
		parts := strings.Split(cleanURI, "@")
		if len(parts) != 2 {
			logger.Fatalf("Invalid MySQL URI format")
		}

		credentials := parts[0]
		hostPart := parts[1]

		// Split host part by / to separate host:port from dbname?params
		hostDbParts := strings.SplitN(hostPart, "/", 2)
		if len(hostDbParts) != 2 {
			logger.Fatalf("Invalid MySQL URI format")
		}

		host := hostDbParts[0]
		dbParams := hostDbParts[1]

		// Construct the DSN for GORM
		dsn = fmt.Sprintf("%s@tcp(%s)/%s", credentials, host, dbParams)

		// Add parseTime if not already in params
		if !strings.Contains(dsn, "parseTime") {
			if strings.Contains(dsn, "?") {
				dsn += "&parseTime=True"
			} else {
				dsn += "?parseTime=True"
			}
		}

		// Add SSL requirement if not already in params
		if !strings.Contains(dsn, "ssl-mode") && !strings.Contains(dsn, "tls") {
			dsn += "&tls=true"
		}

		// Replace ssl-mode=REQUIRED with tls=skip-verify for GORM compatibility
		// This skips certificate verification which is needed for cloud databases
		dsn = strings.Replace(dsn, "ssl-mode=REQUIRED", "tls=skip-verify", 1)

		logger.Infof("Connecting to MySQL with URI-derived DSN")
	} else {
		// Fallback to individual parameters
		dsn = fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			os.Getenv("MYSQL_USER"),
			os.Getenv("MYSQL_PASSWORD"),
			os.Getenv("MYSQL_HOST"),
			os.Getenv("MYSQL_PORT"),
			os.Getenv("MYSQL_DATABASE"),
		)

		// Add SSL if required
		if os.Getenv("MYSQL_SSL_MODE") == "REQUIRED" {
			dsn += "&tls=skip-verify"
		}
	}

	var err error
	mysqlDB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		logger.Fatalf("Failed to connect to MySQL: %v", err)
	}

	logger.Info("Connected to MySQL database successfully")
}

func initMongoDB() {
	// Get MongoDB URI from environment variables
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		logger.Fatal("MONGO_URI environment variable is not set")
	}

	// Get database name from environment variables
	dbName := os.Getenv("MONGO_DATABASE")
	if dbName == "" {
		dbName = "ginchat"
	}

	logger.Infof("Connecting to MongoDB Atlas with database: %s", dbName)

	// Set client options with proper credentials
	clientOptions := options.Client()

	// If using MongoDB Atlas, ensure we have the right format
	if strings.Contains(mongoURI, "mongodb+srv://") {
		// Parse the URI to extract credentials if needed
		if !strings.Contains(mongoURI, dbName) {
			// Add database name if not in the URI
			if strings.Contains(mongoURI, "?") {
				mongoURI = strings.Replace(mongoURI, "?", "/"+dbName+"?", 1)
			} else {
				mongoURI = mongoURI + "/" + dbName
			}
		}

		// Add additional options for Atlas
		if !strings.Contains(mongoURI, "retryWrites=true") {
			if strings.Contains(mongoURI, "?") {
				mongoURI += "&retryWrites=true&w=majority"
			} else {
				mongoURI += "?retryWrites=true&w=majority"
			}
		}

		logger.Infof("Using MongoDB Atlas URI: %s", mongoURI)
	}

	// Apply the URI
	clientOptions.ApplyURI(mongoURI)

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		logger.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	// Ping the database to verify connection
	err = client.Ping(ctx, nil)
	if err != nil {
		logger.Fatalf("Failed to ping MongoDB: %v", err)
	}

	mongoDB = client.Database(dbName)
	logger.Info("Connected to MongoDB Atlas database successfully")
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
		err := mysqlDB.AutoMigrate(&models.User{}, &models.PushToken{})
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
