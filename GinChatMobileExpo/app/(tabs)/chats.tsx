import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Text, Alert, Modal, View, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { chatAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';

// Define conversation type
interface Conversation {
  id: string;  // MongoDB ObjectID as string
  name: string;
  created_by: number;  // uint in backend
  created_at: string;
  members: {
    user_id: number;  // uint in backend
    username: string;
    joined_at: string;
  }[];
  last_message?: {
    content: string;
    timestamp: string;
    sender_id: number;
  };
}

export default function ChatScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [availableChatrooms, setAvailableChatrooms] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'create' | 'join'>('create');
  const [joiningChatroom, setJoiningChatroom] = useState(false);
  const [currentJoiningId, setCurrentJoiningId] = useState<string>('');
  const [newChatroomName, setNewChatroomName] = useState('');
  const [creatingChatroom, setCreatingChatroom] = useState(false);
  const [createError, setCreateError] = useState('');
  const { user } = useAuth();

  // Debug info: Show the user object
  console.log('Current user:', user);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    if (!user) {
      console.log('User not yet available, skipping fetchConversations');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // User ID is now a number from AuthContext
      const currentUserId = user.id;
      console.log('Current user ID:', currentUserId);
      
      if (!currentUserId) {
        throw new Error('Invalid user ID');
      }

      console.log('Fetching conversations from API for user:', currentUserId);
      const responseData = await chatAPI.getConversations();
      console.log('Conversations API response:', responseData);

      let chatroomsToProcess: Conversation[] = [];

      if (responseData && responseData.chatrooms) {
        chatroomsToProcess = responseData.chatrooms as Conversation[];
      } else if (Array.isArray(responseData)) {
        chatroomsToProcess = responseData as Conversation[];
      } else {
        console.warn('Unexpected API response structure:', responseData);
        setConversations([]);
        setAvailableChatrooms([]);
        setLoading(false);
        return;
      }

      // Helper function to parse user ID consistently
      const parseUserId = (id: string | number): number => {
        return typeof id === 'string' ? parseInt(id, 10) : id;
      };

      // Filter chatrooms based on user membership using the helper function
      const userChatrooms = chatroomsToProcess.filter(chatroom => 
        chatroom.members?.some(member => {
          const memberId = parseUserId(member.user_id);
          console.log(`Comparing member ID ${memberId} with user ID ${currentUserId}`);
          return memberId === currentUserId;
        })
      );

      const otherChatrooms = chatroomsToProcess.filter(chatroom => 
        !chatroom.members?.some(member => {
          const memberId = parseUserId(member.user_id);
          return memberId === currentUserId;
        })
      );

      console.log('User chatrooms:', userChatrooms.map(c => ({ id: c.id, name: c.name })));
      console.log('Available chatrooms:', otherChatrooms.map(c => ({ id: c.id, name: c.name })));

      setConversations(userChatrooms);
      setAvailableChatrooms(otherChatrooms);
    } catch (err: unknown) {
      console.error('Error fetching conversations:', err);
      const error = err as Error;
      setError(error.message || 'Failed to load conversations');
      setConversations([]);
      setAvailableChatrooms([]);
    } finally {
      setLoading(false);
    }
  };

  // Refresh conversations when user changes or after joining a chatroom
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const getOtherMembers = (conversation: Conversation) => {
    if (!conversation.members) return [];
    return conversation.members.filter(member => member.user_id !== user?.id);
  };

  const getChatroomName = (conversation: Conversation) => {
    // Handle undefined conversation
    if (!conversation) {
      return 'New Chat';
    }

    // If there's a name property, use it
    if (conversation.name) {
      return conversation.name;
    }
    
    // Use members if available
    const otherMembers = getOtherMembers(conversation);
    if (otherMembers.length > 0) {
      return otherMembers.map(member => member.username).join(', ');
    }
    
    // Fallback with ID if available, otherwise return default name
    return conversation.id ? `Chat ${conversation.id}` : 'New Chat';
  };

  const handleJoinChatroom = async (chatroom: Conversation) => {
    try {
      setJoiningChatroom(true);
      setCurrentJoiningId(chatroom.id.toString());
      console.log('Joining chatroom:', chatroom.id);
      
      await chatAPI.joinChatroom(chatroom.id.toString());
      console.log('Successfully joined chatroom:', chatroom.name);
      
      await fetchConversations();
      setShowModal(false);
      
      router.push({
        pathname: '/chat/[id]',
        params: { id: chatroom.id }
      });
    } catch (err) {
      console.error('Error joining chatroom:', err);
      Alert.alert('Error', 'Failed to join chatroom. Please try again.');
    } finally {
      setJoiningChatroom(false);
      setCurrentJoiningId('');
    }
  };

  const handleCreateChatroom = async () => {
    if (!newChatroomName.trim() || creatingChatroom) return;

    try {
      setCreatingChatroom(true);
      setCreateError('');
      
      const newChatroom = await chatAPI.createConversation([], newChatroomName.trim());
      await fetchConversations();
      setShowModal(false);
      setNewChatroomName('');
      
      router.push({
        pathname: '/chat/[id]',
        params: { id: newChatroom.id }
      });
    } catch (err: any) {
      console.error('Error creating chatroom:', err);
      setCreateError(err.message || 'Failed to create chatroom. Please try again.');
    } finally {
      setCreatingChatroom(false);
    }
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const otherMembers = getOtherMembers(item);
    const lastMessage = item.last_message;
    const lastMessageTime = lastMessage?.timestamp ? new Date(lastMessage.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    }) : '';

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => router.push({
          pathname: '/chat/[id]',
          params: { id: item.id }
        })}
      >
        <View style={styles.conversationContent}>
          <ThemedText style={styles.conversationName}>
            {getChatroomName(item)}
          </ThemedText>
          {lastMessage && (
            <ThemedText style={styles.lastMessage} numberOfLines={1}>
              {lastMessage.content}
            </ThemedText>
          )}
          <ThemedText style={styles.memberCount}>
            {item.members.length} members
          </ThemedText>
        </View>
        {lastMessageTime && (
          <ThemedText style={styles.timestamp}>
            {lastMessageTime}
          </ThemedText>
        )}
      </TouchableOpacity>
    );
  };

  const renderAvailableChatroomItem = ({ item }: { item: Conversation }) => {
    const isJoiningThis = joiningChatroom && currentJoiningId === item.id.toString();
    
    return (
      <ThemedView style={styles.availableChatroomItem}>
        <ThemedView style={styles.availableChatroomDetails}>
          <ThemedText style={styles.conversationName}>
            {item.name || `Chatroom ${item.id}`}
          </ThemedText>
          <ThemedText style={styles.memberCount}>
            {item.members?.length || 0} members
          </ThemedText>
        </ThemedView>
        
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => handleJoinChatroom(item)}
          disabled={joiningChatroom}
        >
          {isJoiningThis ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.joinButtonText}>Join</ThemedText>
          )}
        </TouchableOpacity>
      </ThemedView>
    );
  };

  const renderCreateTab = () => (
    <ThemedView style={styles.createTabContainer}>
      {createError ? (
        <ThemedText style={styles.errorText}>{createError}</ThemedText>
      ) : null}

      <ThemedText style={styles.inputLabel}>Chatroom Name</ThemedText>
      <TextInput
        style={styles.input}
        value={newChatroomName}
        onChangeText={setNewChatroomName}
        placeholder="Enter chatroom name"
        placeholderTextColor="#9E9E9E"
      />

      <TouchableOpacity 
        style={[
          styles.createChatroomButton, 
          (!newChatroomName.trim() || creatingChatroom) && styles.createChatroomButtonDisabled
        ]} 
        onPress={handleCreateChatroom}
        disabled={!newChatroomName.trim() || creatingChatroom}
      >
        {creatingChatroom ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.createChatroomButtonText}>Create Chatroom</ThemedText>
        )}
      </TouchableOpacity>
    </ThemedView>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {error ? (
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Error: {error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={fetchConversations}>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      ) : null}

      {conversations.length === 0 ? (
        <ThemedView style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={Colors.primary} />
          <ThemedText style={styles.emptyTitle}>No Conversations Yet</ThemedText>
          <ThemedText style={styles.emptyText}>
            Create a new chatroom or join an existing one to start chatting
          </ThemedText>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => {
              setModalTab('create');
              setShowModal(true);
            }}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <ThemedText style={styles.createButtonText}>Get Started</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedView style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {modalTab === 'create' ? 'Create Chatroom' : 'Join Chatroom'}
              </ThemedText>
              <TouchableOpacity onPress={() => {
                setShowModal(false);
                setNewChatroomName('');
                setCreateError('');
              }}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </ThemedView>

            <ThemedView style={styles.modalTabs}>
              <TouchableOpacity 
                style={[styles.modalTab, modalTab === 'create' && styles.modalTabActive]}
                onPress={() => setModalTab('create')}
              >
                <ThemedText style={[styles.modalTabText, modalTab === 'create' && styles.modalTabTextActive]}>
                  Create
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalTab, modalTab === 'join' && styles.modalTabActive]}
                onPress={() => setModalTab('join')}
              >
                <ThemedText style={[styles.modalTabText, modalTab === 'join' && styles.modalTabTextActive]}>
                  Join
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>

            {modalTab === 'create' ? renderCreateTab() : (
              <FlatList
                data={availableChatrooms}
                renderItem={renderAvailableChatroomItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.availableChatroomsList}
                ListEmptyComponent={
                  <ThemedView style={styles.emptyAvailableChatrooms}>
                    <ThemedText style={styles.emptyText}>
                      No available chatrooms to join
                    </ThemedText>
                  </ThemedView>
                }
              />
            )}
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
    marginBottom: 8,
  },
  errorText: {
    color: '#c62828',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#c62828',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    elevation: 2,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  conversationContent: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  memberCount: {
    fontSize: 14,
    color: '#666',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.25)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '50%',
    maxHeight: '90%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalTabs: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 4,
  },
  modalTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  modalTabActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  modalTabText: {
    fontSize: 16,
    color: '#666',
  },
  modalTabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  availableChatroomsList: {
    paddingTop: 8,
  },
  availableChatroomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  availableChatroomDetails: {
    flex: 1,
  },
  joinButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyAvailableChatrooms: {
    padding: 32,
    alignItems: 'center',
  },
  createTabContainer: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: Colors.text.primary,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  createChatroomButton: {
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createChatroomButtonDisabled: {
    backgroundColor: Colors.gray[400],
  },
  createChatroomButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
}); 