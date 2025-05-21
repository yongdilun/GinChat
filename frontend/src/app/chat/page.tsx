'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ChatLayout from '@/components/ChatLayout';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import { User, Chatroom, Message, WebSocketMessage } from '@/types';
import { chatroomAPI, messageAPI } from '@/services/api';
import useWebSocket from '@/hooks/useWebSocket';

// Interface for media inside chatrooms
interface Media {
  url: string;
  type: string; // "image", "video", or "audio"
}

// Welcome component for when no chatroom is selected
const WelcomePage = ({ user, onCreateChatroom, onJoinChatroom }: { 
  user: User | null;
  onCreateChatroom: () => void;
  onJoinChatroom: () => void;
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <div className="text-center max-w-xl">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {user?.username?.charAt(0).toUpperCase() || 'G'}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Welcome to GinChat, {user?.username || 'User'}!
          </h1>
          
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Connect with others by joining an existing chatroom or create your own to start chatting.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onCreateChatroom}
              className="px-6 py-3 bg-primary-500 text-white font-medium rounded-lg shadow-md hover:bg-primary-600 transition-colors flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create a Chatroom
            </button>
            
            <button
              onClick={onJoinChatroom}
              className="px-6 py-3 bg-green-500 text-white font-medium rounded-lg shadow-md hover:bg-green-600 transition-colors flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Join a Chatroom
            </button>
          </div>
          
          <div className="mt-12 px-6 py-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Getting Started</h2>
            <ul className="space-y-2 text-left text-sm text-gray-600 dark:text-gray-300">
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Join existing chatrooms using the sidebar
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Create your own chatrooms and invite others
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Share messages, images and files in real-time
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [hasFetchedData, setHasFetchedData] = useState(false);
  // Store media for the chatroom
  const [chatroomMedia, setChatroomMedia] = useState<Media[]>([]);

  // Process messages to extract media (image, video, audio)
  useEffect(() => {
    if (!messages.length) {
      setChatroomMedia([]);
      return;
    }

    // Extract media from messages
    const media: Media[] = [];
    
    // Process messages to extract media
    messages.forEach(message => {
      if (message.media_url) {
        let type = 'image'; // Default type
        
        if (message.message_type.includes('video')) {
          type = 'video';
        } else if (message.message_type.includes('audio')) {
          type = 'audio';
        } else if (message.message_type.includes('picture')) {
          type = 'image';
        }
        
        media.push({
          url: message.media_url,
          type: type
        });
      }
    });
    
    setChatroomMedia(media);
    console.log(`Processed ${media.length} media files from messages`);
    
  }, [messages]);

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

  // Create enhanced chatroom with media
  const enhancedSelectedChatroom = useMemo(() => {
    if (!selectedChatroom) return null;
    
    return {
      ...selectedChatroom,
      media: chatroomMedia,
      files: [] // Add files if needed later
    };
  }, [selectedChatroom, chatroomMedia]);

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
    // Skip if we've already fetched data once
    if (hasFetchedData) {
      return;
    }
    
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
      
      // Mark that we've fetched data
      setHasFetchedData(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error('Error fetching chatrooms:', error.response?.data?.error || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [user, hasFetchedData]);

  // Update the fetch messages function to use a similar flag
  const fetchMessagesRef = useRef<{[chatroomId: string]: boolean}>({});
  
  // Fetch messages for a chatroom
  const fetchMessages = async (chatroomId: string) => {
    // Skip if we've already fetched messages for this chatroom
    if (fetchMessagesRef.current[chatroomId]) {
      return;
    }
    
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
      
      // Mark this chatroom's messages as fetched
      fetchMessagesRef.current[chatroomId] = true;
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
    if (selectedChatroom?.id === chatroom.id) {
      return; // Skip if same chatroom is selected
    }
    
    setSelectedChatroom(chatroom);
    
    // Allow fetching messages for this chatroom again if manually selected
    fetchMessagesRef.current[chatroom.id] = false;
    fetchMessages(chatroom.id);
  };

  // Add a manual refresh function that allows explicit refresh
  const handleManualRefresh = useCallback(() => {
    // Reset fetch flags to allow fetching again
    setHasFetchedData(false);
    fetchMessagesRef.current = {};
    fetchChatrooms();
  }, [fetchChatrooms]);

  // Helper functions to handle creating/joining chatrooms from the welcome page
  const handleShowCreateChatroom = useCallback(() => {
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
  }, []);
  
  const handleShowJoinChatroom = useCallback(() => {
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
  }, []);

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
          onChatroomsRefresh={handleManualRefresh}
        />

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedChatroom ? (
            <>
              {/* Chat header - using enhancedSelectedChatroom with media */}
              <ChatHeader 
                chatroom={enhancedSelectedChatroom} 
                onClose={() => {}}
              />

              {/* Messages */}
              <div className="flex-1 overflow-hidden">
                <MessageList
                  user={user}
                  selectedChatroom={selectedChatroom}
                  messages={messages}
                  onShowJoinChatroom={handleShowJoinChatroom}
                  onShowCreateChatroom={handleShowCreateChatroom}
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
            </>
          ) : (
            <WelcomePage 
              user={user}
              onCreateChatroom={handleShowCreateChatroom}
              onJoinChatroom={handleShowJoinChatroom}
            />
          )}
        </div>
      </div>
    </ChatLayout>
  );
}
