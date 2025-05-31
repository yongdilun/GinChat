package controllers

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ginchat/utils"
	"github.com/gorilla/websocket"
	"github.com/sirupsen/logrus"
)

// SafeWebSocketConn wraps a WebSocket connection with a mutex for thread-safe writes
type SafeWebSocketConn struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

// NewSafeWebSocketConn creates a new thread-safe WebSocket connection wrapper
func NewSafeWebSocketConn(conn *websocket.Conn) *SafeWebSocketConn {
	return &SafeWebSocketConn{
		conn: conn,
	}
}

// WriteMessage safely writes a message to the WebSocket connection
func (s *SafeWebSocketConn) WriteMessage(messageType int, data []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.conn.WriteMessage(messageType, data)
}

// Close safely closes the WebSocket connection
func (s *SafeWebSocketConn) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.conn.Close()
}

// ReadMessage reads a message from the WebSocket connection (no mutex needed for reads)
func (s *SafeWebSocketConn) ReadMessage() (messageType int, p []byte, err error) {
	return s.conn.ReadMessage()
}

// WebSocketController handles WebSocket connections
// Add user activity tracking for better push notification management
type WebSocketController struct {
	clients               map[uint]map[*SafeWebSocketConn]bool
	rooms                 map[string]map[*SafeWebSocketConn]bool
	clientsMux            sync.RWMutex
	broadcast             chan []byte
	logger                *logrus.Logger
	connectionAttempts    map[uint]time.Time
	connectionAttemptsMux sync.RWMutex
	// Add these fields for activity tracking
	userActivity          map[uint]time.Time // Track last activity per user
	userActivityMux       sync.RWMutex
}

// Global WebSocket controller instance for broadcasting messages
var GlobalWebSocketController *WebSocketController

// Update the constructor to initialize new fields
func NewWebSocketController(logger *logrus.Logger) *WebSocketController {
	controller := &WebSocketController{
		clients:            make(map[uint]map[*SafeWebSocketConn]bool),
		rooms:              make(map[string]map[*SafeWebSocketConn]bool),
		broadcast:          make(chan []byte),
		logger:             logger,
		connectionAttempts: make(map[uint]time.Time),
		userActivity:       make(map[uint]time.Time), // Initialize activity tracking
	}

	// Start broadcast handler
	go controller.handleBroadcasts()

	// Start a goroutine to periodically clean up old connection attempts
	go controller.cleanupConnectionAttempts()

	// Set the global instance
	GlobalWebSocketController = controller

	return controller
}

// Add method to update user activity when they connect or send messages
func (wsc *WebSocketController) UpdateUserActivity(userID uint) {
	wsc.userActivityMux.Lock()
	defer wsc.userActivityMux.Unlock()
	wsc.userActivity[userID] = time.Now()
}

// Add method to check if user is recently active (for push notification optimization)
func (wsc *WebSocketController) IsUserRecentlyActive(userID uint, threshold time.Duration) bool {
	wsc.userActivityMux.RLock()
	defer wsc.userActivityMux.RUnlock()
	
	if lastActivity, exists := wsc.userActivity[userID]; exists {
		return time.Since(lastActivity) < threshold
	}
	return false
}

// WebSocketMessage represents a message sent over WebSocket
type WebSocketMessage struct {
	Type       string `json:"type"`
	ChatroomID string `json:"chatroom_id,omitempty"`
	Data       any    `json:"data"`
}

// WebSocket connection upgrader
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for now
	},
}

// Rate limiting constants
const (
	connectionCooldown = 1 * time.Second // Increased to 1 second to prevent connection storms
)

