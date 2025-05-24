package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/ginchat/models"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	log.Println("=== GinChat Database Initialization ===")
	log.Println("WARNING: This will clear ALL existing data in both MySQL and MongoDB!")
	log.Println("========================================")

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

	log.Println("========================================")
	log.Println("✅ Database initialization completed successfully!")
	log.Println("✅ All existing data has been cleared")
	log.Println("✅ Fresh database schema created")
	log.Println("✅ Ready for application use")
	log.Println("========================================")
}

// initMySQL initializes the MySQL database by clearing all data and creating fresh schema
func initMySQL() (*gorm.DB, error) {
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
			return nil, fmt.Errorf("invalid MySQL URI format")
		}

		credentials := parts[0]
		hostPart := parts[1]

		// Split host part by / to separate host:port from dbname?params
		hostDbParts := strings.SplitN(hostPart, "/", 2)
		if len(hostDbParts) != 2 {
			return nil, fmt.Errorf("invalid MySQL URI format")
		}

		host := hostDbParts[0]
		dbParams := hostDbParts[1]

		// Construct the DSN for GORM
		dsn = fmt.Sprintf("%s@tcp(%s)/%s", credentials, host, dbParams)

		// Add SSL requirement if not already in params
		if !strings.Contains(dsn, "ssl-mode") && !strings.Contains(dsn, "tls") {
			if strings.Contains(dsn, "?") {
				dsn += "&tls=true"
			} else {
				dsn += "?tls=true"
			}
		}

		// Replace ssl-mode=REQUIRED with tls=skip-verify for GORM compatibility
		// This skips certificate verification which is needed for cloud databases
		dsn = strings.Replace(dsn, "ssl-mode=REQUIRED", "tls=skip-verify", 1)

		log.Println("Connecting to MySQL with URI-derived DSN")
	} else {
		// Fallback to individual parameters
		dbUser := getEnv("MYSQL_USER", "root")
		dbPassword := getEnv("MYSQL_PASSWORD", "password")
		dbHost := getEnv("MYSQL_HOST", "localhost")
		dbPort := getEnv("MYSQL_PORT", "3306")
		dbName := getEnv("MYSQL_DATABASE", "ginchat")

		// Create DSN string
		dsn = fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			dbUser, dbPassword, dbHost, dbPort, dbName)

		// Add SSL if required
		if os.Getenv("MYSQL_SSL_MODE") == "REQUIRED" {
			dsn += "&tls=skip-verify"
		}
	}

	// Connect to database
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MySQL: %v", err)
	}

	log.Println("Connected to MySQL database successfully")

	// Clear all existing data by dropping and recreating tables
	log.Println("Clearing all MySQL data...")

	// Drop the users table if it exists
	if db.Migrator().HasTable(&models.User{}) {
		log.Println("Dropping existing users table")
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
	log.Println("MySQL database initialization completed - ready for use")
	return db, nil
}

// initMongoDB initializes the MongoDB database by clearing all data and creating fresh collections
func initMongoDB() (*mongo.Database, error) {
	// Get MongoDB URI from environment variables
	mongoURI := os.Getenv("MONGO_URI")
	var uri string

	if mongoURI != "" {
		// Use the provided MongoDB Atlas URI
		uri = mongoURI
		log.Println("Using MongoDB Atlas connection string")
	} else {
		// Fallback to individual parameters for local development
		dbHost := getEnv("MONGO_HOST", "localhost")
		dbPort := getEnv("MONGO_PORT", "27017")

		// Create connection URI for local development without authentication
		uri = fmt.Sprintf("mongodb://%s:%s", dbHost, dbPort)
		log.Printf("Using local MongoDB connection: host=%s, port=%s", dbHost, dbPort)
	}

	// Get database name
	dbName := getEnv("MONGO_DATABASE", "ginchat")

	// Set client options with proper credentials
	clientOptions := options.Client()

	// If using MongoDB Atlas, ensure we have the right format
	if strings.Contains(uri, "mongodb+srv://") {
		// Parse the URI to extract credentials if needed
		if !strings.Contains(uri, dbName) {
			// Add database name if not in the URI
			if strings.Contains(uri, "?") {
				uri = strings.Replace(uri, "?", "/"+dbName+"?", 1)
			} else {
				uri = uri + "/" + dbName
			}
		}

		// Add additional options for Atlas
		if !strings.Contains(uri, "retryWrites=true") {
			if strings.Contains(uri, "?") {
				uri += "&retryWrites=true&w=majority"
			} else {
				uri += "?retryWrites=true&w=majority"
			}
		}

		log.Printf("Using MongoDB Atlas URI: %s", uri)
	}

	// Apply the URI
	clientOptions.ApplyURI(uri)

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

	log.Println("Connected to MongoDB database successfully")

	// Get database
	db := client.Database(dbName)
	log.Printf("Using MongoDB database: %s", dbName)

	// Clear all existing data by dropping collections
	log.Println("Clearing all MongoDB data...")

	// Get list of existing collections
	collections, err := db.ListCollectionNames(ctx, bson.D{})
	if err != nil {
		return nil, fmt.Errorf("failed to list collections: %v", err)
	}

	// Drop existing collections
	for _, collectionName := range collections {
		if collectionName == "chatrooms" || collectionName == "messages" || collectionName == "chatroom_members" ||
			collectionName == "message_read_status" || collectionName == "user_last_read" {
			log.Printf("Dropping existing collection: %s", collectionName)
			err = db.Collection(collectionName).Drop(ctx)
			if err != nil {
				return nil, fmt.Errorf("failed to drop collection %s: %v", collectionName, err)
			}
		}
	}

	// Create fresh collections
	log.Println("Creating fresh MongoDB collections...")

	err = db.CreateCollection(ctx, "chatrooms")
	if err != nil {
		return nil, fmt.Errorf("failed to create chatrooms collection: %v", err)
	}
	log.Println("Created chatrooms collection")

	err = db.CreateCollection(ctx, "messages")
	if err != nil {
		return nil, fmt.Errorf("failed to create messages collection: %v", err)
	}
	log.Println("Created messages collection")

	err = db.CreateCollection(ctx, "chatroom_members")
	if err != nil {
		return nil, fmt.Errorf("failed to create chatroom_members collection: %v", err)
	}
	log.Println("Created chatroom_members collection")

	err = db.CreateCollection(ctx, "message_read_status")
	if err != nil {
		return nil, fmt.Errorf("failed to create message_read_status collection: %v", err)
	}
	log.Println("Created message_read_status collection")

	err = db.CreateCollection(ctx, "user_last_read")
	if err != nil {
		return nil, fmt.Errorf("failed to create user_last_read collection: %v", err)
	}
	log.Println("Created user_last_read collection")

	log.Println("MongoDB database initialization completed - ready for use")

	return db, nil
}

// Helper function to get environment variables with fallback
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
