import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '@/services/api';
import { notificationService } from '../services/notificationService';
import { Logger } from '../utils/logger';
import { router } from 'expo-router';

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
    try {
      console.log('Attempting login...');
      const data = await authAPI.login(email, password);
      console.log('Login successful:', data.user);

      // Only set loading state AFTER successful API call, when we're actually processing login
      setIsLoading(true);

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

      // Initialize notifications after successful login
      try {
        console.log('DEBUG: Starting notification initialization...');
        await notificationService.initialize();
        const pushToken = notificationService.getCurrentPushToken();
        console.log('DEBUG: Push token obtained:', pushToken ? pushToken.substring(0, 20) + '...' : 'null');

        if (pushToken) {
          // Register push token with server
          console.log('DEBUG: Registering push token with server...');
          await authAPI.registerPushToken(pushToken, {
            device_type: 'mobile',
            app_version: '1.0.0',
          });
          console.log('DEBUG: Push token registered successfully with server');
          console.log('Push token registered with server');
        } else {
          console.log('DEBUG: No push token available to register');
        }
      } catch (notificationError) {
        console.error('DEBUG: Failed to initialize notifications:', notificationError);
        console.warn('Failed to initialize notifications:', notificationError);
        // Don't fail login if notifications fail
      }

      // Add a small delay to ensure the auth state is updated before navigation
      setTimeout(() => {
        console.log('Navigating to chats tab specifically...');
        router.replace('/(tabs)/chats');
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.log('Login failed:', error);
      // Don't set loading state for errors - user should see immediate feedback
      throw error;
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string) => {
    console.log('[AuthContext] Starting registration process...');
    // Don't set isLoading for registration - only for auth state changes
    try {
      const response = await authAPI.register(name, email, password);
      console.log('[AuthContext] Registration API call successful:', response);
      return response;
    } catch (error) {
      console.log('[AuthContext] Registration failed:', error);
      throw error;
    }
    // No finally block - don't touch isLoading for registration
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
      // Step 1: WebSocket will be handled by SimpleWebSocketContext
      console.log('[AuthContext] STEP 1: WebSocket will be disconnected by SimpleWebSocketContext...');

      // Step 2: Remove push token from server
      console.log('[AuthContext] STEP 2: Removing push token from server...');
      try {
        await authAPI.removePushToken();
        console.log('[AuthContext] ✅ Push token removed from server');
      } catch (pushTokenError) {
        console.warn('[AuthContext] ⚠️ Failed to remove push token (continuing with logout):', pushTokenError);
      }

      // Step 3: Call backend logout API
      console.log('[AuthContext] STEP 3: Calling backend logout API...');
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

      // Step 4: Clear local storage
      console.log('[AuthContext] STEP 4: Clearing local storage...');
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

      // Step 5: Clear state
      console.log('[AuthContext] STEP 5: Clearing application state...');
      console.log('[AuthContext] Setting user to null (was:', user, ')');
      setUser(null);
      console.log('[AuthContext] Setting token to null (was:', token ? 'present' : 'null', ')');
      setToken(null);

      // Step 6: Navigate to login
      console.log('[AuthContext] STEP 6: Navigating to login page...');
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
