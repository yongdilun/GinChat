import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  View,
  Alert,
  StatusBar,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { chatAPI, Message, Chatroom, MessageType, mediaAPI, ReadStatus } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { GoldTheme } from '../../constants/GoldTheme';
import { GoldButton } from '../../src/components/GoldButton';
import { MessageActions } from '../../src/components/MessageActions';
import { ChatroomActions } from '../../src/components/ChatroomActions';
import { MessageInfo } from '../../src/components/chat/MessageInfo';

// Import our extracted components
import { AudioPlayer } from '../../src/components/chat/AudioPlayer';
import { ChatDetailHeader } from '../../src/components/chat/ChatDetailHeader';
import { VideoPlayer } from '../../src/components/chat/VideoPlayer';
import { MessageItem } from '../../src/components/chat/MessageItem';
import { MessageInput } from '../../src/components/chat/MessageInput';
import { ImageModal } from '../../src/components/chat/ImageModal';
import { UnreadMessageIndicator } from '../../src/components/chat/UnreadMessageIndicator';
import { UnreadMessageDivider } from '../../src/components/chat/UnreadMessageDivider';
import { FixedUnreadDivider } from '../../src/components/chat/FixedUnreadDivider';
import { useWebSocketHandler } from '../../src/hooks/useWebSocketHandler';
import { usePaginatedMessages } from '../../src/hooks/usePaginatedMessages';
import { useMediaPicker } from '../../src/hooks/useMediaPicker';
import { useAudioRecorder } from '../../src/hooks/useAudioRecorder';



