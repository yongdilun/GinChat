import { useRef, useEffect } from 'react';
import { User, Chatroom, Message } from '@/types';

interface MessageListProps {
  user: User | null;
  selectedChatroom: Chatroom | null;
  messages: Message[];
}

const MessageList: React.FC<MessageListProps> = ({ user, selectedChatroom, messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!selectedChatroom) {
    return (
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Select a chatroom to start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
      {messages.length > 0 ? (
        messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 ${
              message.sender_id === user?.user_id ? 'text-right' : 'text-left'
            }`}
          >
            <div
              className={`inline-block px-4 py-2 rounded-lg ${
                message.sender_id === user?.user_id
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <p className="text-sm font-semibold">{message.sender_name}</p>
              <p>{message.text_content}</p>
              {message.media_url && (
                <div className="mt-2">
                  {message.message_type.includes('picture') ? (
                    <img 
                      src={message.media_url} 
                      alt="Shared image" 
                      className="max-w-xs rounded"
                    />
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
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(message.sent_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-4">
          No messages yet. Start the conversation!
        </p>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
