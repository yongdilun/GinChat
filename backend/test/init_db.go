package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/ginchat/models"
	"github.com/ginchat/services"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	// First try to load environment variables from the test directory
	if err := godotenv.Load(".env"); err != nil {
		// If not found, try to load from parent directory
		if err := godotenv.Load("../.env"); err != nil {
			log.Println("Warning: Neither .env nor ../.env file found, using default values")
		} else {
			log.Println("Loaded environment variables from ../.env")
		}
	} else {
		log.Println("Loaded environment variables from .env")
	}

	// Initialize MySQL
	mysqlDB, err := initMySQL()
	if err != nil {
		log.Fatalf("Failed to initialize MySQL: %v", err)
	}

	// Get MySQL connection
	sqlDB, err := mysqlDB.DB()
	if err != nil {
		log.Fatalf("Failed to get MySQL connection: %v", err)
	}
	defer sqlDB.Close()

	// Initialize MongoDB
	mongoDB, err := initMongoDB()
	if err != nil {
		log.Fatalf("Failed to initialize MongoDB: %v", err)
	}

	// Close MongoDB connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	mongoClient := mongoDB.Client()
	defer mongoClient.Disconnect(ctx)

	log.Println("Database initialization completed successfully")
}

// initMySQL initializes the MySQL database with test data
func initMySQL() (*gorm.DB, error) {
	// Get database connection details from environment variables
	dbUser := getEnv("MYSQL_USER", "root")
	dbPassword := getEnv("MYSQL_PASSWORD", "password")
	dbHost := getEnv("MYSQL_HOST", "localhost")
	dbPort := getEnv("MYSQL_PORT", "3306")
	dbName := getEnv("MYSQL_DATABASE", "ginchat")

	// Create DSN string
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPassword, dbHost, dbPort, dbName)

	// Connect to database
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MySQL: %v", err)
	}

	log.Println("Connected to MySQL database")

	// Check if the users table exists
	var tableExists bool
	err = db.Raw("SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ?",
		"ginchat", "users").Scan(&tableExists).Error
	if err != nil {
		return nil, fmt.Errorf("failed to check if users table exists: %v", err)
	}

	// If the table exists, drop it to ensure the schema is updated
	if tableExists {
		log.Println("Dropping users table to update schema")
		err = db.Migrator().DropTable(&models.User{})
		if err != nil {
			return nil, fmt.Errorf("failed to drop users table: %v", err)
		}
	}

	// Auto migrate the schema
	err = db.AutoMigrate(&models.User{})
	if err != nil {
		return nil, fmt.Errorf("failed to migrate schema: %v", err)
	}

	log.Println("Schema migration completed")

	// Since we dropped and recreated the table, we always need to create test users
	log.Println("Creating test users")

	// Create a user service
	userService := services.NewUserService(db)

	// Create test users using the user service
	testUsers := []struct {
		username string
		email    string
		password string
		role     string
	}{
		{
			username: "testuser1",
			email:    "test1@example.com",
			password: "password123",
			role:     "member",
		},
		{
			username: "testuser2",
			email:    "test2@example.com",
			password: "password123",
			role:     "member",
		},
		{
			username: "admin",
			email:    "admin@example.com",
			password: "password123",
			role:     "admin",
		},
	}

	// Insert test users
	for _, userData := range testUsers {
		_, err := userService.Register(userData.username, userData.email, userData.password, userData.role)
		if err != nil {
			return nil, fmt.Errorf("failed to create test user %s: %v", userData.username, err)
		}
	}

	log.Println("Test users created successfully")
	return db, nil
}