// HandleConnection handles a WebSocket connection
func (wsc *WebSocketController) HandleConnection(c *gin.Context) {
	// Unified token-based connection for both mobile and web
	// Always get token from query param
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No token provided"})
		return
	}

	// Validate token
	claims, err := utils.ValidateJWT(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
		return
	}
	uid := claims.UserID

	// Apply rate limiting for connection attempts
	if !wsc.canConnect(uid) {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "Too many connection attempts, please wait"})
		return
	}

	// Get room ID
	roomID := c.Query("room_id")
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No room ID provided"})
		return
	}

	// Allow multiple connections per user (don't close existing connections)
	// This allows both mobile app (chat room) and web app (sidebar) to connect simultaneously

	// Upgrade HTTP connection to WebSocket
	rawConn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		// Connection upgrade failed
		return
	}

	// Wrap in SafeWebSocketConn
	conn := NewSafeWebSocketConn(rawConn)

	// Register client
	wsc.clientsMux.Lock()
	if _, ok := wsc.clients[uid]; !ok {
		wsc.clients[uid] = make(map[*SafeWebSocketConn]bool)
	}
	wsc.clients[uid][conn] = true

	// Register client in the room
	if _, ok := wsc.rooms[roomID]; !ok {
		wsc.rooms[roomID] = make(map[*SafeWebSocketConn]bool)
	}
	wsc.rooms[roomID][conn] = true
	wsc.clientsMux.Unlock()
	
	wsc.UpdateUserActivity(uid)
	wsc.logger.Infof("User %d (chat room connection) connected to room %s via token-based WebSocket", uid, roomID)

	// Send connection success message
	connectMsg := WebSocketMessage{
		Type: "connected",
		Data: map[string]any{
			"message": "Connected to WebSocket server",
			"user_id": uid,
			"room_id": roomID,
		},
	}
	connectJSON, _ := json.Marshal(connectMsg)
	conn.WriteMessage(websocket.TextMessage, connectJSON)

	// Handle client disconnection
	defer func() {
		// Recover from any panics during cleanup
		if r := recover(); r != nil {
			wsc.logger.Errorf("Panic during WebSocket cleanup for user %d: %v", uid, r)
		}

		wsc.clientsMux.Lock()
		// Remove from clients map
		if connections, ok := wsc.clients[uid]; ok {
			delete(connections, conn)
			if len(connections) == 0 {
				delete(wsc.clients, uid)
			}
		}
		// Remove from room map
		if clients, ok := wsc.rooms[roomID]; ok {
			delete(clients, conn)
			if len(clients) == 0 {
				delete(wsc.rooms, roomID)
			}
		}
		wsc.clientsMux.Unlock()
		conn.Close()
		wsc.logger.Infof("User %d (chat room connection) disconnected from room %s", uid, roomID)
	}()

	// Start ping-pong to keep connection alive
	go wsc.pingClient(conn, uid)

	// Handle incoming messages
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}

		// Process message
		var msg WebSocketMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		// Process message directly (removed duplicate prevention for simplicity)

		// Handle different message types
		switch msg.Type {
		case "heartbeat":
			heartbeatMsg := WebSocketMessage{
				Type: "heartbeat_ack",
				Data: map[string]string{
					"timestamp": time.Now().Format(time.RFC3339),
				},
			}
			heartbeatJSON, _ := json.Marshal(heartbeatMsg)
			conn.WriteMessage(websocket.TextMessage, heartbeatJSON)
		case "chat_message":
			// Update user activity when they send messages
			wsc.UpdateUserActivity(uid)
			// Broadcast message only to the specified room
			if msg.ChatroomID != "" {
				wsc.clientsMux.RLock()
				if clients, ok := wsc.rooms[msg.ChatroomID]; ok {
					for client := range clients {
						client.WriteMessage(websocket.TextMessage, message)
					}
				}
				wsc.clientsMux.RUnlock()
			}
		}
	}
}

// canConnect checks if a user can connect (rate limiting)
func (wsc *WebSocketController) canConnect(uid uint) bool {
	wsc.connectionAttemptsMux.Lock()
	defer wsc.connectionAttemptsMux.Unlock()

	lastAttempt, exists := wsc.connectionAttempts[uid]
	now := time.Now()

	// Allow connection if no previous attempt or enough time has passed
	if !exists || now.Sub(lastAttempt) > connectionCooldown {
		wsc.connectionAttempts[uid] = now
		return true
	}

	return false
}

