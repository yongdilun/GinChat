# GinChat Backend

A robust real-time chat application backend built with Go, Gin framework, GORM, and MongoDB with comprehensive message read status tracking and blue tick system. Serves both web and mobile clients with cross-platform synchronization.

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
│   ├── push_token_controller.go  # Push token management
│   └── websocket_controller.go
├── docs/               # Swagger documentation
│   ├── docs.go
│   ├── swagger.json
│   └── swagger.yaml
├── middleware/         # Middleware functions
│   └── auth.go         # Authentication middleware
├── models/             # Data models
│   ├── user.go         # User model (MySQL)
│   ├── push_token.go   # Push token model (MySQL)
│   ├── chatroom.go     # Chatroom model (MongoDB)
│   ├── chatroom_member.go # Chatroom member model (MongoDB)
│   └── message.go      # Message model (MongoDB)
├── routes/             # API routes
│   └── routes.go
├── services/           # Business logic
│   ├── user_service.go
│   ├── chatroom_service.go
│   ├── message_service.go
│   ├── media_service.go
│   ├── push_notification_service.go  # Push notification service
│   └── cloudinary_service.go  # Cloudinary integration for media storage
├── test/               # Test utilities
│   ├── init_db.go      # Database initialization for testing
│   └── README.md       # Test documentation
├── utils/              # Utility functions
│   ├── jwt.go          # JWT utilities
│   ├── password.go     # Password hashing utilities
│   └── media_utils.go  # Media type utilities
├── .env                # Environment variables
├── go.mod              # Go module file
├── go.sum              # Go module checksum
└── main.go             # Entry point
```

## Cross-Platform Integration

This backend serves multiple client applications:
- **Web Frontend**: React/Next.js application with responsive design
- **Mobile App**: React Native with Expo for iOS and Android
- **Shared Features**: Synchronized messaging, room management, and media handling
- **Real-time Sync**: WebSocket connections work seamlessly across all platforms
- **Consistent API**: Same endpoints serve both web and mobile clients

## Recent Updates & Improvements

### Enhanced WebSocket Architecture
- **Cross-Platform Support**: WebSocket connections work seamlessly between web and mobile clients
- **Improved Connection Management**: Better handling of room switching and disconnections
- **Real-time Synchronization**: Messages and read status sync instantly across all platforms
- **Robust Reconnection**: Enhanced auto-reconnection logic for network interruptions

### Database Optimization
- **Hosted Services**: Migrated to hosted MySQL (Aiven) and MongoDB (Atlas) for better reliability
- **Environment Variables**: All database connections use environment variables for security
- **Connection Pooling**: Optimized database connection management for better performance
- **Index Optimization**: Added proper indexes for faster query performance

### Media Handling Improvements
- **Cloudinary Integration**: Secure cloud storage for all media files
- **Automatic Cleanup**: Media files are automatically deleted when messages/chatrooms are removed
- **Cross-Platform Access**: Media URLs work consistently across web and mobile
- **Type Validation**: Enhanced media type validation and processing

### Security Enhancements
- **JWT Token Management**: Improved token validation and refresh mechanisms
- **CORS Configuration**: Proper cross-origin resource sharing for web clients
- **Rate Limiting**: Protection against API abuse and spam
- **Input Validation**: Enhanced validation for all API endpoints

## Key Features

- **RESTful API**: Clean API design following REST principles
- **Real-time Messaging**: Advanced WebSocket support for instant messaging
  - **Instant Message Delivery**: Messages appear immediately across all connected clients
  - **Live Message Broadcasting**: Real-time message distribution to chatroom members
  - **Auto-reconnection**: Robust connection management with exponential backoff
  - **Connection Status Tracking**: Real-time connection monitoring and status updates
- **Message Read Status**: Complete blue tick system with read/unread tracking
  - **Grey/Blue Tick Indicators**: Visual read status like WhatsApp/Telegram
    - Single grey tick: Message delivered (not read)
    - Double grey tick: Message read by some recipients
    - Double blue tick: Message read by ALL recipients
  - **Real-time Read Status Updates**: Read status changes instantly via WebSocket
  - **Individual message read status tracking**: Per-user read status for each message
  - **Unread message counts per chatroom**: Live unread count updates
  - **Latest message tracking for chatroom overview**: Real-time sidebar updates
  - **Auto-mark messages as read functionality**: Automatic read marking when viewing
  - **First unread message navigation**: Smart scroll to unread content
- **WebSocket Real-time Features**:
  - **Live Sidebar Updates**: Unread counts update instantly without refresh
  - **Real-time Message Appearance**: New messages appear immediately in chat
  - **Live Read Receipt Updates**: Blue ticks update in real-time when messages are read
  - **Connection Management**: Automatic reconnection with status indicators
  - **Broadcast System**: Efficient message distribution to all connected users
- **Authentication**: Secure JWT-based authentication
- **Password Security**: bcrypt hashing with automatic salting
- **Chatroom Management**: Room codes, passwords, and member management
- **Database Integration**:
  - MySQL for user data and authentication
  - MongoDB for chat data (messages, chatrooms, read status)
- **Media Handling**: Support for uploading media files to Cloudinary cloud storage
- **Push Notifications**: Real-time push notifications via Expo Push API
  - **Cross-Platform Support**: Works with React Native Expo apps on iOS and Android
  - **Smart Notification Management**: Notifications shown only when app is in background
  - **Badge Count Management**: Automatic badge count updates based on unread messages
  - **Notification Categories**: Support for quick actions like "Reply" and "Mark as Read"
  - **Token Management**: Secure push token registration and management
  - **Background Processing**: Asynchronous notification sending to prevent blocking
- **API Documentation**: Swagger UI for interactive API documentation
- **Structured Logging**: JSON-formatted logs with logrus
- **Environment Configuration**: Flexible configuration via environment variables
- **Database Migrations**: Automatic schema migrations with GORM

## API Endpoints

All API endpoints are prefixed with `/api` except for health check and Swagger documentation.

### Authentication (No Auth Required)

#### Register User
- **POST** `/api/auth/register`
- **Description**: Register a new user with username, email, and password
- **Request Body**:
  ```json
  {
    "username": "string (3-50 chars, required)",
    "email": "string (valid email, required)",
    "password": "string (min 6 chars, required)"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "user": {
      "user_id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "member",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "token": "jwt_token_string"
  }
  ```

#### Login User
- **POST** `/api/auth/login`
- **Description**: Login with email and password to get authentication token
- **Request Body**:
  ```json
  {
    "email": "string (required)",
    "password": "string (required)"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "user": {
      "user_id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "member",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "token": "jwt_token_string"
  }
  ```

### Authentication (Auth Required)

All endpoints below require `Authorization: Bearer <token>` header.

#### Logout User
- **POST** `/api/auth/logout`
- **Description**: Logout the authenticated user
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`

#### Register Push Token
- **POST** `/api/auth/push-token`
- **Description**: Register a push notification token for the authenticated user
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "token": "string (required) - Expo push token",
    "platform": "string (required) - Platform: ios, android, web",
    "device_info": {
      "device_type": "string (optional) - Device type",
      "app_version": "string (optional) - App version",
      "os_version": "string (optional) - OS version",
      "device_model": "string (optional) - Device model"
    }
  }
  ```
- **Response**: `201 Created` or `200 OK` (if token already exists)
  ```json
  {
    "message": "Push token registered successfully"
  }
  ```

#### Update Push Token
- **PUT** `/api/auth/push-token`
- **Description**: Update an existing push notification token
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: Same as register push token
- **Response**: `200 OK`
  ```json
  {
    "message": "Push token updated successfully"
  }
  ```

#### Remove Push Token
- **DELETE** `/api/auth/push-token`
- **Description**: Deactivate all push notification tokens for the authenticated user
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
  ```json
  {
    "message": "Push token removed successfully"
  }
  ```

### Chatrooms (Auth Required)

#### Get User's Chatrooms
- **GET** `/api/chatrooms`
- **Description**: Get all chatrooms that the authenticated user has joined
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
  ```json
  {
    "chatrooms": [
      {
        "id": "60d5f8b8e6b5f0b3e8b4b5b3",
        "name": "General Chat",
        "created_by": 1,
        "created_by_name": "john_doe",
        "created_at": "2024-01-01T00:00:00Z",
        "member_count": 5
      }
    ]
  }
  ```

#### Get User's Chatrooms (Alternative)
- **GET** `/api/chatrooms/user`
- **Description**: Alternative endpoint to get user's joined chatrooms
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Same as above

#### Get Chatroom by ID
- **GET** `/api/chatrooms/:id`
- **Description**: Get detailed information about a specific chatroom
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: `id` (string) - Chatroom ObjectID
- **Response**: `200 OK`
  ```json
  {
    "chatroom": {
      "id": "60d5f8b8e6b5f0b3e8b4b5b3",
      "name": "General Chat",
      "created_by": 1,
      "created_by_name": "john_doe",
      "created_at": "2024-01-01T00:00:00Z",
      "member_count": 5
    }
  }
  ```

#### Create Chatroom
- **POST** `/api/chatrooms`
- **Description**: Create a new chatroom (user automatically joins)
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "name": "string (3-100 chars, required)"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "chatroom": {
      "id": "60d5f8b8e6b5f0b3e8b4b5b3",
      "name": "New Chat",
      "created_by": 1,
      "created_by_name": "john_doe",
      "created_at": "2024-01-01T00:00:00Z",
      "member_count": 1
    }
  }
  ```

#### Join Chatroom
- **POST** `/api/chatrooms/:id/join`
- **Description**: Join an existing chatroom
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: `id` (string) - Chatroom ObjectID
- **Response**: `200 OK`
  ```json
  {
    "message": "Joined chatroom successfully"
  }
  ```

#### Delete Chatroom
- **DELETE** `/api/chatrooms/:id`
- **Description**: Delete a chatroom and all its messages (only creator can delete)
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: `id` (string) - Chatroom ObjectID
- **Response**: `200 OK`
  ```json
  {
    "message": "Chatroom deleted successfully"
  }
  ```
- **Error Responses**:
  - `403 Forbidden`: Only the chatroom creator can delete the chatroom
  - `404 Not Found`: Chatroom not found
- **Note**: This operation will permanently delete:
  - The chatroom itself
  - All messages in the chatroom
  - All media files associated with messages in Cloudinary

### Messages (Auth Required)

#### Get Messages
- **GET** `/api/chatrooms/:id/messages`
- **Description**: Get messages from a chatroom (user must be a member)
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - `id` (string) - Chatroom ObjectID
  - `limit` (query, optional) - Number of messages to retrieve (default: 50)
- **Response**: `200 OK`
  ```json
  {
    "messages": [
      {
        "id": "60d5f8b8e6b5f0b3e8b4b5b4",
        "chatroom_id": "60d5f8b8e6b5f0b3e8b4b5b3",
        "sender_id": 1,
        "sender_name": "john_doe",
        "message_type": "text",
        "text_content": "Hello everyone!",
        "media_url": "",
        "sent_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
  ```

#### Send Message
- **POST** `/api/chatrooms/:id/messages`
- **Description**: Send a message to a chatroom (user must be a member)
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: `id` (string) - Chatroom ObjectID
- **Request Body**:
  ```json
  {
    "message_type": "text|picture|audio|video|text_and_picture|text_and_audio|text_and_video",
    "text_content": "string (required for text and combined types)",
    "media_url": "string (required for media and combined types)"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "message": {
      "id": "60d5f8b8e6b5f0b3e8b4b5b4",
      "chatroom_id": "60d5f8b8e6b5f0b3e8b4b5b3",
      "sender_id": 1,
      "sender_name": "john_doe",
      "message_type": "text",
      "text_content": "Hello everyone!",
      "media_url": "",
      "sent_at": "2024-01-01T00:00:00Z"
    }
  }
  ```

#### Update Message
- **PUT** `/api/chatrooms/:id/messages/:messageId`
- **Description**: Update an existing message content and/or media (only sender can update)
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - `id` (string) - Chatroom ObjectID
  - `messageId` (string) - Message ObjectID
- **Request Body**:
  ```json
  {
    "text_content": "string (optional) - Updated text content",
    "media_url": "string (optional) - New media URL or empty string to remove media"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "message": {
      "id": "60d5f8b8e6b5f0b3e8b4b5b4",
      "chatroom_id": "60d5f8b8e6b5f0b3e8b4b5b3",
      "sender_id": 1,
      "sender_name": "john_doe",
      "message_type": "text",
      "text_content": "Updated message content",
      "media_url": "",
      "sent_at": "2024-01-01T00:00:00Z",
      "edited": true,
      "edited_at": "2024-01-01T00:05:00Z"
    }
  }
  ```
- **Error Responses**:
  - `403 Forbidden`: You can only update your own messages
  - `404 Not Found`: Message not found
- **Note**: When updating media, the old media file is automatically deleted from Cloudinary

#### Delete Message
- **DELETE** `/api/chatrooms/:id/messages/:messageId`
- **Description**: Delete a message and its associated media (only sender can delete)
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - `id` (string) - Chatroom ObjectID
  - `messageId` (string) - Message ObjectID
- **Response**: `200 OK`
  ```json
  {
    "message": "Message deleted successfully"
  }
  ```
- **Error Responses**:
  - `403 Forbidden`: You can only delete your own messages
  - `404 Not Found`: Message not found
- **Note**: This operation will permanently delete:
  - The message from the database
  - Any associated media file from Cloudinary

### Media (Auth Required)

#### Upload Media
- **POST** `/api/media/upload`
- **Description**: Upload media files (images, audio, video) to Cloudinary
- **Headers**: `Authorization: Bearer <token>`
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `file` (file, required) - Media file to upload
  - `message_type` (string, required) - One of: `picture`, `audio`, `video`, `text_and_picture`, `text_and_audio`, `text_and_video`
- **Response**: `201 Created`
  ```json
  {
    "media_url": "https://res.cloudinary.com/your-cloud/image/upload/v123456789/abc123.jpg",
    "file_name": "abc123.jpg",
    "message_type": "picture"
  }
  ```

### Message Read Status (Auth Required)

#### Mark Message as Read
- **POST** `/api/messages/read`
- **Description**: Mark a specific message as read by the authenticated user
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "message_id": "60d5f8b8e6b5f0b3e8b4b5b4"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "message": "Message marked as read successfully"
  }
  ```

#### Mark Multiple Messages as Read
- **POST** `/api/messages/read-multiple`
- **Description**: Mark multiple messages as read by the authenticated user
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  ["60d5f8b8e6b5f0b3e8b4b5b4", "60d5f8b8e6b5f0b3e8b4b5b5"]
  ```
