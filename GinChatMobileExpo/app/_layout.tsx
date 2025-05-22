import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Auth navigation guard
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    console.log('AuthGuard running with user:', user?.id, 'segments:', segments, 'isLoading:', isLoading);
    
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inChatGroup = segments[0] === 'chat';
    
    // Add a small delay to ensure consistent navigation
    setTimeout(() => {
      if (!user && (inAuthGroup || inChatGroup)) {
        // Redirect to login if trying to access protected pages without auth
        console.log('Not authenticated, redirecting to login');
        router.replace('/login');
      } else if (user && !inAuthGroup && !inChatGroup && segments[0] !== '+not-found') {
        // Redirect to main app if already logged in and trying to access login/signup
        // But not if they're on the not-found page
        console.log('Authenticated, redirecting to chats tab');
        router.replace('/(tabs)/chats');
      }
    }, 100);
  }, [user, segments, isLoading]);

  return <>{children}</>;
}

// Root layout component
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <AuthProvider>
      <AuthGuard>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
      </AuthGuard>
    </AuthProvider>
  );
}
