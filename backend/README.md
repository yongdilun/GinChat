# GinChat Backend

A robust real-time chat application backend built with Go, Gin framework, GORM, and MongoDB.

## Tech Stack

- **Language**: [Go](https://golang.org/) (v1.24.2)
- **Web Framework**: [Gin](https://github.com/gin-gonic/gin) (v1.10.0)
- **ORM**: [GORM](https://gorm.io/) (v1.26.1)
- **Relational Database**: MySQL (via GORM)
- **NoSQL Database**: [MongoDB](https://www.mongodb.com/) (v1.17.3)
- **WebSockets**: [Gorilla WebSocket](https://github.com/gorilla/websocket) (v1.5.3)
- **Authentication**: JWT (using [dgrijalva/jwt-go](https://github.com/dgrijalva/jwt-go))
- **Password Hashing**: [bcrypt](https://golang.org/x/crypto/bcrypt)
- **Environment Variables**: [godotenv](https://github.com/joho/godotenv)
- **Logging**: [logrus](https://github.com/sirupsen/logrus)
- **API Documentation**: [Swagger](https://github.com/swaggo/gin-swagger)

## Project Structure

```
backend/
├── config/             # Configuration files
├── controllers/        # Request handlers
│   ├── user_controller.go
│   ├── chatroom_controller.go
│   ├── message_controller.go
│   ├── media_controller.go
│   └── websocket_controller.go
├── docs/               # Swagger documentation
├── middleware/         # Middleware functions
│   └── auth_middleware.go
├── models/             # Data models
│   ├── user.go         # User model (MySQL)
│   ├── chatroom.go     # Chatroom model (MongoDB)
│   ├── chatroom_member.go # Chatroom member model
│   └── message.go      # Message model (MongoDB)
├── routes/             # API routes
│   └── routes.go
├── services/           # Business logic
│   ├── user_service.go
│   ├── chatroom_service.go
│   ├── message_service.go
│   └── media_service.go
├── test/               # Test utilities
│   └── init_db.go      # Database initialization for testing
├── utils/              # Utility functions
│   ├── jwt.go          # JWT utilities
│   └── password.go     # Password hashing utilities
├── services/           # Business logic
│   ├── user_service.go
│   ├── chatroom_service.go
│   ├── message_service.go
│   ├── cloudinary_service.go  # Cloudinary integration for media storage
├── .env                # Environment variables
├── go.mod              # Go module file
├── go.sum              # Go module checksum
└── main.go             # Entry point
```

## Key Features

- **RESTful API**: Clean API design following REST principles
- **Real-time Messaging**: WebSocket support for instant messaging
- **Authentication**: Secure JWT-based authentication
- **Password Security**: bcrypt hashing with automatic salting
- **Database Integration**:
  - MySQL for user data and authentication
  - MongoDB for chat data (messages, chatrooms)
- **Media Handling**: Support for uploading media files to Cloudinary cloud storage
- **API Documentation**: Swagger UI for interactive API documentation
- **Structured Logging**: JSON-formatted logs with logrus
- **Environment Configuration**: Flexible configuration via environment variables
- **Database Migrations**: Automatic schema migrations with GORM

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/logout` - Logout (requires authentication)

### Chatrooms
- `GET /api/chatrooms` - Get all chatrooms for the authenticated user
- `POST /api/chatrooms` - Create a new chatroom
- `POST /api/chatrooms/:id/join` - Join an existing chatroom

### Messages
- `GET /api/chatrooms/:id/messages` - Get messages for a chatroom
- `POST /api/chatrooms/:id/messages` - Send a message to a chatroom

### Media
- `POST /api/media/upload` - Upload media files
- `GET /media/:filename` - Serve media files

### WebSocket
- `GET /api/ws` - WebSocket endpoint for real-time communication

### Health Check
- `GET /health` - Health check endpoint

## Database Schema

### MySQL (User Data)
- **users**: User accounts and authentication data

### MongoDB (Chat Data)
- **chatrooms**: Chat room information and members
- **messages**: Chat messages with metadata

## Message Types

The application supports various message types:
- `text`: Plain text messages
- `picture`: Image messages
- `audio`: Audio messages
- `video`: Video messages
- `text_and_picture`: Text with image
- `text_and_audio`: Text with audio
- `text_and_video`: Text with video

## Getting Started

### Prerequisites

- Go 1.16 or later
- MySQL server
- MongoDB server

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```
# Server Configuration
PORT=8080

# MySQL Configuration
# Option 1: Use a full connection URI (recommended for cloud databases)
MYSQL_URI=mysql://user:password@host:port/dbname?ssl-mode=REQUIRED
# Option 2: Use individual parameters (for local development)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=ginchat
MYSQL_SSL_MODE=REQUIRED

# MongoDB Configuration
# Option 1: Use a full connection URI (recommended for MongoDB Atlas)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
# Option 2: Use individual parameters (for local development)
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=ginchat

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=24h  # Token expiration time

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ginchat.git
cd ginchat/backend

# Install dependencies
go mod download

# Run the application
go run main.go
```

The server will start on port 8080 (or the port specified in your `.env` file).

### Database Initialization

To initialize the database with test data:

```bash
cd test
go run init_db.go
```

This will create the necessary tables and collections, and populate them with sample data.

### API Documentation

Swagger documentation is available at:
```
http://localhost:8080/swagger/index.html
```

## WebSocket Protocol

The WebSocket endpoint accepts a token parameter for authentication:

```
ws://localhost:8080/api/ws?token=your_jwt_token
```

WebSocket messages follow this format:

```json
{
  "type": "message_type",
  "chatroom_id": "chatroom_id",
  "data": {
    // Message-specific data
  }
}
```

## Development

### Running Tests

```bash
go test ./...
```

### Building for Production

```bash
go build -o ginchat-server
```

## Security Considerations

- JWT tokens are signed with HS256/RS256 algorithm
- Passwords are hashed using bcrypt with automatic salting
- Authentication middleware protects sensitive endpoints
- Input validation is performed on all API endpoints