// Update cleanup to also clean user activity
func (wsc *WebSocketController) cleanupConnectionAttempts() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()
		
		// Clean connection attempts
		wsc.connectionAttemptsMux.Lock()
		for uid, timestamp := range wsc.connectionAttempts {
			if now.Sub(timestamp) > 5*time.Minute {
				delete(wsc.connectionAttempts, uid)
			}
		}
		wsc.connectionAttemptsMux.Unlock()

		// Clean user activity older than 1 hour
		wsc.userActivityMux.Lock()
		for uid, timestamp := range wsc.userActivity {
			if now.Sub(timestamp) > 1*time.Hour {
				delete(wsc.userActivity, uid)
			}
		}
		wsc.userActivityMux.Unlock()
	}
}
// pingClient sends periodic pings to keep the connection alive
func (wsc *WebSocketController) pingClient(conn *SafeWebSocketConn, _ uint) {
	ticker := time.NewTicker(90 * time.Second) // Increased to 90 seconds to avoid conflicts
	defer ticker.Stop()

	for range ticker.C {
		if err := conn.WriteMessage(websocket.PingMessage, []byte{}); err != nil {
			return
		}
	}
}

// handleBroadcasts processes messages from the broadcast channel
func (wsc *WebSocketController) handleBroadcasts() {
	for message := range wsc.broadcast {
		// Parse the message to determine which chatroom it's for
		var msg WebSocketMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			wsc.logger.Errorf("Failed to unmarshal broadcast message: %v", err)
			continue
		}

		// Only broadcast to the specified chatroom
		if msg.ChatroomID != "" {
			wsc.clientsMux.RLock()
			if clients, ok := wsc.rooms[msg.ChatroomID]; ok {
				for client := range clients {
					client.WriteMessage(websocket.TextMessage, message)
				}
			}
			wsc.clientsMux.RUnlock()
		}
	}
}

// BroadcastNewMessage broadcasts a new message to clients in a specific chatroom
func (wsc *WebSocketController) BroadcastNewMessage(chatroomID string, message any) {
	if wsc == nil {
		return // Safety check
	}

	// Create WebSocket message
	wsMessage := WebSocketMessage{
		Type:       "new_message",
		ChatroomID: chatroomID,
		Data:       message,
	}

	// Marshal to JSON
	jsonMessage, err := json.Marshal(wsMessage)
	if err != nil {
		wsc.logger.Errorf("Failed to marshal WebSocket message: %v", err)
		return
	}

	// Send to broadcast channel for room-specific broadcasting
	wsc.broadcast <- jsonMessage

	// Also send to all connected users for sidebar updates
	wsc.clientsMux.RLock()
	for userID, connections := range wsc.clients {
		for conn := range connections {
			func() {
				defer func() {
					if r := recover(); r != nil {
						wsc.logger.Errorf("Panic while broadcasting new message to user %d: %v", userID, r)
					}
				}()
				err := conn.WriteMessage(websocket.TextMessage, jsonMessage)
				if err != nil {
					wsc.logger.Errorf("Failed to send new message notification to user %d: %v", userID, err)
				}
			}()
		}
	}
	wsc.clientsMux.RUnlock()

	wsc.logger.Infof("Broadcasted new message to chatroom %s", chatroomID)
}

// BroadcastNewMessageGlobal is a helper function to broadcast a message using the global controller
func BroadcastNewMessageGlobal(chatroomID string, message any) {
	if GlobalWebSocketController != nil {
		GlobalWebSocketController.BroadcastNewMessage(chatroomID, message)
	}
}

