import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../utils/logger';
import Constants from 'expo-constants';
import { firebaseApp } from '../config/firebase';

// Define new interfaces for stored notifications
interface StoredNotification {
  messageId: string; // Assuming messageId is available in notification data
  senderName: string;
  messageContent: string;
  timestamp: number;
}

interface ChatroomNotificationGroup {
  chatroomId: string;
  chatroomName: string; // Add this
  messages: StoredNotification[];
  lastNotificationTimestamp: number;
}

// Expo push notification configuration
const expoPushConfig = {
  projectId: 'ed9112c0-dcb5-44d5-abf9-2f85fc7baf6c',
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Configure notification channels for Android
async function configureNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('chat-messages', {
      name: 'Chat Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFD700',
    });

    await Notifications.setNotificationChannelAsync('direct-messages', {
      name: 'Direct Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFD700',
    });

    await Notifications.setNotificationChannelAsync('system', {
      name: 'System Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFD700',
    });
  }
}

// Request notification permissions
async function requestNotificationPermissions() {
  if (!Device.isDevice) {
    console.warn('Push notifications are not supported in the simulator');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token for push notification!');
    return false;
  }

  return true;
}

// Get push token
async function getPushToken() {
  try {
    if (!Device.isDevice) {
      throw new Error('Push notifications are not supported in the simulator');
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      throw new Error('Notification permissions not granted');
    }

    // Get the token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    throw error;
  }
}

// Initialize notification service
export async function initializeNotificationService() {
  try {
    // Configure notification channels
    await configureNotificationChannels();
    console.info('Android notification channels configured');

    // Request permissions
    const hasPermission = await requestNotificationPermissions();
    if (hasPermission) {
      console.info('Notification permissions granted successfully');
    }

    // Get push token
    console.info('Requesting Expo push token...');
    const token = await getPushToken();
    console.info('Push token obtained successfully');

    // Set up notification categories
    await Notifications.setNotificationCategoryAsync('MESSAGE', [
      {
        identifier: 'REPLY',
        buttonTitle: 'Reply',
        options: {
          isAuthenticationRequired: true,
          isDestructive: false,
        },
      },
    ]);
    console.log('Notification categories set up');

    // Set up notification listeners
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    console.log('Notification listeners set up');

    return {
      token,
      notificationListener,
      responseListener,
    };
  } catch (error) {
    console.error('Error initializing notification service:', error);
    throw error;
  }
}

// Clean up notification listeners
export function cleanupNotificationListeners(listeners: {
  notificationListener: Notifications.Subscription;
  responseListener: Notifications.Subscription;
}) {
  if (listeners.notificationListener) {
    listeners.notificationListener.remove();
  }
  if (listeners.responseListener) {
    listeners.responseListener.remove();
  }
}

export interface PushToken {
  token: string;
  type: 'expo';
  deviceInfo?: {
    deviceType: string;
    platform: string;
    osVersion?: string;
    appVersion: string;
  };
}

export interface NotificationData {
  type: 'new_message' | 'message_read' | 'user_joined' | 'user_left';
  chatroomId?: string;
  senderId?: number;
  messageId?: string;
  timestamp?: string;
  [key: string]: any; // Allow additional data
}

export interface NotificationState {
  totalUnreadCount: number;
  chatroomUnreadCounts: Record<string, number>;
  lastNotificationTime: number;
  isInForeground: boolean;
}

export interface NotificationGroup {
  chatroomId: string;
  chatroomName: string;
  count: number;
  lastMessage: string;
  lastSender: string;
  timestamp: number;
}

class NotificationService {
  private pushToken: string | null = null;
  private isRegistered = false;
  private notificationState: NotificationState = {
    totalUnreadCount: 0,
    chatroomUnreadCounts: {},
    lastNotificationTime: 0,
    isInForeground: true,
  };
  private notificationGroups: Map<string, NotificationGroup> = new Map();
  private appStateSubscription: any = null;
  private notificationListeners: {
    received?: any;
    response?: any;
  } = {};

