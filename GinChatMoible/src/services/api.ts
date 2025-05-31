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
  message?: string;
  error?: string;
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
    const errorData = axiosError.response?.data;

    if (statusCode === 401) {
      // Handle authentication errors - extract the actual error message from server
      let errorMessage = 'Invalid email or password. Please try again.';

      // Try to get error message from various possible response formats
      if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }

      // Check if this is a login attempt (no stored token) vs session expired
      AsyncStorage.getItem('token').then(token => {
        if (!token) {
          // This is likely a login failure - don't clear token as there isn't one
          return;
        } else {
          // This is a session expiry - clear the expired token
          AsyncStorage.removeItem('token');
        }
      });

      return Promise.reject({
        status: 'unauthorized',
        message: errorMessage
      });
    }

    if (statusCode === 409) {
      // Handle conflict errors (like "already logged in on another device")
      let errorMessage = 'Conflict error occurred.';

      // Try to get error message from various possible response formats
      if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }

      return Promise.reject({
        status: 'conflict',
        message: errorMessage
      });
    }

    // Handle 429 Rate Limit
    if (statusCode === 429) {
      console.warn('API Error: 429 Rate Limit Exceeded');
      const retryAfter = axiosError.response?.headers['retry-after'] || 1;
      const delay = Math.min(parseInt(retryAfter) * 1000, 5000); // Max 5 seconds

      console.warn(`[API] Rate limit hit. Suggested retry after ${delay}ms`);

      return Promise.reject({
        status: 'rate_limit',
        message: 'Too many requests. Please slow down.',
        retryAfter: delay
      });
    }

    // Handle other status codes
    let errorMessage = 'An error occurred';
    if (errorData?.message) {
      errorMessage = errorData.message;
    } else if (errorData?.error) {
      errorMessage = errorData.error;
    } else if (typeof errorData === 'string') {
      errorMessage = errorData;
    }

    return Promise.reject({
      status: statusCode,
      message: errorMessage
    });
  }

  console.log('Unknown API Error:', error);
  return Promise.reject({
    status: 'unknown',
    message: 'An unknown error occurred'
  });
};

// Rate limiting and request tracking
const requestTracker = new Map<string, number>();
const RATE_LIMIT_WINDOW = 1000; // 1 second
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per second

// Request debouncing for frequent operations
const debouncedRequests = new Map<string, NodeJS.Timeout>();

// Helper function to check rate limits
const checkRateLimit = (endpoint: string): boolean => {
  const now = Date.now();
  const key = `${endpoint}_${Math.floor(now / RATE_LIMIT_WINDOW)}`;
  const count = requestTracker.get(key) || 0;

  if (count >= MAX_REQUESTS_PER_WINDOW) {
    console.warn(`[API] Rate limit exceeded for ${endpoint}. Requests: ${count}/${MAX_REQUESTS_PER_WINDOW}`);
    return false;
  }

  requestTracker.set(key, count + 1);

  // Clean up old entries
  for (const [k] of requestTracker) {
    if (parseInt(k.split('_')[1]) < Math.floor(now / RATE_LIMIT_WINDOW) - 5) {
      requestTracker.delete(k);
    }
  }

  return true;
};

// Debounce helper for frequent API calls
const debounceRequest = <T extends any[]>(
  key: string,
  fn: (...args: T) => Promise<any>,
  delay: number = 500
) => {
  return (...args: T): Promise<any> => {
    return new Promise((resolve, reject) => {
      // Clear existing timeout
      if (debouncedRequests.has(key)) {
        clearTimeout(debouncedRequests.get(key)!);
      }

      // Set new timeout
      const timeout = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          debouncedRequests.delete(key);
        }
      }, delay);

      debouncedRequests.set(key, timeout);
    });
  };
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // Reduced timeout to 15 seconds to fail faster
});

