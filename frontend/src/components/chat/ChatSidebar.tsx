import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Chatroom } from '@/types';
import { chatroomAPI } from '@/services/api';

interface ChatSidebarProps {
  user: User | null;
  chatrooms: Chatroom[];
  selectedChatroom: Chatroom | null;
  onSelectChatroom: (chatroom: Chatroom) => void;
  onChatroomsRefresh: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  user,
  chatrooms,
  selectedChatroom,
  onSelectChatroom,
  onChatroomsRefresh,
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

      // Get the newly created chatroom ID
      const newChatroomId = response.data.chatroom.id;

      // Clear input and hide forms
      setNewChatroomName('');
      setShowCreateChatroom(false);
      setShowChatroomOptions(false);

      // Refresh chatrooms
      await onChatroomsRefresh();

      // Find the newly created chatroom in the updated list
      const updatedChatrooms = await chatroomAPI.getChatrooms();
      const newChatroom = updatedChatrooms.data.chatrooms.find(
        (chatroom: Chatroom) => chatroom.id === newChatroomId
      );

      // Select the newly created chatroom
      if (newChatroom) {
        onSelectChatroom(newChatroom);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create chatroom');
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

      // Refresh chatrooms
      await onChatroomsRefresh();

      // Find the joined chatroom in the updated list
      const updatedChatrooms = await chatroomAPI.getChatrooms();
      const joinedChatroom = updatedChatrooms.data.chatrooms.find(
        (chatroom: Chatroom) => chatroom.id === chatroomId
      );

      // Select the joined chatroom
      if (joinedChatroom) {
        onSelectChatroom(joinedChatroom);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join chatroom');
    } finally {
      setIsJoining(false);
      setJoiningChatroomId(null);
    }
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* User info */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3">
            <p className="font-medium">{user?.username}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 w-full px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {/* Chatrooms */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 flex justify-between items-center">
          <h2 className="font-semibold">My Chatrooms</h2>
          <button
            onClick={() => setShowChatroomOptions(!showChatroomOptions)}
            className="text-primary-500 hover:text-primary-600 text-xl font-bold"
          >
            +
          </button>
        </div>

        {/* Chatroom options */}
        {showChatroomOptions && (
          <div className="px-4 mb-4 flex flex-col space-y-2">
            <button
              onClick={() => {
                setShowCreateChatroom(true);
                setShowJoinChatroom(false);
                setShowChatroomOptions(false);
                setError('');
              }}
              className="w-full px-3 py-2 text-sm text-white bg-primary-500 rounded hover:bg-primary-600"
            >
              Create New Chatroom
            </button>
            <button
              onClick={() => {
                setShowJoinChatroom(true);
                setShowCreateChatroom(false);
                setShowChatroomOptions(false);
                setError('');
              }}
              className="w-full px-3 py-2 text-sm text-white bg-green-500 rounded hover:bg-green-600"
            >
              Join Existing Chatroom
            </button>
          </div>
        )}

        {/* Create chatroom form */}
        {showCreateChatroom && (
          <form onSubmit={createChatroom} className="px-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Create New Chatroom</h3>
              <button
                type="button"
                onClick={() => setShowCreateChatroom(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
            <button
              type="submit"
              disabled={isCreating}
              className="mt-2 w-full px-3 py-1 text-sm text-white bg-primary-500 rounded hover:bg-primary-600 disabled:opacity-50"
            >
              {isCreating ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : 'Create'}
            </button>
          </form>
        )}

        {/* Join chatroom form */}
        {showJoinChatroom && (
          <div className="px-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Join Existing Chatroom</h3>
              <button
                onClick={() => setShowJoinChatroom(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            {error && (
              <div className="mb-2 text-sm text-red-600">{error}</div>
            )}
            {availableChatrooms.length > 0 ? (
              <ul className="border border-gray-200 rounded-md overflow-hidden">
                {availableChatrooms.map((chatroom) => (
                  <li key={chatroom.id} className="border-b border-gray-200 last:border-b-0">
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50">
                      <span className="text-sm">{chatroom.name}</span>
                      <button
                        onClick={() => joinChatroom(chatroom.id)}
                        disabled={isJoining}
                        className="px-2 py-1 text-xs text-white bg-green-500 rounded hover:bg-green-600 disabled:opacity-50"
                      >
                        {isJoining && joiningChatroomId === chatroom.id ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Joining
                          </span>
                        ) : 'Join'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No available chatrooms to join.</p>
            )}
          </div>
        )}

        {/* Joined chatroom list */}
        <ul>
          {joinedChatrooms.length > 0 ? (
            joinedChatrooms.map((chatroom) => (
              <li key={chatroom.id}>
                <button
                  onClick={() => onSelectChatroom(chatroom)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    selectedChatroom?.id === chatroom.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                >
                  {chatroom.name}
                </button>
              </li>
            ))
          ) : (
            <li className="px-4 py-2 text-gray-500 dark:text-gray-400 text-sm">
              You haven't joined any chatrooms yet. Create or join one to get started!
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ChatSidebar;
