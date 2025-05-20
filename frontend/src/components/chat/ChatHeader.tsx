import { Chatroom, Message } from '@/types';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserGroupIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  PhotographIcon, 
  FilmIcon, 
  MicrophoneIcon,
  XIcon
} from '@heroicons/react/outline';

interface ChatHeaderProps {
  selectedChatroom: Chatroom | null;
  messages?: Message[];
}

// ArrowDownIcon as inline SVG
const ArrowDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

const ChatHeader: React.FC<ChatHeaderProps> = ({ selectedChatroom, messages = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'photos' | 'videos' | 'audio'>('members');
  const headerRef = useRef<HTMLDivElement>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  
  // Close the panel if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter messages by media type
  const getMediaByType = (type: string) => {
    if (!messages) return [];
    
    return messages.filter(msg => {
      if (type === 'photos') {
        return msg.message_type === 'picture' || msg.message_type === 'text_and_picture';
      } else if (type === 'videos') {
        return msg.message_type === 'video' || msg.message_type === 'text_and_video';
      } else if (type === 'audio') {
        return msg.message_type === 'audio' || msg.message_type === 'text_and_audio';
      }
      return false;
    });
  };

  // Toggle the dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Handle image download
  const handleDownloadImage = (url: string, filename: string) => {
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Extract filename from URL
  const getFilenameFromUrl = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  if (!selectedChatroom) {
    return (
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center text-white mr-3 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-lg">Welcome to GinChat</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select a chatroom from the sidebar or create a new one to start chatting
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div ref={headerRef} className="sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-sm">
      <motion.div 
        className="p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer"
        onClick={toggleDropdown}
        whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-lg">
              {selectedChatroom.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold text-lg">
                {selectedChatroom.name}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedChatroom.members.length} member{selectedChatroom.members.length !== 1 ? 's' : ''} • Created {formatDate(selectedChatroom.created_at)}
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
            )}
          </motion.div>
        </div>
      </motion.div>

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
              className="relative flex flex-col items-center max-w-3xl max-h-[80vh]"
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
              <motion.img
                src={expandedImage}
                alt="Expanded view"
                className="max-w-full max-h-[75vh] object-contain rounded shadow-lg"
                drag
                dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                dragElastic={0.1}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Video Viewer Modal */}
      <AnimatePresence>
        {expandedVideo && (
          <motion.div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedVideo(null)}
          >
            <motion.div
              className="relative flex flex-col items-center max-w-3xl max-h-[80vh]"
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
                  onClick={() => expandedVideo && handleDownloadImage(expandedVideo, getFilenameFromUrl(expandedVideo))}
                >
                  <ArrowDownIcon className="w-5 h-5" />
                </motion.button>
                <motion.button
                  className="p-2 bg-white rounded-full text-gray-800 hover:bg-gray-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setExpandedVideo(null)}
                >
                  <XIcon className="w-5 h-5" />
                </motion.button>
              </div>
              <video
                src={expandedVideo}
                controls
                autoPlay
                className="max-w-full max-h-[75vh] rounded shadow-lg"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-md overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ 
              zIndex: 50,
              maxHeight: 'calc(50vh - 70px)'
            }}
          >
            <div className="p-4">
              {/* Navigation tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-4 overflow-x-auto pb-2" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('members')}
                    className={`px-3 py-2 text-sm font-medium rounded-md flex items-center ${
                      activeTab === 'members'
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <UserGroupIcon className="w-4 h-4 mr-1" />
                    Members
                  </button>
                  <button
                    onClick={() => setActiveTab('photos')}
                    className={`px-3 py-2 text-sm font-medium rounded-md flex items-center ${
                      activeTab === 'photos'
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <PhotographIcon className="w-4 h-4 mr-1" />
                    Photos
                  </button>
                  <button
                    onClick={() => setActiveTab('videos')}
                    className={`px-3 py-2 text-sm font-medium rounded-md flex items-center ${
                      activeTab === 'videos'
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <FilmIcon className="w-4 h-4 mr-1" />
                    Videos
                  </button>
                  <button
                    onClick={() => setActiveTab('audio')}
                    className={`px-3 py-2 text-sm font-medium rounded-md flex items-center ${
                      activeTab === 'audio'
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <MicrophoneIcon className="w-4 h-4 mr-1" />
                    Audio
                  </button>
                </nav>
              </div>

              {/* Tab content */}
              <div className="mt-4">
                {/* Members Tab */}
                {activeTab === 'members' && (
                  <div className="max-h-64 overflow-y-auto">
                    <h3 className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">
                      {selectedChatroom.members.length} Participants
                    </h3>
                    <ul className="space-y-2">
                      {selectedChatroom.members.map((member) => (
                        <motion.li
                          key={member.user_id}
                          className="flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white mr-3">
                            {member.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.username}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Joined {formatDate(member.joined_at)}
                            </p>
                          </div>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Photos Tab */}
                {activeTab === 'photos' && (
                  <div>
                    <h3 className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">
                      {getMediaByType('photos').length} Photos
                    </h3>
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-1 max-h-40 overflow-y-auto p-1">
                      {getMediaByType('photos').length > 0 ? (
                        getMediaByType('photos').map((msg) => (
                          <motion.div
                            key={msg.id}
                            className="aspect-square rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-sm hover:shadow-md transition-shadow group relative cursor-pointer"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => msg.media_url && setExpandedImage(msg.media_url)}
                          >
                            <img
                              src={msg.media_url}
                              alt={`Photo shared by ${msg.sender_name}`}
                              className="w-full h-full object-cover object-center"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="p-1.5 bg-white rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                          No photos shared in this chat
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Videos Tab */}
                {activeTab === 'videos' && (
                  <div>
                    <h3 className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">
                      {getMediaByType('videos').length} Videos
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                      {getMediaByType('videos').length > 0 ? (
                        getMediaByType('videos').map((msg) => (
                          <motion.div
                            key={msg.id}
                            className="aspect-video rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-sm hover:shadow-md transition-shadow relative cursor-pointer"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => msg.media_url && setExpandedVideo(msg.media_url)}
                          >
                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                              <div className="w-8 h-8 bg-white bg-opacity-80 rounded-full flex items-center justify-center shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                            </div>
                            <img 
                              src={msg.media_url + '#t=0.1'} 
                              alt={`Video thumbnail`}
                              className="w-full h-full object-cover absolute inset-0"
                              onError={(e) => {
                                // If error loading thumbnail, replace with a default
                                (e.target as HTMLImageElement).src = '/video-placeholder.jpg';
                              }}
                            />
                          </motion.div>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                          No videos shared in this chat
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Audio Tab */}
                {activeTab === 'audio' && (
                  <div>
                    <h3 className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">
                      {getMediaByType('audio').length} Audio Files
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                      {getMediaByType('audio').length > 0 ? (
                        getMediaByType('audio').map((msg) => (
                          <motion.div
                            key={msg.id}
                            className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center shadow-sm"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="mr-2 flex-shrink-0">
                              <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                                <MicrophoneIcon className="w-3.5 h-3.5 text-primary-500" />
                              </div>
                            </div>
                            <div className="flex-grow min-w-0 mr-2">
                              <p className="text-xs font-medium truncate">{msg.sender_name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {formatDate(msg.sent_at)}
                              </p>
                            </div>
                            <audio controls className="w-24 h-6 flex-shrink-0">
                              <source src={msg.media_url} />
                            </audio>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No audio files shared in this chat
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatHeader;
