import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { notificationService, NotificationState, NotificationData } from '../services/notificationService';
import { Logger } from '../utils/logger';

interface NotificationContextType {
  notificationState: NotificationState;
  updateChatroomUnreadCount: (chatroomId: string, count: number) => Promise<void>;
  handleNotificationData: (data: NotificationData) => Promise<void>;
  clearChatroomNotifications: (chatroomId: string) => Promise<void>;
  getTotalUnreadCount: () => number;
  getChatroomUnreadCount: (chatroomId: string) => number;
}

const NotificationContext = createContext<NotificationContextType>({
  notificationState: {
    totalUnreadCount: 0,
    chatroomUnreadCounts: {},
    lastNotificationTime: 0,
    isInForeground: true,
  },
  updateChatroomUnreadCount: async () => {},
  handleNotificationData: async () => {},
  clearChatroomNotifications: async () => {},
  getTotalUnreadCount: () => 0,
  getChatroomUnreadCount: () => 0,
});

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notificationState, setNotificationState] = useState<NotificationState>(
    notificationService.getNotificationState()
  );

  // Update local state when notification service state changes
  useEffect(() => {
    const updateState = () => {
      setNotificationState(notificationService.getNotificationState());
    };

    // Poll for state changes (could be improved with event emitters)
    const interval = setInterval(updateState, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const updateChatroomUnreadCount = async (chatroomId: string, count: number) => {
    try {
      await notificationService.updateChatroomUnreadCount(chatroomId, count);
      setNotificationState(notificationService.getNotificationState());
      Logger.debug(`[NotificationContext] Updated unread count for ${chatroomId}: ${count}`);
    } catch (error) {
      Logger.error('[NotificationContext] Failed to update unread count:', error);
    }
  };

  const handleNotificationData = async (data: NotificationData) => {
    try {
      await notificationService.handleNotificationData(data);
      setNotificationState(notificationService.getNotificationState());
      Logger.debug('[NotificationContext] Handled notification data:', data);
    } catch (error) {
      Logger.error('[NotificationContext] Failed to handle notification data:', error);
    }
  };

  const clearChatroomNotifications = async (chatroomId: string) => {
    try {
      await notificationService.updateChatroomUnreadCount(chatroomId, 0);
      setNotificationState(notificationService.getNotificationState());
      Logger.debug(`[NotificationContext] Cleared notifications for ${chatroomId}`);
    } catch (error) {
      Logger.error('[NotificationContext] Failed to clear notifications:', error);
    }
  };

  const getTotalUnreadCount = () => {
    return notificationState.totalUnreadCount;
  };

  const getChatroomUnreadCount = (chatroomId: string) => {
    return notificationState.chatroomUnreadCounts[chatroomId] || 0;
  };

  const value: NotificationContextType = {
    notificationState,
    updateChatroomUnreadCount,
    handleNotificationData,
    clearChatroomNotifications,
    getTotalUnreadCount,
    getChatroomUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
