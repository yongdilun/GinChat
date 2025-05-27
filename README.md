# GinChat - Real-time Chat Application

A modern cross-platform real-time chat application with Go (Gin) backend, React (Next.js) web frontend, and React Native mobile app.

## Tech Stack

### Backend
- Go
- Gin Web Framework
- GORM (ORM)
- MySQL (User data)
- MongoDB (Chat data)
- WebSockets (gorilla/websocket)
- JWT Authentication
- Bcrypt for password hashing
- Logrus for logging
- Swagger for API documentation

### Web Frontend
- React
- Next.js
- TypeScript
- Tailwind CSS
- Framer Motion for animations
- Axios for API requests
- WebSockets for real-time communication
- React Hook Form for form handling

### Mobile App
- React Native
- Expo
- TypeScript
- Expo Router for navigation
- Expo AV for media playback
- Expo Linear Gradient for UI effects
- AsyncStorage for local data
- Cloudinary for media storage

## Project Structure

```
GinChat/
├── backend/             # Go backend
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Middleware functions
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── main.go          # Entry point
│   └── go.mod           # Go module file
│
├── frontend/            # React web frontend
│   ├── public/          # Static files
│   ├── src/             # Source code
│   │   ├── components/  # React components
│   │   │   ├── chat/    # Chat-related components
│   │   │   ├── auth/    # Authentication components
│   │   │   └── ui/      # Reusable UI components
│   │   ├── app/         # Next.js app directory
│   │   ├── services/    # API services
│   │   ├── contexts/    # React contexts
│   │   ├── styles/      # CSS styles
│   │   ├── types/       # TypeScript types
│   │   ├── hooks/       # Custom React hooks
│   │   └── utils/       # Utility functions
│   ├── package.json     # NPM package file
│   └── tsconfig.json    # TypeScript config
│
├── GinChatMoible/       # React Native mobile app
│   ├── app/             # Expo Router pages
│   │   ├── (tabs)/      # Tab navigation
│   │   ├── auth/        # Authentication screens
│   │   └── chat/        # Chat screens
│   ├── src/             # Source code
│   │   ├── components/  # React Native components
│   │   │   ├── chat/    # Chat-related components
│   │   │   └── ui/      # Reusable UI components
│   │   ├── contexts/    # React contexts
│   │   ├── services/    # API and WebSocket services
│   │   ├── hooks/       # Custom React hooks
│   │   └── types/       # TypeScript types
│   ├── constants/       # App constants and themes
│   ├── assets/          # Images, icons, and media
│   ├── package.json     # NPM package file
│   └── app.json         # Expo configuration
│
└── README.md            # Project documentation
```

## Setup Instructions

### Prerequisites
- Go 1.16+
- Node.js 16+
- MySQL (or hosted MySQL service)
- MongoDB (or hosted MongoDB service)
- Expo CLI (for mobile development)
- iOS Simulator or Android Emulator (for mobile testing)

### Database Setup
1. Set up MySQL database:
   - Create a new database named `ginchat`
   - The user table will be automatically created when the backend starts

2. Set up MongoDB database:
   - Create a new database named `ginchat`
   - Collections will be automatically created when needed

### Backend Setup
1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a .env file based on .env.example:
   ```
   cp .env.example .env
   ```

3. Edit the .env file with your database credentials:
   ```
   # Server Configuration
   PORT=8080

   # MySQL Configuration
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=your_mysql_user
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DATABASE=ginchat

   # MongoDB Configuration
   MONGO_HOST=localhost
   MONGO_PORT=27017
   MONGO_DATABASE=ginchat
   # MONGO_USER and MONGO_PASSWORD are optional for local development

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRATION=24h
   ```

4. Install Go dependencies:
   ```
   go mod tidy
   ```

5. Uncomment the database initialization lines in main.go:
   ```go
   // initMySQL()
   // initMongoDB()
   // initDatabase()
   ```

6. Run the server:
   ```
   go run main.go
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install NPM dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Mobile App Setup
1. Navigate to the mobile app directory:
   ```
   cd GinChatMoible
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the Expo development server:
   ```
   npx expo start
   ```

