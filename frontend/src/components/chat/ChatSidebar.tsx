import { useState } from 'react';
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
  const [showCreateChatroom, setShowCreateChatroom] = useState(false);
  const [newChatroomName, setNewChatroomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

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
      await chatroomAPI.createChatroom(newChatroomName);
      
      // Clear input, hide form, and refresh chatrooms
      setNewChatroomName('');
      setShowCreateChatroom(false);
      onChatroomsRefresh();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create chatroom');
    } finally {
      setIsCreating(false);
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
          <h2 className="font-semibold">Chatrooms</h2>
          <button
            onClick={() => setShowCreateChatroom(!showCreateChatroom)}
            className="text-primary-500 hover:text-primary-600 text-xl font-bold"
          >
            +
          </button>
        </div>
        
        {/* Create chatroom form */}
        {showCreateChatroom && (
          <form onSubmit={createChatroom} className="px-4 mb-4">
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
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </form>
        )}
        
        {/* Chatroom list */}
        <ul>
          {chatrooms.length > 0 ? (
            chatrooms.map((chatroom) => (
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
              No chatrooms available. Create one to get started!
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ChatSidebar;
