'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ChatLayout from '@/components/ChatLayout';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import { User, Chatroom, Message, WebSocketMessage } from '@/types';
import { chatroomAPI, messageAPI } from '@/services/api';
import useWebSocket from '@/hooks/useWebSocket';

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);
  const [selectedChatroom, setSelectedChatroom] = useState<Chatroom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const disconnectRef = useRef<(() => void) | null>(null);
  const [wsUrl, setWsUrl] = useState<string>('');
  // Track processed message IDs to prevent duplication
  const processedMessageIdsRef = useRef<Set<string>>(new Set());

  // Add a message to the chat if it hasn't been added already
  const addMessageSafely = useCallback((newMessage: Message) => {
    // If message has already been processed, ignore it
    if (processedMessageIdsRef.current.has(newMessage.id)) {
      console.log('Message already processed, ignoring:', newMessage.id);
      return;
    }

    // Mark the message as processed
    processedMessageIdsRef.current.add(newMessage.id);
    console.log('Adding new message to chat:', newMessage);
    
    // Add to messages state
    setMessages(prevMessages => [...prevMessages, newMessage]);
  }, []);
  
  // WebSocket connection for real-time updates
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const wsMessage = JSON.parse(event.data) as WebSocketMessage;
      console.log('Received WebSocket message:', wsMessage);

      // Handle new message event
      if (wsMessage.type === 'new_message' && wsMessage.chatroom_id && selectedChatroom?.id === wsMessage.chatroom_id) {
        const newMessage = wsMessage.data as Message;
        addMessageSafely(newMessage);
      } else if (wsMessage.type === 'connected') {
        console.log('WebSocket connection established:', wsMessage.data);
      } else {
        console.log('Received message for different chatroom or unknown type:', wsMessage);
      }
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
    }
  }, [selectedChatroom, addMessageSafely]);

  // Get authentication token for WebSocket
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Update wsUrl when selectedChatroom changes
  useEffect(() => {
    if (token && selectedChatroom) {
      const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL;
      setWsUrl(`${wsBaseUrl}/api/ws?token=${encodeURIComponent(token)}&room_id=${encodeURIComponent(selectedChatroom.id)}`);
      
      // Clear processed messages when changing rooms
      processedMessageIdsRef.current = new Set();
    } else {
      setWsUrl('');
    }
  }, [token, selectedChatroom]);

  // Create WebSocket connection - always create the hook, even with empty URL
  const { disconnect } = useWebSocket(
    wsUrl,
    {
      onMessage: handleWebSocketMessage,
      onOpen: () => {
        console.log('WebSocket connected');
      },
      onClose: (event) => {
        console.log('WebSocket disconnected:', event);
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && event.code !== 1001) {
          console.log('Attempting to reconnect...');
        }
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
      },
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
    }
  );

  // Store disconnect function in ref and handle cleanup
  useEffect(() => {
    // Store the current disconnect function
    disconnectRef.current = disconnect;
    
    // Cleanup function - this runs when the component unmounts or before the next effect runs
    return () => {
      if (disconnectRef.current) {
        disconnectRef.current();
        disconnectRef.current = null;
      }
    };
  }, [disconnect]); // Only depend on disconnect, not wsUrl

  // Fetch chatrooms
  const fetchChatrooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await chatroomAPI.getChatrooms();
      const chatrooms = response.data.chatrooms || [];
      setChatrooms(chatrooms);

      // Find the first chatroom that the user is a member of
      if (chatrooms.length > 0 && user) {
        const joinedChatroom = chatrooms.find((chatroom: Chatroom) =>
          chatroom.members.some((member: { user_id: number }) => member.user_id === user.user_id)
        );

        if (joinedChatroom) {
          setSelectedChatroom(joinedChatroom);
          fetchMessages(joinedChatroom.id);
        }
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error('Error fetching chatrooms:', error.response?.data?.error || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch messages for a chatroom
  const fetchMessages = async (chatroomId: string) => {
    try {
      const response = await messageAPI.getMessages(chatroomId);
      // Reverse the messages to display oldest first (chronological order)
      const messagesData = response.data.messages || [];
      setMessages([...messagesData].reverse());
      
      // Clear and repopulate processed message IDs with fetched messages
      processedMessageIdsRef.current = new Set();
      messagesData.forEach((msg: Message) => {
        processedMessageIdsRef.current.add(msg.id);
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error('Error fetching messages:', error.response?.data?.error || 'An error occurred');
    }
  };

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/auth/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
      fetchChatrooms();
    } catch (err) {
      console.error('Failed to parse user data:', err);
      router.push('/auth/login');
    }
  }, [router, fetchChatrooms]);

  // Handle chatroom selection
  const handleSelectChatroom = (chatroom: Chatroom) => {
    setSelectedChatroom(chatroom);
    fetchMessages(chatroom.id);
  };

  if (isLoading) {
    return (
      <ChatLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4">Loading...</p>
          </div>
        </div>
      </ChatLayout>
    );
  }

  return (
    <ChatLayout>
      <div className="flex h-[95vh] overflow-hidden bg-gray-100 dark:bg-gray-900 m-2 rounded-lg shadow-lg">
        {/* Sidebar */}
        <ChatSidebar
          user={user}
          chatrooms={chatrooms}
          selectedChatroom={selectedChatroom}
          onSelectChatroom={handleSelectChatroom}
          onChatroomsRefresh={fetchChatrooms}
        />

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat header */}
          <ChatHeader 
            chatroom={selectedChatroom} 
            onClose={() => {}}
          />

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <MessageList
              user={user}
              selectedChatroom={selectedChatroom}
              messages={messages}
              onShowJoinChatroom={() => {
                // Find sidebar and check if it's collapsed
                const sidebarElement = document.querySelector('[data-sidebar]');
                if (!sidebarElement) return;
                
                const isCollapsed = sidebarElement.classList.contains('w-20');
                
                if (isCollapsed) {
                  // Expand sidebar first
                  const expandButton = sidebarElement.querySelector('button[title="Expand sidebar"]') as HTMLButtonElement;
                  expandButton?.click();
                  
                  // Wait for animation to complete then show join form
                  setTimeout(() => {
                    // Click add button
                    const addButton = document.getElementById('add-chatroom-button') as HTMLButtonElement;
                    if (addButton) addButton.click();
                    
                    // After options panel opens, click join button
                    setTimeout(() => {
                      const joinButton = document.getElementById('join-chatroom-button') as HTMLButtonElement;
                      if (joinButton) joinButton.click();
                    }, 100);
                  }, 300);
                } else {
                  // Not collapsed, show join directly
                  // First make sure options are shown
                  const addButton = document.getElementById('add-chatroom-button') as HTMLButtonElement;
                  if (addButton) addButton.click();
                  
                  setTimeout(() => {
                    const joinButton = document.getElementById('join-chatroom-button') as HTMLButtonElement;
                    if (joinButton) joinButton.click();
                  }, 100);
                }
              }}
              onShowCreateChatroom={() => {
                // Find sidebar and check if it's collapsed
                const sidebarElement = document.querySelector('[data-sidebar]');
                if (!sidebarElement) return;
                
                const isCollapsed = sidebarElement.classList.contains('w-20');
                
                if (isCollapsed) {
                  // Expand sidebar first
                  const expandButton = sidebarElement.querySelector('button[title="Expand sidebar"]') as HTMLButtonElement;
                  expandButton?.click();
                  
                  // Wait for animation to complete then show create form
                  setTimeout(() => {
                    // Click add button
                    const addButton = document.getElementById('add-chatroom-button') as HTMLButtonElement;
                    if (addButton) addButton.click();
                    
                    // After options panel opens, click create button
                    setTimeout(() => {
                      const createButton = document.getElementById('create-chatroom-button') as HTMLButtonElement;
                      if (createButton) createButton.click();
                    }, 100);
                  }, 300);
                } else {
                  // Not collapsed, show create directly
                  // First make sure options are shown
                  const addButton = document.getElementById('add-chatroom-button') as HTMLButtonElement;
                  if (addButton) addButton.click();
                  
                  setTimeout(() => {
                    const createButton = document.getElementById('create-chatroom-button') as HTMLButtonElement;
                    if (createButton) createButton.click();
                  }, 100);
                }
              }}
            />
          </div>

          {/* Message input */}
          <MessageInput
            selectedChatroom={selectedChatroom}
            onMessageSent={(sentMessage) => {
              // If we got a sent message, add it to the messages list using
              // our safe add function that prevents duplication
              if (sentMessage) {
                addMessageSafely(sentMessage);
              }
            }}
          />
        </div>
      </div>
    </ChatLayout>
  );
}
