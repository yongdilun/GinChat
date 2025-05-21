'use client';

interface WebSocketMessageData {
  type: string;
  data: unknown;
  chatroom_id?: string;
}

interface WebSocketOptions {
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  headers?: Record<string, string>;
}

// Create a global WebSocket manager
class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, WebSocket> = new Map();
  private messageHandlers: Map<string, Set<(data: WebSocketMessageData) => void>> = new Map();
  private connectionAttempts: Map<string, number> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private connectionLocks: Map<string, boolean> = new Map();
  private maxReconnectAttempts = 5;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  // Get or create a connection for a URL
  connect(url: string, options?: WebSocketOptions): boolean {
    // Don't connect if URL is empty
    if (!url) {
      console.log('WebSocket URL is empty, skipping connection');
      return false;
    }

    // Check for connection lock to prevent multiple simultaneous connection attempts
    if (this.connectionLocks.get(url)) {
      console.log(`Connection attempt to ${url} is already in progress`);
      return false;
    }

    // Check if already connected
    const existingConnection = this.connections.get(url);
    if (existingConnection && existingConnection.readyState === WebSocket.OPEN) {
      console.log(`Already connected to ${url}`);
      return true;
    }

    // Set connection lock
    this.connectionLocks.set(url, true);

    try {
      // Clean up any existing connection
      this.disconnect(url);

      // Check connection attempts
      const attempts = this.connectionAttempts.get(url) || 0;
      if (attempts >= this.maxReconnectAttempts) {
        console.log(`Max reconnect attempts (${this.maxReconnectAttempts}) reached for ${url}`);
        this.connectionLocks.set(url, false);
        return false;
      }

      console.log(`Creating WebSocket connection to ${url} (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);
      
      // Create new WebSocket
      const ws = new WebSocket(url);
      this.connections.set(url, ws);
      
      // Update attempt counter
      this.connectionAttempts.set(url, attempts + 1);

      // Set up event handlers
      ws.onopen = () => {
        console.log(`WebSocket connected to ${url}`);
        // Reset connection attempts on successful connection
        this.connectionAttempts.set(url, 0);
        this.connectionLocks.set(url, false);
        
        if (options?.onOpen) {
          options.onOpen();
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessageData;
          // Notify all registered handlers for this URL
          const handlers = this.messageHandlers.get(url);
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(data);
              } catch (err) {
                console.error('Error in message handler:', err);
              }
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log(`WebSocket disconnected from ${url} with code ${event.code}`);
        this.connections.delete(url);
        this.connectionLocks.set(url, false);
        
        if (options?.onClose) {
          options.onClose(event);
        }

        // Only attempt reconnect if not normal closure and within attempt limits
        if (event.code !== 1000 && event.code !== 1001) {
          const attempts = this.connectionAttempts.get(url) || 0;
          if (attempts < this.maxReconnectAttempts) {
            console.log(`Scheduling reconnect to ${url} in 3 seconds`);
            const timer = setTimeout(() => {
              this.connect(url, options);
            }, 3000);
            this.reconnectTimers.set(url, timer);
          }
        }
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error on ${url}:`, error);
        if (options?.onError) {
          options.onError(error);
        }
      };

      return true;
    } catch (err) {
      console.error(`Error establishing WebSocket connection to ${url}:`, err);
      this.connectionLocks.set(url, false);
      return false;
    }
  }

  // Disconnect from a specific URL
  disconnect(url: string): void {
    const ws = this.connections.get(url);
    if (ws) {
      console.log(`Closing WebSocket connection to ${url}`);
      ws.close();
      this.connections.delete(url);
    }

    // Clear any reconnect timer
    const timer = this.reconnectTimers.get(url);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(url);
    }
  }

  // Disconnect all connections
  disconnectAll(): void {
    Array.from(this.connections.keys()).forEach(url => {
      this.disconnect(url);
    });
  }

  // Add a message handler for a specific URL
  addMessageHandler(url: string, handler: (data: WebSocketMessageData) => void): void {
    if (!this.messageHandlers.has(url)) {
      this.messageHandlers.set(url, new Set());
    }
    this.messageHandlers.get(url)?.add(handler);
  }

  // Remove a message handler for a specific URL
  removeMessageHandler(url: string, handler: (data: WebSocketMessageData) => void): void {
    const handlers = this.messageHandlers.get(url);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(url);
      }
    }
  }

  // Check if connected to a specific URL
  isConnected(url: string): boolean {
    const ws = this.connections.get(url);
    return ws !== undefined && ws.readyState === WebSocket.OPEN;
  }

  // Send a message to a specific URL
  send(url: string, message: string | Record<string, unknown>): boolean {
    const ws = this.connections.get(url);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(typeof message === 'string' ? message : JSON.stringify(message));
      return true;
    }
    return false;
  }

  // Send a chat message
  sendChatMessage(url: string, chatroomId: string, messageType: string, textContent?: string, mediaURL?: string): boolean {
    return this.send(url, {
      type: 'chat_message',
      chatroom_id: chatroomId,
      data: {
        message_type: messageType,
        text_content: textContent,
        media_url: mediaURL,
      },
    });
  }
}

// Export a singleton instance
const webSocketManager = WebSocketManager.getInstance();
export default webSocketManager;
