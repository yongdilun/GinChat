import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { SimpleWebSocketProvider } from '@/contexts/SimpleWebSocketContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { setupProductionLogging, Logger } from '../src/utils/logger';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { notificationService, Notifications } from '../src/services/notificationService';

export default function RootLayout() {
  // Setup production logging and notifications on app start
  useEffect(() => {
    setupProductionLogging();
    
    // Initialize notification service
    notificationService.initialize().catch((error) => {
      Logger.error('Failed to initialize notifications:', error);
    });

    // Setup enhanced notification handlers
    const notificationListener = notificationService.addNotificationReceivedListener(
      (notification) => {
        Logger.info('Notification received while app is running:', notification);

        // Handle notification data for state management
        const data = notification.request.content.data;
        if (data) {
          // This will be handled by the NotificationContext
          Logger.debug('Processing notification data:', data);
        }
      }
    );

    const responseListener = notificationService.addNotificationResponseReceivedListener(
      (response) => {
        Logger.info('Notification tapped:', response);

        // Handle notification actions
        const action = response.actionIdentifier;
        const data = response.notification.request.content.data;

        if (action === 'mark_read' && data?.chatroomId) {
          // Handle mark as read action without opening app
          Logger.info('Mark as read action triggered for chatroom:', data.chatroomId);
          // This could trigger an API call to mark messages as read
          return;
        }

        // Handle navigation for tap or reply actions
        if (data?.chatroomId) {
          router.push(`/chat/${data.chatroomId}`);
        } else {
          router.push('/(tabs)/chats');
        }
      }
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <View style={{ flex: 1 }}>
        <AuthProvider>
          <NotificationProvider>
            <SimpleWebSocketProvider>
              <ProtectedRoute>
            <Stack
              screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: 'white' }
              }}
            >
              <Stack.Screen
                name="index"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="(tabs)"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="login"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="signup"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="chat/[id]"
                options={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              />
              </Stack>
              </ProtectedRoute>
              <StatusBar style="light" />
            </SimpleWebSocketProvider>
          </NotificationProvider>
        </AuthProvider>
      </View>
    </ErrorBoundary>
  );
}
