import { Chatroom } from '@/types';

interface ChatHeaderProps {
  selectedChatroom: Chatroom | null;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ selectedChatroom }) => {
  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {selectedChatroom ? (
        <div>
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg">
              {selectedChatroom.name}
            </h2>
            <span className="text-xs px-2 py-1 bg-primary-100 text-primary-800 rounded-full">
              {selectedChatroom.members.length} member{selectedChatroom.members.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span>Created {formatDate(selectedChatroom.created_at)}</span>
            <span className="mx-2">•</span>
            <div className="flex -space-x-2 overflow-hidden">
              {selectedChatroom.members.slice(0, 3).map((member) => (
                <div
                  key={member.user_id}
                  className="inline-block h-6 w-6 rounded-full bg-gray-300 text-xs flex items-center justify-center border-2 border-white"
                  title={member.username}
                >
                  {member.username.charAt(0).toUpperCase()}
                </div>
              ))}
              {selectedChatroom.members.length > 3 && (
                <div className="inline-block h-6 w-6 rounded-full bg-gray-200 text-xs flex items-center justify-center border-2 border-white">
                  +{selectedChatroom.members.length - 3}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="font-semibold text-lg">Select a chatroom</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Join or create a chatroom to start chatting
          </p>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;
