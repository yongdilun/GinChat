import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

// Handle API errors
const handleApiError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    if (!axiosError.response) {
      // Network error
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

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  async (config) => {
    try {
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
    console.log('=== API LOGOUT PROCESS STARTED ===');
    console.log('[API] Timestamp:', new Date().toISOString());
    
    try {
      // Step 1: Check token availability
      console.log('[API] STEP 1: Checking authentication token...');
      const token = await AsyncStorage.getItem('token');
      console.log('[API] Token status:', token ? 'Present' : 'Missing');
      if (token) {
        console.log('[API] Token length:', token.length);
        console.log('[API] Token preview:', token.substring(0, 20) + '...');
      }
      
      // Step 2: Make server logout request
      console.log('[API] STEP 2: Making server logout request...');
      console.log('[API] Request URL:', `${API_URL}/auth/logout`);
      console.log('[API] Request method: POST');
      console.log('[API] Authorization header will be set by interceptor');
      
      const startTime = Date.now();
      const response = await api.post('/auth/logout');
      const endTime = Date.now();
      
      console.log('[API] ✅ Server logout successful!');
      console.log('[API] Response status:', response.status);
      console.log('[API] Response time:', endTime - startTime, 'ms');
      console.log('[API] Response headers:', response.headers);
      console.log('[API] Response data:', response.data);
      
    } catch (error) {
      console.warn('=== API LOGOUT SERVER REQUEST FAILED ===');
      console.warn('[API] ⚠️ Server logout failed, continuing with local logout');
      console.warn('[API] Error type:', typeof error);
      
      if (axios.isAxiosError(error)) {
        console.warn('[API] Axios error details:');
        console.warn('[API] - Status:', error.response?.status);
        console.warn('[API] - Status text:', error.response?.statusText);
        console.warn('[API] - Response data:', error.response?.data);
        console.warn('[API] - Request URL:', error.config?.url);
        console.warn('[API] - Request method:', error.config?.method);
        console.warn('[API] - Request headers:', error.config?.headers);
        
        if (error.code) {
          console.warn('[API] - Error code:', error.code);
        }
        if (error.message) {
          console.warn('[API] - Error message:', error.message);
        }
      } else {
        console.warn('[API] Non-axios error:', error);
        if (error instanceof Error) {
          console.warn('[API] Error message:', error.message);
          console.warn('[API] Error stack:', error.stack);
        }
      }
    }

    // Step 3: Always clear local storage regardless of server response
    console.log('[API] STEP 3: Clearing local storage (always executed)...');
    try {
      console.log('[API] Removing token from AsyncStorage...');
      await AsyncStorage.removeItem('token');
      console.log('[API] ✅ Token removed from AsyncStorage');
      
      console.log('[API] Removing user from AsyncStorage...');
      await AsyncStorage.removeItem('user');
      console.log('[API] ✅ User removed from AsyncStorage');
      
      // Verify storage is cleared
      const remainingToken = await AsyncStorage.getItem('token');
      const remainingUser = await AsyncStorage.getItem('user');
      console.log('[API] Verification - remaining token:', remainingToken);
      console.log('[API] Verification - remaining user:', remainingUser);
      
      console.log('[API] ✅ Local storage cleared successfully');
    } catch (storageError) {
      console.error('[API] ❌ Failed to clear local storage:', storageError);
      throw storageError; // Re-throw to let caller handle
    }
    
    console.log('=== API LOGOUT PROCESS COMPLETED ===');
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
export type MessageType = 'text' | 'picture' | 'audio' | 'video' | 'text_and_picture' | 'text_and_audio' | 'text_and_video';

export interface Message {
  id: string;  // MongoDB ObjectID as string
  chatroom_id: string;  // MongoDB ObjectID as string
  sender_id: number;  // uint in backend
  sender_name: string;
  message_type: MessageType;
  text_content?: string;
  media_url?: string;
  sent_at: string;
}

export interface ChatroomMember {
  user_id: number;  // uint in backend
  username: string;
  joined_at: string;
}

export interface Chatroom {
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
// Media API calls
export const mediaAPI = {
  uploadMedia: async (file: { uri: string; type: string; name?: string }, messageType: string) => {
    try {
      // Validate message type
      const validMessageTypes = ['picture', 'audio', 'video', 'text_and_picture', 'text_and_audio', 'text_and_video'];
      if (!validMessageTypes.includes(messageType)) {
        messageType = 'picture';
      }

      // Ensure file has a valid name
      let fileName = file.name;
      if (!fileName) {
        // Generate filename based on timestamp if not provided
        const timestamp = new Date().getTime();
        const extension = file.type === 'image/jpeg' || file.type === 'image/jpg' ? 'jpg' : 
                          file.type === 'image/png' ? 'png' :
                          file.type === 'video/mp4' ? 'mp4' : 
                          file.type === 'audio/mpeg' ? 'mp3' : 'bin';
        fileName = `upload_${timestamp}.${extension}`;
      }

      // Get token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Handle data URIs - Convert Base64 to Blob
      let fileBlob;
      let fileUri = file.uri;
      
      if (fileUri.startsWith('data:')) {
        // Parse the data URI to get MIME type and Base64 data
        const match = fileUri.match(/^data:([^;]+);base64,(.+)$/);
        
        if (!match) {
          throw new Error('Invalid data URI format');
        }
        
        const mimeType = match[1] || file.type;
        const base64Data = match[2];
        
        // Convert base64 to binary
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create blob from binary data
        fileBlob = new Blob([bytes], { type: mimeType });
        
        // For React Native, we need a URI, not a blob
        // Since we're in web mode, we can use URL.createObjectURL
        fileUri = URL.createObjectURL(fileBlob);
      } else if (Platform.OS === 'ios' && fileUri.startsWith('file://')) {
        fileUri = fileUri.replace('file://', '');
      }

      // Create FormData for the upload
      const formData = new FormData();

      // Special handling for web (Expo Web) vs native
      if (Platform.OS === 'web') {
        if (fileBlob) {
          // If we created a blob earlier, use it directly
          formData.append('file', fileBlob, fileName);
        } else {
          // Try to fetch the file data first
          try {
            const response = await fetch(fileUri);
            const blob = await response.blob();
            formData.append('file', blob, fileName);
          } catch (error) {
            console.error('Error fetching file blob:', error);
            throw new Error('Could not fetch file data');
          }
        }
      } else {
        // For native platforms, use the standard React Native approach
        formData.append('file', {
          uri: fileUri,
          type: file.type || 'application/octet-stream',
          name: fileName
        } as any);
      }
      
      // Add message_type parameter
      formData.append('message_type', messageType);

      // Use axios for better cross-platform compatibility
      const response = await axios.post(`${API_URL}/media/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          // Let axios set the content-type header with boundary
          ...(Platform.OS !== 'web' ? { 'Content-Type': 'multipart/form-data' } : {})
        }
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Upload failed:', error.response?.status);
      } else {
        console.error('Upload error:', error);
      }
      throw error;
    }
  }
};

export const chatAPI = {
  getConversations: async (): Promise<{ chatrooms: Chatroom[] }> => {
    try {
      console.log('[API] Fetching user\'s joined chatrooms...');
      const response = await api.get('/chatrooms/user');
      console.log('[API] Successfully fetched user chatrooms:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Failed to fetch user conversations:', error);
      if (axios.isAxiosError(error)) {
        console.error('[API] Error status:', error.response?.status);
        console.error('[API] Error data:', error.response?.data);
      }
      // Return empty array to avoid crashes
      return { chatrooms: [] };
    }
  },

  getAllAvailableChatrooms: async (): Promise<{ chatrooms: Chatroom[] }> => {
    try {
      console.log('[API] Fetching all available chatrooms...');
      const response = await api.get('/chatrooms');
      console.log('[API] Successfully fetched all available chatrooms:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Failed to fetch all available chatrooms:', error);
      if (axios.isAxiosError(error)) {
        console.error('[API] Error status:', error.response?.status);
        console.error('[API] Error data:', error.response?.data);
      }
      // Return empty array to avoid crashes
      return { chatrooms: [] };
    }
  },

 

  getConversationById: async (id: string): Promise<{ chatroom: Chatroom }> => {
    try {
      console.log(`[API] Fetching conversation with ID: ${id}`);
      const response = await api.get(`/chatrooms/${id}`);
      console.log(`[API] Successfully fetched conversation ${id}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to fetch conversation ${id}:`, error);
      if (axios.isAxiosError(error)) {
        console.error('[API] Error status:', error.response?.status);
        console.error('[API] Error data:', error.response?.data);
      }
      // Return a default conversation object to avoid crashes
      return {
        chatroom: {
          id,
          name: 'Chat',
          created_by: 0,
          created_at: new Date().toISOString(),
          members: [],
        }
      };
    }
  },

  createConversation: async (name: string) => {
    try {
      console.log('[API] Creating conversation with name:', name);
      if (!name || name.length < 3) {
        throw new Error('Chatroom name must be at least 3 characters long');
      }

      const response = await api.post('/chatrooms', { name });
      console.log('[API] Create chatroom response:', response.data);

      // The backend returns {chatroom: {...}} structure
      return response.data;
    } catch (error) {
      console.error('[API] Failed to create conversation:', error);
      if (axios.isAxiosError(error)) {
        console.error('[API] Error status:', error.response?.status);
        console.error('[API] Error data:', error.response?.data);
      }
      throw error;
    }
  },

  joinChatroom: async (chatroomId: string) => {
    try {
      console.log(`[API] Joining chatroom with ID: ${chatroomId}`);
      const response = await api.post(`/chatrooms/${chatroomId}/join`);
      console.log(`[API] Successfully joined chatroom ${chatroomId}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to join chatroom ${chatroomId}:`, error);
      if (axios.isAxiosError(error)) {
        console.error('[API] Error status:', error.response?.status);
        console.error('[API] Error data:', error.response?.data);
      }
      throw error;
    }
  },

  sendMessage: async (conversationId: string, content: string | {
    message_type: MessageType;
    text_content?: string;
    media_url?: string;
  }) => {
    try {
      console.log(`[API] Sending message to conversation ${conversationId}:`, content);

      // Prepare message data
      let messageData: any;
      if (typeof content === 'string') {
        messageData = {
          message_type: 'text' as MessageType,
          text_content: content
        };
      } else {
        // Make sure we're not sending empty strings
        messageData = {
          message_type: content.message_type,
          // Only include text_content if it's not empty
          ...(content.text_content && content.text_content.trim() ? { text_content: content.text_content.trim() } : {}),
          // Only include media_url if it's not empty
          ...(content.media_url ? { media_url: content.media_url } : {})
        };
      }

      console.log('[API] Prepared message data:', JSON.stringify(messageData, null, 2));

      const response = await api.post(`/chatrooms/${conversationId}/messages`, messageData);
      console.log('[API] Message sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Failed to send message:', error);
      if (axios.isAxiosError(error)) {
        console.error('[API] Error status:', error.response?.status);
        console.error('[API] Error data:', error.response?.data);
      }
      throw error;
    }
  },

  getMessages: async (conversationId: string, page = 1, limit = 20): Promise<{ messages: Message[] }> => {
    try {
      console.log(`[API] Fetching messages for conversation ${conversationId}`);
      const response = await api.get(
        `/chatrooms/${conversationId}/messages?page=${page}&limit=${limit}`
      );
      console.log(`[API] Successfully fetched messages for ${conversationId}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to fetch messages for ${conversationId}:`, error);
      if (axios.isAxiosError(error)) {
        console.error('[API] Error status:', error.response?.status);
        console.error('[API] Error data:', error.response?.data);
      }
      // Return empty array to avoid crashes
      return { messages: [] };
    }
  },
};
