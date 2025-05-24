'use client';

import axios from 'axios';

// Helper to check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Create an axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Set a timeout to avoid hanging requests
  timeout: 10000, // 10 seconds
});

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  (config) => {
    if (isBrowser) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (!isBrowser) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response) {
      // Only redirect to session expired if:
      // 1. Status is 401 AND
      // 2. We're not already on the login page AND
      // 3. The request is not a login attempt
      const isLoginAttempt = error.config?.url?.includes('/api/auth/login');
      if (error.response.status === 401 &&
          window.location.pathname !== '/auth/login' &&
          !isLoginAttempt) {
        // Clear local storage and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth/login?session=expired';
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network error:', error.request);
      // Show a user-friendly error message
      if (window.location.pathname !== '/auth/login') {
        alert('Unable to connect to the server. Please check your internet connection and try again.');
      }
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) => {
    return api.post('/api/auth/login', { email, password });
  },
  register: (username: string, email: string, password: string) => {
    return api.post('/api/auth/register', { username, email, password });
  },
  logout: async () => {
    try {
      const response = await api.post('/api/auth/logout');

      if (isBrowser) {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login with logout parameter
      window.location.href = '/auth/login?session=logout';
      }

      return response;
    } catch (error) {
      if (isBrowser) {
      // Still clear storage and redirect even if the API call fails
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login?session=logout';
      }
      throw error;
    }
  },
};

// Chatroom API
export const chatroomAPI = {
  getChatrooms: () => {
    return api.get('/api/chatrooms');
  },
  createChatroom: (name: string, password?: string) => {
    return api.post('/api/chatrooms', { name, password });
  },
  getChatroomById: (chatroomId: string) => {
    return api.get(`/api/chatrooms/${chatroomId}`);
  },
  joinChatroom: (chatroomId: string) => {
    return api.post(`/api/chatrooms/${chatroomId}/join`);
  },
  joinChatroomByCode: (roomCode: string, password?: string) => {
    return api.post('/api/chatrooms/join', { room_code: roomCode, password });
  },
  deleteChatroom: (chatroomId: string) => {
    return api.delete(`/api/chatrooms/${chatroomId}`);
  },
};

// Message Read Status API
export const messageReadStatusAPI = {
  markMessageAsRead: (messageId: string) => {
    return api.post('/api/messages/read', { message_id: messageId });
  },
  markMultipleMessagesAsRead: (messageIds: string[]) => {
    return api.post('/api/messages/read-multiple', messageIds);
  },
  getUnreadCounts: () => {
    return api.get('/api/messages/unread-counts');
  },
  getLatestMessages: () => {
    return api.get('/api/messages/latest');
  },
  getMessageReadStatus: (messageId: string) => {
    return api.get(`/api/messages/${messageId}/read-status`);
  },
  getMessageReadByWho: (messageId: string) => {
    return api.get(`/api/messages/${messageId}/read-by-who`);
  },
  getUserLastRead: (chatroomId: string) => {
    return api.get(`/api/chatrooms/${chatroomId}/last-read`);
  },
  markAllMessagesAsRead: (chatroomId: string) => {
    return api.post(`/api/chatrooms/${chatroomId}/mark-all-read`);
  },
  getFirstUnreadMessage: (chatroomId: string) => {
    return api.get(`/api/chatrooms/${chatroomId}/first-unread`);
  },
  getUnreadCountForChatroom: (chatroomId: string) => {
    return api.get(`/api/chatrooms/${chatroomId}/unread-count`);
  },
};

// Message API
export const messageAPI = {
  getMessages: (chatroomId: string) => {
    return api.get(`/api/chatrooms/${chatroomId}/messages`);
  },
  sendMessage: (chatroomId: string, messageType: string, textContent?: string, mediaURL?: string) => {
    return api.post(`/api/chatrooms/${chatroomId}/messages`, {
      message_type: messageType,
      text_content: textContent,
      media_url: mediaURL,
    });
  },
  updateMessage: (chatroomId: string, messageId: string, textContent?: string, mediaURL?: string, messageType?: string) => {
    return api.put(`/api/chatrooms/${chatroomId}/messages/${messageId}`, {
      text_content: textContent,
      media_url: mediaURL,
      message_type: messageType,
    });
  },
  deleteMessage: (chatroomId: string, messageId: string) => {
    return api.delete(`/api/chatrooms/${chatroomId}/messages/${messageId}`);
  },
  uploadMedia: (file: File, messageType: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('message_type', messageType);

    return api.post('/api/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default api;
