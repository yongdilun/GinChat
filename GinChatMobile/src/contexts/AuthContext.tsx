import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import { router } from 'expo-router';
import webSocketService from '@/services/WebSocketService'; // Import WebSocket service

// Define user type
export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

// Define context type
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

// Create provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const [userJson, storedToken] = await Promise.all([
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('token')
        ]);
        if (userJson) {
          setUser(JSON.parse(userJson));
        }
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('Attempting login...');
      const data = await authAPI.login(email, password);
      console.log('Login successful:', data.user);
      
      // Convert backend user data format to our format
      const userData: User = {
        id: data.user.user_id,
        name: data.user.username,
        email: data.user.email,
        avatar: data.user.avatar_url
      };
      
      // Save user data and token
      await Promise.all([
        AsyncStorage.setItem('user', JSON.stringify(userData)),
        AsyncStorage.setItem('token', data.token)
      ]);
      
      setUser(userData);
      setToken(data.token);
      
      // Add a small delay to ensure the auth state is updated before navigation
      setTimeout(() => {
        console.log('Navigating to chats tab specifically...');
        router.replace('/(tabs)/chats');
      }, 500);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      await authAPI.register(name, email, password);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    console.log('[AuthContext] Logout function called');
    setIsLoading(true);
    try {
      // Disconnect WebSocket before logging out
      console.log('[AuthContext] Disconnecting WebSocket due to logout.');
      try {
        webSocketService.disconnect(); 
      } catch (wsError) {
        console.warn('[AuthContext] WebSocket disconnect error (continuing logout):', wsError);
      }

      console.log('[AuthContext] Calling backend logout API...');
      try {
        await authAPI.logout(); // Call the backend logout
        console.log('[AuthContext] Backend logout successful');
      } catch (apiError) {
        console.warn('[AuthContext] Backend logout failed (continuing with local logout):', apiError);
      }
      
      console.log('[AuthContext] Clearing local storage...');
      await AsyncStorage.removeItem('user'); // Clear user from storage
      await AsyncStorage.removeItem('token'); // Clear token from storage
      
      console.log('[AuthContext] Clearing state...');
      setUser(null); // Clear user state
      setToken(null); // Clear token state
      
      console.log('[AuthContext] Navigating to login...');
      // Use immediate navigation instead of setTimeout
      router.replace('/login'); // Redirect to login
      
      console.log('[AuthContext] Logout completed successfully');

    } catch (error) {
      console.error('[AuthContext] Critical error during logout:', error);
      // Even if everything fails, attempt to clear local state and redirect
      try {
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('token');
      } catch (storageError) {
        console.error('[AuthContext] Failed to clear storage:', storageError);
      }
      setUser(null);
      setToken(null);
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  // Value object to be provided to consumers
  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for easy context use
export const useAuth = () => useContext(AuthContext);
