import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface Message {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  timestamp: string;
}

export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
}

class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private eventEmitter: EventEmitter;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout = 3000;
  private backgroundReconnectTimeout = 30000; // 30 seconds
  private pingInterval: NodeJS.Timeout | null = null;
  private pingTimeout: NodeJS.Timeout | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private messageQueue: Message[] = [];
  private backendUrl = 'ws://your-backend-url/ws';
  private isAppActive = true;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(20); // Increase max listeners to avoid memory leak warnings
    
    // Listen for network changes
    NetInfo.addEventListener(state => {
      if (state.isConnected && this.connectionState === ConnectionState.FAILED) {
        this.connect();
      }
    });
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  // Get current connection state
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  // Set app active/inactive state (for background mode handling)
  setAppActive(isActive: boolean): void {
    this.isAppActive = isActive;
    if (isActive && this.connectionState !== ConnectionState.CONNECTED) {
      this.connect();
    }
  }

  // Connect to websocket
  async connect(): Promise<void> {
    // Don't try to reconnect if already connecting
    if (this.connectionState === ConnectionState.CONNECTING || 
        this.connectionState === ConnectionState.RECONNECTING) {
      return;
    }

    // Check network connectivity
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      this.updateConnectionState(ConnectionState.FAILED);
      this.eventEmitter.emit('error', new Error('No internet connection'));
      return;
    }

    try {
      // Clean up existing connection
      this.cleanup();
      
      this.updateConnectionState(ConnectionState.CONNECTING);
      
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      this.ws = new WebSocket(`${this.backendUrl}?token=${token}`);

      this.ws.onopen = () => {
        console.log('WebSocket Connected');
        this.updateConnectionState(ConnectionState.CONNECTED);
        this.reconnectAttempts = 0;
        this.eventEmitter.emit('connected');
        
        // Start ping interval to keep connection alive
        this.startHeartbeat();
        
        // Send any queued messages
        this.sendQueuedMessages();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle ping/pong for server heartbeat
          if (data.type === 'ping') {
            this.sendPong();
            return;
          }
          
          this.eventEmitter.emit('message', data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket Disconnected, code: ${event.code}, reason: ${event.reason}`);
        this.updateConnectionState(ConnectionState.DISCONNECTED);
        this.cleanup();
        
        // Don't attempt reconnect if closed normally or auth error
        if (event.code !== 1000 && event.code !== 1008) {
          this.attemptReconnect();
        } else if (event.code === 1008) {
          // Auth error - clear token and emit auth failure
          AsyncStorage.removeItem('userToken');
          this.updateConnectionState(ConnectionState.FAILED);
          this.eventEmitter.emit('authError');
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
        this.eventEmitter.emit('error', error);
      };
    } catch (error) {
      console.error('WebSocket Connection Error:', error);
      this.updateConnectionState(ConnectionState.FAILED);
      this.eventEmitter.emit('error', error);
      this.attemptReconnect();
    }
  }

  private updateConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.eventEmitter.emit('connectionStateChanged', state);
    }
  }

  private startHeartbeat(): void {
    // Clear existing intervals
    this.clearHeartbeat();
    
    // Send ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        
        // Set timeout for pong response
        this.pingTimeout = setTimeout(() => {
          console.log('Ping timeout - connection dead');
          this.ws?.close();
        }, 5000); // Wait 5 seconds for pong
      }
    }, 30000);
  }

  private sendPong(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'pong' }));
    }
    
    // Clear pong timeout since we got a response
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
  }

  private clearHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
  }

  private attemptReconnect(): void {
    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.updateConnectionState(ConnectionState.RECONNECTING);
      
      // Exponential backoff with maximum of 30 seconds
      const delay = Math.min(
        30000,
        Math.pow(2, this.reconnectAttempts) * 1000 + Math.random() * 1000
      );
      
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, this.isAppActive ? delay : this.backgroundReconnectTimeout);
    } else {
      this.updateConnectionState(ConnectionState.FAILED);
      this.eventEmitter.emit('maxReconnectAttemptsReached');
    }
  }

  private cleanup(): void {
    this.clearHeartbeat();
    
    if (this.ws) {
      // Remove all listeners to avoid memory leaks
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      
      // Only close if not already closed/closing
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      
      this.ws = null;
    }
  }

  // Send message - will queue if not connected
  sendMessage(message: Message): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message to send when connection is established
      this.messageQueue.push(message);
      console.log('WebSocket not connected, message queued');
      
      // Try to reconnect if disconnected
      if (this.connectionState !== ConnectionState.CONNECTING && 
          this.connectionState !== ConnectionState.RECONNECTING) {
        this.connect();
      }
    }
  }

  // Send all queued messages
  private sendQueuedMessages(): void {
    if (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      console.log(`Sending ${this.messageQueue.length} queued messages`);
      
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          this.ws.send(JSON.stringify(message));
        }
      }
    }
  }

  // Event listeners
  onMessage(callback: (message: Message) => void): () => void {
    this.eventEmitter.on('message', callback);
    return () => this.eventEmitter.off('message', callback);
  }

  onError(callback: (error: Error) => void): () => void {
    this.eventEmitter.on('error', callback);
    return () => this.eventEmitter.off('error', callback);
  }

  onConnected(callback: () => void): () => void {
    this.eventEmitter.on('connected', callback);
    return () => this.eventEmitter.off('connected', callback);
  }

  onConnectionStateChanged(callback: (state: ConnectionState) => void): () => void {
    this.eventEmitter.on('connectionStateChanged', callback);
    return () => this.eventEmitter.off('connectionStateChanged', callback);
  }

  onAuthError(callback: () => void): () => void {
    this.eventEmitter.on('authError', callback);
    return () => this.eventEmitter.off('authError', callback);
  }

  // Disconnect WebSocket
  disconnect(): void {
    this.cleanup();
    this.updateConnectionState(ConnectionState.DISCONNECTED);
  }
}

export default WebSocketService.getInstance(); 