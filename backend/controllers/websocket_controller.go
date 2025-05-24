package controllers

import (
	"encoding/json"
	"fmt"
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
type WebSocketController struct {
	clients               map[uint]map[*SafeWebSocketConn]bool
	rooms                 map[string]map[*SafeWebSocketConn]bool
	clientsMux            sync.RWMutex
	broadcast             chan []byte
	logger                *logrus.Logger
	processedMessages     map[string]map[string]bool
	connectionAttempts    map[uint]time.Time
	connectionAttemptsMux sync.RWMutex
}

// Global WebSocket controller instance for broadcasting messages
var GlobalWebSocketController *WebSocketController

// NewWebSocketController creates a new WebSocketController
func NewWebSocketController(logger *logrus.Logger) *WebSocketController {
	controller := &WebSocketController{
		clients:            make(map[uint]map[*SafeWebSocketConn]bool),
		rooms:              make(map[string]map[*SafeWebSocketConn]bool),
		broadcast:          make(chan []byte),
		logger:             logger,
		processedMessages:  make(map[string]map[string]bool),
		connectionAttempts: make(map[uint]time.Time),
	}

	// Start broadcast handler
	go controller.handleBroadcasts()

	// Start a goroutine to periodically clean up old connection attempts
	go controller.cleanupConnectionAttempts()

	// Set the global instance
	GlobalWebSocketController = controller

	return controller
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
	connectionCooldown = 500 * time.Millisecond // Minimum time between connection attempts
)

// HandleConnection handles a WebSocket connection
func (wsc *WebSocketController) HandleConnection(c *gin.Context) {
	// Check if this is a simple user_id connection (for sidebar)
	userIDStr := c.Query("user_id")
	if userIDStr != "" {
		wsc.HandleSimpleConnection(c)
		return
	}

	// Original token-based connection for chat rooms
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

	// Check if this user already has a connection in this room and close it if they do
	wsc.clientsMux.Lock()
	if conns, ok := wsc.clients[uid]; ok {
		// Close all existing connections for this user
		for safeConn := range conns {
			// Remove from room
			for r, clients := range wsc.rooms {
				delete(clients, safeConn)
				if len(clients) == 0 {
					delete(wsc.rooms, r)
				}
			}
			// Close the connection
			safeConn.Close()
		}
		// Clear all connections for this user
		delete(wsc.clients, uid)
	}
	wsc.clientsMux.Unlock()

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

		// Check if this message has already been processed to prevent duplicates
		messageID := string(message)
		if msg.ChatroomID != "" {
			wsc.clientsMux.Lock()
			if _, ok := wsc.processedMessages[msg.ChatroomID]; !ok {
				wsc.processedMessages[msg.ChatroomID] = make(map[string]bool)
			}
			// Skip if already processed
			if wsc.processedMessages[msg.ChatroomID][messageID] {
				wsc.clientsMux.Unlock()
				continue
			}
			// Mark as processed
			wsc.processedMessages[msg.ChatroomID][messageID] = true
			wsc.clientsMux.Unlock()
		}

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

// HandleSimpleConnection handles a simple WebSocket connection for sidebar updates
func (wsc *WebSocketController) HandleSimpleConnection(c *gin.Context) {
	// Get user ID from query param
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No user_id provided"})
		return
	}

	// Convert user ID to uint
	var uid uint
	if _, err := fmt.Sscanf(userIDStr, "%d", &uid); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id"})
		return
	}

	// Apply rate limiting for connection attempts
	if !wsc.canConnect(uid) {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "Too many connection attempts, please wait"})
		return
	}

	// Upgrade HTTP connection to WebSocket
	rawConn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		wsc.logger.Errorf("Failed to upgrade WebSocket connection: %v", err)
		return
	}

	// Wrap in SafeWebSocketConn
	conn := NewSafeWebSocketConn(rawConn)

	// Register client for sidebar updates (no specific room)
	wsc.clientsMux.Lock()
	if _, ok := wsc.clients[uid]; !ok {
		wsc.clients[uid] = make(map[*SafeWebSocketConn]bool)
	}
	wsc.clients[uid][conn] = true
	wsc.clientsMux.Unlock()

	wsc.logger.Infof("User %d (sidebar connection) connected via simple WebSocket", uid)

	// Send connection success message
	connectMsg := WebSocketMessage{
		Type: "connected",
		Data: map[string]any{
			"message": "Connected to WebSocket server",
			"user_id": uid,
			"type":    "sidebar",
		},
	}
	connectJSON, _ := json.Marshal(connectMsg)
	conn.WriteMessage(websocket.TextMessage, connectJSON)

	// Handle client disconnection
	defer func() {
		// Recover from any panics during cleanup
		if r := recover(); r != nil {
			wsc.logger.Errorf("Panic during sidebar WebSocket cleanup for user %d: %v", uid, r)
		}

		wsc.clientsMux.Lock()
		// Remove from clients map
		if connections, ok := wsc.clients[uid]; ok {
			delete(connections, conn)
			if len(connections) == 0 {
				delete(wsc.clients, uid)
			}
		}
		wsc.clientsMux.Unlock()
		conn.Close()
		wsc.logger.Infof("User %d (sidebar connection) disconnected from simple WebSocket", uid)
	}()

	// Start ping-pong to keep connection alive
	go wsc.pingClient(conn, uid)

	// Handle incoming messages
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				wsc.logger.Errorf("WebSocket error for user %d: %v", uid, err)
			}
			break
		}

		// Process message
		var msg WebSocketMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		// Handle different message types
		switch msg.Type {
		case "ping":
			// Respond with pong
			pongMsg := WebSocketMessage{
				Type: "pong",
				Data: map[string]any{
					"timestamp": time.Now().Format(time.RFC3339),
				},
			}
			pongJSON, _ := json.Marshal(pongMsg)
			conn.WriteMessage(websocket.TextMessage, pongJSON)
		case "heartbeat":
			heartbeatMsg := WebSocketMessage{
				Type: "heartbeat_ack",
				Data: map[string]any{
					"timestamp": time.Now().Format(time.RFC3339),
				},
			}
			heartbeatJSON, _ := json.Marshal(heartbeatMsg)
			conn.WriteMessage(websocket.TextMessage, heartbeatJSON)
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

// cleanupConnectionAttempts periodically removes old connection attempts
func (wsc *WebSocketController) cleanupConnectionAttempts() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()
		wsc.connectionAttemptsMux.Lock()
		for uid, timestamp := range wsc.connectionAttempts {
			if now.Sub(timestamp) > 5*time.Minute {
				delete(wsc.connectionAttempts, uid)
			}
		}
		wsc.connectionAttemptsMux.Unlock()

		// Also clean up processed messages to prevent memory leaks
		wsc.clientsMux.Lock()
		for roomID, messages := range wsc.processedMessages {
			// Check if room still exists
			if _, exists := wsc.rooms[roomID]; !exists {
				delete(wsc.processedMessages, roomID)
				continue
			}
			// Remove messages older than 1 hour (not implemented here - would need message timestamps)
			if len(messages) > 1000 {
				// If too many messages, just reset the map
				wsc.processedMessages[roomID] = make(map[string]bool)
			}
		}
		wsc.clientsMux.Unlock()
	}
}

// pingClient sends periodic pings to keep the connection alive
func (wsc *WebSocketController) pingClient(conn *SafeWebSocketConn, _ uint) {
	ticker := time.NewTicker(30 * time.Second)
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

// BroadcastMessageRead broadcasts message read status updates to clients in a specific chatroom
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

	// Send to broadcast channel for room-specific broadcasting
	wsc.broadcast <- jsonMessage

	// Send read status updates only to chatroom members (more efficient)
	wsc.clientsMux.RLock()
	if clients, ok := wsc.rooms[chatroomID]; ok {
		for conn := range clients {
			err := conn.WriteMessage(websocket.TextMessage, jsonMessage)
			if err != nil {
				wsc.logger.Errorf("Failed to send read status update to chatroom %s: %v", chatroomID, err)
			}
		}
	}
	wsc.clientsMux.RUnlock()
}

// BroadcastMessageReadGlobal is a helper function to broadcast message read status using the global controller
func BroadcastMessageReadGlobal(chatroomID string, readData any) {
	if GlobalWebSocketController != nil {
		GlobalWebSocketController.BroadcastMessageRead(chatroomID, readData)
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

	// Send directly to user's connections
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
