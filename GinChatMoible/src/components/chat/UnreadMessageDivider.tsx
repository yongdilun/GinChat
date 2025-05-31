import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GoldTheme } from '../../../constants/GoldTheme';

interface UnreadMessageDividerProps {
  unreadCount: number;
}

export function UnreadMessageDivider({ unreadCount }: UnreadMessageDividerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.dividerLine} />
      <LinearGradient
        colors={['#FF6B6B', '#FF5252']}
        style={styles.badge}
      >
        <Ionicons name="mail-unread" size={14} color="#fff" />
        <Text style={styles.text}>
          {unreadCount} unread message{unreadCount > 1 ? 's' : ''}
        </Text>
      </LinearGradient>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#FF6B6B',
    opacity: 0.6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
});
