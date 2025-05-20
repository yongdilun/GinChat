import { Chatroom } from '@/types';

interface ChatHeaderProps {
  selectedChatroom: Chatroom | null;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ selectedChatroom }) => {
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <h2 className="font-semibold">
        {selectedChatroom?.name || 'Select a chatroom'}
      </h2>
      {selectedChatroom && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {selectedChatroom.members.length} member{selectedChatroom.members.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default ChatHeader;
