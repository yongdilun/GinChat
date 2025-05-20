package controllers

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/sirupsen/logrus"
)

// WebSocketController handles WebSocket connections
type WebSocketController struct {
	clients    map[uint]map[*websocket.Conn]bool
	clientsMux sync.RWMutex
	broadcast  chan []byte
	logger     *logrus.Logger
}

// NewWebSocketController creates a new WebSocketController
func NewWebSocketController(logger *logrus.Logger) *WebSocketController {
	controller := &WebSocketController{
		clients:   make(map[uint]map[*websocket.Conn]bool),
		broadcast: make(chan []byte),
		logger:    logger,
	}

	// Start broadcast handler
	go controller.handleBroadcasts()

	return controller
}

// WebSocketMessage represents a message sent over WebSocket
type WebSocketMessage struct {
	Type       string      `json:"type"`
	ChatroomID string      `json:"chatroom_id,omitempty"`
	Data       interface{} `json:"data"`
}

// WebSocket connection upgrader
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for now
	},
}

// HandleConnection handles a WebSocket connection
func (wsc *WebSocketController) HandleConnection(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	uid := userID.(uint)

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		wsc.logger.Errorf("Failed to upgrade connection: %v", err)
		return
	}

	// Register client
	wsc.clientsMux.Lock()
	if _, ok := wsc.clients[uid]; !ok {
		wsc.clients[uid] = make(map[*websocket.Conn]bool)
	}
	wsc.clients[uid][conn] = true
	wsc.clientsMux.Unlock()

	// Send connection success message
	connectMsg := WebSocketMessage{
		Type: "connected",
		Data: map[string]interface{}{
			"message": "Connected to WebSocket server",
			"user_id": uid,
		},
	}
	connectJSON, _ := json.Marshal(connectMsg)
	conn.WriteMessage(websocket.TextMessage, connectJSON)

	// Handle client disconnection
	defer func() {
		wsc.clientsMux.Lock()
		delete(wsc.clients[uid], conn)
		if len(wsc.clients[uid]) == 0 {
			delete(wsc.clients, uid)
		}
		wsc.clientsMux.Unlock()
		conn.Close()
	}()

	// Start ping-pong to keep connection alive
	go wsc.pingClient(conn, uid)

	// Handle incoming messages
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				wsc.logger.Errorf("WebSocket error: %v", err)
			}
			break
		}

		// Process message (could be a heartbeat, chat message, etc.)
		var msg WebSocketMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			wsc.logger.Errorf("Failed to unmarshal message: %v", err)
			continue
		}

		// Handle different message types
		switch msg.Type {
		case "heartbeat":
			// Update user's heartbeat timestamp
			// This would typically update the user's status in the database
			heartbeatMsg := WebSocketMessage{
				Type: "heartbeat_ack",
				Data: map[string]string{
					"timestamp": time.Now().Format(time.RFC3339),
				},
			}
			heartbeatJSON, _ := json.Marshal(heartbeatMsg)
			conn.WriteMessage(websocket.TextMessage, heartbeatJSON)

		case "chat_message":
			// Broadcast the message to all clients
			wsc.broadcast <- message

		default:
			wsc.logger.Warnf("Unknown message type: %s", msg.Type)
		}
	}
}

// pingClient sends periodic pings to keep the connection alive
func (wsc *WebSocketController) pingClient(conn *websocket.Conn, _ uint) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := conn.WriteMessage(websocket.PingMessage, []byte{}); err != nil {
				wsc.logger.Warnf("Failed to ping client: %v", err)
				return
			}
		}
	}
}

// handleBroadcasts processes messages from the broadcast channel
func (wsc *WebSocketController) handleBroadcasts() {
	for {
		message := <-wsc.broadcast

		// Parse the message to determine which chatroom it's for
		var msg WebSocketMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			wsc.logger.Errorf("Failed to unmarshal broadcast message: %v", err)
			continue
		}

		// Send the message to all connected clients
		wsc.clientsMux.RLock()
		for _, clients := range wsc.clients {
			for client := range clients {
				if err := client.WriteMessage(websocket.TextMessage, message); err != nil {
					wsc.logger.Errorf("Failed to send message: %v", err)
					client.Close()
				}
			}
		}
		wsc.clientsMux.RUnlock()
	}
}
