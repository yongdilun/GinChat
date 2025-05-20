// User types
export interface User {
  user_id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  avatar_url?: string;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Chatroom types
export interface ChatroomMember {
  user_id: number;
  username: string;
  joined_at: string;
}

export interface Chatroom {
  id: string;
  name: string;
  created_by: number;
  created_at: string;
  members: ChatroomMember[];
}

export interface CreateChatroomRequest {
  name: string;
}

export interface ChatroomResponse {
  chatroom: Chatroom;
}

export interface ChatroomsResponse {
  chatrooms: Chatroom[];
}

// Message types
export interface Message {
  id: string;
  chatroom_id: string;
  sender_id: number;
  sender_name: string;
  message_type: 'text' | 'picture' | 'audio' | 'video' | 'text_and_picture' | 'text_and_audio' | 'text_and_video';
  text_content?: string;
  media_url?: string;
  sent_at: string;
}

export interface SendMessageRequest {
  message_type: Message['message_type'];
  text_content?: string;
  media_url?: string;
}

export interface MessageResponse {
  message: Message;
}

export interface MessagesResponse {
  messages: Message[];
}

// WebSocket types
export interface WebSocketMessage {
  type: string;
  chatroom_id?: string;
  data: any;
}