// initMongoDB initializes the MongoDB database with test data
func initMongoDB() (*mongo.Database, error) {
	// Get database connection details from environment variables
	dbHost := getEnv("MONGO_HOST", "localhost")
	dbPort := getEnv("MONGO_PORT", "27017")
	dbName := getEnv("MONGO_DATABASE", "ginchat")

	log.Printf("MongoDB connection: Using host=%s, port=%s, database=%s", dbHost, dbPort, dbName)

	// Create connection URI for local development without authentication
	uri := fmt.Sprintf("mongodb://%s:%s", dbHost, dbPort)

	// Set client options
	clientOptions := options.Client().ApplyURI(uri)

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %v", err)
	}

	// Check the connection
	err = client.Ping(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %v", err)
	}

	log.Println("Connected to MongoDB database")

	// Get database
	db := client.Database(dbName)
	log.Printf("Connected to MongoDB database: %s", dbName)

	// Create collections if they don't exist
	collections, err := db.ListCollectionNames(ctx, bson.D{})
	if err != nil {
		return nil, fmt.Errorf("failed to list collections: %v", err)
	}

	// Check if collections exist
	chatroomsExists := false
	messagesExists := false
	for _, collection := range collections {
		if collection == "chatrooms" {
			chatroomsExists = true
		}
		if collection == "messages" {
			messagesExists = true
		}
	}

	// Create collections if they don't exist
	if !chatroomsExists {
		err = db.CreateCollection(ctx, "chatrooms")
		if err != nil {
			return nil, fmt.Errorf("failed to create chatrooms collection: %v", err)
		}
		log.Println("Created chatrooms collection")
	}

	if !messagesExists {
		err = db.CreateCollection(ctx, "messages")
		if err != nil {
			return nil, fmt.Errorf("failed to create messages collection: %v", err)
		}
		log.Println("Created messages collection")
	}

	// Check if test data already exists
	chatroomsColl := db.Collection("chatrooms")
	count, err := chatroomsColl.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, fmt.Errorf("failed to count chatrooms: %v", err)
	}

	if count > 0 {
		log.Println("Test data already exists, skipping creation")
		return db, nil
	}

	// Create test chatrooms
	generalChatroomID := primitive.NewObjectID()
	randomChatroomID := primitive.NewObjectID()

	chatrooms := []any{
		models.Chatroom{
			ID:        generalChatroomID,
			Name:      "General",
			CreatedBy: 1, // testuser1
			CreatedAt: time.Now(),
			Members: []models.ChatroomMember{
				{
					UserID:   1,
					Username: "testuser1",
					JoinedAt: time.Now(),
				},
			},
		},
		models.Chatroom{
			ID:        randomChatroomID,
			Name:      "Random",
			CreatedBy: 2, // testuser2
			CreatedAt: time.Now(),
			Members: []models.ChatroomMember{
				{
					UserID:   2,
					Username: "testuser2",
					JoinedAt: time.Now(),
				},
			},
		},
	}

	// Insert chatrooms
	_, err = chatroomsColl.InsertMany(ctx, chatrooms)
	if err != nil {
		return nil, fmt.Errorf("failed to insert chatrooms: %v", err)
	}

	log.Println("Test chatrooms created successfully")

	// Create test messages
	messagesColl := db.Collection("messages")
	messages := []any{
		models.Message{
			ID:          primitive.NewObjectID(),
			ChatroomID:  generalChatroomID,
			SenderID:    1,
			SenderName:  "testuser1",
			MessageType: "text",
			TextContent: "Hello, welcome to the General chatroom!",
			SentAt:      time.Now(),
		},
		models.Message{
			ID:          primitive.NewObjectID(),
			ChatroomID:  generalChatroomID,
			SenderID:    3,
			SenderName:  "admin",
			MessageType: "text",
			TextContent: "This is a test message from admin.",
			SentAt:      time.Now().Add(time.Minute),
		},
		models.Message{
			ID:          primitive.NewObjectID(),
			ChatroomID:  randomChatroomID,
			SenderID:    2,
			SenderName:  "testuser2",
			MessageType: "text",
			TextContent: "Hello, welcome to the Random chatroom!",
			SentAt:      time.Now(),
		},
	}

	// Insert messages
	_, err = messagesColl.InsertMany(ctx, messages)
	if err != nil {
		return nil, fmt.Errorf("failed to insert messages: %v", err)
	}

	log.Println("Test messages created successfully")

	return db, nil
}

// Note: hashPassword function has been removed as we now use the UserService for creating users

// Helper function to get environment variables with fallback
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
