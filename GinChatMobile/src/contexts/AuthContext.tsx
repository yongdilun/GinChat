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
    console.log('=== LOGOUT PROCESS STARTED ===');
    console.log('[AuthContext] Logout function called at:', new Date().toISOString());
    console.log('[AuthContext] Current user state:', user);
    console.log('[AuthContext] Current token state:', token ? 'Present' : 'Not present');
    console.log('[AuthContext] Current isLoading state:', isLoading);
    
    setIsLoading(true);
    console.log('[AuthContext] Set isLoading to true');

    try {
      // Step 1: Disconnect WebSocket
      console.log('[AuthContext] STEP 1: Disconnecting WebSocket...');
      try {
        webSocketService.disconnect(); 
        console.log('[AuthContext] ✅ WebSocket disconnected successfully');
      } catch (wsError) {
        console.warn('[AuthContext] ⚠️ WebSocket disconnect error (continuing logout):', wsError);
      }

      // Step 2: Call backend logout API
      console.log('[AuthContext] STEP 2: Calling backend logout API...');
      try {
        const startTime = Date.now();
        await authAPI.logout();
        const endTime = Date.now();
        console.log('[AuthContext] ✅ Backend logout successful in', endTime - startTime, 'ms');
      } catch (apiError) {
        console.warn('[AuthContext] ⚠️ Backend logout failed (continuing with local logout):', apiError);
        if (apiError && typeof apiError === 'object') {
          console.warn('[AuthContext] API Error details:', JSON.stringify(apiError, null, 2));
        }
      }
      
      // Step 3: Clear local storage
      console.log('[AuthContext] STEP 3: Clearing local storage...');
      try {
        const userRemoved = await AsyncStorage.removeItem('user');
        console.log('[AuthContext] ✅ User removed from storage, result:', userRemoved);
        
        const tokenRemoved = await AsyncStorage.removeItem('token');
        console.log('[AuthContext] ✅ Token removed from storage, result:', tokenRemoved);
        
        // Verify storage is cleared
        const remainingUser = await AsyncStorage.getItem('user');
        const remainingToken = await AsyncStorage.getItem('token');
        console.log('[AuthContext] Verification - remaining user:', remainingUser);
        console.log('[AuthContext] Verification - remaining token:', remainingToken);
      } catch (storageError) {
        console.error('[AuthContext] ❌ Storage clearing error:', storageError);
        throw storageError;
      }
      
      // Step 4: Clear state
      console.log('[AuthContext] STEP 4: Clearing application state...');
      console.log('[AuthContext] Setting user to null (was:', user, ')');
      setUser(null);
      console.log('[AuthContext] Setting token to null (was:', token ? 'present' : 'null', ')');
      setToken(null);
      
      // Step 5: Navigate to login
      console.log('[AuthContext] STEP 5: Navigating to login page...');
      console.log('[AuthContext] Current router state before navigation');
      
      try {
        router.replace('/login');
        console.log('[AuthContext] ✅ Navigation to /login initiated');
        
        // Add a small delay to ensure navigation completes
        setTimeout(() => {
          console.log('[AuthContext] Navigation timeout completed');
        }, 100);
        
      } catch (navError) {
        console.error('[AuthContext] ❌ Navigation error:', navError);
        // Try alternative navigation
        try {
          router.push('/login');
          console.log('[AuthContext] ✅ Alternative navigation with push successful');
        } catch (altNavError) {
          console.error('[AuthContext] ❌ Alternative navigation failed:', altNavError);
        }
      }
      
      console.log('[AuthContext] ✅ Logout process completed successfully');

    } catch (error) {
      console.error('=== LOGOUT PROCESS FAILED ===');
      console.error('[AuthContext] ❌ Critical error during logout:', error);
      console.error('[AuthContext] Error type:', typeof error);
      console.error('[AuthContext] Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('[AuthContext] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Emergency cleanup - even if everything fails, attempt to clear local state and redirect
      console.log('[AuthContext] EMERGENCY CLEANUP: Attempting to clear state...');
      try {
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('token');
        console.log('[AuthContext] ✅ Emergency storage cleanup successful');
      } catch (storageError) {
        console.error('[AuthContext] ❌ Emergency storage cleanup failed:', storageError);
      }
      
      setUser(null);
      setToken(null);
      console.log('[AuthContext] ✅ Emergency state cleanup completed');
      
      try {
        router.replace('/login');
        console.log('[AuthContext] ✅ Emergency navigation successful');
      } catch (navError) {
        console.error('[AuthContext] ❌ Emergency navigation failed:', navError);
      }
    } finally {
      console.log('[AuthContext] FINALLY: Setting isLoading to false');
      setIsLoading(false);
      console.log('=== LOGOUT PROCESS ENDED ===');
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