// BroadcastMessageRead broadcasts message read status updates to ALL connected clients (like new messages)
func (wsc *WebSocketController) BroadcastMessageRead(chatroomID string, readData any) {
	if wsc == nil {
		return // Safety check
	}

	// Create WebSocket message
	wsMessage := WebSocketMessage{
		Type:       "message_read",
		ChatroomID: chatroomID,
		Data:       readData,
	}

	// Marshal to JSON
	jsonMessage, err := json.Marshal(wsMessage)
	if err != nil {
		wsc.logger.Errorf("Failed to marshal WebSocket message: %v", err)
		return
	}

	// FIXED: Send read status updates to ALL connected users (like new messages)
	// This ensures message senders receive read status updates even if they're not in the chatroom
	wsc.clientsMux.RLock()
	totalConnections := 0
	for userID, connections := range wsc.clients {
		for conn := range connections {
			func() {
				defer func() {
					if r := recover(); r != nil {
						wsc.logger.Errorf("Panic while broadcasting read status to user %d: %v", userID, r)
					}
				}()
				err := conn.WriteMessage(websocket.TextMessage, jsonMessage)
				if err != nil {
					wsc.logger.Errorf("Failed to send read status update to user %d: %v", userID, err)
				} else {
					totalConnections++
				}
			}()
		}
	}
	wsc.clientsMux.RUnlock()

	wsc.logger.Infof("Broadcasted message read status to ALL users (%d connections) for chatroom %s", totalConnections, chatroomID)
}

// BroadcastMessageReadGlobal is a helper function to broadcast message read status using the global controller
func BroadcastMessageReadGlobal(chatroomID string, readData any) {
	if GlobalWebSocketController != nil {
		GlobalWebSocketController.BroadcastMessageRead(chatroomID, readData)
	}
}

// BroadcastMessageUpdated broadcasts message update events to clients in a specific chatroom
func (wsc *WebSocketController) BroadcastMessageUpdated(chatroomID string, messageData any) {
	if wsc == nil {
		return // Safety check
	}

	// Create WebSocket message
	wsMessage := WebSocketMessage{
		Type:       "message_updated",
		ChatroomID: chatroomID,
		Data:       messageData,
	}

	// Marshal to JSON
	jsonMessage, err := json.Marshal(wsMessage)
	if err != nil {
		wsc.logger.Errorf("Failed to marshal WebSocket message: %v", err)
		return
	}

	// Send to broadcast channel for room-specific broadcasting
	wsc.broadcast <- jsonMessage

	// Also send to all connected users for sidebar updates
	wsc.clientsMux.RLock()
	for userID, connections := range wsc.clients {
		for conn := range connections {
			func() {
				defer func() {
					if r := recover(); r != nil {
						wsc.logger.Errorf("Panic while broadcasting message update to user %d: %v", userID, r)
					}
				}()
				err := conn.WriteMessage(websocket.TextMessage, jsonMessage)
				if err != nil {
					wsc.logger.Errorf("Failed to send message update notification to user %d: %v", userID, err)
				}
			}()
		}
	}
	wsc.clientsMux.RUnlock()

	wsc.logger.Infof("Broadcasted message update to chatroom %s", chatroomID)
}

// BroadcastMessageUpdatedGlobal is a helper function to broadcast message updates using the global controller
func BroadcastMessageUpdatedGlobal(chatroomID string, messageData any) {
	if GlobalWebSocketController != nil {
		GlobalWebSocketController.BroadcastMessageUpdated(chatroomID, messageData)
	}
}

// BroadcastMessageDeleted broadcasts message deletion events to clients in a specific chatroom
func (wsc *WebSocketController) BroadcastMessageDeleted(chatroomID string, deleteData any) {
	if wsc == nil {
		return // Safety check
	}

	// Create WebSocket message
	wsMessage := WebSocketMessage{
		Type:       "message_deleted",
		ChatroomID: chatroomID,
		Data:       deleteData,
	}

	// Marshal to JSON
	jsonMessage, err := json.Marshal(wsMessage)
	if err != nil {
		wsc.logger.Errorf("Failed to marshal WebSocket message: %v", err)
		return
	}

	// Send to broadcast channel for room-specific broadcasting
	wsc.broadcast <- jsonMessage

	// Also send to all connected users for sidebar updates
	wsc.clientsMux.RLock()
	for userID, connections := range wsc.clients {
		for conn := range connections {
			func() {
				defer func() {
					if r := recover(); r != nil {
						wsc.logger.Errorf("Panic while broadcasting message deletion to user %d: %v", userID, r)
					}
				}()
				err := conn.WriteMessage(websocket.TextMessage, jsonMessage)
				if err != nil {
					wsc.logger.Errorf("Failed to send message deletion notification to user %d: %v", userID, err)
				}
			}()
		}
	}
	wsc.clientsMux.RUnlock()

	wsc.logger.Infof("Broadcasted message deletion to chatroom %s", chatroomID)
}

