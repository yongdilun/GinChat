// GinChatMobile/src/contexts/SimpleWebSocketContext.tsx
// SIMPLIFIED WebSocket Context - Clean and reliable

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import simpleWebSocketService from '@/services/SimpleWebSocketService';
import { useAuth } from './AuthContext';

export interface WebSocketMessage {
  type: string;
  data: any;
  chatroom_id?: string;
}

interface WebSocketContextType {
  isConnected: boolean;
  currentRoomId: string | null;
  connectToRoom: (roomId: string) => void;
  connectToSidebar: () => void;
  disconnectFromRoom: () => void;
  addMessageHandler: (handler: (message: WebSocketMessage) => void) => void;
  removeMessageHandler: (handler: (message: WebSocketMessage) => void) => void;
  sendMessage: (data: object) => boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const SimpleWebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  // Simple connection methods
  const connectToRoom = useCallback((roomId: string) => {
    if (!token) {
      console.error("[SimpleWebSocketContext] No token available");
      return;
    }

    console.log("[SimpleWebSocketContext] 🔌 Connecting to room:", roomId);
    setCurrentRoomId(roomId);

    simpleWebSocketService.connect(roomId, token, {
      onOpen: () => {
        console.log("[SimpleWebSocketContext] ✅ Connected to room:", roomId);
        setIsConnected(true);
      },
      onClose: () => {
        console.log("[SimpleWebSocketContext] ❌ Disconnected from room:", roomId);
        setIsConnected(false);
      },
      onError: (error) => {
        console.error("[SimpleWebSocketContext] ❌ Connection error:", error);
        setIsConnected(false);
      }
    });
  }, [token]);

  const connectToSidebar = useCallback(() => {
    connectToRoom("global_sidebar");
  }, [connectToRoom]);

  const disconnectFromRoom = useCallback(() => {
    console.log("[SimpleWebSocketContext] 🔌 Disconnecting from room...");
    simpleWebSocketService.disconnect();
    setIsConnected(false);
    setCurrentRoomId(null);
  }, []);



  // Message handlers
  const addMessageHandler = useCallback((handler: (message: WebSocketMessage) => void) => {
    simpleWebSocketService.addMessageHandler(handler);
  }, []);

  const removeMessageHandler = useCallback((handler: (message: WebSocketMessage) => void) => {
    simpleWebSocketService.removeMessageHandler(handler);
  }, []);

  const sendMessage = useCallback((data: object): boolean => {
    return simpleWebSocketService.sendMessage(data);
  }, []);

  // Update connection status periodically
  useEffect(() => {
    const checkConnection = () => {
      const connected = simpleWebSocketService.isConnected();
      const room = simpleWebSocketService.getCurrentRoom();

      if (isConnected !== connected) {
        setIsConnected(connected);
      }

      if (currentRoomId !== room) {
        setCurrentRoomId(room);
      }
    };

    const interval = setInterval(checkConnection, 10000); // Increased to 10 seconds to reduce overhead
    checkConnection(); // Initial check

    return () => clearInterval(interval);
  }, [isConnected, currentRoomId]);

  // Disconnect when token changes or becomes unavailable
  useEffect(() => {
    if (!token) {
      console.log("[SimpleWebSocketContext] Token unavailable, disconnecting...");
      simpleWebSocketService.disconnect();
      setIsConnected(false);
      setCurrentRoomId(null);
    }
  }, [token]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      simpleWebSocketService.disconnect();
    };
  }, []);

  const value: WebSocketContextType = {
    isConnected,
    currentRoomId,
    connectToRoom,
    connectToSidebar,
    disconnectFromRoom,
    addMessageHandler,
    removeMessageHandler,
    sendMessage,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useSimpleWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useSimpleWebSocket must be used within a SimpleWebSocketProvider');
  }
  return context;
};
