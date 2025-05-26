import { useRef, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { User, Chatroom, Message, ReadInfo } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon } from '@heroicons/react/outline';
import MessageActions from './MessageActions';
import { messageReadStatusAPI } from '@/services/api';
import { useWebSocket } from '@/contexts/WebSocketContext';

// ArrowDownIcon as inline SVG
const ArrowDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

// Add MaximizeIcon
const MaximizeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
  </svg>
);

interface MessageListProps {
  user: User | null;
  selectedChatroom: Chatroom | null;
  messages: Message[];
  onShowJoinChatroom?: () => void;
  onShowCreateChatroom?: () => void;
  onEditMessage?: (messageId: string, newContent: string, newMediaUrl?: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onNewMessage?: (message: Message) => void;
  onMessageReadStatusUpdate?: (messageId: string, readStatus: ReadInfo[]) => void;
  onRefreshMessages?: () => void;
}

const MessageList: React.FC<MessageListProps> = ({
  user,
  selectedChatroom,
  messages,
  onShowJoinChatroom,
  onShowCreateChatroom,
  onEditMessage,
  onDeleteMessage,
  onNewMessage,
  onMessageReadStatusUpdate,
  onRefreshMessages
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);

  // WebSocket for real-time updates
  const { lastMessage } = useWebSocket();

  // Handle WebSocket messages for real-time updates
  useEffect(() => {
    if (!lastMessage || !selectedChatroom || !user) return;

    switch (lastMessage.type) {
      case 'new_message':
        // Check if the message is for the current chatroom
        if (lastMessage.chatroom_id === selectedChatroom.id) {
          console.log('New message received via WebSocket:', lastMessage.data);
          if (onNewMessage && lastMessage.data) {
            const newMessage = lastMessage.data as Message;
            onNewMessage(newMessage);
          }
          // FIXED: Direct positioning to bottom for new messages
          setTimeout(() => {
            const messagesContainer = document.querySelector('.h-full.overflow-y-auto');
            if (messagesContainer) {
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
              console.log('🎯 Auto-positioned to bottom for new message');
            }
          }, 50);
        }
        break;

      case 'message_read':
        // Handle real-time read status updates with API verification
        if (lastMessage.chatroom_id === selectedChatroom.id) {
          if (lastMessage.data) {
            const data = lastMessage.data as { message_id?: string; read_status?: ReadInfo[] };
            if (data.message_id) {
              console.log(`📡 WebSocket read status update for message ${data.message_id}`);

              // Use WebSocket data if available
              if (data.read_status && onMessageReadStatusUpdate) {
                onMessageReadStatusUpdate(data.message_id, data.read_status);
                console.log(`✅ Updated from WebSocket:`, data.read_status);
              }

              // Also refresh from API to ensure accuracy (like working read status modal)
              setTimeout(() => {
                refreshMessageReadStatus(data.message_id!);
              }, 100); // Small delay to avoid race conditions
            }
          }
        }
        break;



      default:
        // Handle other message types if needed
        break;
    }
  }, [lastMessage, selectedChatroom, onNewMessage, onMessageReadStatusUpdate, onRefreshMessages, user]);

  // Get first unread message and navigate directly when chatroom changes (FIXED: Static unread label)
  useEffect(() => {
    if (!selectedChatroom || !user) return;

    const getFirstUnreadAndNavigate = async () => {
      try {
        console.log('🎯 Getting first unread message for chatroom:', selectedChatroom.id);
        const response = await messageReadStatusAPI.getFirstUnreadMessage(selectedChatroom.id);
        const firstUnreadMessage = response.data;

        if (firstUnreadMessage) {
          // Set unread message ID (FIXED: This will be static until chat room change)
          setFirstUnreadMessageId(firstUnreadMessage.id);
          console.log('📍 Found first unread message:', firstUnreadMessage.id);

          // FIXED: Direct positioning to unread message without scrolling animation
          setTimeout(() => {
            const messageElement = document.getElementById(`message-${firstUnreadMessage.id}`);
            const messagesContainer = document.querySelector('.h-full.overflow-y-auto');

            if (messageElement && messagesContainer) {
              // Calculate direct position
              const containerRect = messagesContainer.getBoundingClientRect();
              const messageRect = messageElement.getBoundingClientRect();
              const scrollTop = messagesContainer.scrollTop;
              const targetPosition = scrollTop + messageRect.top - containerRect.top - (containerRect.height / 2) + (messageRect.height / 2);

              // Direct positioning without animation
              messagesContainer.scrollTop = Math.max(0, targetPosition);
              console.log('🎯 Positioned directly at unread message');
            }
          }, 200); // Faster positioning
        } else {
          setFirstUnreadMessageId(null);
          console.log('📍 No unread messages, navigating to bottom');

          // FIXED: Direct positioning to bottom without scrolling animation
          setTimeout(() => {
            const messagesContainer = document.querySelector('.h-full.overflow-y-auto');
            if (messagesContainer) {
              // Direct positioning to bottom
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
              console.log('🎯 Positioned directly at bottom');
            }
          }, 200);
        }
      } catch (error) {
        console.error('Failed to get first unread message:', error);
        setFirstUnreadMessageId(null);

        // FIXED: Fallback direct positioning to bottom
        setTimeout(() => {
          const messagesContainer = document.querySelector('.h-full.overflow-y-auto');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            console.log('🎯 Fallback positioned at bottom');
          }
        }, 200);
      }
    };

    // Only run when chatroom changes, not when messages change
    getFirstUnreadAndNavigate();
  }, [selectedChatroom, user]); // Include full objects for proper dependency tracking

