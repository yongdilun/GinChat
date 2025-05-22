export interface Message {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

export interface ApiErrorResponse {
  message: string;
  status?: number;
  code?: string;
} 