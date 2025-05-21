import { useState, useEffect, useCallback, useRef } from 'react';
import webSocketManager from '@/services/websocket';

// Define message type for WebSocket messages
interface WebSocketData {
  type: string;
  data: unknown;
  chatroom_id?: string;
}

interface WebSocketOptions {
  onMessage?: (event: MessageEvent) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  headers?: Record<string, string>;
}

export const useWebSocket = (url: string, options: WebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketData | null>(null);
  const urlRef = useRef<string>(url);
  const messageHandlerRef = useRef<((data: WebSocketData) => void) | null>(null);

  const {
    onOpen,
    onMessage,
    onClose,
    onError,
  } = options;

  // Cleanup function to handle disconnection and handler removal
  const cleanup = useCallback(() => {
    if (urlRef.current && messageHandlerRef.current) {
      // Remove message handler
      webSocketManager.removeMessageHandler(urlRef.current, messageHandlerRef.current);
      messageHandlerRef.current = null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!url) {
      setIsConnected(false);
      return;
    }

    // Update URL ref
    urlRef.current = url;

    // Check if already connected
    if (webSocketManager.isConnected(url)) {
      setIsConnected(true);
      console.log(`Already connected to ${url}`);
    } else {
      // Connect to WebSocket
      webSocketManager.connect(url, {
        onOpen: () => {
          setIsConnected(true);
          if (onOpen) onOpen(new Event('open'));
        },
        onClose: (event) => {
          setIsConnected(false);
          if (onClose) onClose(event);
        },
        onError: (error) => {
          if (onError) onError(error);
        },
      });
    }

    // Create message handler
    const messageHandler = (data: WebSocketData) => {
      setLastMessage(data);
      if (onMessage) {
        // Create a MessageEvent-like object
        const messageEvent = {
          data: JSON.stringify(data),
          type: 'message',
          target: null
        } as unknown as MessageEvent;
        onMessage(messageEvent);
      }
    };

    // Store message handler in ref
    messageHandlerRef.current = messageHandler;

    // Register message handler
    webSocketManager.addMessageHandler(url, messageHandler);

    // Update connection status
    setIsConnected(webSocketManager.isConnected(url));
  }, [url, onOpen, onClose, onError, onMessage]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (urlRef.current) {
      webSocketManager.disconnect(urlRef.current);
      setIsConnected(false);
    }
    cleanup();
  }, [cleanup]);

  // Send message to WebSocket
  const sendMessage = useCallback((data: string | Record<string, unknown>) => {
    if (!urlRef.current) return false;
    return webSocketManager.send(urlRef.current, data);
  }, []);

  // Connect when URL changes, disconnect on unmount
  useEffect(() => {
    // Cleanup previous connection if URL changed
    cleanup();
    
    // Connect to new URL
    if (url) {
      connect();
    }
    
    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [url, connect, cleanup]);

  // Update connection status periodically
  useEffect(() => {
    const checkConnection = () => {
      if (urlRef.current) {
        const connected = webSocketManager.isConnected(urlRef.current);
        setIsConnected(connected);
      }
    };

    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  };
};

export default useWebSocket;