4. Run on device/simulator:
   - **iOS**: Press `i` to open iOS Simulator
   - **Android**: Press `a` to open Android Emulator
   - **Physical Device**: Scan QR code with Expo Go app

### Testing the Application
1. Register a new user at http://localhost:3000/auth/register
2. Login with your credentials at http://localhost:3000/auth/login
3. Create a new chatroom
4. Start chatting!

## Features

### Core Features
- **Cross-platform support**: Web and mobile apps
- **User authentication**: Register, login, logout with JWT
- **Real-time messaging**: WebSocket-based instant communication
- **Room management**: Create and join chat rooms with unique codes
- **Password protection**: Optional room passwords for privacy
- **Media support**: Text, images, audio, and video messages
- **Message management**: Edit and delete your own messages
- **Media handling**: View, download, and play media files
- **Unread indicators**: Track unread messages with badges
- **Read receipts**: Blue tick indicators for message read status

### Web-Specific Features
- **Responsive design**: Works on desktop and mobile browsers
- **Collapsible sidebar**: Better space utilization
- **Interactive empty states**: Helpful guidance for new users
- **Smooth animations**: Framer Motion transitions
- **Keyboard shortcuts**: Enhanced productivity

### Mobile-Specific Features
- **Native performance**: React Native with Expo
- **Touch-optimized UI**: Gesture-friendly interface
- **Audio recording**: Built-in voice message recording
- **Media gallery**: Organized media viewing in chat headers
- **Offline support**: Local storage for better performance
- **Push notifications**: Real-time alerts (when configured)
- **Cross-platform sync**: Share rooms between web and mobile

## Room Management

### Creating Chatrooms
- **Room Names**: Each chatroom has a unique name
- **Room Codes**: Automatically generated 6-character codes (e.g., "ABC123")
- **Optional Passwords**: Creators can set passwords for private rooms
- **Auto-Join**: Creators are automatically added as the first member

### Joining Chatrooms
- **By Room Code**: Use the 6-character room code to find and join rooms
- **Password Protection**: Enter password if the room is protected
- **Search First**: Frontend searches for the room, then prompts for password if needed
- **Duplicate Prevention**: Users cannot join the same room twice

### Room Code System
- **Format**: 6 characters using A-Z and 0-9 (e.g., "XYZ789")
- **Uniqueness**: Each room code is guaranteed to be unique
- **Case Insensitive**: Room codes work regardless of case
- **Easy Sharing**: Share room codes with friends to invite them

## WebSocket Implementation

GinChat uses a bidirectional WebSocket communication layer to enable real-time messaging:

### Backend (Go)
- **Connection Management**: Uses gorilla/websocket package to handle WebSocket connections
- **Authentication**: JWT tokens are validated during WebSocket handshake
- **Room-Based Messaging**: Messages are broadcast only to clients connected to the same chatroom
- **Concurrency Handling**: Uses Go's goroutines and channels for efficient message broadcasting
- **Connection Persistence**: Implements heartbeat mechanism to maintain connections

### Web Frontend (TypeScript)
- **Custom WebSocket Hook**: React hook that manages connection lifecycle
- **Automatic Reconnection**: Attempts to reconnect if connection is lost
- **Message Deduplication**: Tracks processed message IDs to prevent duplicate messages
- **Typed Message Events**: Uses TypeScript interfaces for type-safe message handling
- **Chatroom-Specific Connections**: Each chatroom has its own WebSocket connection

### Mobile App (React Native)
- **SimpleWebSocket Service**: Lightweight WebSocket management
- **Persistent Sidebar Connection**: Maintains connection for global updates
- **Room-Specific Connections**: Connects to specific rooms when entering chat
- **Graceful Disconnection**: Properly handles room switching and app backgrounding
- **Auto-Reconnection**: Attempts to reconnect on network changes
- **Cross-Platform Compatibility**: Works on both iOS and Android

### Message Flow
1. Client establishes WebSocket connection with room ID and JWT token
2. Server validates token and adds client to room's broadcast list
3. When a message is sent, it's processed by the server and stored in MongoDB
4. Server broadcasts the message to all connected clients in the same room
5. Clients receive the message and update their UI in real-time

## API Documentation
API documentation is available at `/swagger/index.html` when the backend server is running.

### Key API Endpoints

