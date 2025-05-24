package services

import (
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// WebSocketService handles WebSocket connections and message broadcasting
type WebSocketService struct {
	clients    map[*websocket.Conn]uint // Map of connections to user IDs
	clientsMux sync.RWMutex             // Mutex for thread-safe access to clients map
	upgrader   websocket.Upgrader       // WebSocket upgrader
}

// WebSocketMessage represents a message sent over WebSocket
type WebSocketMessage struct {
	Type       string      `json:"type"`
	Data       interface{} `json:"data"`
	UserID     uint        `json:"user_id,omitempty"`
	ChatroomID string      `json:"chatroom_id,omitempty"`
}

// NewWebSocketService creates a new WebSocket service
func NewWebSocketService() *WebSocketService {
	return &WebSocketService{
		clients: make(map[*websocket.Conn]uint),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				// Allow connections from any origin in development
				// In production, you should check the origin properly
				return true
			},
		},
	}
}

// HandleWebSocket handles WebSocket connection upgrades
func (ws *WebSocketService) HandleWebSocket(c *gin.Context) {
	// Get user ID from query parameter (since WebSocket doesn't support headers easily)
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
		return
	}

	// Convert user ID to uint
	var userID uint
	if _, err := fmt.Sscanf(userIDStr, "%d", &userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id"})
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := ws.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	// Register client
	ws.clientsMux.Lock()
	ws.clients[conn] = userID
	ws.clientsMux.Unlock()

	log.Printf("User %d connected via WebSocket", userID)

	// Send welcome message
	welcomeMsg := WebSocketMessage{
		Type: "connected",
		Data: map[string]interface{}{
			"message": "Connected to WebSocket",
			"user_id": userID,
		},
	}
	ws.sendToConnection(conn, welcomeMsg)

	// Handle incoming messages
	for {
		var msg WebSocketMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error reading WebSocket message: %v", err)
			break
		}

		// Handle different message types
		switch msg.Type {
		case "ping":
			// Respond with pong
			pongMsg := WebSocketMessage{
				Type: "pong",
				Data: map[string]interface{}{
					"timestamp": msg.Data,
				},
			}
			ws.sendToConnection(conn, pongMsg)
		default:
			log.Printf("Unknown message type: %s", msg.Type)
		}
	}

	// Unregister client
	ws.clientsMux.Lock()
	delete(ws.clients, conn)
	ws.clientsMux.Unlock()

	log.Printf("User %d disconnected from WebSocket", userID)
}

// BroadcastToUser sends a message to a specific user
func (ws *WebSocketService) BroadcastToUser(userID uint, message WebSocketMessage) {
	ws.clientsMux.RLock()
	defer ws.clientsMux.RUnlock()

	for conn, connUserID := range ws.clients {
		if connUserID == userID {
			ws.sendToConnection(conn, message)
		}
	}
}

// BroadcastToChatroom sends a message to all users in a chatroom
func (ws *WebSocketService) BroadcastToChatroom(chatroomID string, userIDs []uint, message WebSocketMessage) {
	ws.clientsMux.RLock()
	defer ws.clientsMux.RUnlock()

	userIDMap := make(map[uint]bool)
	for _, id := range userIDs {
		userIDMap[id] = true
	}

	for conn, connUserID := range ws.clients {
		if userIDMap[connUserID] {
			message.ChatroomID = chatroomID
			ws.sendToConnection(conn, message)
		}
	}
}

// BroadcastToAll sends a message to all connected users
func (ws *WebSocketService) BroadcastToAll(message WebSocketMessage) {
	ws.clientsMux.RLock()
	defer ws.clientsMux.RUnlock()

	for conn := range ws.clients {
		ws.sendToConnection(conn, message)
	}
}

// sendToConnection sends a message to a specific connection
func (ws *WebSocketService) sendToConnection(conn *websocket.Conn, message WebSocketMessage) {
	if err := conn.WriteJSON(message); err != nil {
		log.Printf("Error sending WebSocket message: %v", err)
		// Close the connection if there's an error
		conn.Close()
		ws.clientsMux.Lock()
		delete(ws.clients, conn)
		ws.clientsMux.Unlock()
	}
}

// GetConnectedUsers returns the list of connected user IDs
func (ws *WebSocketService) GetConnectedUsers() []uint {
	ws.clientsMux.RLock()
	defer ws.clientsMux.RUnlock()

	users := make([]uint, 0, len(ws.clients))
	for _, userID := range ws.clients {
		users = append(users, userID)
	}
	return users
}

// IsUserConnected checks if a user is currently connected
func (ws *WebSocketService) IsUserConnected(userID uint) bool {
	ws.clientsMux.RLock()
	defer ws.clientsMux.RUnlock()

	for _, connUserID := range ws.clients {
		if connUserID == userID {
			return true
		}
	}
	return false
}

// NotifyNewMessage notifies users about a new message
func (ws *WebSocketService) NotifyNewMessage(chatroomID string, userIDs []uint, messageData interface{}) {
	message := WebSocketMessage{
		Type:       "new_message",
		Data:       messageData,
		ChatroomID: chatroomID,
	}
	ws.BroadcastToChatroom(chatroomID, userIDs, message)
}

// NotifyMessageRead notifies users about message read status updates
func (ws *WebSocketService) NotifyMessageRead(chatroomID string, userIDs []uint, readData interface{}) {
	message := WebSocketMessage{
		Type:       "message_read",
		Data:       readData,
		ChatroomID: chatroomID,
	}
	ws.BroadcastToChatroom(chatroomID, userIDs, message)
}

// NotifyUnreadCountUpdate notifies a user about unread count changes
func (ws *WebSocketService) NotifyUnreadCountUpdate(userID uint, unreadData interface{}) {
	message := WebSocketMessage{
		Type: "unread_count_update",
		Data: unreadData,
	}
	ws.BroadcastToUser(userID, message)
}
