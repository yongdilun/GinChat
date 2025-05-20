import axios from 'axios';

// Create an axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Set a timeout to avoid hanging requests
  timeout: 10000, // 10 seconds
});

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response) {
      if (error.response.status === 401 && window.location.pathname !== '/auth/login') {
        // Clear local storage and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth/login?session=expired';
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network error:', error.request);
      // We'll handle this in the components
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
    return api.post('/auth/login', { email, password });
  },
  register: (username: string, email: string, password: string) => {
    return api.post('/auth/register', { username, email, password });
  },
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login with logout parameter
      window.location.href = '/auth/login?session=logout';
      return response;
    } catch (error) {
      // Still clear storage and redirect even if the API call fails
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login?session=logout';
      throw error;
    }
  },
};

// Chatroom API
export const chatroomAPI = {
  getChatrooms: () => {
    return api.get('/chatrooms');
  },
  createChatroom: (name: string) => {
    return api.post('/chatrooms', { name });
  },
  joinChatroom: (chatroomId: string) => {
    return api.post(`/chatrooms/${chatroomId}/join`);
  },
};

// Message API
export const messageAPI = {
  getMessages: (chatroomId: string) => {
    return api.get(`/chatrooms/${chatroomId}/messages`);
  },
  sendMessage: (chatroomId: string, messageType: string, textContent?: string, mediaURL?: string) => {
    return api.post(`/chatrooms/${chatroomId}/messages`, {
      message_type: messageType,
      text_content: textContent,
      media_url: mediaURL,
    });
  },
};

export default api;
