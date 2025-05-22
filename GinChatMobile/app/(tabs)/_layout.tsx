import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';

export default function TabLayout() {
  const { logout } = useAuth();

  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles-outline" size={24} color={color} />,
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 15 }}
              onPress={logout}
            >
              <Ionicons name="log-out-outline" size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}
