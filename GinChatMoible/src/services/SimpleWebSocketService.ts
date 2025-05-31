// GinChatMobile/src/services/SimpleWebSocketService.ts
// SIMPLIFIED WebSocket Service - Clean and reliable

import { Platform } from 'react-native';

interface WebSocketServiceOptions {
  onOpen?: () => void;
  onMessage?: (data: any) => void;
  onClose?: (event: WebSocketCloseEvent) => void;
  onError?: (event: WebSocketErrorEvent) => void;
}

interface WebSocketMessage {
  type: string;
  data: unknown;
  chatroom_id?: string;
}

interface BatchedNotification {
  title: string;
  body: string;
  tag: string;
  data: {
    notification_id: string;
    chatroom_id: string;
    message_count: number;
    last_sender_id: number;
    last_message_preview: string;
    last_sender_name: string;
  };
}

// Production server URL
const WS_BASE_URL = "wss://ginchat-14ry.onrender.com/api/ws";

class SimpleWebSocketService {
  private ws: WebSocket | null = null;
  private currentRoomId: string | null = null;
  private currentToken: string | null = null;
  private messageHandlers: Set<(data: WebSocketMessage) => void> = new Set();
  private isConnecting: boolean = false;
  private isManualDisconnect: boolean = false;
  private lastConnectionAttempt: number = 0;
  private readonly CONNECTION_COOLDOWN = 5000; // 5 seconds between connections to prevent 429 errors
  private switchingRooms: boolean = false;
  private connectionAttempts: number = 0;
  private readonly MAX_CONNECTION_ATTEMPTS = 3;
  private pendingConnection: { roomId: string; token: string; options?: WebSocketServiceOptions } | null = null;
  private switchTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds between heartbeats

  // Notification batching
  private notificationBatches: Map<string, BatchedNotification> = new Map();
  private readonly NOTIFICATION_BATCH_INTERVAL = 3000; // 3 seconds to batch notifications
  private notificationBatchTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // Improved connection method with graceful room switching
  public connect(roomId: string, token: string, options?: WebSocketServiceOptions): void {
    if (!roomId || !token) {
      console.error("[SimpleWebSocketService] Room ID and token are required");
      return;
    }

    // If already connected to the same room, do nothing
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentRoomId === roomId && !this.switchingRooms) {
      console.log("[SimpleWebSocketService] Already connected to room:", roomId);
      if (options?.onOpen) options.onOpen();
      return;
    }

    // If currently switching rooms, store the pending connection
    if (this.switchingRooms) {
      console.log("[SimpleWebSocketService] Currently switching rooms, storing pending connection for:", roomId);
      this.pendingConnection = { roomId, token, options };
      return;
    }

    // Prevent rapid connection attempts
    const now = Date.now();
    if (now - this.lastConnectionAttempt < this.CONNECTION_COOLDOWN && !this.switchingRooms) {
      console.log("[SimpleWebSocketService] Connection cooldown active, storing pending connection for:", roomId);
      this.pendingConnection = { roomId, token, options };

      // Clear any existing timeout and set a new one
      if (this.switchTimeout) {
        clearTimeout(this.switchTimeout);
      }

      this.switchTimeout = setTimeout(() => {
        if (this.pendingConnection) {
          const pending = this.pendingConnection;
          this.pendingConnection = null;
          this.connect(pending.roomId, pending.token, pending.options);
        }
      }, this.CONNECTION_COOLDOWN - (now - this.lastConnectionAttempt));
      return;
    }

    // If currently connecting, store pending connection
    if (this.isConnecting) {
      console.log("[SimpleWebSocketService] Already connecting, storing pending connection for:", roomId);
      this.pendingConnection = { roomId, token, options };
      return;
    }

    // If connecting to a different room, gracefully switch
    if (this.ws && this.currentRoomId !== roomId) {
      console.log("[SimpleWebSocketService] 🔄 Gracefully switching from", this.currentRoomId, "to", roomId);
      this.gracefulRoomSwitch(roomId, token, options);
      return;
    }