  // Initialize notification service
  async initialize(): Promise<void> {
    try {
      Logger.info('Initializing Expo notification service...');

      // Setup app state monitoring
      this.setupAppStateMonitoring();

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        Logger.error('Notification permissions not granted');
        return;
      }

      // Get push token
      const token = await this.getPushToken();
      if (token) {
        this.pushToken = token;
        await this.storePushToken(token);
        Logger.info('Push token obtained and stored');
      }

      // Load saved notification state
      await this.loadNotificationState();

      // Setup notification categories for actions
      await this.setupNotificationCategories();

      // Setup notification listeners
      this.setupNotificationListeners();

      this.isRegistered = true;
      Logger.info('Expo notification service initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize notification service:', error);
    }
  }

  // Request notification permissions with detailed Android handling
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        Logger.error('Push notifications only work on physical devices');
        return false;
      }

      // Get current permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      Logger.info('Current notification permission status:', existingStatus);

      if (existingStatus !== 'granted') {
        Logger.info('Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
          android: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
        Logger.info('Permission request result:', status);
      }

      if (finalStatus !== 'granted') {
        Logger.error('Notification permission denied');
        return false;
      }

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidNotificationChannels();
      }

      Logger.info('Notification permissions granted successfully');
      return true;
    } catch (error) {
      Logger.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Setup Android notification channels
  private async setupAndroidNotificationChannels(): Promise<void> {
    try {
      // Main chat messages channel
      await Notifications.setNotificationChannelAsync('chat-messages', {
        name: 'Chat Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFD700',
        sound: 'default',
        showBadge: true,
        enableLights: true,
        enableVibrate: true,
      });

      // System notifications channel
      await Notifications.setNotificationChannelAsync('system', {
        name: 'System Notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        showBadge: false,
      });

      // Direct messages channel (higher priority)
      await Notifications.setNotificationChannelAsync('direct-messages', {
        name: 'Direct Messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 100, 300],
        lightColor: '#FF6B6B',
        sound: 'default',
        showBadge: true,
        enableLights: true,
        enableVibrate: true,
      });

      Logger.info('Android notification channels configured');
    } catch (error) {
      Logger.error('Error setting up Android notification channels:', error);
    }
  }

  // Get push token with device info
  async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        Logger.error('Push tokens only work on physical devices');
        return null;
      }

      Logger.info('Requesting Expo push token...');
      
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: expoPushConfig.projectId,
      });

      if (tokenData?.data) {
        Logger.info('Expo push token obtained successfully');
        
        // Store token with device info
        const pushTokenInfo: PushToken = {
          token: tokenData.data,
          type: 'expo',
          deviceInfo: {
            deviceType: Device.deviceType ? Device.DeviceType[Device.deviceType] : 'unknown',
            platform: Platform.OS,
            osVersion: Device.osVersion || undefined,
            appVersion: '1.0.0', // You can get this from app.json or Constants
          },
        };

        await this.storePushTokenInfo(pushTokenInfo);
        return tokenData.data;
      } else {
        Logger.error('Failed to get push token - no data returned');
        return null;
      }
    } catch (error) {
      Logger.error('[ERROR] Error getting push token:', error);
      
      // Provide more specific error information
      if (error instanceof Error) {
        if (error.message.includes('projectId')) {
          Logger.error('Invalid projectId - check your Expo configuration');
        } else if (error.message.includes('network')) {
          Logger.error('Network error - check your internet connection');
        }
      }
      
      return null;
    }
  }

  // Store push token info with metadata
  async storePushTokenInfo(tokenInfo: PushToken): Promise<void> {
    try {
      await AsyncStorage.setItem('pushTokenInfo', JSON.stringify(tokenInfo));
      Logger.debug('Push token info stored locally');
    } catch (error) {
      Logger.error('Error storing push token info:', error);
    }
  }

  // Get stored push token info
  async getStoredPushTokenInfo(): Promise<PushToken | null> {
    try {
      const tokenInfo = await AsyncStorage.getItem('pushTokenInfo');
      return tokenInfo ? JSON.parse(tokenInfo) : null;
    } catch (error) {
      Logger.error('Error getting stored push token info:', error);
      return null;
    }
  }

  // Store push token locally (legacy method)
  async storePushToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('pushToken', token);
      Logger.debug('Push token stored locally');
    } catch (error) {
      Logger.error('Error storing push token:', error);
    }
  }

  // Get stored push token (legacy method)
  async getStoredPushToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('pushToken');
      return token;
    } catch (error) {
      Logger.error('Error getting stored push token:', error);
      return null;
    }
  }

  // Get current push token
  getCurrentPushToken(): string | null {
    return this.pushToken;
  }

  // Check if service is registered
  isServiceRegistered(): boolean {
    return this.isRegistered;
  }

  // Setup notification listeners
  private setupNotificationListeners(): void {
    // Handle notifications received while app is running
    this.notificationListeners.received = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Handle notification responses (when user taps notification)
    this.notificationListeners.response = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    Logger.debug('Notification listeners set up');
  }

  // Handle notification received
  private handleNotificationReceived(notification: Notifications.Notification): void {
    Logger.info('Notification received while app is running:', {
      title: notification.request.content.title,
      body: notification.request.content.body,
      data: notification.request.content.data,
    });

    // Process notification data
    const data = notification.request.content.data as NotificationData & {
      // Explicitly type expected properties from the push notification
      senderName?: string;
      messageContent?: string;
      chatroomName?: string; // Added chatroomName
    };

    if (data && data.type === 'new_message' && data.chatroomId && data.messageId && data.senderName && data.messageContent && data.chatroomName) {
      this.storeNotificationAndUpdateGroup(data as Required<NotificationData & { senderName: string; messageContent: string; chatroomName: string; }>);
      this.handleNotificationData(data); // Keep existing logic if needed
    } else if (data) {
      // Fallback for other notification types or if data is incomplete
      this.handleNotificationData(data);
    }
  }

  // New method to store notification and update group
  // Helper function to get a specific chatroom notification group
  async getChatroomNotificationGroup(chatroomId: string): Promise<ChatroomNotificationGroup | null> {
    try {
      const storedGroups = await AsyncStorage.getItem('notificationGroups');
      if (storedGroups) {
        const groups: Record<string, ChatroomNotificationGroup> = JSON.parse(storedGroups);
        return groups[chatroomId] || null;
      }
      return null;
    } catch (error) {
      Logger.error('Error getting chatroom notification group from AsyncStorage:', error);
      return null;
    }
  }

  // New method to clear a specific chatroom's notification group from AsyncStorage
  async clearStoredNotificationGroup(chatroomId: string): Promise<void> {
    try {
      const storedGroups = await AsyncStorage.getItem('notificationGroups');
      if (storedGroups) {
        const groups: Record<string, ChatroomNotificationGroup> = JSON.parse(storedGroups);
        if (groups[chatroomId]) {
          delete groups[chatroomId];
          await AsyncStorage.setItem('notificationGroups', JSON.stringify(groups));
          Logger.info(`Cleared stored notification group for chatroom: ${chatroomId}`);
        }
      }
    } catch (error) {
      Logger.error('Error clearing stored notification group:', error);
    }
  }

  private async storeNotificationAndUpdateGroup(
    notificationData: Required<NotificationData & { senderName: string; messageContent: string; chatroomName: string; messageId: string; }>
  ): Promise<void> {
    try {
      const { chatroomId, chatroomName, messageId, senderName, messageContent } = notificationData;
      // Ensure timestamp is a number. If it's a string, parse it. If undefined, use Date.now().
      let timestamp: number;
      if (typeof notificationData.timestamp === 'string') {
        timestamp = parseInt(notificationData.timestamp, 10);
      } else if (typeof notificationData.timestamp === 'number') {
        timestamp = notificationData.timestamp;
      } else {
        timestamp = Date.now();
      }

      const storedMessage: StoredNotification = {
        messageId,
        senderName,
        messageContent,
        timestamp,
      };

      const storedGroups = await AsyncStorage.getItem('notificationGroups');
      let groups: Record<string, ChatroomNotificationGroup> = storedGroups ? JSON.parse(storedGroups) : {};

      if (!groups[chatroomId]) {
        groups[chatroomId] = {
          chatroomId,
          chatroomName, // Initialize with chatroomName
          messages: [],
          lastNotificationTimestamp: 0,
        };
      }

      groups[chatroomId].messages.push(storedMessage);
      // Sort messages by timestamp, newest first for easier display
      groups[chatroomId].messages.sort((a, b) => b.timestamp - a.timestamp);
      // Optional: Limit the number of stored messages per group
      // if (groups[chatroomId].messages.length > 50) {
      //   groups[chatroomId].messages = groups[chatroomId].messages.slice(0, 50);
      // }
      groups[chatroomId].lastNotificationTimestamp = Date.now();
      // Update chatroomName in case it changed (though unlikely for a specific ID)
      groups[chatroomId].chatroomName = chatroomName;


      await AsyncStorage.setItem('notificationGroups', JSON.stringify(groups));
      Logger.info('Notification groups updated and stored:', groups);
      // For verification during development:
      console.log('Updated notification groups:', JSON.stringify(groups, null, 2));

      // After storing and updating, decide how to display
      const updatedGroup = groups[chatroomId];
      if (!updatedGroup) return;

      if (this.notificationState.isInForeground) {
        // App is in foreground: Display custom in-app notification
        let title = chatroomName;
        let body = '';
        if (updatedGroup.messages.length === 1) {
          const lastMessage = updatedGroup.messages[0];
          title = chatroomName; // Or senderName if preferred for 1-1 like feel
          body = `${lastMessage.senderName}: ${lastMessage.messageContent}`;
        } else {
          body = `${updatedGroup.messages.length} new messages in ${updatedGroup.chatroomName}`;
        }

        // TODO: Check if user is currently in this specific chatroom. For now, always show.
        // Use chatroomId and a unique part for identifier to try and make it replaceable
        const foregroundNotificationId = `foreground_${chatroomId}_${Date.now()}`;

        Notifications.scheduleNotificationAsync({
          content: {
            title: title,
            body: body,
            sound: 'default', // Consider making this conditional
            data: { ...notificationData, notificationId: foregroundNotificationId }, // Pass original data
          },
          identifier: foregroundNotificationId, // Use this to potentially update/dismiss
          trigger: null, // immediate
        });
        Logger.info(`Scheduled foreground notification for ${chatroomId}: ${foregroundNotificationId}`);

      } else {
        // App is in background: Display summarized push notification
        let title = `New messages in ${updatedGroup.chatroomName}`;
        let body = '';

        if (updatedGroup.messages.length === 1) {
          const firstMessage = updatedGroup.messages[0];
          body = `${firstMessage.senderName}: ${firstMessage.messageContent}`;
        } else if (updatedGroup.messages.length > 1) {
          const firstMessage = updatedGroup.messages[0]; // Most recent
          body = `${firstMessage.senderName} and ${updatedGroup.messages.length - 1} others sent messages in ${updatedGroup.chatroomName}`;
        }

        // Use chatroomId as the identifier for the notification request.
        // This should make new notifications for the same chatroom replace the old ones.
        const backgroundNotificationIdentifier = chatroomId;

        Notifications.scheduleNotificationAsync({
          content: {
            title: title,
            body: body,
            sound: 'default',
            badge: (this.notificationState.totalUnreadCount || 0) + 1, // Tentative: update badge based on group
            data: { ...notificationData, chatroomId, notificationId: backgroundNotificationIdentifier }, // Ensure chatroomId is in data for navigation
          },
          identifier: backgroundNotificationIdentifier, // Key for summarization
          trigger: {
            seconds: 1, // Schedule slightly in the future to allow dismissal to work if needed
            channelId: 'chat-messages', // Ensure it uses our configured channel on Android
          },
        });
        Logger.info(`Scheduled background/summarized notification for ${chatroomId} with identifier: ${backgroundNotificationIdentifier}`);
      }

    } catch (error) {
      Logger.error('Error storing notification, updating group, or displaying notification:', error);
    }
  }

  // Handle notification response (user interaction)
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    Logger.info('Notification response received:', {
      actionIdentifier: response.actionIdentifier,
      data: response.notification.request.content.data,
    });

    // Handle different actions
    const data = response.notification.request.content.data as NotificationData;
    
    if (response.actionIdentifier === 'mark_read' && data?.chatroomId) {
      // Handle mark as read without opening app
      this.handleMarkAsRead(data.chatroomId);
    } else {
      // Default action - navigate to relevant screen
      this.handleNotificationNavigation(data);
    }
  }

  // Handle mark as read action
  private async handleMarkAsRead(chatroomId: string): Promise<void> {
    try {
      // Update local unread count
      await this.updateChatroomUnreadCount(chatroomId, 0);
      
      // TODO: Send API request to mark messages as read
      Logger.info('Marked messages as read for chatroom:', chatroomId);
    } catch (error) {
      Logger.error('Error marking messages as read:', error);
    }
  }

  // Handle notification navigation
  private handleNotificationNavigation(data: NotificationData): void {
    // This will be handled by the app's navigation system
    // You can emit an event or use a callback here
    Logger.info('Should navigate to:', data);
  }

  // Legacy methods for backward compatibility
  addNotificationReceivedListener(handler: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(handler);
  }

  addNotificationResponseReceivedListener(
    handler: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(handler);
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      Logger.debug('All notifications cleared');
    } catch (error) {
      Logger.error('Error clearing notifications:', error);
    }
  }

  // Set notification badge count
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
      Logger.debug('Badge count set to:', count);
    } catch (error) {
      Logger.error('Error setting badge count:', error);
    }
  }

  // Schedule local notification (for testing)
  async scheduleLocalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Show immediately
      });
      Logger.debug('Local notification scheduled');
    } catch (error) {
      Logger.error('Error scheduling local notification:', error);
    }
  }

  // Setup app state monitoring
  private setupAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const wasInForeground = this.notificationState.isInForeground;
      this.notificationState.isInForeground = nextAppState === 'active';

      Logger.debug(`App state changed: ${nextAppState}, isInForeground: ${this.notificationState.isInForeground}`);

      // When app comes to foreground, clear notifications and update badge
      if (!wasInForeground && this.notificationState.isInForeground) {
        this.handleAppForeground();
      }
    });
  }

  // Handle app coming to foreground
  private async handleAppForeground(): Promise<void> {
    try {
      // Clear all OS notifications when app becomes active
      await this.clearAllNotifications();
      Logger.debug('Cleared all OS notifications on app foreground.');

      // Clear stored notification groups from AsyncStorage
      await AsyncStorage.removeItem('notificationGroups');
      Logger.info('Cleared all stored notification groups from AsyncStorage on app foreground.');

      // Update badge count based on actual unread messages
      // This should be called from the chat service when unread counts are updated
      Logger.debug('App came to foreground.');
    } catch (error) {
      Logger.error('Error handling app foreground:', error);
    }
  }

  // Setup notification categories for quick actions
  private async setupNotificationCategories(): Promise<void> {
    try {
      await Notifications.setNotificationCategoryAsync('message', [
        {
          identifier: 'reply',
          buttonTitle: 'Reply',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'mark_read',
          buttonTitle: 'Mark as Read',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

      Logger.debug('Notification categories set up');
    } catch (error) {
      Logger.error('Error setting up notification categories:', error);
    }
  }

  // Load notification state from storage
  private async loadNotificationState(): Promise<void> {
    try {
      const savedState = await AsyncStorage.getItem('notificationState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        this.notificationState = {
          ...this.notificationState,
          ...parsed,
          isInForeground: AppState.currentState === 'active', // Always use current app state
        };
        Logger.debug('Notification state loaded from storage');
      }
    } catch (error) {
      Logger.error('Error loading notification state:', error);
    }
  }

  // Save notification state to storage
  private async saveNotificationState(): Promise<void> {
    try {
      await AsyncStorage.setItem('notificationState', JSON.stringify(this.notificationState));
      Logger.debug('Notification state saved to storage');
    } catch (error) {
      Logger.error('Error saving notification state:', error);
    }
  }

  // Update unread count for a chatroom
  async updateChatroomUnreadCount(chatroomId: string, count: number): Promise<void> {
    this.notificationState.chatroomUnreadCounts[chatroomId] = count;
    this.notificationState.totalUnreadCount = Object.values(this.notificationState.chatroomUnreadCounts)
      .reduce((total, current) => total + current, 0);

    await this.setBadgeCount(this.notificationState.totalUnreadCount);
    await this.saveNotificationState();

    Logger.debug(`Updated unread count for chatroom ${chatroomId}: ${count}, total: ${this.notificationState.totalUnreadCount}`);

    if (count === 0) {
      // If unread count for a chatroom is zero, clear its stored notification group
      await this.clearStoredNotificationGroup(chatroomId);
    }
  }

  // Get current notification state
  getNotificationState(): NotificationState {
    return { ...this.notificationState };
  }

  // Handle incoming notification data
  async handleNotificationData(data: NotificationData): Promise<void> {
    try {
      switch (data.type) {
        case 'new_message':
          if (data.chatroomId) {
            await this.handleNewMessageNotification(data);
          }
          break;
        case 'message_read':
          if (data.chatroomId) {
            await this.handleMessageReadNotification(data);
          }
          break;
        default:
          Logger.debug('Unhandled notification type:', data.type);
      }
    } catch (error) {
      Logger.error('Error handling notification data:', error);
    }
  }

  // Handle new message notification
  private async handleNewMessageNotification(data: NotificationData): Promise<void> {
    if (!data.chatroomId) return;

    const currentCount = this.notificationState.chatroomUnreadCounts[data.chatroomId] || 0;
    await this.updateChatroomUnreadCount(data.chatroomId, currentCount + 1);
  }

  // Handle message read notification
  private async handleMessageReadNotification(data: NotificationData): Promise<void> {
    if (!data.chatroomId) return;

    // Reset unread count for this chatroom
    await this.updateChatroomUnreadCount(data.chatroomId, 0);
  }

  // Cleanup method
  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export types and utilities
export { Notifications };
export type { Notification, NotificationResponse } from 'expo-notifications';
