import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSimpleWebSocket, WebSocketMessage as WSMessage } from '@/contexts/SimpleWebSocketContext';
import { Message, chatAPI } from '@/services/api';

// Use the same API URL as the rest of the app
const API_URL = 'https://ginchat-14ry.onrender.com/api';

interface AppWebSocketMessage {
  type: string;
  data: any;
  chatroom_id?: string;
}

interface UseWebSocketHandlerProps {
  chatroomId: string | null;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  addNewMessage?: (message: Message) => void;
  updateMessage?: (messageId: string, updates: Partial<Message>) => void;
  removeMessage?: (messageId: string) => void;
}

export function useWebSocketHandler({
  chatroomId,
  setMessages,
  markMessageAsRead,
  addNewMessage,
  updateMessage,
  removeMessage
}: UseWebSocketHandlerProps) {
  const { user } = useAuth();
  const { connectToRoom, connectToSidebar, addMessageHandler, removeMessageHandler } = useSimpleWebSocket();
  const processedMessages = useRef(new Set<string>());
  const isMountedRef = useRef(true);

  // WebSocket message handler
  const handleIncomingMessage = useCallback((newMessage: AppWebSocketMessage | WSMessage) => {
    // Only process messages if component is still mounted and for current room
    if (!isMountedRef.current) {
      console.log('[Chat] 🚫 Ignoring message - component unmounted');
      return;
    }

    console.log('[Chat] Received WebSocket message:', newMessage);

    if ('data' in newMessage && newMessage.data && typeof newMessage.data === 'object') {
      const messageType = newMessage.type;

      if (messageType === 'message_updated') {
        // Handle message edit
        const updatedMessage = newMessage.data as Message;
        console.log('[Chat] Message updated:', updatedMessage);

        if (updateMessage) {
          // Use the hook function if available
          updateMessage(updatedMessage.id, { ...updatedMessage, edited: true });
        } else {
          // Fallback to direct state update
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === updatedMessage.id ? { ...updatedMessage, edited: true } : msg
            )
          );
        }
      } else if (messageType === 'message_deleted') {
        // Handle message deletion
        const { message_id } = newMessage.data as { message_id: string; chatroom_id: string };
        console.log('[Chat] Message deleted:', message_id);

        if (removeMessage) {
          // Use the hook function if available
          removeMessage(message_id);
        } else {
          // Fallback to direct state update
          setMessages(prevMessages =>
            prevMessages.filter(msg => msg.id !== message_id)
          );
        }
      } else if (messageType === 'chatroom_deleted') {
        // Handle chatroom deletion
        const { chatroom_id } = newMessage.data as { chatroom_id: string };
        console.log('[Chat] Chatroom deleted:', chatroom_id);

        if (chatroom_id === chatroomId) {
          Alert.alert(
            'Chatroom Deleted',
            'This chatroom has been deleted by the creator.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      } else if (messageType === 'message_read') {
        // Handle read status updates from WebSocket with chatroom filtering
        if (newMessage.chatroom_id === chatroomId) {
          const readData = newMessage.data as {
            message_id?: string;
            read_status?: any[];
            user_id?: number;
            type?: string;
            chatroom_id?: string;
            read_all?: boolean;
          };

          console.log('[Chat] 📝 Read status update received for current chatroom:', readData);

          // Handle individual message read status update
          if (readData.message_id && readData.read_status) {
            console.log('[Chat] 📝 Processing read status update for message:', readData.message_id, '(reader:', readData.user_id, ')');
            console.log('[Chat] 📝 New read status data:', readData.read_status);

            if (updateMessage) {
              // Use the hook function if available
              updateMessage(readData.message_id, { read_status: readData.read_status });
            } else {
              // Fallback to direct state update
              setMessages(prevMessages => {
                const updatedMessages = prevMessages.map(msg => {
                  if (msg.id === readData.message_id) {
                    const updatedMsg = { ...msg, read_status: readData.read_status };
                    console.log('[Chat] 📝 Updated message read status:', {
                      messageId: msg.id,
                      oldReadStatus: msg.read_status,
                      newReadStatus: readData.read_status
                    });
                    return updatedMsg;
                  }
                  return msg;
                });

                console.log('[Chat] 📝 Messages state updated with new read status');
                return updatedMessages;
              });
            }
          }

          // Handle bulk read status update (when user marks all as read)
          if (readData.type === 'bulk_read' && readData.user_id) {
            console.log('[Chat] 📝 Processing bulk read status update for user:', readData.user_id);

            setMessages(prevMessages => {
              const updatedMessages = prevMessages.map(msg => {
                // Only update messages that this user hasn't read yet
                const currentReadStatus = msg.read_status || [];
                const userAlreadyRead = currentReadStatus.some(status => status.user_id === readData.user_id && status.is_read);

                if (!userAlreadyRead) {
                  const newReadStatus = [...currentReadStatus];
                  const existingIndex = newReadStatus.findIndex(status => status.user_id === readData.user_id);

                  if (existingIndex >= 0) {
                    // Update existing status
                    newReadStatus[existingIndex] = {
                      ...newReadStatus[existingIndex],
                      is_read: true,
                      read_at: new Date().toISOString()
                    };
                  } else {
                    // Add new read status
                    newReadStatus.push({
                      user_id: readData.user_id,
                      username: 'User', // Will be updated by backend
                      is_read: true,
                      read_at: new Date().toISOString()
                    });
                  }

                  console.log('[Chat] 📝 Bulk updated message:', msg.id, 'for user:', readData.user_id);
                  return { ...msg, read_status: newReadStatus };
                }
                return msg;
              });

              console.log('[Chat] 📝 Bulk read status update completed');
              return updatedMessages;
            });
          }
        } else {
          console.log('[Chat] 📝 Ignoring read status update for different chatroom:', newMessage.chatroom_id, 'vs current:', chatroomId);
        }
      } else if (messageType === 'new_message' || messageType === 'chat_message') {
        // Handle new message with optimistic updates
        console.log('[Chat] 📝 New message received');
        let messageData = newMessage.data as Message;

        if (messageData.id && !processedMessages.current.has(messageData.id)) {
          processedMessages.current.add(messageData.id);

          // Auto-mark new messages as read BEFORE adding to list if from others and user is in chatroom
          if (messageData.sender_id !== user?.id && messageData.id) {
            console.log('[Chat] 🚀 Pre-marking new message as read to prevent unread label flicker:', messageData.id);

            // Add read status to message immediately to prevent unread label from showing
            const currentReadStatus = messageData.read_status || [];
            const userAlreadyRead = currentReadStatus.find(status => status.user_id === user?.id && status.is_read);

            if (!userAlreadyRead) {
              messageData = {
                ...messageData,
                read_status: [
                  ...currentReadStatus,
                  {
                    user_id: user.id,
                    username: user.email || 'User',
                    read_at: new Date().toISOString(),
                    is_read: true
                  }
                ]
              };
            }

            // Mark as read via API in background (non-blocking)
            chatAPI.markSingleMessageAsRead(messageData.id).then((response) => {
              if (response) {
                console.log('[Chat] ✅ Message auto-marked as read via WebSocket API, notification sent to other users');
              } else {
                console.log('[Chat] ⚠️ Message auto-read API failed silently (non-critical)');
              }
            }).catch((error) => {
              console.error('[Chat] ❌ Failed to auto-mark message as read via WebSocket API:', error);
              // Don't throw error - auto-read failures should be silent
            });
          }

          // Add message to list (now with read status already set if applicable)
          if (addNewMessage) {
            // Use the hook function if available (preferred for paginated messages)
            addNewMessage(messageData);
          } else {
            // Fallback to direct state update
            setMessages(prevMessages => {
              const messageExists = prevMessages.some(msg => msg.id === messageData.id);
              if (!messageExists) {
                const updatedMessages = [messageData, ...prevMessages];
                return updatedMessages.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
              }
              return prevMessages;
            });
          }
        }
      }
    }
  }, [chatroomId, user?.id, setMessages, markMessageAsRead, addNewMessage, updateMessage, removeMessage]);

  // Connect to chat room WebSocket
  useEffect(() => {
    if (chatroomId && user?.id) {
      console.log('[Chat] 🔌 Connecting to WebSocket room:', chatroomId);

      // Mark component as mounted for this room
      isMountedRef.current = true;

      // Add message handler and connect to room
      addMessageHandler(handleIncomingMessage);
      connectToRoom(chatroomId);

      return () => {
        console.log('[Chat] 🔌 Cleaning up WebSocket connection for room:', chatroomId);
        // Mark component as unmounted to stop processing messages
        isMountedRef.current = false;
        // Remove the message handler first to stop processing messages
        removeMessageHandler(handleIncomingMessage);
        // Clear processed messages for this room
        processedMessages.current.clear();
        // Reconnect to sidebar when leaving chat room
        connectToSidebar();
      };
    }
  }, [chatroomId, user?.id, handleIncomingMessage, addMessageHandler, removeMessageHandler, connectToRoom, connectToSidebar]);

  return {
    processedMessages,
  };
}