- **Response**: `200 OK`
  ```json
  {
    "message": "Messages marked as read successfully"
  }
  ```

#### Get Unread Counts
- **GET** `/api/messages/unread-counts`
- **Description**: Get unread message counts for all chatrooms the user has joined
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
  ```json
  [
    {
      "chatroom_id": "60d5f8b8e6b5f0b3e8b4b5b3",
      "chatroom_name": "General Chat",
      "unread_count": 5
    }
  ]
  ```

#### Get Latest Messages
- **GET** `/api/messages/latest`
- **Description**: Get the latest message for each chatroom the user has joined
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
  ```json
  [
    {
      "chatroom_id": "60d5f8b8e6b5f0b3e8b4b5b3",
      "chatroom_name": "General Chat",
      "message_id": "60d5f8b8e6b5f0b3e8b4b5b4",
      "sender_name": "john_doe",
      "message_type": "text",
      "text_content": "Hello everyone!",
      "sent_at": "2024-01-01T00:00:00Z",
      "read_status": [
        {
          "user_id": 1,
          "username": "john_doe",
          "is_read": true,
          "read_at": "2024-01-01T00:00:00Z"
        }
      ]
    }
  ]
  ```

#### Get Message Read Status
- **GET** `/api/messages/:message_id/read-status`
- **Description**: Get read status information for a specific message
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: `message_id` (string) - Message ObjectID
- **Response**: `200 OK`
  ```json
  [
    {
      "user_id": 1,
      "username": "john_doe",
      "is_read": true,
      "read_at": "2024-01-01T00:00:00Z"
    }
  ]
  ```

