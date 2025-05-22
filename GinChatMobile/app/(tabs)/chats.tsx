import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Text, Alert, Modal, View, TextInput, StatusBar, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { chatAPI, Chatroom } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { GoldButton } from '../../src/components/GoldButton';
import { GoldInput } from '../../src/components/GoldInput';
import { GoldTheme } from '../../constants/GoldTheme';

export default function ChatsScreen() {
  const { user, logout } = useAuth();
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);
  const [availableChatrooms, setAvailableChatrooms] = useState<Chatroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newChatroomName, setNewChatroomName] = useState('');
  const [chatroomIdToJoin, setChatroomIdToJoin] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  useEffect(() => {
    fetchChatrooms();
  }, []);

  const fetchChatrooms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await chatAPI.getConversations();
      setChatrooms(response.chatrooms || []);
      
    } catch (err) {
      console.error('Error fetching chatrooms:', err);
      setError('Failed to load chatrooms');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChatrooms();
    setRefreshing(false);
  };

  const handleCreateChatroom = async () => {
    if (!newChatroomName.trim()) {
      Alert.alert('Error', 'Please enter a chatroom name');
      return;
    }

    try {
      setCreating(true);
      const response = await chatAPI.createConversation(newChatroomName);
      setShowCreateModal(false);
      setShowActionModal(false);
      setNewChatroomName('');
      fetchChatrooms();

      if (response.chatroom && response.chatroom.id) {
        router.push(`/chat/${response.chatroom.id}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create chatroom');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinChatroom = async (chatroomId?: string) => {
    const idToJoin = chatroomId || chatroomIdToJoin.trim();
    
    if (!idToJoin) {
      Alert.alert('Error', 'Please select a chatroom to join');
      return;
    }

    try {
      setJoining(true);
      await chatAPI.joinChatroom(idToJoin);
      setShowJoinModal(false);
      setShowActionModal(false);
      setChatroomIdToJoin('');
      fetchChatrooms();
      router.push(`/chat/${idToJoin}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join chatroom');
    } finally {
      setJoining(false);
    }
  };

  const fetchAvailableChatrooms = async () => {
    try {
      setLoadingAvailable(true);
      
      // Get user's current chatrooms
      const myChatsResponse = await chatAPI.getConversations();
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

  const handleChatroomPress = (chatroom: Chatroom) => {
    router.push(`/chat/${chatroom.id}`);
  };

  const fetchLastMessage = async (chatroomId: string) => {
    try {
      const response = await chatAPI.getMessages(chatroomId, 1, 1);
      if (response.messages && response.messages.length > 0) {
        const message = response.messages[0];
        return {
          content: message.text_content || (message.media_url ? `[${message.message_type.replace('_', ' ')}]` : 'Empty message'),
          timestamp: message.sent_at,
          sender_id: message.sender_id,
          sender_name: message.sender_name
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching last message:', error);
      return null;
    }
  };

  useEffect(() => {
    const updateChatroomsWithLastMessages = async () => {
      if (chatrooms.length === 0) return;

      const updatedChatrooms = [...chatrooms];
      let hasUpdates = false;

      for (let i = 0; i < updatedChatrooms.length; i++) {
        if (!updatedChatrooms[i].last_message) {
          const lastMessage = await fetchLastMessage(updatedChatrooms[i].id);
          if (lastMessage) {
            updatedChatrooms[i] = {
              ...updatedChatrooms[i],
              last_message: lastMessage
            };
            hasUpdates = true;
          }
        }
      }

      if (hasUpdates) {
        setChatrooms(updatedChatrooms);
      }
    };

    updateChatroomsWithLastMessages();
  }, [chatrooms]);

  const getGoldGradient = (name: string) => {
    const colors = [
      ['#FFD700', '#FFA500'],
      ['#DAA520', '#B8860B'],
      ['#F4E4BC', '#D4AF37'],
      ['#FFED4E', '#FFD700'],
      ['#FFA500', '#FF8C00'],
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString();
  };

  const renderChatroomItem = ({ item }: { item: Chatroom }) => {
    const gradientColors = getGoldGradient(item.name);
    const lastMessage = item.last_message
      ? item.last_message.content
      : 'Start the conversation...';
    const lastMessageTime = item.last_message
      ? formatTime(item.last_message.timestamp)
      : '';

    const isOwn = item.last_message?.sender_id === user?.id;

    return (
      <TouchableOpacity
        style={styles.chatroomItem}
        onPress={() => handleChatroomPress(item)}
        activeOpacity={0.8}
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
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          
          <View style={styles.chatroomInfo}>
            <View style={styles.chatroomHeader}>
              <Text style={styles.chatroomName}>{item.name}</Text>
              <View style={styles.timeContainer}>
                {lastMessageTime && (
                  <Text style={styles.timeText}>{lastMessageTime}</Text>
                )}
                <Ionicons 
                  name="chevron-forward" 
                  size={16} 
                  color={GoldTheme.gold.primary} 
                />
              </View>
            </View>
            
            <View style={styles.chatroomContent}>
              <Text style={styles.lastMessageText} numberOfLines={1} ellipsizeMode="tail">
                {isOwn && '◾ '}
                {lastMessage}
              </Text>
              
              <View style={styles.memberBadge}>
                <Ionicons 
                  name="people" 
                  size={12} 
                  color={GoldTheme.gold.primary} 
                />
                <Text style={styles.memberBadgeText}>
                  {item.members.length}
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
                <Text style={styles.headerTitle}>GinChat Elite</Text>
                <Text style={styles.headerSubtitle}>
                  Welcome back, {user?.name}
                </Text>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Premium Messaging</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => {
                  Alert.alert(
                    'Logout',
                    'Are you sure you want to logout?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Logout', 
                        style: 'destructive',
                        onPress: logout
                      }
                    ]
                  );
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
              <Text style={styles.footerTitle}>GinChat Elite</Text>
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
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.joinModalContainer]}>
            <LinearGradient
              colors={[GoldTheme.background.card, GoldTheme.background.secondary]}
              style={styles.modalGradient}
            >
              <Text style={styles.modalTitle}>Available Chat Rooms</Text>
              
              {loadingAvailable ? (
                <View style={styles.loadingAvailableContainer}>
                  <ActivityIndicator size="large" color={GoldTheme.gold.primary} />
                  <Text style={styles.loadingAvailableText}>Loading available rooms...</Text>
                </View>
              ) : (
                <>
                  {availableChatrooms.length > 0 ? (
                    <FlatList
                      data={availableChatrooms}
                      keyExtractor={(item) => item.id}
                      style={styles.availableChatroomsList}
                      renderItem={({ item }) => (
                        <View style={styles.availableChatroomItem}>
                          <LinearGradient
                            colors={getGoldGradient(item.name) as any}
                            style={styles.availableChatroomAvatar}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Text style={styles.availableChatroomAvatarText}>
                              {item.name.charAt(0).toUpperCase()}
                            </Text>
                          </LinearGradient>
                          
                          <View style={styles.availableChatroomInfo}>
                            <Text style={styles.availableChatroomName}>{item.name}</Text>
                            <View style={styles.availableChatroomDetails}>
                              <View style={styles.memberInfo}>
                                <Ionicons name="people" size={14} color={GoldTheme.gold.primary} />
                                <Text style={styles.memberInfoText}>
                                  {item.members.length} {item.members.length === 1 ? 'member' : 'members'}
                                </Text>
                              </View>
                              <View style={styles.createdInfo}>
                                <Ionicons name="calendar" size={14} color={GoldTheme.text.muted} />
                                <Text style={styles.createdInfoText}>
                                  Created {new Date(item.created_at).toLocaleDateString()}
                                </Text>
                              </View>
                            </View>
                          </View>
                          
                          <TouchableOpacity
                            style={styles.joinButton}
                            onPress={() => handleJoinChatroom(item.id)}
                            disabled={joining}
                            activeOpacity={0.8}
                          >
                            <LinearGradient
                              colors={joining ? ['#888', '#666'] : GoldTheme.gradients.goldButton}
                              style={styles.joinButtonGradient}
                            >
                              {joining ? (
                                <ActivityIndicator size="small" color={GoldTheme.text.inverse} />
                              ) : (
                                <>
                                  <Ionicons name="add" size={16} color={GoldTheme.text.inverse} />
                                  <Text style={styles.joinButtonText}>Join</Text>
                                </>
                              )}
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                  ) : (
                    <View style={styles.noAvailableChatrooms}>
                      <Ionicons name="globe-outline" size={48} color={GoldTheme.text.muted} />
                      <Text style={styles.noAvailableChatroomsText}>No available rooms to join</Text>
                      <Text style={styles.noAvailableChatroomsSubtext}>
                        All public rooms have been joined or no rooms are available
                      </Text>
                    </View>
                  )}
                </>
              )}
              
              <View style={styles.modalButtons}>
                <GoldButton
                  title="Cancel"
                  onPress={() => {
                    setShowJoinModal(false);
                    setAvailableChatrooms([]);
                  }}
                  variant="outline"
                  style={styles.modalButton}
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: GoldTheme.status.error,
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 24,
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
    borderRadius: 20,
    overflow: 'hidden',
    ...GoldTheme.shadow.gold,
  },
  modalGradient: {
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: GoldTheme.text.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    gap: 12,
  },
  modalButton: {
    marginBottom: 0,
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
    marginBottom: 24,
  },
  // Join modal styles
  joinModalContainer: {
    width: '95%',
    maxWidth: 500,
    height: '80%',
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
  },
  availableChatroomName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: GoldTheme.text.primary,
    marginBottom: 6,
  },
  availableChatroomDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
    marginLeft: 16,
  },
  joinButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
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
});
