'use client';

import { WebSocketMessage } from '@/types';

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 3000; // 3 seconds
  private messageListeners: ((message: WebSocketMessage) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];

  // Connect to WebSocket server
  connect() {
    if (this.socket) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found, cannot connect to WebSocket');
      return;
    }

    // Create WebSocket connection
    this.socket = new WebSocket(`ws://${window.location.host}/api/ws`);

    // Connection opened
    this.socket.addEventListener('open', () => {
      console.log('Connected to WebSocket server');
      this.reconnectAttempts = 0;
      this.notifyConnectionListeners(true);

      // Send authentication message
      this.send({
        type: 'auth',
        data: { token },
      });

      // Start heartbeat
      this.startHeartbeat();
    });

    // Listen for messages
    this.socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        this.notifyMessageListeners(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    // Connection closed
    this.socket.addEventListener('close', () => {
      console.log('Disconnected from WebSocket server');
      this.socket = null;
      this.notifyConnectionListeners(false);

      // Attempt to reconnect
      this.reconnect();
    });

    // Connection error
    this.socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      this.socket?.close();
    });
  }

  // Disconnect from WebSocket server
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Send a message to the WebSocket server
  send(message: WebSocketMessage) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  // Send a chat message
  sendChatMessage(chatroomId: string, messageType: string, textContent?: string, mediaURL?: string) {
    this.send({
      type: 'chat_message',
      chatroom_id: chatroomId,
      data: {
        message_type: messageType,
        text_content: textContent,
        media_url: mediaURL,
      },
    });
  }

  // Add a message listener
  addMessageListener(listener: (message: WebSocketMessage) => void) {
    this.messageListeners.push(listener);
  }

  // Remove a message listener
  removeMessageListener(listener: (message: WebSocketMessage) => void) {
    this.messageListeners = this.messageListeners.filter((l) => l !== listener);
  }

  // Add a connection listener
  addConnectionListener(listener: (connected: boolean) => void) {
    this.connectionListeners.push(listener);
  }

  // Remove a connection listener
  removeConnectionListener(listener: (connected: boolean) => void) {
    this.connectionListeners = this.connectionListeners.filter((l) => l !== listener);
  }

  // Notify all message listeners
  private notifyMessageListeners(message: WebSocketMessage) {
    this.messageListeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });
  }

  // Notify all connection listeners
  private notifyConnectionListeners(connected: boolean) {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  // Attempt to reconnect to the WebSocket server
  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectTimeout);
  }

  // Send heartbeat messages to keep the connection alive
  private startHeartbeat() {
    const interval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.send({
          type: 'heartbeat',
          data: {
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        clearInterval(interval);
      }
    }, 30000); // 30 seconds

    // Clear interval when socket closes
    if (this.socket) {
      this.socket.addEventListener('close', () => {
        clearInterval(interval);
      });
    }
  }
}

// Create a singleton instance
const websocketService = new WebSocketService();

export default websocketService;
