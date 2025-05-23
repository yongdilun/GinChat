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
  room_code: string;
  has_password: boolean;
  created_by: number;
  created_at: string;
  members: ChatroomMember[];
}

export interface CreateChatroomRequest {
  name: string;
  password?: string;
}

export interface JoinChatroomByCodeRequest {
  room_code: string;
  password?: string;
}

export interface ReadInfo {
  user_id: number;
  username: string;
  is_read: boolean;
  read_at?: string;
}

export interface MessageReadStatus {
  id: string;
  message_id: string;
  chatroom_id: string;
  sender_id: number;
  recipient_id: number;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface ChatroomUnreadCount {
  chatroom_id: string;
  chatroom_name: string;
  unread_count: number;
}

export interface LatestChatMessage {
  chatroom_id: string;
  chatroom_name: string;
  message_id: string;
  sender_name: string;
  message_type: string;
  text_content?: string;
  media_url?: string;
  sent_at: string;
  read_status: ReadInfo[];
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
  edited?: boolean;
  edited_at?: string;
  read_status?: ReadInfo[];
}

export interface SendMessageRequest {
  message_type: Message['message_type'];
  text_content?: string;
  media_url?: string;
}

export interface UpdateMessageRequest {
  text_content?: string;
  media_url?: string;
  message_type?: string;
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
  data: unknown;
}
