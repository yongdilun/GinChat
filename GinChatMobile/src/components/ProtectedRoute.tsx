import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return; // Don't navigate while auth state is loading

    const currentRoute = segments.join('/');
    const inAuthGroup = segments.includes('(tabs)') || segments.includes('chat');
    const isIndexRoute = currentRoute === '';
    const isLoginRoute = segments.includes('login');
    const isSignupRoute = segments.includes('signup');
    const isPublicRoute = isLoginRoute || isSignupRoute || isIndexRoute;

    console.log('[ProtectedRoute] Current route:', currentRoute);
    console.log('[ProtectedRoute] Current segments:', segments);
    console.log('[ProtectedRoute] Is authenticated:', isAuthenticated);
    console.log('[ProtectedRoute] Is in auth group:', inAuthGroup);
    console.log('[ProtectedRoute] Is public route:', isPublicRoute);

    if (isAuthenticated) {
      // User is authenticated
      if (isPublicRoute) {
        // Redirect authenticated users away from auth pages to chats
        console.log('[ProtectedRoute] Authenticated user accessing public route, redirecting to chats');
        router.replace('/(tabs)/chats');
      }
      // If user is authenticated and in protected routes, allow access
    } else {
      // User is not authenticated
      if (inAuthGroup) {
        // Redirect unauthenticated users to login
        console.log('[ProtectedRoute] Unauthenticated user accessing protected route, redirecting to login');
        router.replace('/login');
      }
      // If user is not authenticated and on public routes, allow access
    }
  }, [isAuthenticated, isLoading, segments]);

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
}); 