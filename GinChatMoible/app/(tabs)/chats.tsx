import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Text, Alert, Modal, View, TextInput, StatusBar, RefreshControl, Clipboard, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { chatAPI, chatroomAPI, Chatroom } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSimpleWebSocket, WebSocketMessage } from '@/contexts/SimpleWebSocketContext';
import { GoldButton } from '../../src/components/GoldButton';
import { GoldInput } from '../../src/components/GoldInput';
import { GoldTheme } from '../../constants/GoldTheme';

export default function ChatsScreen() {
  const { user, logout } = useAuth();
  const { connectToSidebar, disconnectFromRoom, addMessageHandler, removeMessageHandler, isConnected, currentRoomId } = useSimpleWebSocket();
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);
  const [availableChatrooms, setAvailableChatrooms] = useState<Chatroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newChatroomName, setNewChatroomName] = useState('');
  const [newChatroomPassword, setNewChatroomPassword] = useState('');
  const [chatroomIdToJoin, setChatroomIdToJoin] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdChatroom, setCreatedChatroom] = useState<Chatroom | null>(null);
  const [navigating, setNavigating] = useState(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  // WebSocket message handler for sidebar updates
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log('[ChatsScreen] Received WebSocket message:', message.type);
    console.log('[ChatsScreen] Message data:', JSON.stringify(message.data));

    // IMPORTANT: Filter events based on current room context
    if (message.type === 'message_read') {
      if (currentRoomId && currentRoomId !== 'global_sidebar') {
        console.log('[ChatsScreen] 🚫 Ignoring message_read event while in chat room to prevent conflicts');
        return;
      } else {
        console.log('[ChatsScreen] 🚫 Ignoring message_read event in sidebar to prevent unwanted updates');
        return;
      }
    }

    // Always process unread_count_update events regardless of current room
    // This ensures unread badges update correctly even when in chat rooms
    if (message.type === 'unread_count_update') {
      console.log('[ChatsScreen] ✅ Processing unread_count_update event (always allowed)');
    }

    switch (message.type) {
      case 'new_message':
        console.log('[ChatsScreen] New message received, updating last message');
        // Update the last message for the specific chatroom and re-sort
        if (message.chatroom_id) {
          setChatrooms(prevChatrooms => {
            const updatedChatrooms = prevChatrooms.map(chatroom => {
              if (chatroom.id === message.chatroom_id) {
                return {
                  ...chatroom,
                  last_message: {
                    content: message.data.text_content || 'New message',
                    timestamp: message.data.sent_at || new Date().toISOString(),
                    sender_id: message.data.sender_id,
                    sender_name: message.data.sender_name || 'Unknown'
                  }
                };
              }
              return chatroom;
            });

            // Note: For real-time updates, we still need to re-sort since WebSocket
            // updates don't come from the optimized backend endpoint
            return updatedChatrooms.sort((a, b) => {
              const aTime = a.last_message?.timestamp ? new Date(a.last_message.timestamp).getTime() : 0;
              const bTime = b.last_message?.timestamp ? new Date(b.last_message.timestamp).getTime() : 0;
              return bTime - aTime; // Descending order (newest first)
            });
          });
        }
        break;

      case 'message_updated':
        console.log('[ChatsScreen] Message updated, refreshing chatrooms');
        fetchChatrooms(); // Use debounced version for automatic updates
        break;

      case 'message_deleted':
        console.log('[ChatsScreen] Message deleted, refreshing chatrooms');
        fetchChatrooms(); // Use debounced version for automatic updates
        break;

      case 'unread_count_update':
        console.log('[ChatsScreen] Unread count update received:', message.data);
        // Update chatrooms with new unread counts in real-time
        if (Array.isArray(message.data)) {
          console.log('[ChatsScreen] Processing unread count updates for', message.data.length, 'chatrooms');
          setChatrooms(prevChatrooms => {
            const updatedChatrooms = prevChatrooms.map(chatroom => {
              const updateData = message.data.find((item: any) => item.chatroom_id === chatroom.id);
              if (updateData) {
                const oldCount = chatroom.unread_count || 0;
                const newCount = updateData.unread_count || 0;
                console.log(`[ChatsScreen] Updating unread count for ${chatroom.name}: ${oldCount} → ${newCount}`);
                return {
                  ...chatroom,
                  unread_count: newCount
                };
              }
              return chatroom;
            });
            console.log('[ChatsScreen] Updated chatrooms with unread counts');
            return updatedChatrooms;
          });
        } else {
          console.warn('[ChatsScreen] Unread count update data is not an array:', message.data);
        }
        break;

      default:
        console.log('[ChatsScreen] Unhandled message type:', message.type);
    }
  }, [currentRoomId]);

  // Connect to sidebar WebSocket when component mounts
  useEffect(() => {
    console.log('[ChatsScreen] Component mounted, setting up sidebar WebSocket');
    console.log('[ChatsScreen] Current connection state - isConnected:', isConnected, 'currentRoomId:', currentRoomId);

    // Only connect if not already connected to sidebar
    if (currentRoomId !== 'global_sidebar') {
      console.log('[ChatsScreen] 🔌 Connecting to sidebar');
      addMessageHandler(handleWebSocketMessage);
      connectToSidebar();
    } else {
      console.log('[ChatsScreen] Already connected to sidebar, just adding handler');
      addMessageHandler(handleWebSocketMessage);
    }

    return () => {
      console.log('[ChatsScreen] 🔌 Component unmounting, removing message handler');
      removeMessageHandler(handleWebSocketMessage);
    };
  }, []);

  // Keep sidebar handler active but filter events based on current room
  // This ensures we always receive unread_count_update events
  useEffect(() => {
    if (currentRoomId && currentRoomId !== 'global_sidebar') {
      console.log('[ChatsScreen] 🔌 Chat room active, sidebar handler will filter events');
      // Keep handler active but it will filter out message_read events
    } else if (currentRoomId === 'global_sidebar') {
      console.log('[ChatsScreen] 🔌 Back to sidebar, handler will process all relevant events');
      // Handler processes all events normally
    }
  }, [currentRoomId]);

  useEffect(() => {
    fetchChatrooms(true); // Immediate load on mount
  }, []);

  // Refresh chatrooms when screen comes into focus (e.g., after deleting a chatroom)
  useFocusEffect(
    useCallback(() => {
      console.log('[ChatsScreen] Screen focused, refreshing chatrooms');
      fetchChatrooms(true); // Immediate refresh when screen comes into focus
    }, [])
  );

  // Cleanup navigation timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Note: Sorting is now handled by backend for better performance
  // Frontend sorting has been removed in favor of optimized database sorting

  // Debounced version of fetchChatrooms to prevent excessive API calls
  const debouncedFetchChatrooms = useRef<NodeJS.Timeout | null>(null);

  const fetchChatrooms = useCallback(async (immediate = false) => {
    // Clear existing timeout
    if (debouncedFetchChatrooms.current) {
      clearTimeout(debouncedFetchChatrooms.current);
    }

    const doFetch = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await chatAPI.getConversations();

        // Debug: Log unread counts from API
        if (response.chatrooms) {
          response.chatrooms.forEach(chatroom => {
            if (chatroom.unread_count && chatroom.unread_count > 0) {
              console.log(`[ChatsScreen] API returned unread count for ${chatroom.name}: ${chatroom.unread_count}`);
            }
          });
        }

        // Chatrooms are already sorted by backend - no frontend sorting needed
        console.log('[ChatsScreen] Received pre-sorted chatrooms from backend');
        setChatrooms(response.chatrooms || []);

      } catch (err) {
        console.error('Error fetching chatrooms:', err);
        setError('Failed to load chatrooms');
      } finally {
        setLoading(false);
      }
    };

    if (immediate) {
      // Execute immediately for initial load or user-triggered refresh
      await doFetch();
    } else {
      // Debounce for automatic refreshes
      debouncedFetchChatrooms.current = setTimeout(doFetch, 1000); // 1 second debounce
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChatrooms(true); // Immediate refresh for user-triggered action
    setRefreshing(false);
  };

  const handleCreateChatroom = async () => {
    if (!newChatroomName.trim()) {
      Alert.alert('Error', 'Please enter a chatroom name');
      return;
    }

    try {
      setCreating(true);
      const response = await chatAPI.createConversation(
        newChatroomName.trim(),
        newChatroomPassword.trim() || undefined
      );

      // Close create modal
      setShowCreateModal(false);
      setShowActionModal(false);

      // Store created chatroom for success modal
      setCreatedChatroom(response.chatroom);

      // Clear form
      setNewChatroomName('');
      setNewChatroomPassword('');

      // Refresh chatrooms list
      fetchChatrooms(true); // Immediate refresh after creating chatroom

      // Show success modal with room code
      setShowSuccessModal(true);

    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create chatroom');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinChatroom = async () => {
    if (!roomCode.trim()) {
      Alert.alert('Error', 'Please enter a room code');
      return;
    }

    try {
      setJoining(true);
      setError(null);
      
      // Try to join with the room code
      const response = await chatroomAPI.joinChatroomByCode(roomCode.toUpperCase(), roomPassword);
      
      // If successful, close modal and navigate
      setShowJoinModal(false);
      setRoomCode('');
      setRoomPassword('');
      setShowPasswordInput(false);
      fetchChatrooms(true); // Refresh chatrooms list
      
      // Navigate to the joined chatroom
      router.push(`/chat/${response.chatroom.id}`);
    } catch (err: any) {
      if (err.response?.data?.error === 'Incorrect password') {
        // Show password input if room needs password
        setShowPasswordInput(true);
        setError('This room is password protected. Please enter the password.');
      } else if (err.response?.data?.error === 'Room not found') {
        setError('Room not found. Please check the room code.');
      } else {
        setError(err.response?.data?.error || 'Failed to join room');
      }
    } finally {
      setJoining(false);
    }
  };

  const fetchAvailableChatrooms = async () => {
    try {
      setLoadingAvailable(true);

      // Get user's current chatrooms (use cached data if available to reduce API calls)
      const myChatsResponse = chatrooms.length > 0 ? { chatrooms } : await chatAPI.getConversations();
      const userChatroomIds = new Set((myChatsResponse.chatrooms || []).map(chat => chat.id));

      // Get all available chatrooms
      const allChatsResponse = await chatAPI.getAllAvailableChatrooms();

      // Filter out chatrooms the user has already joined
      const availableChats = (allChatsResponse.chatrooms || []).filter(
        chat => !userChatroomIds.has(chat.id)
      );

      setAvailableChatrooms(availableChats);
    } catch (error) {
      console.error('Error fetching available chatrooms:', error);
      Alert.alert('Error', 'Failed to load available chatrooms');
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleChatroomPress = async (chatroom: Chatroom) => {
    // Prevent multiple rapid taps
    if (navigating) {
      console.log('[ChatsScreen] Navigation already in progress, ignoring tap');
      return;
    }

    try {
      setNavigating(true);
      console.log('[ChatsScreen] 🚀 Navigating to chatroom:', chatroom.id);

      // Clear any existing navigation timeout
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }

      // First check if the chatroom still exists before navigating
      await chatAPI.getConversationById(chatroom.id);

      // Navigate to the chat room
      router.push(`/chat/${chatroom.id}`);

      // Reset navigation state after a delay to prevent rapid navigation
      navigationTimeoutRef.current = setTimeout(() => {
        setNavigating(false);
      }, 2000); // 2 second cooldown

    } catch (error: any) {
      setNavigating(false); // Reset immediately on error

      if (error.response?.status === 404) {
        console.log('[ChatsScreen] Chatroom no longer exists, refreshing list');
        Alert.alert(
          'Chatroom Not Found',
          'This chatroom no longer exists. It may have been deleted.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Remove the deleted chatroom from the list immediately
                setChatrooms(prevChatrooms =>
                  prevChatrooms.filter(c => c.id !== chatroom.id)
                );
                // Also refresh the full list
                fetchChatrooms(true); // Immediate refresh after error handling
              }
            }
          ]
        );
      } else {
        console.error('[ChatsScreen] Error accessing chatroom:', error);
        Alert.alert('Error', 'Failed to access chatroom. Please try again.');
      }
    }
  };

  // Note: fetchLastMessage and updateChatroomsWithLastMessages have been removed
  // Backend now provides latest messages directly in the sorted chatrooms response
  // This eliminates N+1 query problem and improves performance significantly

  const getGoldGradient = (name: string) => {
    // More consistent gold-themed gradients
    const colors = [
      ['#FFD700', '#DAA520'], // Classic gold
      ['#FFA500', '#FF8C00'], // Orange gold
      ['#F4E4BC', '#D4AF37'], // Light gold
      ['#FFED4E', '#FFB347'], // Bright gold
      ['#B8860B', '#8B7355'], // Dark gold
      ['#FFE135', '#FFC649'], // Yellow gold
      ['#D4AF37', '#B8860B'], // Medium gold
      ['#FFBF00', '#FF9500'], // Amber gold
    ];

    // Use a more stable hash function for consistency
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

      if (diffInMinutes < 1) return 'now';
      if (diffInMinutes < 60) return `${diffInMinutes}m`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
      return String(date.toLocaleDateString());
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'now';
    }
  };

  const renderChatroomItem = ({ item }: { item: Chatroom }) => {
    const gradientColors = getGoldGradient(item.name);

    // Format last message with username
    const formatLastMessage = () => {
      if (!item.last_message?.content) {
        return 'Start the conversation...';
      }

      const content = String(item.last_message.content);
      const senderName = item.last_message.sender_name || 'Unknown';
      const isOwn = item.last_message.sender_id === user?.id;

      if (isOwn) {
        return `You: ${content}`;
      } else {
        return `${senderName}: ${content}`;
      }
    };

    const lastMessage = formatLastMessage();
    const lastMessageTime = item.last_message?.timestamp
      ? formatTime(item.last_message.timestamp)
      : '';

    const isOwn = item.last_message?.sender_id === user?.id;

    // Debug logging for unread count
    if (item.unread_count && item.unread_count > 0) {
      console.log(`[ChatsScreen] Rendering ${item.name} with unread_count:`, item.unread_count, typeof item.unread_count);
    }

    return (
      <TouchableOpacity
        style={[styles.chatroomItem, navigating && styles.chatroomItemDisabled]}
        onPress={() => handleChatroomPress(item)}
        activeOpacity={navigating ? 1 : 0.8}
        disabled={navigating}
      >
        <LinearGradient
          colors={[GoldTheme.background.card, 'rgba(42, 42, 42, 0.95)']}
          style={styles.chatroomBackground}
        >
          <LinearGradient
            colors={gradientColors as any}
            style={styles.chatroomAvatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.chatroomAvatarText}>
              {String(item.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>

          <View style={styles.chatroomInfo}>
            <View style={styles.chatroomHeader}>
              <Text style={styles.chatroomName}>{String(item.name || 'Unknown')}</Text>
              <View style={styles.timeContainer}>
                {lastMessageTime && (
                  <Text style={styles.timeText}>{String(lastMessageTime)}</Text>
                )}
                {/* Unread count badge */}
                {(item.unread_count && typeof item.unread_count === 'number' && item.unread_count > 0) ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {item.unread_count > 99 ? '99+' : `${item.unread_count}`}
                    </Text>
                  </View>
                ) : null}
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={GoldTheme.gold.primary}
                />
              </View>
            </View>

            <View style={styles.chatroomContent}>
              <Text style={styles.lastMessageText} numberOfLines={1} ellipsizeMode="tail">
                {String(lastMessage)}
              </Text>

              <View style={styles.memberBadge}>
                <Ionicons
                  name="people"
                  size={12}
                  color={GoldTheme.gold.primary}
                />
                <Text style={styles.memberBadgeText}>
                  {String(item.members?.length || 0)}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={[GoldTheme.background.primary, GoldTheme.background.secondary]}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View style={styles.titleSection}>
              <LinearGradient
                colors={GoldTheme.gradients.goldShimmer}
                style={styles.headerLogo}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.headerLogoText}>G</Text>
              </LinearGradient>

              <View style={styles.titleContainer}>
                <LinearGradient
                  colors={['rgba(255, 215, 0, 0.1)', 'transparent']}
                  style={styles.titleGlow}
                />
                <Text style={styles.headerTitle}>GinChat</Text>
                <Text style={styles.headerSubtitle}>
                  Welcome back, {user?.name || 'User'}
                </Text>
                <View style={styles.statusBadge}>
                  <View style={[styles.statusDot, { backgroundColor: isConnected ? GoldTheme.status.success : GoldTheme.status.warning }]} />
                  <Text style={styles.statusText}>
                    {isConnected ? 'Live Updates Active' : 'Connecting...'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => {
                  console.log('=== LOGOUT BUTTON PRESSED ===');
                  console.log('[ChatsScreen] User pressed logout button at:', new Date().toISOString());
                  console.log('[ChatsScreen] Current user:', user);
                  console.log('[ChatsScreen] Calling logout function directly...');
                  logout();
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255, 59, 48, 0.9)', 'rgba(255, 59, 48, 0.7)']}
                  style={styles.logoutButtonGradient}
                >
                  <Ionicons name="log-out-outline" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowActionModal(true)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={GoldTheme.gradients.goldButton}
                  style={styles.addButtonGradient}
                >
                  <Ionicons name="add" size={24} color={GoldTheme.text.inverse} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Enhanced decorative elements */}
          <View style={styles.headerDecorations}>
            <View style={styles.decorativeLine} />
            <View style={styles.centerDiamond}>
              <LinearGradient
                colors={GoldTheme.gradients.goldButton}
                style={styles.diamondGradient}
              >
                <Ionicons name="diamond" size={12} color={GoldTheme.text.inverse} />
              </LinearGradient>
            </View>
            <View style={styles.decorativeLine} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={['rgba(255, 215, 0, 0.1)', 'transparent']}
        style={styles.emptyGlow}
      />
      <Ionicons name="chatbubbles-outline" size={80} color={GoldTheme.gold.primary} />
      <Text style={styles.emptyTitle}>No Conversations Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create or join a chat room to start your premium messaging experience
      </Text>
      <GoldButton
        title="Get Started"
        onPress={() => setShowActionModal(true)}
        style={styles.emptyButton}
      />
    </View>
  );

  const renderFooter = () => {
    if (chatrooms.length === 0) return null;

    return (
      <View style={styles.footer}>
        <LinearGradient
          colors={[GoldTheme.background.secondary, GoldTheme.background.primary]}
          style={styles.footerGradient}
        >
          {/* Decorative elements */}
          <View style={styles.footerDecorations}>
            <View style={styles.decorativeLine} />
            <View style={styles.centerDiamond}>
              <LinearGradient
                colors={GoldTheme.gradients.goldButton}
                style={styles.diamondGradient}
              >
                <Ionicons name="diamond" size={12} color={GoldTheme.text.inverse} />
              </LinearGradient>
            </View>
            <View style={styles.decorativeLine} />
          </View>

          {/* App Info */}
          <View style={styles.footerContent}>
            <LinearGradient
              colors={GoldTheme.gradients.goldShimmer}
              style={styles.footerLogo}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.footerLogoText}>G</Text>
            </LinearGradient>

            <View style={styles.footerInfo}>
              <Text style={styles.footerTitle}>GinChat</Text>
              <Text style={styles.footerSubtitle}>Premium Messaging Experience</Text>
              <View style={styles.footerBadge}>
                <Ionicons name="shield-checkmark" size={12} color={GoldTheme.gold.primary} />
                <Text style={styles.footerBadgeText}>Secure • Encrypted • Fast</Text>
              </View>
            </View>
          </View>

          {/* Version Info */}
          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>Version 1.0.0 • Built with ❤️</Text>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[GoldTheme.background.primary, GoldTheme.background.secondary]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={GoldTheme.background.primary} />

      {renderHeader()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GoldTheme.gold.primary} />
          <Text style={styles.loadingText}>Loading your conversations...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={GoldTheme.status.error} />
          <Text style={styles.errorText}>{error}</Text>
          <GoldButton
            title="Try Again"
            onPress={fetchChatrooms}
            variant="outline"
            style={styles.retryButton}
          />
        </View>
      ) : (
        <FlatList
          data={chatrooms}
          renderItem={renderChatroomItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[GoldTheme.gold.primary]}
              tintColor={GoldTheme.gold.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
        />
      )}

      {/* Action Selection Modal */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[GoldTheme.background.card, GoldTheme.background.secondary]}
              style={styles.modalGradient}
            >
              <Text style={styles.modalTitle}>Choose Action</Text>

              <View style={styles.modalButtons}>
                <GoldButton
                  title="Create New Room"
                  onPress={() => {
                    setShowActionModal(false);
                    setShowCreateModal(true);
                  }}
                  style={styles.modalButton}
                />

                <GoldButton
                  title="Join Existing Room"
                  onPress={() => {
                    setShowActionModal(false);
                    setShowJoinModal(true);
                    fetchAvailableChatrooms();
                  }}
                  variant="outline"
                  style={styles.modalButton}
                />

                <GoldButton
                  title="Cancel"
                  onPress={() => setShowActionModal(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Create Chatroom Modal */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[GoldTheme.background.card, GoldTheme.background.secondary]}
              style={styles.modalGradient}
            >
              <Text style={styles.modalTitle}>Create Chat Room</Text>

              <GoldInput
                label="Room Name"
                placeholder="Enter a name for your room"
                value={newChatroomName}
                onChangeText={setNewChatroomName}
                icon={<Ionicons name="chatbubble-outline" size={20} color={GoldTheme.gold.primary} />}
                containerStyle={styles.inputContainer}
              />

              <GoldInput
                label="Password (Optional)"
                placeholder="Enter a password to protect your room"
                value={newChatroomPassword}
                onChangeText={setNewChatroomPassword}
                secureTextEntry={true}
                icon={<Ionicons name="lock-closed-outline" size={20} color={GoldTheme.gold.primary} />}
                containerStyle={styles.inputContainer}
              />

              <Text style={styles.passwordHint}>
                💡 Leave password empty for a public room that anyone can join
              </Text>

              <View style={styles.modalButtons}>
                <GoldButton
                  title={creating ? "Creating..." : "Create Room"}
                  onPress={handleCreateChatroom}
                  disabled={creating}
                  style={styles.modalButton}
                />

                <GoldButton
                  title="Cancel"
                  onPress={() => {
                    setShowCreateModal(false);
                    setNewChatroomName('');
                    setNewChatroomPassword('');
                  }}
                  variant="outline"
                  style={styles.modalButton}
                />
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Join Chatroom Modal */}
      <Modal
        visible={showJoinModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowJoinModal(false);
          setRoomCode('');
          setRoomPassword('');
          setShowPasswordInput(false);
          setError(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.joinModalContainer]}>
            <LinearGradient
              colors={[GoldTheme.background.card, GoldTheme.background.secondary]}
              style={styles.modalGradient}
            >
              <Text style={styles.modalTitle}>
                {showPasswordInput ? 'Enter Room Password' : 'Join Chat Room'}
              </Text>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {!showPasswordInput ? (
                // Step 1: Enter room code
                <View style={styles.inputContainer}>
                  <GoldInput
                    label="Room Code"
                    placeholder="Enter 6-character room code"
                    value={roomCode}
                    onChangeText={(text) => setRoomCode(text.toUpperCase())}
                    maxLength={6}
                    autoCapitalize="characters"
                    icon={<Ionicons name="key-outline" size={20} color={GoldTheme.gold.primary} />}
                  />
                  <Text style={styles.inputHint}>
                    Enter the 6-character code to join a chat room
                  </Text>
                  <GoldInput
                    label="Password (Optional)"
                    placeholder="Enter room password if required"
                    value={roomPassword}
                    onChangeText={setRoomPassword}
                    secureTextEntry={true}
                    icon={<Ionicons name="lock-closed-outline" size={20} color={GoldTheme.gold.primary} />}
                  />
                  <Text style={styles.inputHint}>
                    Leave empty if the room has no password
                  </Text>
                </View>
              ) : (
                // Step 2: Enter password (only shown if first attempt fails)
                <View style={styles.inputContainer}>
                  <View style={styles.roomCodeDisplay}>
                    <Text style={styles.roomCodeLabel}>Room Code:</Text>
                    <Text style={styles.roomCodeValue}>{roomCode}</Text>
                  </View>
                  <GoldInput
                    label="Password"
                    placeholder="Enter room password"
                    value={roomPassword}
                    onChangeText={setRoomPassword}
                    secureTextEntry={true}
                    icon={<Ionicons name="lock-closed-outline" size={20} color={GoldTheme.gold.primary} />}
                  />
                </View>
              )}

              <View style={styles.modalButtons}>
                <GoldButton
                  title={joining ? "Joining..." : (showPasswordInput ? "Join Room" : "Join Room")}
                  onPress={handleJoinChatroom}
                  disabled={joining || (!showPasswordInput && roomCode.length !== 6)}
                  style={styles.modalButton}
                />

                {showPasswordInput && (
                  <GoldButton
                    title="Back"
                    onPress={() => {
                      setShowPasswordInput(false);
                      setRoomPassword('');
                      setError(null);
                    }}
                    variant="outline"
                    style={styles.modalButton}
                  />
                )}

                <GoldButton
                  title="Cancel"
                  onPress={() => {
                    setShowJoinModal(false);
                    setRoomCode('');
                    setRoomPassword('');
                    setShowPasswordInput(false);
                    setError(null);
                  }}
                  variant="secondary"
                  style={styles.modalButton}
                />
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContainer}>
            <LinearGradient
              colors={[GoldTheme.background.card, GoldTheme.background.secondary]}
              style={styles.successModalGradient}
            >
              {/* Success Icon */}
              <View style={styles.successIconContainer}>
                <LinearGradient
                  colors={GoldTheme.gradients.goldButton}
                  style={styles.successIconGradient}
                >
                  <Ionicons name="checkmark" size={32} color={GoldTheme.text.inverse} />
                </LinearGradient>
              </View>

              <Text style={styles.successTitle}>Room Created Successfully!</Text>
              <Text style={styles.successSubtitle}>
                Your chat room "{createdChatroom?.name}" has been created
              </Text>

              {/* Room Code Display */}
              <View style={styles.roomCodeContainer}>
                <Text style={styles.roomCodeLabel}>Room Code:</Text>
                <View style={styles.roomCodeBox}>
                  <Text style={styles.roomCodeText}>
                    {createdChatroom?.room_code || 'N/A'}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => {
                      if (createdChatroom?.room_code) {
                        Clipboard.setString(createdChatroom.room_code);
                        Alert.alert('Copied!', 'Room code copied to clipboard.');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="copy" size={18} color="#fff" />
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.roomCodeDescription}>
                  Share this code with others so they can join your room
                </Text>
              </View>

              {/* Password Status */}
              {newChatroomPassword ? (
                <View style={styles.passwordStatusContainer}>
                  <Ionicons name="lock-closed" size={16} color={GoldTheme.status.success} />
                  <Text style={styles.passwordStatusText}>
                    Room is password protected
                  </Text>
                </View>
              ) : (
                <View style={styles.passwordStatusContainer}>
                  <Ionicons name="globe" size={16} color={GoldTheme.gold.primary} />
                  <Text style={styles.passwordStatusText}>
                    Room is public - anyone can join
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.successModalButtons}>
                <GoldButton
                  title="Enter Room"
                  onPress={() => {
                    setShowSuccessModal(false);
                    if (createdChatroom?.id) {
                      router.push(`/chat/${createdChatroom.id}`);
                    }
                  }}
                  style={styles.successModalButton}
                />
                <GoldButton
                  title="Stay Here"
                  onPress={() => {
                    setShowSuccessModal(false);
                    setCreatedChatroom(null);
                  }}
                  variant="outline"
                  style={styles.successModalButton}
                />
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    elevation: 8,
    shadowColor: GoldTheme.gold.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerGradient: {
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...GoldTheme.shadow.gold,
  },
  headerLogoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: GoldTheme.text.inverse,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: GoldTheme.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: GoldTheme.text.secondary,
    opacity: 0.8,
  },
  titleContainer: {
    flex: 1,
    position: 'relative',
  },
  titleGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    borderRadius: 30,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GoldTheme.gold.primary,
    marginRight: 6,
    ...GoldTheme.shadow.gold,
  },
  statusText: {
    fontSize: 12,
    color: GoldTheme.gold.primary,
    fontWeight: '600',
  },
  headerDecorations: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  decorativeLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  centerDiamond: {
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  diamondGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoutButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  logoutButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButton: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...GoldTheme.shadow.gold,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  chatroomItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    ...GoldTheme.shadow.dark,
  },
  chatroomBackground: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  chatroomAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...GoldTheme.shadow.gold,
  },
  chatroomAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: GoldTheme.text.inverse,
  },
  chatroomInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatroomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatroomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: GoldTheme.text.primary,
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: GoldTheme.text.muted,
    marginRight: 4,
  },
  unreadBadge: {
    backgroundColor: GoldTheme.status.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  chatroomContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageText: {
    fontSize: 14,
    color: GoldTheme.text.secondary,
    flex: 1,
    marginRight: 8,
    opacity: 0.8,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  memberBadgeText: {
    fontSize: 12,
    color: GoldTheme.gold.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: GoldTheme.text.secondary,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    position: 'relative',
  },
  emptyGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    height: 200,
    borderRadius: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: GoldTheme.text.primary,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: GoldTheme.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    opacity: 0.8,
  },
  emptyButton: {
    minWidth: 200,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: GoldTheme.background.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: GoldTheme.background.card,
    borderRadius: 20,
    overflow: 'hidden',
    ...GoldTheme.shadow.gold,
    paddingVertical: 8,
    alignSelf: 'center',
  },
  modalGradient: {
    padding: 24,
    alignItems: 'stretch',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: GoldTheme.text.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    gap: 16,
    marginTop: 24,
    alignItems: 'stretch',
  },
  modalButton: {
    marginBottom: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
  footerGradient: {
    padding: 24,
    paddingBottom: 32,
  },
  footerDecorations: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...GoldTheme.shadow.gold,
  },
  footerLogoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: GoldTheme.text.inverse,
  },
  footerInfo: {
    flex: 1,
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: GoldTheme.text.primary,
    marginBottom: 4,
  },
  footerSubtitle: {
    fontSize: 12,
    color: GoldTheme.text.secondary,
    marginBottom: 8,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    alignSelf: 'flex-start',
  },
  footerBadgeText: {
    fontSize: 10,
    color: GoldTheme.gold.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  versionInfo: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.1)',
  },
  versionText: {
    fontSize: 11,
    color: GoldTheme.text.muted,
    opacity: 0.8,
  },
  inputContainer: {
    marginBottom: 20,
    width: '100%',
  },
  // Join modal styles
  joinModalContainer: {
    width: '95%',
    maxWidth: 500,
    height: '80%',
    backgroundColor: GoldTheme.background.card,
  },
  loadingAvailableContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingAvailableText: {
    fontSize: 16,
    color: GoldTheme.text.secondary,
    marginTop: 16,
    textAlign: 'center',
  },
  availableChatroomsList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  availableChatroomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
    minHeight: 80,
  },
  availableChatroomAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...GoldTheme.shadow.gold,
  },
  availableChatroomAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: GoldTheme.text.inverse,
  },
  availableChatroomInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  availableChatroomName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: GoldTheme.text.primary,
    marginBottom: 6,
  },
  availableChatroomDetails: {
    flexDirection: 'column',
    gap: 4,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberInfoText: {
    fontSize: 12,
    color: GoldTheme.gold.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  createdInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createdInfoText: {
    fontSize: 12,
    color: GoldTheme.text.muted,
    marginLeft: 4,
  },
  joinButton: {
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  joinButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
    minWidth: 80,
    minHeight: 44,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: GoldTheme.text.inverse,
  },
  noAvailableChatrooms: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAvailableChatroomsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: GoldTheme.text.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noAvailableChatroomsSubtext: {
    fontSize: 14,
    color: GoldTheme.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  // Password hint style
  passwordHint: {
    fontSize: 12,
    color: GoldTheme.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  // Success modal styles
  successModalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: GoldTheme.background.card,
    borderRadius: 20,
    overflow: 'hidden',
    ...GoldTheme.shadow.dark,
  },
  successModalGradient: {
    padding: 24,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 16,
    borderRadius: 40,
    overflow: 'hidden',
  },
  successIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...GoldTheme.shadow.gold,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: GoldTheme.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: GoldTheme.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  roomCodeContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  roomCodeLabel: {
    fontSize: 14,
    color: GoldTheme.text.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  roomCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    minWidth: 200,
  },
  roomCodeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: GoldTheme.text.primary,
    flex: 1,
    textAlign: 'center',
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GoldTheme.gold.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  roomCodeDescription: {
    fontSize: 12,
    color: GoldTheme.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  passwordStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 20,
  },
  passwordStatusText: {
    fontSize: 12,
    color: GoldTheme.text.secondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  successModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  successModalButton: {
    flex: 1,
  },
  // Navigation disabled state
  chatroomItemDisabled: {
    opacity: 0.6,
  },
  inputHint: {
    fontSize: 12,
    color: GoldTheme.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  roomCodeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  roomCodeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: GoldTheme.gold.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