#### Get Detailed Read Status
- **GET** `/api/messages/:message_id/read-by-who`
- **Description**: Get detailed information about who has read a specific message
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: `message_id` (string) - Message ObjectID
- **Response**: `200 OK`
  ```json
  [
    {
      "id": "60d5f8b8e6b5f0b3e8b4b5b6",
      "message_id": "60d5f8b8e6b5f0b3e8b4b5b4",
      "chatroom_id": "60d5f8b8e6b5f0b3e8b4b5b3",
      "sender_id": 1,
      "recipient_id": 2,
      "is_read": true,
      "read_at": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
  ```

#### Get User's Last Read Message
- **GET** `/api/chatrooms/:id/last-read`
- **Description**: Get the last message that the authenticated user has read in a specific chatroom
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: `id` (string) - Chatroom ObjectID
- **Response**: `200 OK`
  ```json
  {
    "id": "60d5f8b8e6b5f0b3e8b4b5b7",
    "chatroom_id": "60d5f8b8e6b5f0b3e8b4b5b3",
    "user_id": 1,
    "message_id": "60d5f8b8e6b5f0b3e8b4b5b4",
    "read_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
  ```

#### Mark All Messages in Chatroom as Read
- **POST** `/api/chatrooms/:id/mark-all-read`
- **Description**: Mark all unread messages in a specific chatroom as read for the authenticated user
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: `id` (string) - Chatroom ObjectID
- **Response**: `200 OK`
  ```json
  {
    "message": "All messages marked as read successfully"
  }
  ```

#### Get First Unread Message
- **GET** `/api/chatrooms/:id/first-unread`
- **Description**: Get the first unread message for the authenticated user in a specific chatroom
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: `id` (string) - Chatroom ObjectID
- **Response**: `200 OK`
  ```json
  {
    "id": "60d5f8b8e6b5f0b3e8b4b5b4",
    "chatroom_id": "60d5f8b8e6b5f0b3e8b4b5b3",
    "sender_id": 1,
    "sender_name": "john_doe",
    "message_type": "text",
    "text_content": "Hello everyone!",
    "sent_at": "2024-01-01T00:00:00Z"
  }
  ```

#### Get Unread Count for Specific Chatroom
- **GET** `/api/chatrooms/:id/unread-count`
- **Description**: Get unread message count for the authenticated user in a specific chatroom
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: `id` (string) - Chatroom ObjectID
- **Response**: `200 OK`
  ```json
  {
    "unread_count": 5
  }
  ```

