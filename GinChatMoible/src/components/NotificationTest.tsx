import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../services/notificationService';
import { useNotification } from '../contexts/NotificationContext';
import { GoldTheme } from '../../constants/GoldTheme';
import { Logger } from '../utils/logger';

export function NotificationTest() {
  const {
    notificationState,
    updateChatroomUnreadCount,
    getTotalUnreadCount,
    getChatroomUnreadCount
  } = useNotification();

  const testLocalNotification = async () => {
    try {
      await notificationService.scheduleLocalNotification(
        'Test Notification',
        'This is a test notification from GinChat!',
        {
          type: 'new_message',
          chatroomId: 'test-chatroom-123',
          senderId: 1,
          test: true
        }
      );
      Alert.alert('Success', 'Test notification scheduled!');
    } catch (error) {
      Logger.error('Failed to schedule test notification:', error);
      Alert.alert('Error', 'Failed to schedule test notification');
    }
  };

  const testMessageNotification = async () => {
    try {
      await notificationService.scheduleLocalNotification(
        'New message in Test Chat',
        'John: Hey, how are you doing?',
        {
          type: 'new_message',
          chatroomId: 'test-chatroom-123',
          senderId: 2,
          messageId: 'msg-123'
        }
      );
      Alert.alert('Success', 'Message notification scheduled!');
    } catch (error) {
      Logger.error('Failed to schedule message notification:', error);
      Alert.alert('Error', 'Failed to schedule message notification');
    }
  };

  const testUnreadCountUpdate = async () => {
    try {
      await updateChatroomUnreadCount('test-chatroom-123', 5);
      Alert.alert('Success', 'Unread count updated to 5 for test chatroom!');
    } catch (error) {
      Logger.error('Failed to update unread count:', error);
      Alert.alert('Error', 'Failed to update unread count');
    }
  };

  const checkNotificationStatus = async () => {
    const isRegistered = notificationService.isServiceRegistered();
    const pushToken = notificationService.getCurrentPushToken();
    const totalUnread = getTotalUnreadCount();
    const testChatroomUnread = getChatroomUnreadCount('test-chatroom-123');

    Alert.alert(
      'Notification Status',
      `Service Registered: ${isRegistered}\n` +
      `Push Token: ${pushToken ? 'Available' : 'Not available'}\n` +
      `Total Unread: ${totalUnread}\n` +
      `Test Chatroom Unread: ${testChatroomUnread}\n` +
      `In Foreground: ${notificationState.isInForeground}\n\n` +
      `Token: ${pushToken?.substring(0, 50)}...`
    );
  };

  const clearNotifications = async () => {
    try {
      await notificationService.clearAllNotifications();
      Alert.alert('Success', 'All notifications cleared!');
    } catch (error) {
      Logger.error('Failed to clear notifications:', error);
      Alert.alert('Error', 'Failed to clear notifications');
    }
  };

  const resetBadgeCount = async () => {
    try {
      await notificationService.setBadgeCount(0);
      Alert.alert('Success', 'Badge count reset to 0!');
    } catch (error) {
      Logger.error('Failed to reset badge count:', error);
      Alert.alert('Error', 'Failed to reset badge count');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[GoldTheme.background.card, 'rgba(42, 42, 42, 0.95)']}
        style={styles.card}
      >
        <View style={styles.header}>
          <Ionicons name="notifications" size={24} color={GoldTheme.gold.primary} />
          <Text style={styles.title}>Notification Test</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={testLocalNotification}>
          <LinearGradient
            colors={GoldTheme.gradients.goldShimmer}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="send" size={16} color={GoldTheme.background.primary} />
            <Text style={styles.buttonText}>Test Local Notification</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={checkNotificationStatus}>
          <LinearGradient
            colors={['#4A90E2', '#357ABD']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="information-circle" size={16} color="white" />
            <Text style={[styles.buttonText, { color: 'white' }]}>Check Status</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testMessageNotification}>
          <LinearGradient
            colors={GoldTheme.gradients.goldShimmer}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="chatbubble" size={16} color={GoldTheme.background.primary} />
            <Text style={styles.buttonText}>Test Message</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testUnreadCountUpdate}>
          <LinearGradient
            colors={GoldTheme.gradients.goldShimmer}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="mail-unread" size={16} color={GoldTheme.background.primary} />
            <Text style={styles.buttonText}>Test Unread</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={resetBadgeCount}>
          <LinearGradient
            colors={['#4A90E2', '#357ABD']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="refresh" size={16} color="white" />
            <Text style={[styles.buttonText, { color: 'white' }]}>Reset Badge</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={clearNotifications}>
          <LinearGradient
            colors={['#FF6B6B', '#FF5252']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="trash" size={16} color="white" />
            <Text style={[styles.buttonText, { color: 'white' }]}>Clear All</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Current Status:</Text>
          <Text style={styles.statusText}>Total Unread: {getTotalUnreadCount()}</Text>
          <Text style={styles.statusText}>Test Chat Unread: {getChatroomUnreadCount('test-chatroom-123')}</Text>
          <Text style={styles.statusText}>In Foreground: {notificationState.isInForeground ? 'Yes' : 'No'}</Text>
        </View>

        <Text style={styles.note}>
          Note: Notifications are hidden when app is active (shouldShowAlert: false).
          They will appear when app is in background or killed.
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: GoldTheme.text.primary,
    marginLeft: 8,
  },
  button: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: GoldTheme.background.primary,
    marginLeft: 8,
  },
  statusContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GoldTheme.gold.primary,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    color: GoldTheme.text.primary,
    marginBottom: 4,
  },
  note: {
    fontSize: 12,
    color: GoldTheme.text.secondary,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
});
