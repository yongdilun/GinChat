import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Chatroom } from '@/types';
import { chatroomAPI } from '@/services/api';
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
}) => {
  const router = useRouter();
  const [showChatroomOptions, setShowChatroomOptions] = useState(false);
  const [showCreateChatroom, setShowCreateChatroom] = useState(false);
  const [showJoinChatroom, setShowJoinChatroom] = useState(false);
  const [newChatroomName, setNewChatroomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joiningChatroomId, setJoiningChatroomId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [availableChatrooms, setAvailableChatrooms] = useState<Chatroom[]>([]);
  const [joinedChatrooms, setJoinedChatrooms] = useState<Chatroom[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Filter chatrooms to show only joined ones
  useEffect(() => {
    if (!user) return;

    const joined = chatrooms.filter(chatroom =>
      chatroom.members.some(member => member.user_id === user.user_id)
    );

    const available = chatrooms.filter(chatroom =>
      !chatroom.members.some(member => member.user_id === user.user_id)
    );

    setJoinedChatrooms(joined);
    setAvailableChatrooms(available);
  }, [chatrooms, user]);

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
      const response = await chatroomAPI.createChatroom(newChatroomName);

      // Get the newly created chatroom
      const newChatroom = response.data.chatroom;

      // Clear input and hide forms
      setNewChatroomName('');
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

  const joinChatroom = async (chatroomId: string) => {
    setIsJoining(true);
    setJoiningChatroomId(chatroomId);
    setError('');

    try {
      await chatroomAPI.joinChatroom(chatroomId);

      // Hide forms
      setShowJoinChatroom(false);
      setShowChatroomOptions(false);

      // Refresh chatrooms via the parent component
      await onChatroomsRefresh();

      // Find the joined chatroom in the current chatrooms list or use the response
      const joinedChatroom = chatrooms.find(chatroom => chatroom.id === chatroomId);

      // Select the joined chatroom
      if (joinedChatroom) {
        console.log("Automatically selecting joined chatroom:", joinedChatroom.name);
        onSelectChatroom(joinedChatroom);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to join chatroom');
    } finally {
      setIsJoining(false);
      setJoiningChatroomId(null);
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
          <motion.button
            onClick={handleLogout}
            className="mt-3 w-full px-3 py-2 flex items-center justify-center text-sm text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <LogoutIcon className="w-4 h-4 mr-2" />
            Logout
          </motion.button>
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
              }}
              className="w-full px-3 py-2 flex items-center text-sm text-white bg-green-500 rounded-md hover:bg-green-600 transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              data-join-chatroom
              id="join-chatroom-button"
            >
              <UserGroupIcon className="w-4 h-4 mr-2" />
              Join Existing Chatroom
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
            <input
              type="text"
              value={newChatroomName}
              onChange={(e) => setNewChatroomName(e.target.value)}
              placeholder="Chatroom name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
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
              <h3 className="text-sm font-medium">Join Existing Chatroom</h3>
              <button
                onClick={() => setShowJoinChatroom(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            {error && (
              <div className="mb-2 text-sm text-red-600">{error}</div>
            )}
            {availableChatrooms.length > 0 ? (
              <motion.ul
                className="border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
              >
                {availableChatrooms.map((chatroom) => (
                  <motion.li
                    key={chatroom.id}
                    className="border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: { opacity: 1, y: 0 }
                    }}
                  >
                    <div className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <div>
                        <p className="text-sm font-medium">{chatroom.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {chatroom.members.length} member{chatroom.members.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <motion.button
                        onClick={() => joinChatroom(chatroom.id)}
                        disabled={isJoining}
                        className="px-2 py-1 text-xs text-white bg-green-500 rounded hover:bg-green-600 disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isJoining && joiningChatroomId === chatroom.id ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Join
                          </span>
                        ) : 'Join'}
                      </motion.button>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No available chatrooms to join.</p>
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
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold ${
                          isSidebarCollapsed ? 'mx-auto' : 'mr-3'
                        }`}>
                          {chatroom.name.charAt(0).toUpperCase()}
                        </div>
                        {!isSidebarCollapsed && (
                          <div className="overflow-hidden flex-1">
                            <p className={`font-medium truncate ${
                              selectedChatroom?.id === chatroom.id ? 'text-primary-600 dark:text-primary-400' : ''
                            }`}>{chatroom.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {chatroom.members.length} member{chatroom.members.length !== 1 ? 's' : ''}
                            </p>
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