### WebSocket (Auth Required)

#### WebSocket Connection Options

##### Option 1: Room-specific Connection (Chat Room WebSocket)
- **GET** `/api/ws`
- **Description**: Establish WebSocket connection for specific chatroom real-time messaging
- **Query Parameters**:
  - `token` (string, required) - JWT authentication token
  - `room_id` (string, required) - Chatroom ObjectID to join
- **Connection URL**: `ws://localhost:8080/api/ws?token=<jwt_token>&room_id=<chatroom_id>`
- **Use Case**: Real-time messaging within a specific chatroom

##### Option 2: User-based Connection (Sidebar WebSocket)
- **GET** `/ws`
- **Description**: Establish WebSocket connection for user-wide real-time updates
- **Query Parameters**:
  - `user_id` (string, required) - User ID for connection
- **Connection URL**: `ws://localhost:8080/ws?user_id=<user_id>`
- **Use Case**: Real-time sidebar updates, unread counts, and cross-chatroom notifications

#### WebSocket Connection Response
```json
{
  "type": "connected",
  "data": {
    "message": "Connected to WebSocket server",
    "user_id": 1,
    "type": "sidebar|chatroom",
    "room_id": "60d5f8b8e6b5f0b3e8b4b5b3" // Only for room-specific connections
  }
}
```

#### WebSocket Message Types

##### Client to Server Messages:
- **Ping**: `{"type": "ping", "data": {"timestamp": "2025-01-24T20:00:00Z"}}` - Keep connection alive
- **Heartbeat**: `{"type": "heartbeat"}` - Alternative keep-alive mechanism

##### Server to Client Messages:

###### Real-time Message Updates:
```json
{
  "type": "new_message",
  "chatroom_id": "60d5f8b8e6b5f0b3e8b4b5b3",
  "data": {
    "id": "message_id",
    "chatroom_id": "60d5f8b8e6b5f0b3e8b4b5b3",
    "sender_id": 1,
    "sender_name": "john_doe",
    "message_type": "text",
    "text_content": "Hello everyone!",
    "media_url": "",
    "sent_at": "2025-01-24T20:00:00Z",
    "read_status": [...]
  }
}
```

###### Real-time Read Status Updates:
```json
{
  "type": "message_read",
  "chatroom_id": "60d5f8b8e6b5f0b3e8b4b5b3",
  "data": {
    "message_id": "message_id",
    "read_status": [
      {"user_id": 1, "is_read": true, "read_at": "2025-01-24T20:00:00Z"},
      {"user_id": 2, "is_read": false}
    ],
    "user_id": 1
  }
}
```

###### Real-time Unread Count Updates:
```json
{
  "type": "unread_count_update",
  "data": [
    {
      "chatroom_id": "60d5f8b8e6b5f0b3e8b4b5b3",
      "unread_count": 3
    },
    {
      "chatroom_id": "60d5f8b8e6b5f0b3e8b4b5b4",
      "unread_count": 0
    }
  ]
}
```

###### Connection Management:
- **Connected**: `{"type": "connected", "data": {...}}` - Connection confirmation
- **Pong**: `{"type": "pong", "data": {"timestamp": "..."}}` - Ping response
- **Heartbeat ACK**: `{"type": "heartbeat_ack", "data": {"timestamp": "..."}}` - Heartbeat response

### Utility Endpoints

#### Health Check
- **GET** `/health`
- **Description**: Check if the server is running
- **Response**: `200 OK`
  ```json
  {
    "status": "ok"
  }
  ```

#### WebSocket Debug
- **GET** `/api/ws-debug`
- **Description**: Debug endpoint to validate JWT tokens for WebSocket connections
- **Query Parameters**: `token` (string, required) - JWT token to validate
- **Response**: `200 OK`
  ```json
  {
    "message": "Token is valid",
    "user_id": 1,
    "username": "john_doe"
  }
  ```

#### Swagger Documentation
- **GET** `/swagger/*any`
- **Description**: Interactive API documentation
- **URL**: `http://localhost:8080/swagger/index.html`

## API Usage Examples

### Complete Workflow Examples

#### 1. User Registration and Authentication

```bash
# Register a new user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# Response: Save the token for subsequent requests
# {
#   "user": {...},
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# }

# Login (if already registered)
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

#### 2. Chatroom Management

```bash
# Set your token as environment variable for convenience
export TOKEN="your_jwt_token_here"

# Create a new chatroom
curl -X POST http://localhost:8080/api/chatrooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Project Discussion"
  }'

# Get all available chatrooms
curl -X GET http://localhost:8080/api/chatrooms \
  -H "Authorization: Bearer $TOKEN"

# Get user's joined chatrooms
curl -X GET http://localhost:8080/api/chatrooms/user \
  -H "Authorization: Bearer $TOKEN"

# Join an existing chatroom
curl -X POST http://localhost:8080/api/chatrooms/60d5f8b8e6b5f0b3e8b4b5b3/join \
  -H "Authorization: Bearer $TOKEN"

# Get specific chatroom details
curl -X GET http://localhost:8080/api/chatrooms/60d5f8b8e6b5f0b3e8b4b5b3 \
  -H "Authorization: Bearer $TOKEN"

# Delete a chatroom (creator only)
curl -X DELETE http://localhost:8080/api/chatrooms/60d5f8b8e6b5f0b3e8b4b5b3 \
  -H "Authorization: Bearer $TOKEN"
```

#### 3. Message Operations

```bash
# Send a text message
curl -X POST http://localhost:8080/api/chatrooms/60d5f8b8e6b5f0b3e8b4b5b3/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "text",
    "text_content": "Hello everyone! How is the project going?"
  }'

# Get messages from a chatroom
curl -X GET "http://localhost:8080/api/chatrooms/60d5f8b8e6b5f0b3e8b4b5b3/messages?limit=20" \
  -H "Authorization: Bearer $TOKEN"

# Update a message
curl -X PUT http://localhost:8080/api/chatrooms/60d5f8b8e6b5f0b3e8b4b5b3/messages/60d5f8b8e6b5f0b3e8b4b5b4 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text_content": "Hello everyone! How is the project going? (Updated)"
  }'

# Delete a message
curl -X DELETE http://localhost:8080/api/chatrooms/60d5f8b8e6b5f0b3e8b4b5b3/messages/60d5f8b8e6b5f0b3e8b4b5b4 \
  -H "Authorization: Bearer $TOKEN"