    this.connectToRoom(roomId, token, options);
  }

  // Graceful room switching with proper delays
  private gracefulRoomSwitch(roomId: string, token: string, options?: WebSocketServiceOptions): void {
    this.switchingRooms = true;
    this.pendingConnection = { roomId, token, options };

    console.log("[SimpleWebSocketService] 🔄 Starting graceful room switch...");

    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Disconnect current connection
    this.isManualDisconnect = true;
    if (this.ws) {
      try {
        this.ws.close(1000, "Room switch");
      } catch (error) {
        console.error("[SimpleWebSocketService] Error during room switch disconnect:", error);
      }
    }

    // Wait for proper disconnect, then connect to new room
    this.switchTimeout = setTimeout(() => {
      console.log("[SimpleWebSocketService] 🔄 Completing room switch to:", roomId);
      this.switchingRooms = false;

      if (this.pendingConnection) {
        const pending = this.pendingConnection;
        this.pendingConnection = null;
        this.connectToRoom(pending.roomId, pending.token, pending.options);
      }
    }, 1500); // 1.5 second delay for graceful switching
  }

  private connectToRoom(roomId: string, token: string, options?: WebSocketServiceOptions): void {
    // Check connection attempts to prevent rate limiting
    if (this.connectionAttempts >= this.MAX_CONNECTION_ATTEMPTS) {
      console.warn("[SimpleWebSocketService] ⚠️ Max connection attempts reached, waiting longer...");
      setTimeout(() => {
        this.connectionAttempts = 0; // Reset after longer wait
        this.connectToRoom(roomId, token, options);
      }, 30000); // 30 second wait after max attempts
      return;
    }

    this.isConnecting = true;
    this.isManualDisconnect = false;
    this.lastConnectionAttempt = Date.now();
    this.connectionAttempts++;
    this.currentRoomId = roomId;
    this.currentToken = token;

    const url = `${WS_BASE_URL}?token=${encodeURIComponent(token)}&room_id=${encodeURIComponent(roomId)}`;
    console.log("[SimpleWebSocketService] Connecting to:", roomId);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log("[SimpleWebSocketService] ✅ Connected to room:", roomId);
        this.isConnecting = false;
        this.connectionAttempts = 0;
        this.startHeartbeat();
        if (options?.onOpen) options.onOpen();
      };

      this.ws.onmessage = (event: WebSocketMessageEvent) => {
        try {
          let data: string;
          if (typeof event.data === 'string') {
            data = event.data;
          } else if (event.data instanceof ArrayBuffer) {
            data = new TextDecoder().decode(event.data);
          } else {
            console.warn('[SimpleWebSocketService] Received Blob data, converting to text');
            return;
          }
          const parsedData: WebSocketMessage = JSON.parse(data);

          // Handle heartbeat
          if (parsedData.type === 'heartbeat_ack') {
            return;
          }

          // Handle new messages for notification batching
          if (parsedData.type === 'new_message' && parsedData.chatroom_id) {
            this.handleNewMessageNotification(parsedData);
            return; // Don't forward individual messages to handlers
          }

          // Forward other message types to handlers
          this.messageHandlers.forEach(handler => {
            try {
              handler(parsedData);
            } catch (error) {
              console.error("[SimpleWebSocketService] Handler error:", error);
            }
          });

          if (options?.onMessage) {
            options.onMessage(parsedData);
          }
        } catch (error) {
          console.error("[SimpleWebSocketService] Message parse error:", error);
        }
      };

      this.ws.onclose = (event: WebSocketCloseEvent) => {
        this.isConnecting = false;
        this.ws = null;

        // Clear heartbeat interval
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
        }

        // Only log as error if it's unexpected (not manual disconnect or room switch)
        if (this.isManualDisconnect || this.switchingRooms || event.code === 1000) {
          console.log("[SimpleWebSocketService] 🔌 Disconnected from room:", this.currentRoomId, "(Expected)");
        } else {
          console.log("[SimpleWebSocketService] ❌ Unexpected disconnection from room:", this.currentRoomId, "Code:", event.code);
        }

        if (options?.onClose) {
          options.onClose(event);
        }

        // Only reconnect if it's an unexpected disconnection (not during room switching)
        // Use exponential backoff for reconnection attempts
        if (!this.isManualDisconnect && !this.switchingRooms && event.code !== 1000 && this.currentRoomId && this.currentToken) {
          const reconnectDelay = Math.min(5000 * Math.pow(2, this.connectionAttempts), 30000); // Max 30 seconds
          console.log(`[SimpleWebSocketService] 🔄 Reconnecting in ${reconnectDelay/1000} seconds... (attempt ${this.connectionAttempts + 1})`);
          setTimeout(() => {
            if (!this.isManualDisconnect && !this.switchingRooms && this.currentRoomId && this.currentToken) {
              this.connect(this.currentRoomId, this.currentToken, options);
            }
          }, reconnectDelay);
        }

        // If we have a pending connection and we're not switching rooms, process it
        if (!this.switchingRooms && this.pendingConnection) {
          console.log("[SimpleWebSocketService] 🔄 Processing pending connection after disconnect");
          setTimeout(() => {
            if (this.pendingConnection && !this.switchingRooms) {
              const pending = this.pendingConnection;
              this.pendingConnection = null;
              this.connect(pending.roomId, pending.token, pending.options);
            }
          }, 1000);
        }
      };

      this.ws.onerror = (error: Event) => {
        console.error("[SimpleWebSocketService] ❌ Connection error:", error);
        this.isConnecting = false;
        if (options?.onError) {
          options.onError(error as WebSocketErrorEvent);
        }
      };

    } catch (error) {
      console.error("[SimpleWebSocketService] ❌ Failed to create WebSocket:", error);
      this.isConnecting = false;
      if (options?.onError) {
        options.onError(new Event('error') as WebSocketErrorEvent);
      }
    }
  }

  // Start heartbeat interval
  private startHeartbeat(): void {
    // Clear any existing heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send initial heartbeat
    this.sendHeartbeat();

    // Set up heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL);
  }

  // Send heartbeat message
  private sendHeartbeat(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const heartbeatMessage: WebSocketMessage = {
        type: 'heartbeat',
        data: {
          timestamp: new Date().toISOString()
        }
      };
      this.ws.send(JSON.stringify(heartbeatMessage));
    }
  }

  // Handle new message notification
  private handleNewMessageNotification(message: WebSocketMessage): void {
    if (message.type !== 'new_message' || !message.chatroom_id) {
      return;
    }

    const data = message.data as any;
    const chatroomId = message.chatroom_id;
    const batchKey = `chat_${chatroomId}`;

    // Get or create batch for this chatroom
    let batch = this.notificationBatches.get(batchKey);
    if (!batch) {
      batch = {
        title: '',
        body: '',
        tag: batchKey,
        data: {
          notification_id: Date.now().toString(),
          chatroom_id: chatroomId,
          message_count: 0,
          last_sender_id: 0,
          last_sender_name: '',
          last_message_preview: ''
        }
      };
    }

    // Update batch with new message
    batch.data.message_count++;
    batch.data.last_sender_id = data.sender_id;
    batch.data.last_sender_name = data.sender_name;
    batch.data.last_message_preview = data.content || 'New message';

    // Update notification content
    if (batch.data.message_count === 1) {
      batch.title = `New message from ${data.sender_name}`;
      batch.body = data.content || 'New message';
    } else {
      batch.title = `${batch.data.message_count} new messages from ${data.sender_name}`;
      batch.body = batch.data.last_message_preview;
    }

    // Store updated batch
    this.notificationBatches.set(batchKey, batch);

    // Clear existing timeout if any
    const existingTimeout = this.notificationBatchTimeouts.get(batchKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout to process batch
    const timeout = setTimeout(() => {
      this.processNotificationBatch(batchKey);
    }, this.NOTIFICATION_BATCH_INTERVAL);

    this.notificationBatchTimeouts.set(batchKey, timeout);
  }

  // Process notification batch
  private processNotificationBatch(batchKey: string): void {
    const batch = this.notificationBatches.get(batchKey);
    if (!batch) return;

    // Remove from pending batches
    this.notificationBatches.delete(batchKey);
    this.notificationBatchTimeouts.delete(batchKey);

    // Create a batched notification message
    const batchedMessage: WebSocketMessage = {
      type: 'batched_notification',
      data: {
        notification: {
          title: batch.title,
          body: batch.body,
          tag: batch.tag
        },
        data: {
          notification_id: batch.data.notification_id,
          chatroom_id: batch.data.chatroom_id,
          message_count: batch.data.message_count,
          last_sender_id: batch.data.last_sender_id,
          last_sender_name: batch.data.last_sender_name,
          last_message_preview: batch.data.last_message_preview
        }
      },
      chatroom_id: batch.data.chatroom_id
    };

    // Forward batched notification to handlers
    this.messageHandlers.forEach(handler => {
      try {
        handler(batchedMessage);
      } catch (error) {
        console.error("[SimpleWebSocketService] Handler error:", error);
      }
    });
  }

  // Improved disconnect method
  public disconnect(): void {
    console.log("[SimpleWebSocketService] 🔌 Disconnecting...");
    this.isManualDisconnect = true;
    this.isConnecting = false;
    this.switchingRooms = false;
    this.connectionAttempts = 0;

    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Clear all notification batch timeouts
    this.notificationBatchTimeouts.forEach(timeout => clearTimeout(timeout));
    this.notificationBatchTimeouts.clear();
    this.notificationBatches.clear();

    // Clear any pending connections and timeouts
    this.pendingConnection = null;
    if (this.switchTimeout) {
      clearTimeout(this.switchTimeout);
      this.switchTimeout = null;
    }

    if (this.ws) {
      try {
        this.ws.close(1000, "Manual disconnect");
      } catch (error) {
        console.error("[SimpleWebSocketService] Error closing connection:", error);
      }
    }

    this.ws = null;
    this.currentRoomId = null;
    this.currentToken = null;
  }

  // Send message
  public sendMessage(data: object): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[SimpleWebSocketService] Cannot send message - not connected");
      return false;
    }

    try {
      const message: WebSocketMessage = {
        type: 'chat_message',
        chatroom_id: this.currentRoomId || undefined,
        data: data
      };
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("[SimpleWebSocketService] Send error:", error);
      return false;
    }
  }

  // Message handlers
  public addMessageHandler(handler: (data: WebSocketMessage) => void): void {
    this.messageHandlers.add(handler);
  }

  public removeMessageHandler(handler: (data: WebSocketMessage) => void): void {
    this.messageHandlers.delete(handler);
  }

  // Connection status
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public getCurrentRoom(): string | null {
    return this.currentRoomId;
  }
}

// Export singleton
const simpleWebSocketService = new SimpleWebSocketService();
export default simpleWebSocketService;

// Event types
interface WebSocketErrorEvent extends Event {
  message?: string;
}

interface WebSocketCloseEvent extends Event {
  code: number;
  reason: string;
  wasClean: boolean;
}

interface WebSocketMessageEvent extends Event {
  data: string | ArrayBuffer | Blob;
}
