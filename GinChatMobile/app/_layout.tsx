import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <AuthProvider>
        <Stack screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: 'white' }
        }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="chat/[id]" />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </View>
  );
}