```

#### 4. Media Upload and Messaging

```bash
# Upload an image
curl -X POST http://localhost:8080/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/your/image.jpg" \
  -F "message_type=picture"

# Response will include media_url:
# {
#   "media_url": "https://res.cloudinary.com/your-cloud/image/upload/v123456789/abc123.jpg",
#   "file_name": "abc123.jpg",
#   "message_type": "picture"
# }

# Send a picture message using the uploaded media URL
curl -X POST http://localhost:8080/api/chatrooms/60d5f8b8e6b5f0b3e8b4b5b3/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "picture",
    "media_url": "https://res.cloudinary.com/your-cloud/image/upload/v123456789/abc123.jpg"
  }'

# Send a combined text and picture message
curl -X POST http://localhost:8080/api/chatrooms/60d5f8b8e6b5f0b3e8b4b5b3/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "text_and_picture",
    "text_content": "Check out this amazing screenshot!",
    "media_url": "https://res.cloudinary.com/your-cloud/image/upload/v123456789/abc123.jpg"
  }'

# Update message with new media
curl -X PUT http://localhost:8080/api/chatrooms/60d5f8b8e6b5f0b3e8b4b5b3/messages/60d5f8b8e6b5f0b3e8b4b5b4 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text_content": "Updated caption for the image",
    "media_url": "https://res.cloudinary.com/your-cloud/image/upload/v123456789/new_image.jpg"
  }'
```

#### 5. WebSocket Connection Examples

##### Real-time Chat Room Connection
```javascript
// JavaScript WebSocket example for chatroom-specific real-time messaging
const token = "your_jwt_token_here";
const roomId = "60d5f8b8e6b5f0b3e8b4b5b3";
const ws = new WebSocket(`ws://localhost:8080/api/ws?token=${token}&room_id=${roomId}`);

ws.onopen = function(event) {
    console.log("Connected to chatroom WebSocket");

    // Send heartbeat to keep connection alive
    setInterval(() => {
        ws.send(JSON.stringify({ type: "heartbeat" }));
    }, 30000); // Every 30 seconds
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log("Received:", message);

    switch(message.type) {
        case "connected":
            console.log("Successfully connected to room:", message.data.room_id);
            break;
        case "new_message":
            console.log("New message in room:", message.chatroom_id, message.data);
            // Update your chat UI with the new message
            displayNewMessage(message.data);
            break;
        case "message_read":
            console.log("Message read status update:", message.data);
            // Update read status indicators (grey/blue ticks)
            updateReadStatus(message.data.message_id, message.data.read_status);
            break;
        case "heartbeat_ack":
            console.log("Heartbeat acknowledged");
            break;
    }
};

ws.onerror = function(error) {
    console.error("WebSocket error:", error);
};

ws.onclose = function(event) {
    console.log("WebSocket connection closed:", event.code, event.reason);
};
```

##### Real-time Sidebar Updates Connection
```javascript
// JavaScript WebSocket example for sidebar real-time updates
const userId = "123"; // Get from localStorage or user context
const sidebarWs = new WebSocket(`ws://localhost:8080/ws?user_id=${userId}`);

sidebarWs.onopen = function(event) {
    console.log("Connected to sidebar WebSocket");

    // Send ping to keep connection alive
    setInterval(() => {
        sidebarWs.send(JSON.stringify({
            type: "ping",
            data: { timestamp: new Date().toISOString() }
        }));
    }, 30000); // Every 30 seconds
};

sidebarWs.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log("Sidebar update received:", message);

    switch(message.type) {
        case "connected":
            console.log("Successfully connected to sidebar updates");
            break;
        case "new_message":
            console.log("New message notification:", message.data);
            // Update sidebar with new message indicator
            updateSidebarNewMessage(message.chatroom_id, message.data);
            break;
        case "unread_count_update":
            console.log("Unread counts updated:", message.data);
            // Update unread count badges in sidebar
            updateUnreadCounts(message.data);
            break;
        case "message_read":
            console.log("Read status update:", message.data);
            // Update read status if currently viewing the chatroom
            if (currentChatroomId === message.chatroom_id) {
                updateReadStatus(message.data.message_id, message.data.read_status);
            }
            break;
        case "pong":
            console.log("Ping acknowledged");
            break;
    }
};

sidebarWs.onerror = function(error) {
    console.error("Sidebar WebSocket error:", error);
};

sidebarWs.onclose = function(event) {
    console.log("Sidebar WebSocket connection closed:", event.code, event.reason);
    // Attempt to reconnect after a delay
    setTimeout(() => {
        console.log("Attempting to reconnect sidebar WebSocket...");
        // Recreate connection
    }, 5000);
};

// Helper functions for UI updates
function displayNewMessage(messageData) {
    // Add new message to chat UI
    const messageElement = createMessageElement(messageData);
    document.getElementById('messages-container').appendChild(messageElement);
    scrollToBottom();
}

function updateReadStatus(messageId, readStatus) {
    // Update grey/blue tick indicators
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
        const tickElement = messageElement.querySelector('.read-status-tick');
        if (readStatus.every(status => status.is_read)) {
            // All read - blue double tick
            tickElement.className = 'read-status-tick blue-tick';
            tickElement.title = 'Read by all';
        } else if (readStatus.some(status => status.is_read)) {
            // Some read - grey double tick
            tickElement.className = 'read-status-tick grey-double-tick';
            tickElement.title = 'Read by some';
        } else {
            // None read - single grey tick
            tickElement.className = 'read-status-tick grey-single-tick';
            tickElement.title = 'Delivered';
        }
    }
}

function updateUnreadCounts(unreadData) {
    // Update sidebar unread count badges
    unreadData.forEach(item => {
        const badgeElement = document.getElementById(`unread-badge-${item.chatroom_id}`);
        if (badgeElement) {
            if (item.unread_count > 0) {
                badgeElement.textContent = item.unread_count;
                badgeElement.style.display = 'block';
            } else {
                badgeElement.style.display = 'none';
            }
        }
    });
}

