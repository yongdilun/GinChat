import { useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { Logger } from '../utils/logger';

interface UnreadCount {
  chatroom_id: string;
  chatroom_name: string;
  unread_count: number;
}

/**
 * Hook to integrate notifications with chat system
 * Automatically updates notification state when unread counts change
 */
export const useNotificationIntegration = () => {
  const { updateChatroomUnreadCount, clearChatroomNotifications } = useNotification();

  // Update notification state when unread counts change
  const handleUnreadCountsUpdate = async (unreadCounts: UnreadCount[]) => {
    try {
      Logger.debug('[NotificationIntegration] Updating unread counts:', unreadCounts);
      
      for (const count of unreadCounts) {
        await updateChatroomUnreadCount(count.chatroom_id, count.unread_count);
      }
    } catch (error) {
      Logger.error('[NotificationIntegration] Failed to update unread counts:', error);
    }
  };

  // Clear notifications when entering a chatroom
  const handleChatroomEnter = async (chatroomId: string) => {
    try {
      Logger.debug('[NotificationIntegration] Clearing notifications for chatroom:', chatroomId);
      await clearChatroomNotifications(chatroomId);
    } catch (error) {
      Logger.error('[NotificationIntegration] Failed to clear chatroom notifications:', error);
    }
  };

  // Handle new message received
  const handleNewMessage = async (chatroomId: string) => {
    try {
      // This will be handled automatically by the notification service
      // when push notifications are received
      Logger.debug('[NotificationIntegration] New message received for chatroom:', chatroomId);
    } catch (error) {
      Logger.error('[NotificationIntegration] Failed to handle new message:', error);
    }
  };

  return {
    handleUnreadCountsUpdate,
    handleChatroomEnter,
    handleNewMessage,
  };
};

/**
 * Hook to automatically sync unread counts with notifications
 * Use this in components that manage unread counts
 */
export const useUnreadCountSync = (unreadCounts: UnreadCount[]) => {
  const { handleUnreadCountsUpdate } = useNotificationIntegration();

  useEffect(() => {
    if (unreadCounts && unreadCounts.length > 0) {
      handleUnreadCountsUpdate(unreadCounts);
    }
  }, [unreadCounts, handleUnreadCountsUpdate]);
};

/**
 * Hook to automatically clear notifications when entering a chat
 * Use this in chat components
 */
export const useChatNotificationClear = (chatroomId: string | undefined) => {
  const { handleChatroomEnter } = useNotificationIntegration();

  useEffect(() => {
    if (chatroomId) {
      handleChatroomEnter(chatroomId);
    }
  }, [chatroomId, handleChatroomEnter]);
};