  // Manual mark message as read when clicked (for testing real-time updates)
  const handleMessageClick = async (messageId: string) => {
    if (!user || !selectedChatroom) return;

    try {
      await messageReadStatusAPI.markMessageAsRead(messageId);
      console.log('Manually marked message as read:', messageId);

      // Immediately refresh the read status for this message (like working read status modal)
      await refreshMessageReadStatus(messageId);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  // Refresh read status for a specific message (using same approach as working read status modal)
  const refreshMessageReadStatus = useCallback(async (messageId: string) => {
    try {
      console.log('🔄 Refreshing read status for message:', messageId);
      const response = await messageReadStatusAPI.getMessageReadStatus(messageId);
      const freshReadStatus = response.data;

      // Update the message with fresh read status data
      if (onMessageReadStatusUpdate) {
        onMessageReadStatusUpdate(messageId, freshReadStatus);
        console.log('✅ Refreshed read status from API:', freshReadStatus);
      }
    } catch (error) {
      console.error('Failed to refresh read status:', error);
    }
  }, [onMessageReadStatusUpdate]);

  // Auto-mark all messages as read when entering chatroom (FIXED: Only clear label on manual action)
  useEffect(() => {
    if (!selectedChatroom || !user) return;

    const markAllAsRead = async () => {
      try {
        await messageReadStatusAPI.markAllMessagesAsRead(selectedChatroom.id);
        // FIXED: Only clear unread label after explicit mark-all-read action
        console.log('🔄 Marked all messages as read, clearing unread label');
        setFirstUnreadMessageId(null);
      } catch (error) {
        console.error('Failed to mark messages as read:', error);
      }
    };

    // Mark as read after a longer delay to allow testing of real-time updates
    const timer = setTimeout(() => {
      markAllAsRead();
    }, 10000); // Increased to 10 seconds for testing

    return () => clearTimeout(timer);
  }, [selectedChatroom, user]);

  // Reset first unread message when chatroom changes (FIXED: Only on chatroom change)
  useEffect(() => {
    console.log('🔄 Chatroom changed, resetting unread label state');
    setFirstUnreadMessageId(null);
  }, [selectedChatroom?.id]);

  // Monitor messages changes for debugging
  useEffect(() => {
    console.log('📝 Messages prop changed, total messages:', messages.length);
    messages.forEach(msg => {
      if (msg.sender_id === user?.user_id && msg.read_status) {
        const allRead = msg.read_status.every(status => status.is_read);
        console.log(`📊 Message ${msg.id} read status:`, {
          readStatus: msg.read_status,
          allRead,
          expectedTickColor: allRead ? 'BLUE' : 'GREY'
        });
      }
    });
  }, [messages, user?.user_id]);

  // Periodic refresh of read status for sender's messages (like working read status modal approach)
  useEffect(() => {
    if (!user || !selectedChatroom || messages.length === 0) return;

    const refreshSenderMessages = async () => {
      const senderMessages = messages.filter(msg =>
        msg.sender_id === user.user_id &&
        msg.read_status &&
        !msg.read_status.every(status => status.is_read) // Only refresh unread messages
      );

      if (senderMessages.length > 0) {
        console.log(`🔄 Refreshing read status for ${senderMessages.length} sender messages`);

        // Refresh read status for each sender message
        for (const msg of senderMessages) {
          try {
            await refreshMessageReadStatus(msg.id);
          } catch (error) {
            console.error(`Failed to refresh read status for message ${msg.id}:`, error);
          }
        }
      }
    };

    // Refresh every 5 seconds for testing (can be increased for production)
    const interval = setInterval(refreshSenderMessages, 5000);

    return () => clearInterval(interval);
  }, [messages, user, selectedChatroom, refreshMessageReadStatus]);

  // Extract filename from URL
  const getFilenameFromUrl = (url: string) => {
    // Get the filename from the URL path
    const urlParts = url.split('/');
    let filename = urlParts[urlParts.length - 1];

    // Remove query parameters if any
    filename = filename.split('?')[0];

    // Make sure we have a valid filename
    return filename || 'download';
  };

  // Handle image download
  const handleDownloadImage = (url: string, filename: string) => {
    try {
      // Create a fetch request to get the image data
      fetch(url)
        .then(response => response.blob())
        .then(blob => {
          // Create a blob URL for the image
          const blobUrl = URL.createObjectURL(blob);

    // Create a temporary link element
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename || 'image';

          // Append to body, click and remove
          document.body.appendChild(link);
          link.click();

          // Clean up
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        })
        .catch(error => {
          console.error('Error downloading image:', error);
          // Fallback to simpler approach if fetch fails
    const link = document.createElement('a');
    link.href = url;
          link.download = filename;
          link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
        });
    } catch (error) {
      console.error('Error in download handler:', error);
    }
  };

  if (!selectedChatroom) {
    return (
      <div className="h-full overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center">
        <motion.div
          className="flex flex-col items-center justify-center text-center max-w-md"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-300 mb-2">No Chatroom Selected</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Choose a chatroom from the sidebar or create a new one to start chatting with others.
          </p>
          <div className="flex space-x-3">
            <motion.button
              onClick={onShowJoinChatroom}
              className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg flex items-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              disabled={!onShowJoinChatroom}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="text-sm">Join a Chatroom</span>
            </motion.button>

            <motion.button
              onClick={onShowCreateChatroom}
              className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg flex items-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              disabled={!onShowCreateChatroom}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm">Create New</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Animation variants for messages
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const messageVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20
      }
    }
  };

  return (
    <div className="h-full overflow-y-auto overscroll-contain p-4 bg-gray-50 dark:bg-gray-900 flex flex-col relative">
      {/* Chat background with pattern */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23000000' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: '300px 300px'
          }}>
      </div>

      {/* Image Viewer Modal */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedImage(null)}
          >
            <motion.div
              className="relative flex flex-col items-center max-w-4xl max-h-[90vh]"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 flex space-x-2 m-4 z-10">
                <motion.button
                  className="p-2 bg-white rounded-full text-gray-800 hover:bg-gray-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => expandedImage && handleDownloadImage(expandedImage, getFilenameFromUrl(expandedImage))}
                >
                  <ArrowDownIcon className="w-5 h-5" />
                </motion.button>
                <motion.button
                  className="p-2 bg-white rounded-full text-gray-800 hover:bg-gray-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setExpandedImage(null)}
                >
                  <XIcon className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="relative w-[85vw] h-[85vh] max-w-4xl">
                <Image
                  src={expandedImage || ''}
                alt="Expanded view"
                  fill
                  className="object-contain rounded shadow-lg"
                  sizes="(max-width: 1024px) 85vw, 1024px"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1"></div> {/* Spacer to push messages to the bottom */}

      {messages.length > 0 ? (
        <motion.div
          className="space-y-4 z-20"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {messages.map((message, index) => (
            <div key={message.id}>
              {/* Unread Messages Label - FIXED: Only show on recipient's messages, not sender's */}
              {firstUnreadMessageId === message.id && message.sender_id !== user?.user_id && (
                <motion.div
                  className="flex justify-center mb-4"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Unread messages</span>
                  </div>
                </motion.div>
              )}

              <motion.div
                key={message.id}
                id={`message-${message.id}`}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                transition={{
                  delay: index * 0.05,
                  duration: 0.3
                }}
                className={`group relative ${
                  message.sender_id === user?.user_id ? 'text-right' : 'text-left'
                }`}
              >
              <div
                className={`inline-block px-4 py-2 rounded-lg max-w-[75%] shadow-sm hover:shadow-md transition-shadow duration-200 group cursor-pointer ${
                  message.sender_id === user?.user_id
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-none'
                }`}
                onClick={() => handleMessageClick(message.id)}
              >
                <div className="flex items-center mb-1">
                  <div className={`w-5 h-5 rounded-full ${
                    message.sender_id === user?.user_id
                      ? 'bg-primary-300'
                      : 'bg-gray-300 dark:bg-gray-600'
                  } flex items-center justify-center text-xs mr-1`}>
                    {message.sender_name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-semibold">{message.sender_name}</p>
                </div>

                {message.text_content && (
                  <p className="whitespace-pre-wrap break-words">{message.text_content}</p>
                )}

                {message.media_url && (
                  <motion.div
                    className="mt-2 relative group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {message.message_type.includes('picture') ? (
                      <>
                        <div className="relative w-full max-w-xs">
                          <Image
                            src={message.media_url || ''}
                          alt="Shared image"
                            width={250}
                            height={200}
                            className="rounded cursor-pointer transform transition-transform hover:scale-105 object-cover"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (message.media_url) {
                                setExpandedImage(message.media_url);
                              }
                            }}
                        />
                        </div>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <div className="bg-black bg-opacity-50 w-full h-full flex items-center justify-center">
                            <div className="flex space-x-3">
                              {message.media_url && (
                                <>
                              <motion.button
                                className="p-2 bg-white rounded-full text-gray-800"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                      e.preventDefault();
                                  e.stopPropagation();
                                      if (message.media_url) {
                                        setExpandedImage(message.media_url);
                                      }
                                }}
                              >
                                <MaximizeIcon className="h-5 w-5" />
                              </motion.button>
                              <motion.button
                                className="p-2 bg-white rounded-full text-gray-800"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                      e.preventDefault();
                                  e.stopPropagation();
                                  if (message.media_url) {
                                    handleDownloadImage(message.media_url, getFilenameFromUrl(message.media_url));
                                  }
                                }}
                              >
                                <ArrowDownIcon className="h-5 w-5" />
                              </motion.button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : message.message_type.includes('video') ? (
                      <video
                        src={message.media_url}
                        controls
                        className="max-w-xs rounded"
                      />
                    ) : message.message_type.includes('audio') ? (
                      <audio
                        src={message.media_url}
                        controls
                        className="max-w-xs"
                      />
                    ) : null}
                  </motion.div>
                )}

                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center">
                    {message.edited && (
                      <span className="text-xs opacity-50 mr-2 italic">
                        edited
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <p className="text-xs opacity-70">
                      {new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {/* Simple read status ticks - only show for sender's messages */}
                    {message.sender_id === user?.user_id && (
                      <div className="flex items-center ml-1">
                        {(() => {
                          // Debug logging for tick rendering
                          const readStatus = message.read_status || [];
                          const allRead = readStatus.length > 0 && readStatus.every(status => status.is_read);
                          const readCount = readStatus.filter(status => status.is_read).length;
                          const totalCount = readStatus.length;

                          console.log(`🎨 Rendering ticks for message ${message.id}:`, {
                            readStatus,
                            allRead,
                            readCount,
                            totalCount,
                            tickColor: allRead ? 'BLUE' : 'GREY'
                          });

                          if (allRead) {
                            // All read - blue double tick with animation
                            return (
                              <div
                                className="flex items-center text-blue-500 transition-all duration-300"
                                title={`Read by all (${readCount}/${totalCount})`}
                                key={`blue-${message.id}-${readCount}`} // Force re-render on status change
                              >
                                <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <svg className="w-4 h-4 -ml-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            );
                          } else {
                            // Not read - gray double tick
                            return (
                              <div
                                className="flex items-center text-gray-400 transition-all duration-300"
                                title={totalCount > 0 ? `Read by ${readCount} of ${totalCount}` : "Delivered"}
                                key={`grey-${message.id}-${readCount}`} // Force re-render on status change
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <svg className="w-4 h-4 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Actions - Inline with message */}
              {onEditMessage && onDeleteMessage && editingMessageId !== message.id && (
                <div className={`flex items-center mt-2 ${message.sender_id === user?.user_id ? 'justify-end' : 'justify-start'}`}>
                  <MessageActions
                    message={message}
                    user={user}
                    onEdit={onEditMessage}
                    onDelete={onDeleteMessage}
                    isEditing={false}
                    onStartEdit={() => setEditingMessageId(message.id)}
                    onCancelEdit={() => setEditingMessageId(null)}
                  />
                </div>
              )}

              {/* Editing Interface - Separate from message bubble */}
              {onEditMessage && onDeleteMessage && editingMessageId === message.id && (
                <div className="mt-2">
                  <MessageActions
                    message={message}
                    user={user}
                    onEdit={onEditMessage}
                    onDelete={onDeleteMessage}
                    isEditing={true}
                    onStartEdit={() => setEditingMessageId(message.id)}
                    onCancelEdit={() => setEditingMessageId(null)}
                  />
                </div>
              )}
            </motion.div>
            </div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          className="flex flex-col items-center justify-center flex-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <motion.div
            className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4 relative"
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.3
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary-400 dark:text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </motion.div>
          <motion.h3
            className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Start a Conversation
          </motion.h3>
          <motion.p
            className="text-center text-gray-500 dark:text-gray-400 max-w-xs"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Be the first to send a message in <b>{selectedChatroom.name}</b>!
          </motion.p>
          <motion.div
            className="mt-4 p-2 bg-primary-50 dark:bg-gray-700 rounded-lg border border-primary-100 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <span className="text-primary-500 dark:text-primary-400 font-medium">Tip:</span> Type in the box below and press Enter to send a message
          </motion.div>
        </motion.div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
