# GinChat - Real-time Chat Application

A modern real-time chat application built with Go (Gin) backend and React (Next.js) frontend.

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

### Frontend
- React
- Next.js
- TypeScript
- Tailwind CSS
- Axios for API requests
- Socket.io for WebSocket communication
- React Hook Form for form handling
- Zustand for state management

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
├── frontend/            # React frontend
│   ├── public/          # Static files
│   ├── src/             # Source code
│   │   ├── components/  # React components
│   │   ├── pages/       # Next.js pages
│   │   ├── services/    # API services
│   │   ├── styles/      # CSS styles
│   │   ├── types/       # TypeScript types
│   │   └── utils/       # Utility functions
│   ├── package.json     # NPM package file
│   └── tsconfig.json    # TypeScript config
│
└── README.md            # Project documentation
```

## Setup Instructions

### Prerequisites
- Go 1.16+
- Node.js 14+
- MySQL
- MongoDB

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

### Testing the Application
1. Register a new user at http://localhost:3000/auth/register
2. Login with your credentials at http://localhost:3000/auth/login
3. Create a new chatroom
4. Start chatting!

## Features
- User authentication (register, login, logout)
- Create and join chat rooms
- Real-time messaging
- Message types: text, images, audio, video
- Online status indicators
- User profiles with avatars

## API Documentation
API documentation is available at `/swagger/index.html` when the backend server is running.

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
- message_type: String (text, picture, audio, video, etc.)
- text_content: String (Optional)
- media_url: String (Optional)
- sent_at: DateTime

## Security
- Passwords are hashed using bcrypt with automatic salting (salt is included in the hash)
- JWT tokens are used for authentication with HS256 signing
- Token expiration and validation are handled server-side
- HTTPS is recommended for production deployment
- Frontend code is checked with TypeScript and CSS linting
