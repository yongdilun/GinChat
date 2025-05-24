import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data: unknown;
  chatroom_id?: string;
}

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  lastMessage: WebSocketMessage | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Helper to check if we're in browser environment
  const isBrowser = typeof window !== 'undefined';

  // Get user and token from localStorage
  const getAuthData = useCallback(() => {
    if (!isBrowser) return { user: null, token: null };

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let user = null;

    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }

    return { user, token };
  }, [isBrowser]);

  const connect = useCallback(() => {
    const { user, token } = getAuthData();

    if (!user || !token) {
      console.log('No user or token available for WebSocket connection');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connecting or connected');
      return;
    }

    setConnectionStatus('connecting');
    console.log('Connecting to WebSocket...');

    // Create WebSocket connection with user_id as query parameter
    // Use the same base URL as the API but with ws protocol
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://') + `/ws?user_id=${user.user_id}`;

    console.log('Attempting WebSocket connection to:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected successfully to:', wsUrl);
      setIsConnected(true);
      setConnectionStatus('connected');
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        setLastMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      wsRef.current = null;

      // Attempt to reconnect if not a normal closure and user is still authenticated
      const { user: currentUser, token: currentToken } = getAuthData();
      if (event.code !== 1000 && currentUser && currentToken && reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Exponential backoff, max 30s
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
    };

    wsRef.current = ws;
  }, [getAuthData]);

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
    reconnectAttempts.current = 0;
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Cannot send message:', message);
    }
  };

  // Connect when component mounts and check auth status
  useEffect(() => {
    const { user, token } = getAuthData();
    if (user && token) {
      connect();
    } else {
      disconnect();
    }

    // Set up interval to check auth status periodically
    const authCheckInterval = setInterval(() => {
      const { user: currentUser, token: currentToken } = getAuthData();
      const isCurrentlyConnected = wsRef.current?.readyState === WebSocket.OPEN;

      if (currentUser && currentToken && !isCurrentlyConnected) {
        // User is authenticated but not connected, try to connect
        connect();
      } else if ((!currentUser || !currentToken) && isCurrentlyConnected) {
        // User is not authenticated but still connected, disconnect
        disconnect();
      }
    }, 5000); // Check every 5 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(authCheckInterval);
      disconnect();
    };
  }, [connect, getAuthData]); // Include dependencies

  // Ping to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      sendMessage({
        type: 'ping',
        data: Date.now(),
      });
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [isConnected, sendMessage]);

  const value: WebSocketContextType = {
    isConnected,
    sendMessage,
    lastMessage,
    connectionStatus,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
