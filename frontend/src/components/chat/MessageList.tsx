import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { User, Chatroom, Message } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon } from '@heroicons/react/outline';

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
}

const MessageList: React.FC<MessageListProps> = ({ user, selectedChatroom, messages, onShowJoinChatroom, onShowCreateChatroom }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    // Use a small timeout to ensure the DOM has updated
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    return () => clearTimeout(timer);
  }, [messages]);

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
            <motion.div
              key={message.id}
              variants={messageVariants}
              initial="hidden"
              animate="visible"
              transition={{ 
                delay: index * 0.05,
                duration: 0.3
              }}
              className={`${
                message.sender_id === user?.user_id ? 'text-right' : 'text-left'
              }`}
            >
              <div
                className={`inline-block px-4 py-2 rounded-lg max-w-[75%] shadow-sm hover:shadow-md transition-shadow duration-200 ${
                  message.sender_id === user?.user_id
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-none'
                }`}
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
                
                <p className="text-xs opacity-70 mt-1 text-right">
                  {new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
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
