import { useState } from 'react';
import { Chatroom } from '@/types';
import { messageAPI } from '@/services/api';

interface MessageInputProps {
  selectedChatroom: Chatroom | null;
  onMessageSent: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ selectedChatroom, onMessageSent }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedChatroom) return;
    
    setIsSending(true);
    
    try {
      await messageAPI.sendMessage(selectedChatroom.id, 'text', newMessage);
      
      // Clear input and refresh messages
      setNewMessage('');
      onMessageSent();
    } catch (err: any) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (!selectedChatroom) {
    return null;
  }

  return (
    <form onSubmit={sendMessage} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="flex">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={isSending}
          className="px-4 py-2 bg-primary-500 text-white rounded-r-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  );
};

export default MessageInput;