function updateSidebarNewMessage(chatroomId, messageData) {
    // Update latest message preview in sidebar
    const chatroomElement = document.getElementById(`chatroom-${chatroomId}`);
    if (chatroomElement) {
        const latestMessageElement = chatroomElement.querySelector('.latest-message');
        if (latestMessageElement) {
            latestMessageElement.textContent = messageData.text_content || '[Media]';
        }
    }
}
```

### Error Handling Examples

```bash
# Example of handling authentication errors
curl -X GET http://localhost:8080/api/chatrooms \
  -H "Authorization: Bearer invalid_token"

# Response: 401 Unauthorized
# {
#   "error": "Please log in to continue"
# }

# Example of handling permission errors
curl -X DELETE http://localhost:8080/api/chatrooms/60d5f8b8e6b5f0b3e8b4b5b3/messages/60d5f8b8e6b5f0b3e8b4b5b4 \
  -H "Authorization: Bearer $TOKEN"

# Response: 403 Forbidden (if not message owner)
# {
#   "error": "You can only delete your own messages"
# }

# Example of handling validation errors
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ab",
    "email": "invalid-email",
    "password": "123"
  }'

# Response: 400 Bad Request
# {
#   "error": "Username must be at least 3 characters long"
# }
```

### Testing API Endpoints

```bash
# Health check
curl -X GET http://localhost:8080/health

# WebSocket token validation
curl -X GET "http://localhost:8080/api/ws-debug?token=$TOKEN"

# Test file upload with different media types
curl -X POST http://localhost:8080/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/audio.mp3" \
  -F "message_type=audio"

curl -X POST http://localhost:8080/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/video.mp4" \
  -F "message_type=video"
