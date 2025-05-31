// Push notification sender service for backend integration
// This shows how to send notifications to Android devices using Expo's push service

interface ExpoPushMessage {
  to: string | string[];
  title?: string;
  body?: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high' | 'max';
  ttl?: number;
  expiration?: number;
  categoryId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

export class PushNotificationSender {
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  /**
   * Send a push notification to one or multiple Expo push tokens
   * This is what your backend server would use
   */
  async sendPushNotification(message: ExpoPushMessage): Promise<ExpoPushTicket[]> {
    try {
      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Send a chat message notification
   */
  async sendChatMessageNotification(
    expoPushTokens: string[],
    senderName: string,
    messageContent: string,
    chatroomId: string,
    chatroomName?: string
  ): Promise<ExpoPushTicket[]> {
    const message: ExpoPushMessage = {
      to: expoPushTokens,
      title: chatroomName ? `${senderName} in ${chatroomName}` : senderName,
      body: messageContent,
      data: {
        type: 'new_message',
        chatroomId,
        senderId: senderName,
        timestamp: new Date().toISOString(),
      },
      sound: 'default',
      channelId: 'chat-messages',
      priority: 'high',
      categoryId: 'message',
      ttl: 3600, // 1 hour
    };

    return this.sendPushNotification(message);
  }

  /**
   * Send a direct message notification (higher priority)
   */
  async sendDirectMessageNotification(
    expoPushToken: string,
    senderName: string,
    messageContent: string,
    chatroomId: string
  ): Promise<ExpoPushTicket[]> {
    const message: ExpoPushMessage = {
      to: expoPushToken,
      title: `💬 ${senderName}`,
      body: messageContent,
      data: {
        type: 'new_message',
        chatroomId,
        senderId: senderName,
        timestamp: new Date().toISOString(),
        isDirect: true,
      },
      sound: 'default',
      channelId: 'direct-messages',
      priority: 'max',
      categoryId: 'message',
      ttl: 7200, // 2 hours
    };

    return this.sendPushNotification(message);
  }

  /**
   * Send a system notification
   */
  async sendSystemNotification(
    expoPushTokens: string[],
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<ExpoPushTicket[]> {
    const message: ExpoPushMessage = {
      to: expoPushTokens,
      title,
      body,
      data: {
        type: 'system',
        ...data,
        timestamp: new Date().toISOString(),
      },
      sound: 'default',
      channelId: 'system',
      priority: 'normal',
      ttl: 1800, // 30 minutes
    };

    return this.sendPushNotification(message);
  }

  /**
   * Validate Expo push tokens
   */
  isValidExpoPushToken(token: string): boolean {
    return token.startsWith('ExponentPushToken[') && token.endsWith(']');
  }

  /**
   * Filter valid tokens from a list
   */
  filterValidTokens(tokens: string[]): string[] {
    return tokens.filter(token => this.isValidExpoPushToken(token));
  }
}

export const pushNotificationSender = new PushNotificationSender(); 