#### Chatroom Management
- `POST /api/chatrooms` - Create a new chatroom with optional password
- `GET /api/chatrooms` - Get all available chatrooms
- `GET /api/chatrooms/user` - Get user's joined chatrooms
- `GET /api/chatrooms/:id` - Get specific chatroom details
- `POST /api/chatrooms/join` - Join chatroom by room code and password
- `POST /api/chatrooms/:id/join` - Join chatroom by ID (legacy)
- `DELETE /api/chatrooms/:id` - Delete chatroom (creator only)

#### Request Examples

**Create Chatroom:**
```json
POST /api/chatrooms
{
  "name": "My Private Room",
  "password": "secret123"  // Optional
}
```

**Join by Room Code:**
```json
POST /api/chatrooms/join
{
  "room_code": "ABC123",
  "password": "secret123"  // Required if room has password
}
```

## Data Models

### User Table
| Field Name    | Data Type    | Description                        | Constraints                    |
|---------------|--------------|------------------------------------|------------------------------ |
| user_id       | INT          | Unique user ID                     | Primary Key, Auto-increment    |
| username      | VARCHAR(50)  | Unique username                    | Not Null, Unique              |
| email         | VARCHAR(100) | User's email address               | Not Null, Unique              |
| password      | VARCHAR(255) | Hashed password (bcrypt)           | Not Null                      |
| role          | VARCHAR(50)  | Role of the user                   | Default: 'member'             |
| is_login      | BOOLEAN      | Whether the user is logged in      | Default: false                |
| last_login_at | DATETIME     | Last login timestamp               | Nullable                      |
| heartbeat     | DATETIME     | Last heartbeat time                | Nullable                      |
| status        | ENUM         | 'online', 'offline', 'away'        | Default: 'offline'            |
| avatar_url    | VARCHAR(255) | Link to user's avatar              | Nullable                      |
| created_at    | DATETIME     | Timestamp of account creation      | Auto-set                      |
| updated_at    | DATETIME     | Timestamp of last profile update   | Auto-updated                  |

### Chatroom (MongoDB)
- id: ObjectID (Primary Key)
- name: String (Unique)
- room_code: String (Unique, 6 characters)
- password: String (Optional, not returned in API responses)
- has_password: Boolean (Indicates if room is password protected)
- created_by: Integer (User ID)
- created_at: DateTime
- members: Array of ChatroomMember objects

### ChatroomMember (MongoDB, embedded in Chatroom)
- user_id: Integer
- username: String
- joined_at: DateTime

### Message (MongoDB)
- id: ObjectID (Primary Key)
- chatroom_id: ObjectID (Reference to Chatroom)
- sender_id: Integer (User ID)
- sender_name: String
- message_type: String (text, picture, audio, video, text_and_picture, text_and_audio, text_and_video)
- text_content: String (Optional)
- media_url: String (Optional)
- edited: Boolean (Indicates if message was edited)
- edited_at: DateTime (Timestamp of last edit)
- sent_at: DateTime

## Deployment

### Backend Deployment
- **Hosted Services**: Currently deployed on Render.com
- **Database**: Uses hosted MySQL (Aiven) and MongoDB (Atlas)
- **Environment Variables**: All sensitive data stored in environment variables
- **Health Endpoint**: `/api/health` for monitoring service status

### Web Frontend Deployment
- **Platform**: Vercel or Netlify recommended
- **Build Command**: `npm run build`
- **Environment Variables**: Set `NEXT_PUBLIC_API_URL` to backend URL

### Mobile App Deployment
- **Development**: Use Expo Go for testing
- **Production**: Build with `expo build` or EAS Build
- **App Stores**: Deploy to iOS App Store and Google Play Store
- **OTA Updates**: Use Expo's over-the-air updates for quick fixes

## Security
- **Password Hashing**: bcrypt with automatic salting
- **JWT Authentication**: HS256 signing with configurable expiration
- **Token Validation**: Server-side validation for all protected routes
- **HTTPS**: Required for production deployment
- **Media Storage**: Cloudinary for secure media file handling
- **Input Validation**: Server-side validation for all API endpoints
- **CORS**: Configured for cross-origin requests
- **Rate Limiting**: Implemented to prevent abuse