export default function ChatDetail() {
  const { id: chatroomId } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const hasAutoScrolledRef = useRef(false);

  // State management
  const [chatroom, setChatroom] = useState<Chatroom | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Use paginated messages hook
  const {
    messages,
    hasMore,
    unreadCount,
    loading,
    loadingMore,
    firstUnreadMessageId,
    loadInitialMessages,
    loadMoreMessages,
    addNewMessage,
    updateMessage,
    removeMessage,
    reset: resetMessages,
  } = usePaginatedMessages(chatroomId || '');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const [showChatroomActions, setShowChatroomActions] = useState(false);
  const [showUnreadIndicator, setShowUnreadIndicator] = useState(true);
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [messageInfoData, setMessageInfoData] = useState<Message | null>(null);

  // Ref to track if we've already marked messages as read for this session
  const hasMarkedAsReadRef = useRef(false);
  // Ref to track if unread indicator has been manually dismissed
  const unreadIndicatorDismissedRef = useRef(false);

  // Media picker hook
  const {
    selectedMedia,
    pickingMedia,
    handlePickMedia,
    handleRemoveMedia,
    setSelectedMedia,
  } = useMediaPicker();

  // Audio recorder hook
  const {
    isRecorderVisible,
    recordedAudio,
    showRecorder,
    handleRecordingComplete,
    handleRecordingCancel,
    clearRecording,
  } = useAudioRecorder();

  // Mark message as read function (kept for manual marking, but WebSocket auto-read now handles automatic marking)
  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!user?.id) return;

    console.log('[Chat] 🚀 Manual mark message as read:', messageId);

    // Find the message to update
    const messageToUpdate = messages.find(msg => msg.id === messageId);
    if (!messageToUpdate) return;

    // Optimistic update - mark message as read immediately in UI
    const updatedReadStatus = messageToUpdate.read_status ? [...messageToUpdate.read_status] : [];
    const existingReadIndex = updatedReadStatus.findIndex(rs => rs.user_id === user.id);

    if (existingReadIndex === -1) {
      // Add new read status
      updatedReadStatus.push({
        user_id: user.id,
        username: user.email || 'User',
        read_at: new Date().toISOString(),
        is_read: true
      });

      updateMessage(messageId, { read_status: updatedReadStatus });
    }

    // Use the new single message API for manual marking
    try {
      console.log('[Chat] 📤 Sending manual mark-as-read API request for message:', messageId);
      const response = await chatAPI.markSingleMessageAsRead(messageId);

      if (!response) {
        console.error('[Chat] ❌ Failed to mark message as read manually');
        // Revert optimistic update on failure
        const revertedReadStatus = messageToUpdate.read_status?.filter(rs => rs.user_id !== user.id) || [];
        updateMessage(messageId, { read_status: revertedReadStatus });
      } else {
        console.log('[Chat] ✅ Message marked as read manually, WebSocket notification sent to other users');
      }
    } catch (error) {
      console.error('[Chat] ❌ Error marking message as read manually:', error);
    }
  }, [user?.id, user?.email, messages, updateMessage]);

  // WebSocket handler - create a custom setMessages function for compatibility
  const setMessagesForWebSocket = useCallback((updater: React.SetStateAction<Message[]>) => {
    if (typeof updater === 'function') {
      const newMessages = updater(messages);
      // Handle new messages from WebSocket
      if (newMessages.length > messages.length) {
        const newestMessage = newMessages[newMessages.length - 1];
        addNewMessage(newestMessage);
      }
    }
    console.log('[Chat] WebSocket message update received');
  }, [messages, addNewMessage]);

  useWebSocketHandler({
    chatroomId,
    setMessages: setMessagesForWebSocket,
    markMessageAsRead,
    addNewMessage,
    updateMessage,
    removeMessage,
  });

  // Mark all messages as read
  const markAllMessagesAsRead = async () => {
    if (!chatroomId || !user?.id || isMarkingAsRead) {
      return;
    }

    setIsMarkingAsRead(true);

    try {
      // Optimistic update - mark all messages as read immediately using the hook
      messages.forEach(msg => {
        if (msg.sender_id !== user.id) {
          const updatedReadStatus = msg.read_status ? [...msg.read_status] : [];
          const existingReadIndex = updatedReadStatus.findIndex(rs => rs.user_id === user.id);

          if (existingReadIndex === -1) {
            updatedReadStatus.push({
              user_id: user.id,
              username: user.email || 'User',
              read_at: new Date().toISOString(),
              is_read: true
            });

            updateMessage(msg.id, { read_status: updatedReadStatus });
          }
        }
      });

      const response = await chatAPI.markAllMessagesAsRead(chatroomId);

      if (!response) {
        console.error('[Chat] ❌ Failed to mark all messages as read');
      } else {
        console.log('[Chat] ✅ All messages marked as read successfully');
      }
    } catch (error) {
      console.error('[Chat] ❌ Error marking all messages as read:', error);
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  // Load chatroom and messages
  const loadChatroomData = useCallback(async () => {
    if (!chatroomId || !token) return;

    try {
      // Load chatroom details
      const chatroomResponse = await chatAPI.getConversationById(chatroomId);
      setChatroom(chatroomResponse.chatroom);
      console.log('[Chat] 📋 Loaded chatroom:', chatroomResponse.chatroom);

      // Load messages using the new paginated system
      await loadInitialMessages(user?.id);
      console.log('[Chat] 📨 Loaded paginated messages');

      // Note: Unread info is now calculated by the usePaginatedMessages hook
      console.log('[Chat] 📍 Fixed unread divider position set by hook');

      // Hide unread indicator initially if no messages
      if (messages.length === 0) {
        setShowUnreadIndicator(false);
      }

      // Note: Messages will be marked as read by the room entry useEffect
      // after a 1.5 second delay to ensure messages are loaded

    } catch (error) {
      console.error('[Chat] Error loading chatroom data:', error);
      Alert.alert('Error', 'Failed to load chat data');
    }
  }, [chatroomId, token, loadInitialMessages, messages.length, user?.id]); // Only essential dependencies to prevent infinite loops

  // Load data on mount and when chatroomId changes
  useEffect(() => {
    // Reset the mark-as-read flag when entering a new chatroom
    hasMarkedAsReadRef.current = false;
    // Reset the auto-scroll flag when entering a new chatroom
    hasAutoScrolledRef.current = false;
    // Reset the unread indicator dismissed flag when entering a new chatroom
    unreadIndicatorDismissedRef.current = false;
    // Reset messages for new chatroom (this also resets unread divider position)
    resetMessages();
    loadChatroomData();

    // Cleanup function - mark as read when leaving if not already marked
    return () => {
      if (!hasMarkedAsReadRef.current && chatroomId && user?.id) {
        console.log('[Chat] 📝 User leaving room quickly, marking messages as read on exit');
        hasMarkedAsReadRef.current = true;
        // Mark as read immediately when leaving (no delay)
        markAllMessagesAsRead();
      }
    };
  }, [chatroomId, token, resetMessages]); // Added resetMessages dependency

  // Auto-mark messages as read when entering the chat room (immediate with debounce)
  useEffect(() => {
    if (!chatroomId || !token || !user?.id || hasMarkedAsReadRef.current) return;

    // Mark messages as read immediately when entering the room
    // Use a shorter delay just to ensure messages are loaded, but mark quickly
    const timeoutId = setTimeout(() => {
      hasMarkedAsReadRef.current = true;
      console.log('[Chat] 📝 User entered chat room, marking messages as read immediately');
      markAllMessagesAsRead();
    }, 300); // Reduced to 300ms for faster marking

    return () => {
      clearTimeout(timeoutId);
    };
  }, [chatroomId, token]); // Removed user?.id and markAllMessagesAsRead to prevent infinite loop

  // Manage unread indicator visibility based on messages and pagination state
  useEffect(() => {
    if (messages.length === 0) {
      setShowUnreadIndicator(false);
      return;
    }

    // Count unread messages from others
    const unreadMessages = messages.filter(msg =>
      msg.sender_id !== user?.id &&
      !msg.read_status?.find(status => status.user_id === user?.id && status.is_read)
    );

    const unreadCount = unreadMessages.length;
    const hasUnreadMessages = unreadCount > 0;

    // Hide indicator if:
    // 1. No unread messages exist
    // 2. Less than 6 unread messages
    // 3. All messages have been loaded (!hasMore) - meaning we've reached the beginning
    // 4. User has manually dismissed the indicator
    if (!hasUnreadMessages || unreadCount < 6 || !hasMore || unreadIndicatorDismissedRef.current) {
      console.log('[Chat] Hiding unread indicator:', {
        hasUnreadMessages,
        unreadCount,
        hasMore,
        dismissed: unreadIndicatorDismissedRef.current
      });
      setShowUnreadIndicator(false);
    } else {
      console.log('[Chat] Showing unread indicator:', { hasUnreadMessages, unreadCount, hasMore });
      setShowUnreadIndicator(true);
    }
  }, [messages, user?.id, hasMore]);



  // Send message function
  const sendMessage = async () => {
    if ((!messageText.trim() && !selectedMedia && !recordedAudio) || sending || isUploading) return;

    try {
      setSending(true);
      let mediaUrl: string | null = null;
      let messageType: MessageType = 'text';

      // Handle selected media (images, videos, etc.)
      if (selectedMedia) {
        setIsUploading(true);
        try {
          const uploadResult = await mediaAPI.uploadMedia({
            uri: selectedMedia.uri,
            type: selectedMedia.mimeType || 'image/jpeg',
            name: selectedMedia.name || 'media',
          }, selectedMedia.backendType || 'picture');
          mediaUrl = uploadResult.media_url;
          messageType = selectedMedia.backendType as MessageType || 'picture';
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          Alert.alert('Upload Failed', 'Could not upload media. Please try again.');
          return;
        } finally {
          setIsUploading(false);
        }
      }

      // Handle recorded audio
      if (recordedAudio) {
        setIsUploading(true);
        try {
          const uploadResult = await mediaAPI.uploadMedia({
            uri: recordedAudio.uri,
            type: 'audio/m4a',
            name: recordedAudio.name,
          }, 'audio');
          mediaUrl = uploadResult.media_url;
          messageType = 'audio';
        } catch (uploadError) {
          console.error('Audio upload error:', uploadError);
          Alert.alert('Upload Failed', 'Could not upload audio. Please try again.');
          return;
        } finally {
          setIsUploading(false);
        }
      }

      // Determine final message type
      if (messageText.trim() && mediaUrl) {
        if (recordedAudio) {
          messageType = 'text_and_audio';
        } else {
          messageType = `text_and_${selectedMedia?.backendType || 'picture'}` as MessageType;
        }
      } else if (mediaUrl) {
        if (recordedAudio) {
          messageType = 'audio';
        } else {
          messageType = selectedMedia?.backendType as MessageType || 'picture';
        }
      } else {
        messageType = 'text';
      }

      const messageData = {
        text_content: messageText.trim() || undefined,
        media_url: mediaUrl || undefined,
        message_type: messageType,
      };

      await chatAPI.sendMessage(chatroomId!, messageData);

      // Clear input
      setMessageText('');
      setSelectedMedia(null);
      clearRecording();

      // Scroll to top (newest message)
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);

    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Get user gradient for message styling
  const getUserGradient = (username: string) => {
    const colors = [
      ['#FFD700', '#FFA500'] as const,
      ['#DAA520', '#B8860B'] as const,
      ['#F4E4BC', '#D4AF37'] as const,
      ['#FFED4E', '#FFD700'] as const,
      ['#FFA500', '#FF8C00'] as const,
    ];
    const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Note: Static unread info is now handled by the usePaginatedMessages hook
  // The fixed unread divider position is calculated once when entering the room

  // Note: Unread message calculation is now handled by the usePaginatedMessages hook

  // Memoize read status calculations to prevent unnecessary recalculations
  const readStatusCache = useMemo(() => {
    const cache = new Map();

    messages.forEach(message => {
      // Only calculate for own messages
      if (message.sender_id !== user?.id) {
        cache.set(message.id, { icon: '', color: 'transparent', title: '' });
        return;
      }

      if (!message.read_status || message.read_status.length === 0) {
        cache.set(message.id, { icon: 'checkmark', color: '#888', title: 'Sent' });
        return;
      }

      const totalMembers = chatroom?.members?.length || 0;
      const readStatuses = message.read_status;
      const readCount = readStatuses.filter(status => status.is_read === true).length;

      // All members (except sender) have read the message
      if (readCount >= totalMembers - 1) { // -1 because sender doesn't count
        cache.set(message.id, {
          icon: 'checkmark-done',
          color: '#007AFF',
          title: 'Read by all'
        });
      } else {
        cache.set(message.id, {
          icon: 'checkmark-done',
          color: '#888',
          title: `Read by ${readCount} of ${totalMembers - 1}`
        });
      }
    });

    return cache;
  }, [messages, user?.id, chatroom?.members]);

  // Create combined data structure with messages and fixed unread divider
  const messagesWithDivider = useMemo(() => {
    if (!firstUnreadMessageId || unreadCount === 0) {
      // No unread messages, return original messages with proper structure
      return messages.map((msg, index) => ({
        type: 'message',
        data: msg,
        id: msg.id || `message_${index}` // Ensure every item has an ID
      }));
    }

    const result = [];
    let dividerInserted = false;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      // Add the message first
      result.push({
        type: 'message',
        data: message,
        id: message.id || `message_${i}` // Ensure every message has an ID
      });

      // Insert fixed divider AFTER the oldest unread message in array (appears ABOVE on inverted FlatList)
      if (!dividerInserted && message.id === firstUnreadMessageId) {
        result.push({
          type: 'fixed_unread_divider',
          data: { unreadCount },
          id: `fixed_unread_divider_${message.id || i}` // Ensure unique ID
        });
        dividerInserted = true;
      }
    }

    return result;
  }, [messages, firstUnreadMessageId, unreadCount]);

  // Auto-scroll to unread message divider when entering chat room
  useEffect(() => {
    // Only auto-scroll once when entering the room and if there are unread messages
    if (!firstUnreadMessageId || !messagesWithDivider.length || !flatListRef.current || hasAutoScrolledRef.current) {
      return;
    }

    // Find the index of the fixed unread divider in the messagesWithDivider array
    const dividerIndex = messagesWithDivider.findIndex(item =>
      item.type === 'fixed_unread_divider'
    );

    if (dividerIndex >= 0) {
      console.log('[Chat] 🎯 Auto-scrolling to unread message divider at index:', dividerIndex);

      // Mark that we've auto-scrolled to prevent multiple scrolls
      hasAutoScrolledRef.current = true;

      // Add a small delay to ensure the FlatList is fully rendered
      const scrollTimer = setTimeout(() => {
        try {
          // Check if the divider is already visible on screen before scrolling
          // For an inverted FlatList, check if the divider index is within the visible range
          // If it's already visible, don't scroll
          const isLikelyVisible = dividerIndex < 10; // Assume first 10 items are likely visible

          if (isLikelyVisible) {
            console.log('[Chat] ℹ️ Unread divider likely already visible, skipping auto-scroll');
            return;
          }

          flatListRef.current?.scrollToIndex({
            index: dividerIndex,
            animated: true,
            viewPosition: 0.5, // Center the divider on screen
          });
          console.log('[Chat] ✅ Auto-scrolled to unread message divider');
        } catch (error) {
          console.warn('[Chat] ⚠️ Failed to auto-scroll to unread divider:', error);
          // Fallback: scroll to the message before the divider
          if (dividerIndex > 0) {
            try {
              flatListRef.current?.scrollToIndex({
                index: dividerIndex - 1,
                animated: true,
                viewPosition: 0.3,
              });
            } catch (fallbackError) {
              console.warn('[Chat] ⚠️ Fallback scroll also failed:', fallbackError);
            }
          }
        }
      }, 500); // Wait 500ms for messages to be fully loaded and rendered

      return () => clearTimeout(scrollTimer);
    }
  }, [firstUnreadMessageId, messagesWithDivider.length]); // Only trigger when these change

  // Get read status for messages (now uses cache)
  const getReadStatus = useCallback((message: Message) => {
    return readStatusCache.get(message.id) || { icon: '', color: 'transparent', title: '' };
  }, [readStatusCache]);

  // Handle message long press
  const handleMessageLongPress = (message: Message) => {
    setSelectedMessage(message);
  };

  // Handle message info
  const handleMessageInfo = (message: Message) => {
    setMessageInfoData(message);
    setShowMessageInfo(true);
  };

  // Handle image click
  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  // Handle three dot menu press
  const handleThreeDotPress = () => {
    setShowChatroomActions(true);
  };

  // Handle scroll to unread message
  const handleScrollToUnread = (messageIndex: number) => {
    if (flatListRef.current && messageIndex >= 0) {
      flatListRef.current.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5, // Center the message
      });
      // Hide the indicator after scrolling and mark as dismissed
      unreadIndicatorDismissedRef.current = true;
      setShowUnreadIndicator(false);
    }
  };

  // Handle viewable items change to detect when user scrolls past unread messages
  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (!firstUnreadMessageId || !messagesWithDivider.length || unreadIndicatorDismissedRef.current) return;

    // Find the index of the fixed unread divider
    const dividerIndex = messagesWithDivider.findIndex(item =>
      item.type === 'fixed_unread_divider'
    );

    if (dividerIndex >= 0) {
      // Check if the unread divider is currently visible
      const dividerVisible = viewableItems.some((item: any) =>
        item.index === dividerIndex && item.isViewable
      );

      // Check if user has scrolled past the divider (divider is no longer visible and we're at higher indices)
      const hasScrolledPastDivider = viewableItems.some((item: any) =>
        item.index > dividerIndex && item.isViewable
      );

      if (hasScrolledPastDivider && !dividerVisible) {
        console.log('[Chat] 📍 User scrolled past unread divider, dismissing indicator');
        unreadIndicatorDismissedRef.current = true;
        setShowUnreadIndicator(false);
      }
    }
  }, [firstUnreadMessageId, messagesWithDivider]);

  // Viewable items config
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50, // Item is considered visible when 50% is visible
    minimumViewTime: 100, // Minimum time item must be visible
  }).current;

  // Render message item or unread divider
  const renderItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'unread_divider') {
      return <UnreadMessageDivider unreadCount={item.data.unreadCount} />;
    }

    if (item.type === 'fixed_unread_divider') {
      return <FixedUnreadDivider unreadCount={item.data.unreadCount} />;
    }

    // Regular message item
    const message = item.data as Message;
    const isOwnMessage = message.sender_id === user?.id;
    const userGradient = isOwnMessage ? null : getUserGradient(message.sender_name);

    return (
      <MessageItem
        item={message}
        isOwnMessage={isOwnMessage}
        userGradient={userGradient}
        onImageClick={handleImageClick}
        onLongPress={handleMessageLongPress}
        getReadStatus={getReadStatus}
      />
    );
  }, [user?.id, getUserGradient, handleImageClick, handleMessageLongPress, getReadStatus]);

  // Loading state
  if (loading) {
    return (
      <LinearGradient
        colors={[GoldTheme.background.primary, GoldTheme.background.secondary]}
        style={styles.loadingContainer}
      >
        <StatusBar barStyle="light-content" backgroundColor={GoldTheme.background.primary} />
        <ActivityIndicator size="large" color={GoldTheme.gold.primary} />
      </LinearGradient>
    );
  }

  // Error state - no chatroom ID
  if (!chatroomId) {
    return (
      <LinearGradient
        colors={[GoldTheme.background.primary, GoldTheme.background.secondary]}
        style={styles.loadingContainer}
      >
        <StatusBar barStyle="light-content" backgroundColor={GoldTheme.background.primary} />
        <GoldButton title="Go Back" onPress={() => router.back()} />
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={GoldTheme.background.primary} />

      {/* Header */}
      <ChatDetailHeader
        chatroom={chatroom}
        onThreeDotPress={handleThreeDotPress}
      />

      {/* Messages List */}
      <LinearGradient
        colors={[GoldTheme.background.primary, GoldTheme.background.secondary]}
        style={styles.messagesContainer}
      >
        <FlatList
          ref={flatListRef}
          data={messagesWithDivider}
          renderItem={renderItem}
          keyExtractor={(item, index) => {
            // Use stable key with type prefix to avoid duplicates
            if (item.type === 'message') {
              return `msg_${item.id || index}`;
            } else if (item.type === 'fixed_unread_divider') {
              return `fixed_divider_${item.id || index}`;
            } else if (item.type === 'unread_divider') {
              return `divider_${item.id || index}`;
            }
            return `item_${index}`;
          }}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          inverted
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onEndReachedThreshold={0.1}
          onEndReached={() => {
            // In an inverted FlatList, onEndReached fires when scrolling to the TOP (oldest messages)
            // This is where we want to load more older messages
            if (hasMore && !loadingMore) {
              console.log('[Chat] 📄 Loading more older messages...');
              loadMoreMessages();
            } else if (!hasMore) {
              // User reached the beginning of conversation, hide unread indicator
              console.log('[Chat] 📍 User reached beginning of conversation via onEndReached, hiding unread indicator');
              setShowUnreadIndicator(false);
            }
          }}
          onScrollToIndexFailed={(info) => {
            // Handle scroll index failed
            console.warn('Scroll to index failed:', info);
          }}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color={GoldTheme.gold.primary} />
                <Text style={styles.loadingText}>Loading older messages...</Text>
              </View>
            ) : !hasMore && messages.length > 0 ? (
              <View style={styles.endOfMessagesContainer}>
                <LinearGradient
                  colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 165, 0, 0.05)']}
                  style={styles.endOfMessagesBadge}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color={GoldTheme.gold.primary}
                    style={styles.endIcon}
                  />
                  <Text style={styles.endOfMessagesText}>
                    Beginning of conversation
                  </Text>
                </LinearGradient>
              </View>
            ) : null
          }
        />

        {/* Unread Message Indicator */}
        {user && messages.length > 0 && (
          <UnreadMessageIndicator
            messages={messages}
            currentUserId={user.id}
            onScrollToUnread={handleScrollToUnread}
            isVisible={showUnreadIndicator}
            hasMore={hasMore}
            isDismissed={unreadIndicatorDismissedRef.current}
          />
        )}
      </LinearGradient>

      {/* Message Input */}
      <MessageInput
        messageText={messageText}
        setMessageText={setMessageText}
        selectedMedia={selectedMedia}
        onPickMedia={handlePickMedia}
        onRemoveMedia={handleRemoveMedia}
        onSendMessage={sendMessage}
        sending={sending}
        pickingMedia={pickingMedia}
        isUploading={isUploading}
        recordedAudio={recordedAudio}
        onStartRecording={showRecorder}
        onRemoveAudio={clearRecording}
        isRecorderVisible={isRecorderVisible}
        onRecordingComplete={handleRecordingComplete}
        onRecordingCancel={handleRecordingCancel}
      />

      {/* Image Modal */}
      <ImageModal
        visible={!!selectedImage}
        imageUri={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      {/* Message Actions Modal */}
      {selectedMessage && user && (
        <MessageActions
          message={selectedMessage}
          isVisible={!!selectedMessage}
          onClose={() => setSelectedMessage(null)}
          onEdit={async (messageId: string, newText: string, newMediaUrl?: string, newMessageType?: string) => {
            // Handle message edit
            try {
              console.log('[Chat] Editing message:', messageId, newText, newMediaUrl, newMessageType);

              const updateData = {
                text_content: newText || undefined,
                media_url: newMediaUrl || undefined,
                message_type: newMessageType || 'text',
              };

              await chatAPI.updateMessage(chatroomId!, messageId, updateData);

              // Update local state optimistically using the hook
              updateMessage(messageId, {
                text_content: newText,
                media_url: newMediaUrl,
                message_type: newMessageType as any,
                edited: true,
              });

              console.log('[Chat] ✅ Message edited successfully');
              setSelectedMessage(null);
            } catch (error) {
              console.error('[Chat] ❌ Failed to edit message:', error);
              Alert.alert('Error', 'Failed to edit message. Please try again.');
            }
          }}
          onDelete={async (messageId: string) => {
            // Handle message delete
            try {
              console.log('[Chat] Deleting message:', messageId);

              await chatAPI.deleteMessage(chatroomId!, messageId);

              // Remove from local state optimistically using the hook
              removeMessage(messageId);

              console.log('[Chat] ✅ Message deleted successfully');
              setSelectedMessage(null);
            } catch (error) {
              console.error('[Chat] ❌ Failed to delete message:', error);
              Alert.alert('Error', 'Failed to delete message. Please try again.');
            }
          }}
          onInfo={() => handleMessageInfo(selectedMessage)}
          currentUserId={user.id}
        />
      )}

      {/* Message Info Modal */}
      {messageInfoData && (
        <MessageInfo
          message={messageInfoData}
          isVisible={showMessageInfo}
          onClose={() => {
            setShowMessageInfo(false);
            setMessageInfoData(null);
          }}
        />
      )}

      {/* Chatroom Actions */}
      {chatroom && user && (
        <ChatroomActions
          chatroom={chatroom}
          isVisible={showChatroomActions}
          onClose={() => setShowChatroomActions(false)}
          onDelete={async (chatroomId: string) => {
            try {
              console.log('[Chat] 🗑️ Deleting chatroom:', chatroomId);
              await chatAPI.deleteChatroom(chatroomId);
              console.log('[Chat] ✅ Chatroom deleted successfully');
              setShowChatroomActions(false);

              // Navigate back to chats list
              // The chats screen will automatically refresh due to useFocusEffect
              router.back();

            } catch (error: any) {
              console.error('[Chat] ❌ Failed to delete chatroom:', error);
              const errorMessage = error.response?.data?.error || error.message || 'Failed to delete chatroom';
              throw new Error(errorMessage);
            }
          }}
          currentUserId={user.id}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GoldTheme.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 8,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  loadingFooter: {
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingText: {
    color: GoldTheme.text.muted,
    fontSize: 14,
    marginLeft: 8,
  },
  endOfMessagesContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endOfMessagesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  endIcon: {
    marginRight: 8,
    opacity: 0.7,
  },
  endOfMessagesText: {
    color: GoldTheme.gold.primary,
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
});