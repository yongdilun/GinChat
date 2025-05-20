'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import { User, Chatroom, Message } from '@/types';
import { chatroomAPI, messageAPI } from '@/services/api';

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);
  const [selectedChatroom, setSelectedChatroom] = useState<Chatroom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/auth/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
      fetchChatrooms();
    } catch (err) {
      console.error('Failed to parse user data:', err);
      router.push('/auth/login');
    }
  }, [router]);

  // Fetch chatrooms
  const fetchChatrooms = async () => {
    setIsLoading(true);
    try {
      const response = await chatroomAPI.getChatrooms();
      const chatrooms = response.data.chatrooms || [];
      setChatrooms(chatrooms);

      if (chatrooms.length > 0) {
        setSelectedChatroom(chatrooms[0]);
        fetchMessages(chatrooms[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch messages for a chatroom
  const fetchMessages = async (chatroomId: string) => {
    try {
      const response = await messageAPI.getMessages(chatroomId);
      setMessages(response.data.messages || []);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
    }
  };

  // Handle chatroom selection
  const handleSelectChatroom = (chatroom: Chatroom) => {
    setSelectedChatroom(chatroom);
    fetchMessages(chatroom.id);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        {/* Sidebar */}
        <ChatSidebar
          user={user}
          chatrooms={chatrooms}
          selectedChatroom={selectedChatroom}
          onSelectChatroom={handleSelectChatroom}
          onChatroomsRefresh={fetchChatrooms}
        />

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <ChatHeader selectedChatroom={selectedChatroom} />

          {/* Messages */}
          <MessageList
            user={user}
            selectedChatroom={selectedChatroom}
            messages={messages}
          />

          {/* Message input */}
          <MessageInput
            selectedChatroom={selectedChatroom}
            onMessageSent={() => selectedChatroom && fetchMessages(selectedChatroom.id)}
          />
        </div>
      </div>
    </Layout>
  );
}
