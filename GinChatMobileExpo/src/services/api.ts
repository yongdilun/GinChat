import axios, { AxiosError, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Use the hosted backend URL
const API_URL = 'https://ginchat-14ry.onrender.com/api';
// Fallback local URLs if needed
// const API_URL = 'http://10.0.2.2:3000/api'; // Android emulator
// const API_URL = 'http://localhost:3000/api'; // iOS simulator

// API error response type
interface ApiErrorResponse {
  message: string;
  status?: number;
  code?: string;
}

// Network error handling 
const handleNetworkError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    
    console.error('API Error:', {
      url: axiosError.config?.url,
      method: axiosError.config?.method,
      status: axiosError.response?.status,
      message: axiosError.response?.data?.message || axiosError.message
    });
    
    if (!axiosError.response) {
      return Promise.reject({
        status: 'network_error',
        message: 'Network error. Please check your internet connection.'
      });
    }
    
    const statusCode = axiosError.response?.status;
    
    if (statusCode === 401) {
      // Handle authentication errors
      AsyncStorage.removeItem('token');
      return Promise.reject({
        status: 'unauthorized',
        message: 'Your session has expired. Please login again.'
      });
    }
    
    return Promise.reject({
      status: statusCode,
      message: axiosError.response?.data?.message || 'An error occurred'
    });
  }
  
  console.error('Unknown API Error:', error);
  return Promise.reject({
    status: 'unknown',
    message: 'An unknown error occurred'
  });
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000, // 20 seconds timeout - increased for slower connections to hosted services
});

// Check network connectivity before requests
const checkConnectivity = async () => {
  const networkState = await NetInfo.fetch();
  return networkState.isConnected;
};

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  async (config) => {
    try {
      // Check if device is online
      const isConnected = await checkConnectivity();
      if (!isConnected) {
        throw new Error('No internet connection');
      }
      
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      return Promise.reject(error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => handleNetworkError(error)
);

// Authentication API calls
export const authAPI = {
  login: async (email: string, password: string) => {
    try {
      console.log('Making login API request to:', `${API_URL}/auth/login`);
      const response = await api.post('/auth/login', { email, password });
      console.log('Login API response received:', response.status);

      // Store auth data
      await AsyncStorage.setItem('token', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      
      console.log('User data stored in AsyncStorage');
      return response.data;
    } catch (error) {
      console.error('Login API error:', error);
      throw error;
    }
  },
  
  register: async (name: string, email: string, password: string) => {
    try {
      const response = await api.post('/auth/register', { name, email, password });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  logout: async () => {
    try {
      // Add server-side logout if necessary
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('Server logout failed, continuing with local logout');
    }
    
    // Always clear local storage
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },
  
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      // If failed to get current user, clear token
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
      }
      throw error;
    }
  },
};

// Message types from backend
type MessageType = 'text' | 'picture' | 'audio' | 'video' | 'text_and_picture' | 'text_and_audio' | 'text_and_video';

interface MessageResponse {
  id: string;  // MongoDB ObjectID as string
  chatroom_id: string;  // MongoDB ObjectID as string
  sender_id: number;  // uint in backend
  sender_name: string;
  message_type: MessageType;
  text_content?: string;
  media_url?: string;
  sent_at: string;
}

interface ChatroomMember {
  user_id: number;  // uint in backend
  username: string;
  joined_at: string;
}

interface ChatroomResponse {
  id: string;  // MongoDB ObjectID as string
  name: string;
  created_by: number;  // uint in backend
  created_at: string;
  members: ChatroomMember[];
  // Add last_message field for UI purposes
  last_message?: {
    content: string;
    timestamp: string;
    sender_id: number;
  };
}

// Chat API calls
export const chatAPI = {
  getConversations: async (): Promise<{ chatrooms: ChatroomResponse[] }> => {
    try {
      console.log('Fetching conversations...');
      // Try the chatrooms endpoint instead of conversations
      let response;
      try {
        response = await api.get('/chatrooms');
        console.log('Successfully fetched chatrooms');
      } catch (err) {
        console.log('Chatrooms endpoint failed, trying chats endpoint...');
        response = await api.get('/chats');
        console.log('Successfully fetched chats');
      }
      return response.data;
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      // Return empty array to avoid crashes
      return { chatrooms: [] };
    }
  },
  
  getConversationById: async (id: string): Promise<{ chatroom: ChatroomResponse }> => {
    try {
      console.log(`Fetching conversation with ID: ${id}`);
      let response;
      try {
        response = await api.get(`/chatrooms/${id}`);
      } catch (err) {
        response = await api.get(`/chats/${id}`);
      }
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch conversation ${id}:`, error);
      // Return a default conversation object to avoid crashes
      return {
        chatroom: {
          id,
          name: 'Chat',
          created_by: 0,
          created_at: new Date().toISOString(),
          members: [],
          last_message: {
            content: '',
            timestamp: '',
            sender_id: 0
          }
        }
      };
    }
  },
  
  createConversation: async (participants: string[], name?: string) => {
    try {
      console.log('Creating conversation with name:', name);
      if (!name || name.length < 3) {
        throw new Error('Chatroom name must be at least 3 characters long');
      }
      
      // Only use the chatrooms endpoint with the required name parameter
      const response = await api.post('/chatrooms', { name });
      console.log('Create chatroom response:', response.data);
      
      // The backend returns {chatroom: {...}} structure
      return response.data;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  },
  
  joinChatroom: async (chatroomId: string) => {
    try {
      console.log(`Joining chatroom with ID: ${chatroomId}`);
      const response = await api.post(`/chatrooms/${chatroomId}/join`);
      return response.data;
    } catch (error) {
      console.error(`Failed to join chatroom ${chatroomId}:`, error);
      throw error;
    }
  },
  
  sendMessage: async (conversationId: string, content: string | {
    message_type: MessageType;
    text_content?: string;
    media_url?: string;
  }) => {
    try {
      console.log(`Sending message to conversation ${conversationId}:`, content);
      let response;
      const messageData = typeof content === 'string' ? { 
        message_type: 'text' as MessageType,
        text_content: content 
      } : content;
      
      try {
        response = await api.post(`/chatrooms/${conversationId}/messages`, messageData);
      } catch (err) {
        response = await api.post(`/chats/${conversationId}/messages`, messageData);
      }
      return response.data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  },
  
  getMessages: async (conversationId: string, page = 1, limit = 20): Promise<{ messages: MessageResponse[] }> => {
    try {
      console.log(`Fetching messages for conversation ${conversationId}`);
      let response;
      try {
        response = await api.get(
          `/chatrooms/${conversationId}/messages?page=${page}&limit=${limit}`
        );
      } catch (err) {
        response = await api.get(
          `/chats/${conversationId}/messages?page=${page}&limit=${limit}`
        );
      }
      return response.data;
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      // Return empty array to avoid crashes
      return { messages: [] };
    }
  },
};

// User API calls
export const userAPI = {
  getUsers: async () => {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getUserById: async (id: string) => {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  updateProfile: async (userData: any) => {
    try {
      const response = await api.put('/users/profile', userData);
      // Update local user data if needed
      const currentUser = await AsyncStorage.getItem('user');
      if (currentUser) {
        const updatedUser = { ...JSON.parse(currentUser), ...userData };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  searchUsers: async (query: string) => {
    try {
      const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default api; 