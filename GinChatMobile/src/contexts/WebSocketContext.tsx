// GinChatMobile/src/contexts/WebSocketContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import webSocketService from '@/services/WebSocketService'; // Import the singleton instance
import { useAuth } from './AuthContext'; // To get the token
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the shape of the WebSocket message for context consumers
export interface WebSocketMessage {
  type: string;
  data: any;
  chatroom_id?: string;
}

interface WebSocketContextType {
  isConnected: boolean;
  connectToRoom: (roomId: string) => void;
  disconnectFromRoom: () => void;
  addMessageHandler: (handler: (message: WebSocketMessage) => void) => void;
  removeMessageHandler: (handler: (message: WebSocketMessage) => void) => void;
  sendMessage: (data: object) => boolean; // Allow sending generic messages if needed
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(webSocketService.isConnected());
  const { token } = useAuth();
  const currentRoomIdRef = useRef<string | null>(null);

  const handleOpen = useCallback(() => {
    console.log("[WebSocketContext] WebSocket connected successfully");
    setIsConnected(true);
  }, []);

  const handleClose = useCallback((event: WebSocketCloseEvent) => {
    console.log("[WebSocketContext] WebSocket disconnected.", event.code, event.reason);
    setIsConnected(false);
  }, []);

  const handleError = useCallback((event: WebSocketErrorEvent) => {
    console.error("[WebSocketContext] WebSocket error:", event.message || event);
    setIsConnected(false);
  }, []);

  const connectToRoom = useCallback(async (roomId: string) => {
    if (!token) {
      console.error("[WebSocketContext] Cannot connect: auth token not available");
      return;
    }
    if (!roomId) {
      console.error("[WebSocketContext] Cannot connect: roomId not provided");
      return;
    }

    try {
      console.log(`[WebSocketContext] Connecting to room ${roomId} with token available: ${!!token}`);
      
      // Store the current room ID
      currentRoomIdRef.current = roomId;
      await AsyncStorage.setItem('lastConnectedRoom', roomId);

      webSocketService.connect(roomId, token, {
        onOpen: handleOpen,
        onClose: handleClose,
        onError: handleError,
      });
    } catch (error) {
      console.error("[WebSocketContext] Error connecting to room:", error);
    }
  }, [token, handleOpen, handleClose, handleError]);

  const disconnectFromRoom = useCallback(() => {
    console.log("[WebSocketContext] Disconnecting from room");
    currentRoomIdRef.current = null;
    AsyncStorage.removeItem('lastConnectedRoom').catch(console.error);
    webSocketService.disconnect();
    setIsConnected(false);
  }, []);

  const addMessageHandler = useCallback((handler: (message: WebSocketMessage) => void) => {
    webSocketService.addMessageHandler(handler);
  }, []);

  const removeMessageHandler = useCallback((handler: (message: WebSocketMessage) => void) => {
    webSocketService.removeMessageHandler(handler);
  }, []);

  const sendMessage = useCallback((data: object): boolean => {
    return webSocketService.sendMessage(data);
  }, []);

  // Effect to update connection status
  useEffect(() => {
    const checkConnectionStatus = () => {
      const currentStatus = webSocketService.isConnected();
      if (isConnected !== currentStatus) {
        console.log(`[WebSocketContext] Connection status changed: ${currentStatus}`);
        setIsConnected(currentStatus);
      }
    };

    // Check status periodically
    const intervalId = setInterval(checkConnectionStatus, 5000);
    checkConnectionStatus(); // Initial check

    return () => clearInterval(intervalId);
  }, [isConnected]);

  // Effect to handle reconnection on token change
  useEffect(() => {
    const reconnectToLastRoom = async () => {
      if (token && !webSocketService.isConnected()) {
        try {
          // Try to get the last connected room
          const lastRoom = await AsyncStorage.getItem('lastConnectedRoom');
          if (lastRoom) {
            console.log("[WebSocketContext] Attempting to reconnect to last room:", lastRoom);
            connectToRoom(lastRoom);
          }
        } catch (error) {
          console.error("[WebSocketContext] Error reconnecting to last room:", error);
        }
      }
    };

    if (token) {
      console.log("[WebSocketContext] Token available, checking for reconnection");
      reconnectToLastRoom();
    } else {
      console.log("[WebSocketContext] No token available, skipping reconnection");
    }

    // Cleanup on unmount or when token changes
    return () => {
      if (currentRoomIdRef.current) {
        console.log("[WebSocketContext] Cleaning up WebSocket connection");
        webSocketService.disconnect();
      }
    };
  }, [token, connectToRoom]);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        connectToRoom,
        disconnectFromRoom,
        addMessageHandler,
        removeMessageHandler,
        sendMessage,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Define WebSocket event types if not globally available (common in React Native)
interface WebSocketErrorEvent extends Event {
  message?: string;
}

interface WebSocketCloseEvent extends Event {
  code: number;
  reason: string;
  wasClean: boolean;
}