// BroadcastMessageDeletedGlobal is a helper function to broadcast message deletions using the global controller
func BroadcastMessageDeletedGlobal(chatroomID string, deleteData any) {
	if GlobalWebSocketController != nil {
		GlobalWebSocketController.BroadcastMessageDeleted(chatroomID, deleteData)
	}
}

// BroadcastUnreadCountUpdate broadcasts unread count updates to a specific user
func (wsc *WebSocketController) BroadcastUnreadCountUpdate(userID uint, unreadData any) {
	if wsc == nil {
		return // Safety check
	}

	// Create WebSocket message
	wsMessage := WebSocketMessage{
		Type: "unread_count_update",
		Data: unreadData,
	}

	// Marshal to JSON
	jsonMessage, err := json.Marshal(wsMessage)
	if err != nil {
		wsc.logger.Errorf("Failed to marshal WebSocket message: %v", err)
		return
	}

	// Send directly to user's connections (all rooms including sidebar)
	wsc.clientsMux.RLock()
	if connections, ok := wsc.clients[userID]; ok {
		wsc.logger.Infof("Broadcasting unread count update to user %d (%d connections)", userID, len(connections))
		for conn := range connections {
			err := conn.WriteMessage(websocket.TextMessage, jsonMessage)
			if err != nil {
				wsc.logger.Errorf("Failed to send unread count update to user %d: %v", userID, err)
			}
		}
	} else {
		wsc.logger.Warnf("No WebSocket connections found for user %d", userID)
	}

	// Also broadcast to global sidebar room for mobile apps
	if clients, ok := wsc.rooms["global_sidebar"]; ok {
		wsc.logger.Infof("Broadcasting unread count update to global_sidebar room (%d connections)", len(clients))
		for conn := range clients {
			// Check if this connection belongs to the target user
			for connUserID, userConnections := range wsc.clients {
				if connUserID == userID {
					if _, hasConn := userConnections[conn]; hasConn {
						err := conn.WriteMessage(websocket.TextMessage, jsonMessage)
						if err != nil {
							wsc.logger.Errorf("Failed to send unread count update to sidebar for user %d: %v", userID, err)
						}
						break
					}
				}
			}
		}
	}
	wsc.clientsMux.RUnlock()
}

// BroadcastUnreadCountUpdateGlobal is a helper function to broadcast unread count updates using the global controller
func BroadcastUnreadCountUpdateGlobal(userID uint, unreadData any) {
	if GlobalWebSocketController != nil {
		GlobalWebSocketController.BroadcastUnreadCountUpdate(userID, unreadData)
	}
}

// GetConnectedUsersInRoom returns a list of user IDs currently connected to a specific room
func (wsc *WebSocketController) GetConnectedUsersInRoom(roomID string) []uint {
	if wsc == nil {
		return []uint{}
	}

	wsc.clientsMux.RLock()
	defer wsc.clientsMux.RUnlock()

	var connectedUsers []uint

	// Check if the room exists
	if clients, ok := wsc.rooms[roomID]; ok {
		// Create a map to track unique user IDs (in case a user has multiple connections)
		userMap := make(map[uint]bool)

		// Find which users are connected to this room
		for _, userConnections := range wsc.clients {
			for conn := range userConnections {
				// Check if this connection is in the specified room
				if _, inRoom := clients[conn]; inRoom {
					// Find the user ID for this connection
					for userID, connections := range wsc.clients {
						if _, hasConn := connections[conn]; hasConn {
							userMap[userID] = true
							break
						}
					}
				}
			}
		}

		// Convert map keys to slice
		for userID := range userMap {
			connectedUsers = append(connectedUsers, userID)
		}
	}

	return connectedUsers
}