// Add request interceptor to add auth token and check rate limits
api.interceptors.request.use(
  async (config) => {
    try {
      // Check rate limits for the endpoint
      const endpoint = config.url || 'unknown';
      if (!checkRateLimit(endpoint)) {
        return Promise.reject(new Error(`Rate limit exceeded for ${endpoint}. Please slow down.`));
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

// Add response interceptor to handle errors consistently
api.interceptors.response.use(
  (response) => {
    // Just return successful responses
    return response;
  },
  (error) => {
    // Use our handleApiError function for all API errors
    return handleApiError(error);
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
      console.log('Login API failed:', error);
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    try {
      console.log('[API] Making registration request to:', `${API_URL}/auth/register`);
      console.log('[API] Registration data:', { username: name, email, password: '[HIDDEN]' });

      const response = await api.post('/auth/register', { username: name, email, password });

      console.log('[API] Registration successful, status:', response.status);
      console.log('[API] Registration response data:', response.data);

      return response.data;
    } catch (error) {
      console.log('[API] Registration failed:', error);
      if (axios.isAxiosError(error)) {
        console.log('[API] Registration error status:', error.response?.status);
        console.log('[API] Registration error data:', error.response?.data);
      }
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

      console.log('[API] Removing push token from AsyncStorage...');
      await AsyncStorage.removeItem('pushToken');
      console.log('[API] ✅ Push token removed from AsyncStorage');

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

  // Push token management
  registerPushToken: async (token: string, deviceInfo?: any) => {
    try {
      console.log('DEBUG: API - Registering push token with server');
      console.log('DEBUG: API - Token:', token.substring(0, 20) + '...');
      console.log('DEBUG: API - Platform:', Platform.OS);
      console.log('DEBUG: API - Device info:', deviceInfo);

      console.log('Registering push token with server');
      const response = await api.post('/auth/push-token', {
        token,
        device_info: deviceInfo,
        platform: Platform.OS,
      });

      console.log('DEBUG: API - Push token registration response:', response.data);
      console.log('Push token registered successfully');
      return response.data;
    } catch (error) {
      console.error('DEBUG: API - Failed to register push token:', error);
      console.error('Failed to register push token:', error);
      throw error;
    }
  },

  updatePushToken: async (token: string, deviceInfo?: any) => {
    try {
      console.log('Updating push token with server');
      const response = await api.put('/auth/push-token', {
        token,
        device_info: deviceInfo,
        platform: Platform.OS,
      });
      console.log('Push token updated successfully');
      return response.data;
    } catch (error) {
      console.error('Failed to update push token:', error);
      throw error;
    }
  },

  removePushToken: async () => {
    try {
      console.log('Removing push token from server');
      const response = await api.delete('/auth/push-token');
      console.log('Push token removed successfully');
      return response.data;
    } catch (error) {
      console.error('Failed to remove push token:', error);
      throw error;
    }
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

export interface ReadStatus {
  user_id: number;
  username: string;
  is_read: boolean;
  read_at: string;
}

export interface Message {
  id: string;  // MongoDB ObjectID as string
  chatroom_id: string;  // MongoDB ObjectID as string
  sender_id: number;  // uint in backend
  sender_name: string;
  message_type: MessageType;
  text_content?: string;
  media_url?: string;
  sent_at: string;
  edited?: boolean;  // Whether message has been edited
  edited_at?: string;  // When message was last edited
  read_status?: ReadStatus[];  // Read status for each user
}

export interface ChatroomMember {
  user_id: number;  // uint in backend
  username: string;
  joined_at: string;
}

export interface Chatroom {
  id: string;  // MongoDB ObjectID as string
  name: string;
  room_code: string;  // 6-digit join code
  has_password: boolean;  // Whether room has password protection
  created_by: number;  // uint in backend
  created_at: string;
  members: ChatroomMember[];
  // Add last_message field for UI purposes
  last_message?: {
    content: string;
    timestamp: string;
    sender_id: number;
  };
  // Add unread_count field for sidebar updates
  unread_count?: number;
}

// Chat API calls
// Media API calls
export const mediaAPI = {
  uploadMedia: async (file: { uri: string; type: string; name?: string }, messageType: string) => {
    try {
      console.log('[MediaAPI] Starting upload:', {
        uri: file.uri.substring(0, 50) + '...',
        type: file.type,
        name: file.name,
        messageType
      });

      // Validate message type
      const validMessageTypes = ['picture', 'audio', 'video', 'text_and_picture', 'text_and_audio', 'text_and_video'];
      if (!validMessageTypes.includes(messageType)) {
        console.log('[MediaAPI] Invalid message type, defaulting to picture:', messageType);
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

      console.log('[MediaAPI] Sending upload request to:', `${API_URL}/media/upload`);
      console.log('[MediaAPI] Upload headers:', {
        'Authorization': `Bearer ${token ? token.substring(0, 20) + '...' : 'none'}`,
        'Accept': 'application/json',
        'Content-Type': Platform.OS !== 'web' ? 'multipart/form-data' : 'auto'
      });

      // Use axios for better cross-platform compatibility
      const response = await axios.post(`${API_URL}/media/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          // Let axios set the content-type header with boundary
          ...(Platform.OS !== 'web' ? { 'Content-Type': 'multipart/form-data' } : {})
        },
        timeout: 30000, // 30 second timeout
      });

      console.log('[MediaAPI] Upload successful:', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[MediaAPI] Upload failed with status:', error.response?.status);
        console.error('[MediaAPI] Error response data:', error.response?.data);
        console.error('[MediaAPI] Error response headers:', error.response?.headers);
        console.error('[MediaAPI] Request config:', {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        });
      } else {
        console.error('[MediaAPI] Upload error:', error);
      }
      throw error;
    }
  }
};

export const chatAPI = {
  getConversations: async (): Promise<{ chatrooms: Chatroom[] }> => {
    try {
      console.log('[API] Fetching user\'s joined chatrooms with backend sorting...');
      // Use optimized backend sorting with ?sorted=true parameter
      const response = await api.get('/chatrooms/user?sorted=true');
      console.log('[API] Successfully fetched sorted user chatrooms:', response.data);

      // Fetch unread counts separately and merge them
      try {
        console.log('[API] Fetching unread counts...');
        const unreadResponse = await api.get('/messages/unread-counts');
        console.log('[API] Successfully fetched unread counts:', unreadResponse.data);

        // Merge unread counts with chatrooms (already sorted by backend)
        const chatrooms = response.data.chatrooms || [];
        const unreadCounts = unreadResponse.data || [];

        const chatroomsWithUnreadCounts = chatrooms.map(chatroom => {
          const unreadData = unreadCounts.find((item: any) => item.chatroom_id === chatroom.id);
          return {
            ...chatroom,
            unread_count: unreadData?.unread_count || 0
          };
        });

        console.log('[API] Merged chatrooms with unread counts (backend sorted)');
        return { chatrooms: chatroomsWithUnreadCounts };
      } catch (unreadError) {
        console.error('[API] Failed to fetch unread counts, using chatrooms without unread counts:', unreadError);
        return response.data;
      }
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

  createConversation: async (name: string, password?: string) => {
    try {
      console.log('[API] Creating conversation with name:', name, password ? '(with password)' : '(no password)');
      if (!name || name.length < 3) {
        throw new Error('Chatroom name must be at least 3 characters long');
      }

      const requestData: { name: string; password?: string } = { name };
      if (password && password.trim()) {
        requestData.password = password.trim();
      }

      const response = await api.post('/chatrooms', requestData);
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

  // New paginated messages API for mobile optimization
  getMessagesPaginated: async (
    conversationId: string,
    options?: {
      limit?: number;
      before?: string;
      after?: string;
    }
  ): Promise<{
    messages: Message[];
    has_more: boolean;
    next_cursor?: string;
    unread_count: number;
    total_count: number;
  }> => {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.before) params.append('before', options.before);
      if (options?.after) params.append('after', options.after);

      const queryString = params.toString();
      const url = `/chatrooms/${conversationId}/messages/paginated${queryString ? `?${queryString}` : ''}`;

      console.log(`[API] Fetching paginated messages for conversation ${conversationId}`, options);
      const response = await api.get(url);
      console.log(`[API] Successfully fetched paginated messages for ${conversationId}:`, {
        messageCount: response.data.messages?.length || 0,
        hasMore: response.data.has_more,
        unreadCount: response.data.unread_count,
        totalCount: response.data.total_count
      });
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to fetch paginated messages for ${conversationId}:`, error);
      if (axios.isAxiosError(error)) {
        console.error('[API] Error status:', error.response?.status);
        console.error('[API] Error data:', error.response?.data);
      }
      // Return empty response to avoid crashes
      return {
        messages: [],
        has_more: false,
        unread_count: 0,
        total_count: 0
      };
    }
  },

  updateMessage: async (conversationId: string, messageId: string, updates: {
    text_content?: string;
    media_url?: string;
  }) => {
    try {
      console.log(`[API] Updating message ${messageId} in conversation ${conversationId}:`, updates);
      const response = await api.put(`/chatrooms/${conversationId}/messages/${messageId}`, updates);
      console.log('[API] Message updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Failed to update message:', error);
      if (axios.isAxiosError(error)) {
        console.error('[API] Error status:', error.response?.status);
        console.error('[API] Error data:', error.response?.data);
      }
      throw error;
    }
  },

  deleteMessage: async (conversationId: string, messageId: string) => {
    try {
      console.log(`[API] Deleting message ${messageId} from conversation ${conversationId}`);
      const response = await api.delete(`/chatrooms/${conversationId}/messages/${messageId}`);
      console.log('[API] Message deleted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Failed to delete message:', error);
      if (axios.isAxiosError(error)) {
        console.error('[API] Error status:', error.response?.status);
        console.error('[API] Error data:', error.response?.data);
      }
      throw error;
    }
  },

  deleteChatroom: async (chatroomId: string) => {
    try {
      console.log(`[API] Deleting chatroom ${chatroomId}`);
      const response = await api.delete(`/chatrooms/${chatroomId}`);
      console.log('[API] Chatroom deleted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Failed to delete chatroom:', error);
      if (axios.isAxiosError(error)) {
        console.error('[API] Error status:', error.response?.status);
        console.error('[API] Error data:', error.response?.data);
      }
      throw error;
    }
  },

  getChatroomMedia: async (chatroomId: string): Promise<{ messages: Message[]; count: number }> => {
    try {
      console.log(`[API] Fetching all media from chatroom ${chatroomId}`);
      const response = await api.get(`/chatrooms/${chatroomId}/media`);
      console.log(`[API] Successfully fetched media from chatroom ${chatroomId}:`, {
        count: response.data.count,
        messages: response.data.messages?.length || 0
      });
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to fetch media from chatroom ${chatroomId}:`, error);
      if (axios.isAxiosError(error)) {
        console.error('[API] Error status:', error.response?.status);
        console.error('[API] Error data:', error.response?.data);
      }
      // Return empty response to avoid crashes
      return { messages: [], count: 0 };
    }
  },

  markAllMessagesAsRead: async (chatroomId: string) => {
    try {
      console.log(`[API] Marking all messages as read for chatroom ${chatroomId}`);
      const response = await api.post(`/chatrooms/${chatroomId}/mark-all-read`);
      console.log('[API] All messages marked as read successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Failed to mark all messages as read:', error);
      throw error;
    }
  },

  markSingleMessageAsRead: debounceRequest(
    'markSingleMessageAsRead',
    async (messageId: string) => {
      try {
        console.log(`[API] Marking single message as read: ${messageId}`);
        const response = await api.post(`/messages/${messageId}/mark-read`);
        console.log('[API] Message marked as read successfully:', response.data);
        return response.data;
      } catch (error) {
        console.error(`[API] Failed to mark message ${messageId} as read:`, error);
        // Don't throw error to prevent disrupting the user experience
        // Auto-read failures should be silent
        return null;
      }
    },
    300 // 300ms debounce for auto-read operations
  ),
};

export const chatroomAPI = {
  joinChatroomByCode: async (roomCode: string, password?: string) => {
    try {
      console.log('[API] Joining chatroom with code:', roomCode, password ? '(with password)' : '(no password)');
      const response = await api.post('/chatrooms/join', { room_code: roomCode, password });
      console.log('[API] Successfully joined chatroom:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Failed to join chatroom:', error);
      if (axios.isAxiosError(error)) {
        console.error('[API] Error status:', error.response?.status);
        console.error('[API] Error data:', error.response?.data);
      }
      throw error;
    }
  }
};