```

## API Quick Reference

### Complete Endpoint List

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| **Authentication** |
| POST | `/api/auth/register` | Register new user | ❌ |
| POST | `/api/auth/login` | Login user | ❌ |
| POST | `/api/auth/logout` | Logout user | ✅ |
| POST | `/api/auth/push-token` | Register push token | ✅ |
| PUT | `/api/auth/push-token` | Update push token | ✅ |
| DELETE | `/api/auth/push-token` | Remove push token | ✅ |
| **Chatrooms** |
| GET | `/api/chatrooms` | Get all chatrooms | ✅ |
| GET | `/api/chatrooms/user` | Get user's joined chatrooms | ✅ |
| GET | `/api/chatrooms/:id` | Get chatroom by ID | ✅ |
| POST | `/api/chatrooms` | Create new chatroom | ✅ |
| POST | `/api/chatrooms/:id/join` | Join chatroom | ✅ |
| DELETE | `/api/chatrooms/:id` | Delete chatroom (creator only) | ✅ |
| **Messages** |
| GET | `/api/chatrooms/:id/messages` | Get messages from chatroom | ✅ |
| POST | `/api/chatrooms/:id/messages` | Send message to chatroom | ✅ |
| PUT | `/api/chatrooms/:id/messages/:messageId` | Update message (sender only) | ✅ |
| DELETE | `/api/chatrooms/:id/messages/:messageId` | Delete message (sender only) | ✅ |
| **Media** |
| POST | `/api/media/upload` | Upload media to Cloudinary | ✅ |
| **WebSocket** |
| GET | `/api/ws` | WebSocket connection | ✅ |
| **Utility** |
| GET | `/health` | Health check | ❌ |
| GET | `/api/ws-debug` | WebSocket token validation | ❌ |
| GET | `/swagger/*any` | API documentation | ❌ |

### New Features Summary

#### 🆕 Message Management
- **Update Messages**: Edit text content and/or replace media files
- **Delete Messages**: Remove messages and associated media from Cloudinary
- **Media Cleanup**: Automatic deletion of old media when updating messages

#### 🆕 Chatroom Management
- **Delete Chatrooms**: Remove entire chatrooms (creator only)
- **Cascade Deletion**: Automatically deletes all messages and media in the chatroom
- **Permission Control**: Only chatroom creators can delete their chatrooms

#### 🆕 Enhanced Security
- **Owner-Only Operations**: Users can only modify their own messages
- **Creator-Only Operations**: Only chatroom creators can delete chatrooms
- **Automatic Cleanup**: No orphaned media files left in Cloudinary

#### 🆕 Error Handling
- **Specific Error Messages**: Clear, actionable error messages for different scenarios
- **Proper HTTP Status Codes**: RESTful status codes for different error types
- **Graceful Degradation**: Operations continue even if media deletion fails

### Permission Matrix

| Operation | Permission Required | Notes |
|-----------|-------------------|-------|
| Create Chatroom | Authenticated User | User automatically becomes creator and member |
| Join Chatroom | Authenticated User | Any user can join any chatroom |
| Delete Chatroom | Chatroom Creator | Only the user who created the chatroom |
| Send Message | Chatroom Member | User must be a member of the chatroom |
| Update Message | Message Sender | Only the user who sent the message |
| Delete Message | Message Sender | Only the user who sent the message |
| Upload Media | Authenticated User | Any authenticated user can upload media |

## Database Schema

### MySQL (User Data)
- **users**: User accounts and authentication data
- **push_tokens**: Push notification tokens for mobile devices
  - `id`: Primary key
  - `user_id`: Foreign key to users table
  - `token`: Expo push token (unique)
  - `platform`: Device platform (ios, android, web)
  - `device_info`: JSON field with device information
  - `is_active`: Boolean flag for active tokens
  - `created_at`, `updated_at`: Timestamps

### MongoDB (Chat Data)
- **chatrooms**: Chat room information and members
- **messages**: Chat messages with metadata

## Push Notification System

### Overview

The GinChat backend includes a comprehensive push notification system that integrates with Expo's Push API to deliver real-time notifications to mobile devices. The system is designed to work seamlessly with React Native Expo applications.

### Key Features

- **Cross-Platform Support**: Works with iOS and Android devices via Expo Push API
- **Smart Notification Management**: Notifications are only sent when the app is in background/killed
- **Automatic Message Notifications**: Push notifications are automatically sent when new messages are received
- **Token Management**: Secure registration and management of push tokens per user
- **Background Processing**: Notifications are sent asynchronously to prevent blocking message sending
- **Device Information Tracking**: Stores device metadata for better notification management

### Architecture

#### Components

1. **PushToken Model** (`models/push_token.go`)
   - Stores push tokens in MySQL database
   - Links tokens to user accounts
   - Tracks device information and platform
   - Manages token activation status

2. **PushNotificationService** (`services/push_notification_service.go`)
   - Handles communication with Expo Push API
   - Manages notification sending logic
   - Retrieves chatroom members from MongoDB
   - Formats notification content

3. **PushTokenController** (`controllers/push_token_controller.go`)
   - Provides REST API endpoints for token management
   - Handles token registration, updates, and removal
   - Validates token format and device information

#### Integration Points

- **Message Controller**: Automatically triggers push notifications when messages are sent
- **WebSocket System**: Coordinates with real-time messaging to avoid duplicate notifications
- **Authentication System**: All push token operations require valid JWT authentication

### API Endpoints

#### Push Token Management

- `POST /api/auth/push-token` - Register a new push token
- `PUT /api/auth/push-token` - Update an existing push token
- `DELETE /api/auth/push-token` - Deactivate push tokens for user

### Notification Flow

1. **Token Registration**: Mobile app registers push token with backend
2. **Message Sent**: User sends message in chatroom
3. **Member Lookup**: System finds all chatroom members except sender
4. **Token Retrieval**: Active push tokens retrieved for recipient users
5. **Notification Formatting**: Message content formatted for notification
6. **Expo API Call**: Notification sent via Expo Push API
7. **Error Handling**: Failed notifications logged for debugging

### Notification Content

Notifications include:
- **Title**: "New message in [Chatroom Name]"
- **Body**: "[Sender Name]: [Message Content]" (truncated if too long)
- **Data**: Chatroom ID, sender ID, message type for deep linking
- **Sound**: Default notification sound
- **Priority**: High priority for immediate delivery

### Media Message Handling

For media messages without text content:
- **Picture**: "📷 Photo"
- **Audio**: "🎵 Audio"
- **Video**: "🎥 Video"
- **Other**: "📎 Media"

### Error Handling

The system includes comprehensive error handling:
- **Database Errors**: Graceful handling of connection issues
- **Expo API Errors**: Logging of failed notification attempts
- **Invalid Tokens**: Automatic cleanup of invalid/expired tokens
- **Network Issues**: Retry logic for temporary failures

### Security Considerations

- **Authentication Required**: All push token operations require valid JWT
- **User Isolation**: Users can only manage their own push tokens
- **Token Validation**: Push tokens are validated before storage
- **Secure Storage**: Tokens stored securely in MySQL database

### Performance Optimizations

- **Asynchronous Processing**: Notifications sent in background goroutines
- **Batch Operations**: Multiple tokens processed efficiently
- **Database Indexing**: Optimized queries for token retrieval
- **Connection Pooling**: Efficient database connection management

### Configuration

No additional configuration required beyond standard database setup. The system uses:
- **Expo Push API**: `https://exp.host/--/api/v2/push/send`
- **MySQL Database**: For push token storage
- **MongoDB Database**: For chatroom member lookup

### Monitoring and Debugging

The system provides detailed logging for:
- Token registration/updates
- Notification sending attempts
- Expo API responses
- Error conditions and failures

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

### Connection Requirements

The WebSocket endpoint requires both authentication token and room ID:

```
ws://localhost:8080/api/ws?token=<jwt_token>&room_id=<chatroom_id>
```

### Connection Flow

1. **Authentication**: Token is validated on connection
2. **Room Assignment**: User is automatically joined to the specified chatroom
3. **Duplicate Prevention**: Any existing connections for the user are closed
4. **Rate Limiting**: Connection attempts are rate-limited (500ms cooldown)

### Message Format

All WebSocket messages follow this JSON format:

```json
{
  "type": "message_type",
  "chatroom_id": "optional_chatroom_id",
  "data": {
    // Message-specific data
  }
}
```

### Supported Message Types

#### Client to Server:
- **Heartbeat**: `{"type": "heartbeat"}` - Keep connection alive
- **Chat Message**: `{"type": "chat_message", "chatroom_id": "...", "data": {...}}` - Send chat message

#### Server to Client:
- **Connected**: `{"type": "connected", "data": {...}}` - Connection confirmation
- **Heartbeat ACK**: `{"type": "heartbeat_ack", "data": {...}}` - Heartbeat response
- **New Message**: `{"type": "new_message", "chatroom_id": "...", "data": {...}}` - Broadcast new messages

### Error Handling

- **401 Unauthorized**: Invalid or missing token
- **400 Bad Request**: Missing room_id parameter
- **429 Too Many Requests**: Rate limit exceeded

## Error Response Format

All API errors follow a consistent JSON format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data or parameters
- **401 Unauthorized**: Authentication required or invalid token
- **403 Forbidden**: User lacks permission for the requested resource
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists or conflict with current state
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Authentication Errors

- **Missing Authorization Header**: `{"error": "Authorization header is required"}`
- **Invalid Token Format**: `{"error": "Authorization header must be in the format 'Bearer {token}'"}`
- **Invalid/Expired Token**: `{"error": "Invalid or expired token"}`

### Validation Errors

- **Missing Required Fields**: `{"error": "Key: 'RegisterRequest.Username' Error:Field validation for 'Username' failed on the 'required' tag"}`
- **Invalid Email Format**: `{"error": "Key: 'RegisterRequest.Email' Error:Field validation for 'Email' failed on the 'email' tag"}`
- **Password Too Short**: `{"error": "Key: 'RegisterRequest.Password' Error:Field validation for 'Password' failed on the 'min' tag"}`

### Business Logic Errors

- **Email Already Exists**: `{"error": "An account with this email already exists. Please use a different email address"}`
- **Username Already Taken**: `{"error": "This username is already taken. Please choose a different username"}`
- **Invalid Credentials**: `{"error": "Invalid email or password. Please check your credentials and try again"}`
- **Chatroom Not Found**: `{"error": "Chat room not found. It may have been deleted"}`
- **User Not Member**: `{"error": "You are not a member of this chat room"}`
- **Already Member**: `{"error": "You are already a member of this chat room"}`
- **Invalid Message Type**: `{"error": "Invalid message type selected"}`

## Media Message Workflow

To send a message with media (picture, audio, video), follow this two-step process:

### Step 1: Upload Media
```bash
curl -X POST http://localhost:8080/api/media/upload \
  -H "Authorization: Bearer <your_jwt_token>" \
  -F "file=@/path/to/your/image.jpg" \
  -F "message_type=picture"
```

Response:
```json
{
  "media_url": "https://res.cloudinary.com/your-cloud/image/upload/v123456789/abc123.jpg",
  "file_name": "abc123.jpg",
  "message_type": "picture"
}
```

### Step 2: Send Message with Media URL
```bash
curl -X POST http://localhost:8080/api/chatrooms/60d5f8b8e6b5f0b3e8b4b5b3/messages \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "picture",
    "media_url": "https://res.cloudinary.com/your-cloud/image/upload/v123456789/abc123.jpg"
  }'
```

### Combined Text and Media Messages
For combined messages (e.g., `text_and_picture`), include both `text_content` and `media_url`:

```json
{
  "message_type": "text_and_picture",
  "text_content": "Check out this amazing photo!",
  "media_url": "https://res.cloudinary.com/your-cloud/image/upload/v123456789/abc123.jpg"
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

### Authentication & Authorization
- **JWT Tokens**: Signed with HS256 algorithm using a secret key
- **Token Validation**: All protected endpoints validate JWT tokens via middleware
- **Token Expiration**: Configurable token expiration (default: 24h)
- **Bearer Token Format**: Tokens must be sent as `Authorization: Bearer <token>`

### Password Security
- **bcrypt Hashing**: Passwords are hashed using bcrypt with automatic salting
- **No Salt Storage**: Salt is embedded in the bcrypt hash, no separate salt field needed
- **Password Strength**: Minimum 6 characters required (additional validation can be added)
- **Timing Attack Prevention**: Login attempts include random delays

### Input Validation
- **Request Binding**: All endpoints use Gin's ShouldBindJSON for automatic validation
- **Field Validation**: Required fields, length limits, and format validation
- **SQL Injection Prevention**: GORM provides automatic SQL injection protection
- **NoSQL Injection Prevention**: MongoDB driver handles query sanitization

### WebSocket Security
- **Token Authentication**: WebSocket connections require valid JWT tokens
- **Room Authorization**: Users can only join chatrooms they're members of
- **Rate Limiting**: Connection attempts are rate-limited (500ms cooldown)
- **Connection Management**: Duplicate connections are automatically closed

### CORS Configuration
- **Cross-Origin Requests**: CORS middleware allows all origins (configure for production)
- **Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Allowed Headers**: Content-Type, Authorization, and other standard headers

### Media Upload Security
- **Authentication Required**: All media uploads require valid JWT tokens
- **File Type Validation**: Media type validation based on message type
- **Cloud Storage**: Files are stored in Cloudinary, not on local server
- **URL Generation**: Secure URLs generated by Cloudinary service

### Production Security Recommendations
- **Environment Variables**: Store sensitive data (JWT_SECRET, DB credentials) in environment variables
- **HTTPS**: Use HTTPS in production for encrypted communication
- **CORS Restriction**: Restrict CORS origins to your frontend domain(s)
- **Rate Limiting**: Implement additional rate limiting for API endpoints
- **Input Sanitization**: Add additional input sanitization for user-generated content
- **Database Security**: Use strong database passwords and restrict network access
- **Logging**: Implement comprehensive logging for security monitoring

## Recent Updates & Improvements

### Push Notification System Implementation (Latest)
- **Expo Push API Integration**: Complete push notification system using Expo's Push API
- **Cross-Platform Support**: Works seamlessly with React Native Expo apps on iOS and Android
- **Smart Notification Management**: Notifications only sent when app is in background/killed state
- **Automatic Message Notifications**: Push notifications automatically triggered when new messages are sent
- **Token Management System**: Secure registration, update, and removal of push tokens
- **Background Processing**: Asynchronous notification sending to prevent blocking message operations
- **Device Information Tracking**: Stores device metadata for better notification management
- **MongoDB Integration**: Retrieves chatroom members from MongoDB for targeted notifications
- **Comprehensive Error Handling**: Graceful handling of Expo API errors and network issues
- **Security Features**: JWT authentication required for all push token operations

### Optimized WebSocket Performance & Navigation Support (Previous)
- **Simplified Broadcasting**: Streamlined WebSocket broadcasting to reduce server load and connection issues
- **Async Operations**: Made unread count updates asynchronous to prevent blocking
- **Efficient Read Status Updates**: Optimized `message_read` event broadcasting for better performance
- **Navigation API Support**: Backend provides reliable first unread message API for frontend navigation
- **Connection Stability**: Reduced WebSocket overhead and improved connection reliability
- **Performance Optimization**: Eliminated complex logging and statistics that caused connection timeouts

### Real-time Read Status Broadcasting (Previous)
- **Enhanced WebSocket Broadcasting**: Improved `message_read` event broadcasting for real-time tick updates
- **Automatic Read Status Updates**: Backend automatically broadcasts read status changes via WebSocket
- **Multi-Event Broadcasting**: Supports both single message and bulk message read status updates
- **Chatroom-Specific Broadcasting**: Read status updates sent only to relevant chatroom members
- **Comprehensive Event Coverage**: Broadcasts on `MarkMessageAsRead`, `MarkAllMessagesInChatroomAsRead`
- **Real-time Synchronization**: All connected users receive instant read status updates

### WebSocket Enhancements (Previous)
- **Thread-Safe WebSocket Connections**: Implemented `SafeWebSocketConn` wrapper to prevent concurrent write crashes
- **Simplified Auto-Mark Logic**: Removed complex auto-marking during WebSocket broadcasts for better performance
- **Enhanced Connection Management**: Added panic recovery and better error handling for WebSocket operations
- **Dual Connection Architecture**: Separate WebSocket connections for chat rooms and sidebar updates
- **Improved Logging**: Better connection type identification and debugging information

### Read Status System Optimizations
- **Visual Tick Indicators**: Simple grey/blue tick system based on existing read status data
- **Real-time Updates**: Read status changes propagate instantly via WebSocket without additional API calls
- **Performance Improvements**: Reduced database operations and API calls for better responsiveness
- **Connection Stability**: Eliminated connection issues caused by excessive auto-marking requests

### Security & Performance
- **Cloudinary Integration**: Secure media storage with automatic cleanup on message/chatroom deletion
- **JWT Security**: Robust token-based authentication with proper validation
- **Database Optimization**: Efficient queries and connection pooling for better performance
- **Error Handling**: Comprehensive error handling with proper HTTP status codes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
