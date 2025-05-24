import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, Chatroom, LatestChatMessage, ChatroomUnreadCount } from '@/types';
import { chatroomAPI, messageReadStatusAPI } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon } from '@heroicons/react/outline';
import ChatroomActions from './ChatroomActions';

interface ChatSidebarProps {
  user: User | null;
  chatrooms: Chatroom[];
  selectedChatroom: Chatroom | null;
  onSelectChatroom: (chatroom: Chatroom) => void;
  onChatroomsRefresh: () => void;
  onDeleteChatroom?: (chatroomId: string) => void;
  refreshTrigger?: number; // Add this to trigger refresh from parent
}

// Replace LogoutIcon with inline SVG
const LogoutIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

// Replace PlusIcon with inline SVG
const PlusIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

// Replace ChatIcon with inline SVG
const ChatIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

// Replace UserGroupIcon with inline SVG
const UserGroupIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  user,
  chatrooms,
  selectedChatroom,
  onSelectChatroom,
  onChatroomsRefresh,
  onDeleteChatroom,
  refreshTrigger,
}) => {
  const router = useRouter();
  const [showChatroomOptions, setShowChatroomOptions] = useState(false);
  const [showCreateChatroom, setShowCreateChatroom] = useState(false);
  const [showJoinChatroom, setShowJoinChatroom] = useState(false);
  const [newChatroomName, setNewChatroomName] = useState('');
  const [newChatroomPassword, setNewChatroomPassword] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [joinedChatrooms, setJoinedChatrooms] = useState<Chatroom[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [latestMessages, setLatestMessages] = useState<LatestChatMessage[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<ChatroomUnreadCount[]>([]);

  // Filter chatrooms to show only joined ones
  useEffect(() => {
    if (!user) return;

    const joined = chatrooms.filter(chatroom =>
      chatroom.members.some(member => member.user_id === user.user_id)
    );

    setJoinedChatrooms(joined);
  }, [chatrooms, user]);

  // Fetch latest messages and unread counts
  const fetchLatestMessagesAndCounts = useCallback(async () => {
    if (!user) return;

    try {
      const [latestResponse, unreadResponse] = await Promise.all([
        messageReadStatusAPI.getLatestMessages(),
        messageReadStatusAPI.getUnreadCounts(),
      ]);



      setLatestMessages(latestResponse.data || []);
      setUnreadCounts(unreadResponse.data || []);
    } catch (error) {
      console.error('Failed to fetch latest messages and unread counts:', error);
      // Set empty arrays as fallback
      setLatestMessages([]);
      setUnreadCounts([]);
    }
  }, [user]);

  // Fetch latest messages and unread counts when chatrooms change
  useEffect(() => {
    fetchLatestMessagesAndCounts();
  }, [chatrooms, user, fetchLatestMessagesAndCounts]);

  // Refresh when parent triggers refresh
  useEffect(() => {
    if (refreshTrigger) {
      fetchLatestMessagesAndCounts();
    }
  }, [refreshTrigger, fetchLatestMessagesAndCounts]);

  // Helper function to get latest message for a chatroom
  const getLatestMessageForChatroom = (chatroomId: string) => {
    if (!latestMessages || !Array.isArray(latestMessages)) return null;
    return latestMessages.find(msg => msg.chatroom_id === chatroomId);
  };

  // Helper function to get unread count for a chatroom
  const getUnreadCountForChatroom = (chatroomId: string) => {
    if (!unreadCounts || !Array.isArray(unreadCounts)) {
      return 0;
    }

    // Debug logging
    console.log(`Looking for unread count for chatroom ID: "${chatroomId}"`);
    console.log('Available unread counts:', unreadCounts.map(count => ({
      chatroom_id: count.chatroom_id,
      chatroom_name: count.chatroom_name,
      unread_count: count.unread_count
    })));

    const unreadData = unreadCounts.find(count => count.chatroom_id === chatroomId);
    console.log(`Found unread data for "${chatroomId}":`, unreadData);

    return unreadData?.unread_count || 0;
  };

  // Helper function to format latest message text
  const formatLatestMessage = (message: LatestChatMessage | null) => {
    if (!message || !message.message_id) return 'No messages yet';

    if (message.message_type === 'text') {
      return message.text_content || '';
    } else if (message.message_type === 'picture') {
      return '📷 Photo';
    } else if (message.message_type === 'audio') {
      return '🎵 Audio';
    } else if (message.message_type === 'video') {
      return '🎥 Video';
    } else if (message.message_type && message.message_type.includes('text_and_')) {
      const mediaType = message.message_type.split('_and_')[1];
      const mediaIcon = mediaType === 'picture' ? '📷' : mediaType === 'audio' ? '🎵' : '🎥';
      return `${mediaIcon} ${message.text_content || 'Media with text'}`;
    }
    return 'Message';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  const createChatroom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newChatroomName.trim()) return;

    setIsCreating(true);
    setError('');

    try {
      const response = await chatroomAPI.createChatroom(
        newChatroomName,
        newChatroomPassword.trim() || undefined
      );

      // Get the newly created chatroom
      const newChatroom = response.data.chatroom;

      // Clear input and hide forms
      setNewChatroomName('');
      setNewChatroomPassword('');
      setShowCreateChatroom(false);
      setShowChatroomOptions(false);

      // Refresh chatrooms via the parent component
      await onChatroomsRefresh();

      // Select the newly created chatroom directly
      if (newChatroom) {
        console.log("Automatically selecting newly created chatroom:", newChatroom.name);
        onSelectChatroom(newChatroom);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create chatroom');
    } finally {
      setIsCreating(false);
    }
  };



  // Search for room by code
  const searchRoomByCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomCode.trim()) return;

    setIsSearching(true);
    setError('');
    setShowPasswordInput(false);

    try {
      // Try to get room info by attempting to join without password first
      // This will tell us if the room exists and if it needs a password
      const response = await chatroomAPI.joinChatroomByCode(roomCode.toUpperCase(), '');

      // If successful, room doesn't need password
      const joinedChatroom = response.data.chatroom;

      // Clear forms and refresh
      setRoomCode('');
      setRoomPassword('');
      setShowJoinChatroom(false);
      setShowChatroomOptions(false);

      await onChatroomsRefresh();

      if (joinedChatroom) {
        console.log("Automatically selecting joined chatroom:", joinedChatroom.name);
        onSelectChatroom(joinedChatroom);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };

      if (error.response?.data?.error === 'Incorrect password') {
        // Room exists but needs password
        setShowPasswordInput(true);
        setError('This room is password protected. Please enter the password.');
      } else if (error.response?.data?.error === 'Room not found. Please check the room code.') {
        setError('Room not found. Please check the room code.');
      } else if (error.response?.data?.error === 'You are already a member of this chatroom') {
        setError('You are already a member of this chatroom.');
      } else {
        setError(error.response?.data?.error || 'Failed to find room');
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Join room with password
  const joinRoomWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomCode.trim()) return;

    setIsJoining(true);
    setError('');

    try {
      const response = await chatroomAPI.joinChatroomByCode(
        roomCode.toUpperCase(),
        roomPassword
      );

      const joinedChatroom = response.data.chatroom;

      // Clear forms and refresh
      setRoomCode('');
      setRoomPassword('');
      setShowPasswordInput(false);
      setShowJoinChatroom(false);
      setShowChatroomOptions(false);

      await onChatroomsRefresh();

      if (joinedChatroom) {
        console.log("Automatically selecting joined chatroom:", joinedChatroom.name);
        onSelectChatroom(joinedChatroom);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };

      if (error.response?.data?.error === 'Incorrect password') {
        setError('Incorrect password. Please try again.');
      } else {
        setError(error.response?.data?.error || 'Failed to join room');
      }
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <motion.div
      className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full ${
        isSidebarCollapsed ? 'w-20' : 'w-80'
      } transition-all duration-300 ease-in-out`}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      data-sidebar
    >
      {/* User info */}
      <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${
        isSidebarCollapsed ? 'flex flex-col items-center' : ''
      }`}>
        <div className="flex justify-between items-center mb-2">
          <div className={`flex ${isSidebarCollapsed ? 'flex-col items-center' : 'items-center'}`}>
            <motion.div
              className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-lg"
              whileHover={{ scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              {user?.username.charAt(0).toUpperCase()}
            </motion.div>

            {!isSidebarCollapsed && (
              <div className="ml-3">
                <p className="font-medium">{user?.username}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                  {user?.email}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 focus:outline-none"
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              animate={{ rotate: isSidebarCollapsed ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </motion.svg>
          </button>
        </div>

        {!isSidebarCollapsed && (
          <div className="mt-3 space-y-2">
            {/* Debug panel */}
            <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded max-h-32 overflow-y-auto">
              <p>Debug: Unread counts: {unreadCounts.length}</p>
              <p>Latest messages: {latestMessages.length}</p>
              <p>Chatrooms: {chatrooms.length}</p>
              {unreadCounts.length > 0 && (
                <div className="mt-1">
                  <p className="font-semibold">Unread data:</p>
                  {unreadCounts.map((count, index) => (
                    <p key={index} className="text-xs">
                      ID: "{count.chatroom_id}" | Name: "{count.chatroom_name}" | Count: {count.unread_count}
                    </p>
                  ))}
                </div>
              )}
              {chatrooms.length > 0 && (
                <div className="mt-1">
                  <p className="font-semibold">Chatroom IDs:</p>
                  {chatrooms.map((room, index) => (
                    <p key={index} className="text-xs">
                      "{room.id}" - {room.name}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <motion.button
              onClick={handleLogout}
              className="w-full px-3 py-2 flex items-center justify-center text-sm text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <LogoutIcon className="w-4 h-4 mr-2" />
              Logout
            </motion.button>
          </div>
        )}

        {isSidebarCollapsed && (
          <motion.button
            onClick={handleLogout}
            className="mt-3 p-2.5 flex items-center justify-center text-white bg-red-500 rounded-full hover:bg-red-600 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <LogoutIcon className="w-6 h-6" />
          </motion.button>
        )}
      </div>

      {/* Add chatrooms */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        {!isSidebarCollapsed ? (
          <motion.button
            onClick={() => setShowChatroomOptions(!showChatroomOptions)}
            className="w-full px-3 py-2 flex items-center justify-center text-sm text-white bg-primary-500 rounded-md hover:bg-primary-600 transition-colors"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            id="add-chatroom-button"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Chatroom
          </motion.button>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <motion.button
              onClick={() => {
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                } else {
                  setShowChatroomOptions(!showChatroomOptions);
                }
              }}
              className="p-3 bg-primary-500 rounded-full text-white hover:bg-primary-600 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <PlusIcon className="w-5 h-5" />
            </motion.button>
          </div>
        )}
      </div>

      {/* Chatroom options */}
      <AnimatePresence>
        {showChatroomOptions && !isSidebarCollapsed && (
          <motion.div
            className="p-4 border-b border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium">Options</h3>
              <button
                onClick={() => setShowChatroomOptions(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <motion.button
              onClick={() => {
                setShowCreateChatroom(true);
                setShowJoinChatroom(false);
                setShowChatroomOptions(false);
                setError('');
              }}
              className="w-full mb-2 px-3 py-2 flex items-center text-sm text-white bg-primary-500 rounded-md hover:bg-primary-600 transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              data-create-chatroom
              id="create-chatroom-button"
            >
              <ChatIcon className="w-4 h-4 mr-2" />
              Create New Chatroom
            </motion.button>
            <motion.button
              onClick={() => {
                setShowJoinChatroom(true);
                setShowCreateChatroom(false);
                setShowChatroomOptions(false);
                setError('');
                setRoomCode('');
                setRoomPassword('');
                setShowPasswordInput(false);
              }}
              className="w-full px-3 py-2 flex items-center text-sm text-white bg-green-500 rounded-md hover:bg-green-600 transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              data-join-chatroom
              id="join-chatroom-button"
            >
              <UserGroupIcon className="w-4 h-4 mr-2" />
              Join by Room Code
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create chatroom form */}
      <AnimatePresence>
        {showCreateChatroom && !isSidebarCollapsed && (
          <motion.form
            onSubmit={createChatroom}
            className="p-4 border-b border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Create New Chatroom</h3>
              <button
                type="button"
                onClick={() => setShowCreateChatroom(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            {error && (
              <div className="mb-2 text-sm text-red-600">{error}</div>
            )}
            <div className="space-y-2">
              <input
                type="text"
                value={newChatroomName}
                onChange={(e) => setNewChatroomName(e.target.value)}
                placeholder="Chatroom name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
              <input
                type="password"
                value={newChatroomPassword}
                onChange={(e) => setNewChatroomPassword(e.target.value)}
                placeholder="Password (optional)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Leave password empty for a public room
              </p>
            </div>
            <motion.button
              type="submit"
              disabled={isCreating}
              className="mt-2 w-full px-3 py-2 flex items-center justify-center text-sm text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:opacity-50"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {isCreating ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : 'Create Chatroom'}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Join chatroom form */}
      <AnimatePresence>
        {showJoinChatroom && !isSidebarCollapsed && (
          <motion.div
            className="p-4 border-b border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Join by Room Code</h3>
              <button
                onClick={() => {
                  setShowJoinChatroom(false);
                  setRoomCode('');
                  setRoomPassword('');
                  setShowPasswordInput(false);
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-2 text-sm text-red-600">{error}</div>
            )}

            {!showPasswordInput ? (
              // Step 1: Enter room code
              <form onSubmit={searchRoomByCode} className="space-y-2">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code (e.g., ABC123)"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enter the 6-character room code
                </p>
                <motion.button
                  type="submit"
                  disabled={isSearching || roomCode.length !== 6}
                  className="w-full px-3 py-2 flex items-center justify-center text-sm text-white bg-green-500 rounded-md hover:bg-green-600 disabled:opacity-50"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isSearching ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Searching...
                    </span>
                  ) : 'Find Room'}
                </motion.button>
              </form>
            ) : (
              // Step 2: Enter password
              <form onSubmit={joinRoomWithPassword} className="space-y-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Room Code: <span className="font-mono font-bold">{roomCode}</span>
                  </p>
                </div>
                <input
                  type="password"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  placeholder="Enter room password"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  autoFocus
                />
                <div className="flex space-x-2">
                  <motion.button
                    type="submit"
                    disabled={isJoining}
                    className="flex-1 px-3 py-2 flex items-center justify-center text-sm text-white bg-green-500 rounded-md hover:bg-green-600 disabled:opacity-50"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {isJoining ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Joining...
                      </span>
                    ) : 'Join Room'}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => {
                      setShowPasswordInput(false);
                      setRoomPassword('');
                      setError('');
                    }}
                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Back
                  </motion.button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Joined chatroom list */}
      <div className="flex-1 overflow-y-auto">
        {!isSidebarCollapsed && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">My Chatrooms</h2>
          </div>
        )}
        <div className={`${isSidebarCollapsed ? 'px-2' : 'px-0'} py-2`}>
          <AnimatePresence>
            {joinedChatrooms.length > 0 ? (
              <motion.ul
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.05
                    }
                  }
                }}
              >
                {joinedChatrooms.map((chatroom) => (
                  <motion.li
                    key={chatroom.id}
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: { opacity: 1, x: 0 }
                    }}
                  >
                    <div className={`${isSidebarCollapsed ? 'py-3 px-0' : 'px-4 py-3'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      selectedChatroom?.id === chatroom.id ? 'bg-primary-50 dark:bg-gray-700 border-l-4 border-primary-500' : ''
                    } flex items-center group`}>
                      <motion.button
                        onClick={() => onSelectChatroom(chatroom)}
                        className="flex items-center flex-1"
                        whileHover={{ x: isSidebarCollapsed ? 0 : 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className={`relative ${isSidebarCollapsed ? 'mx-auto' : 'mr-3'}`}>
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {chatroom.name.charAt(0).toUpperCase()}
                          </div>
                          {isSidebarCollapsed && getUnreadCountForChatroom(chatroom.id) > 0 && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg animate-pulse border-2 border-white">
                              {getUnreadCountForChatroom(chatroom.id) > 99 ? '99+' : getUnreadCountForChatroom(chatroom.id)}
                            </div>
                          )}
                        </div>
                        {!isSidebarCollapsed && (
                          <div className="overflow-hidden flex-1">
                            <div className="flex items-center gap-2 justify-between">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <p className={`font-medium truncate ${
                                  selectedChatroom?.id === chatroom.id ? 'text-primary-600 dark:text-primary-400' : ''
                                }`}>{chatroom.name}</p>
                                {chatroom.has_password && (
                                  <svg className="w-3 h-3 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              {getUnreadCountForChatroom(chatroom.id) > 0 && (
                                <div className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[24px] h-6 flex items-center justify-center font-bold shadow-lg animate-pulse">
                                  {getUnreadCountForChatroom(chatroom.id) > 99 ? '99+' : getUnreadCountForChatroom(chatroom.id)}
                                </div>
                              )}
                            </div>
                            <div className="mt-1">
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {(() => {
                                  const latestMessage = getLatestMessageForChatroom(chatroom.id);
                                  if (latestMessage) {
                                    const formattedMessage = formatLatestMessage(latestMessage);
                                    if (formattedMessage && typeof formattedMessage === 'string') {
                                      return formattedMessage.length > 30 ? `${formattedMessage.substring(0, 30)}...` : formattedMessage;
                                    }
                                  }
                                  return 'No messages yet';
                                })()}
                              </p>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                {chatroom.members.length} member{chatroom.members.length !== 1 ? 's' : ''}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                {chatroom.room_code}
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.button>

                      {/* Chatroom Actions */}
                      {!isSidebarCollapsed && onDeleteChatroom && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <ChatroomActions
                            chatroom={chatroom}
                            user={user}
                            onDelete={onDeleteChatroom}
                          />
                        </div>
                      )}
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            ) : (
              <motion.div
                className={`${isSidebarCollapsed ? 'px-2' : 'px-4'} py-4 text-gray-500 dark:text-gray-400 text-center`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">You haven&apos;t joined any chatrooms yet.</p>
                <p className="text-xs mt-1">Create or join one to get started!</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Version info */}
      <div className="p-2 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        {!isSidebarCollapsed && (
          <p>GinChat v1.0</p>
        )}
      </div>
    </motion.div>
  );
};

export default ChatSidebar;
