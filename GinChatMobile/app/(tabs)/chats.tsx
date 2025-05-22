import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Text, Alert, Modal, View, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { chatAPI, Chatroom } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';

export default function ChatsScreen() {
  const { user } = useAuth();
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newChatroomName, setNewChatroomName] = useState('');
  const [chatroomIdToJoin, setChatroomIdToJoin] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

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

      // Navigate to the new chatroom
      if (response.chatroom && response.chatroom.id) {
        router.push(`/chat/${response.chatroom.id}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create chatroom');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinChatroom = async () => {
    if (!chatroomIdToJoin.trim()) {
      Alert.alert('Error', 'Please enter a chatroom ID');
      return;
    }

    try {
      setJoining(true);
      await chatAPI.joinChatroom(chatroomIdToJoin);
      setShowJoinModal(false);
      setShowActionModal(false);
      setChatroomIdToJoin('');
      fetchChatrooms();

      // Navigate to the joined chatroom
      router.push(`/chat/${chatroomIdToJoin}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join chatroom');
    } finally {
      setJoining(false);
    }
  };

  const handleChatroomPress = (chatroom: Chatroom) => {
    router.push(`/chat/${chatroom.id}`);
  };

  // Function to fetch the most recent message for a chatroom
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

  // Update chatrooms with last messages
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

  const renderChatroomItem = ({ item }: { item: Chatroom }) => {
    // Generate a random pastel color based on the chatroom name
    const getColorFromName = (name: string) => {
      const hue = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
      return `hsl(${hue}, 70%, 80%)`;
    };

    const avatarColor = getColorFromName(item.name);
    const lastMessage = item.last_message
      ? item.last_message.content
      : 'No messages yet';
    const lastMessageTime = item.last_message
      ? new Date(item.last_message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      : '';

    return (
      <TouchableOpacity
        style={styles.chatroomItem}
        onPress={() => handleChatroomPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.chatroomAvatar, { backgroundColor: avatarColor }]}>
          <ThemedText style={styles.chatroomAvatarText}>
            {item.name.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.chatroomInfo}>
          <View style={styles.chatroomHeader}>
            <ThemedText style={styles.chatroomName}>{item.name}</ThemedText>
            {lastMessageTime && (
              <ThemedText style={styles.timeText}>{lastMessageTime}</ThemedText>
            )}
          </View>
          <View style={styles.chatroomFooter}>
            <ThemedText style={styles.lastMessageText} numberOfLines={1} ellipsizeMode="tail">
              {lastMessage}
            </ThemedText>
            <View style={styles.memberBadge}>
              <ThemedText style={styles.memberBadgeText}>
                {item.members.length} {item.members.length === 1 ? 'member' : 'members'}
              </ThemedText>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={fetchChatrooms}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={chatrooms}
          keyExtractor={(item) => item.id}
          renderItem={renderChatroomItem}
          contentContainerStyle={styles.chatroomList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>No chatrooms found</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Create a new chatroom to get started
              </ThemedText>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowActionModal(true)}
      >
        <Ionicons name="add" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Action Selection Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Chat Options</ThemedText>
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setShowActionModal(false);
                  setShowCreateModal(true);
                }}
              >
                <Ionicons name="add-circle" size={40} color={Colors.primary} style={styles.actionIcon} />
                <ThemedText style={styles.actionText}>Create New Chat</ThemedText>
                <ThemedText style={styles.actionSubtext}>Start a new conversation</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setShowActionModal(false);
                  setShowJoinModal(true);
                }}
              >
                <Ionicons name="enter" size={40} color={Colors.secondary} style={styles.actionIcon} />
                <ThemedText style={styles.actionText}>Join Existing Chat</ThemedText>
                <ThemedText style={styles.actionSubtext}>Enter a chat ID to join</ThemedText>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { marginTop: 20 }]}
              onPress={() => setShowActionModal(false)}
            >
              <ThemedText style={styles.buttonText}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Chatroom Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Create New Chatroom</ThemedText>
            <TextInput
              style={styles.input}
              value={newChatroomName}
              onChangeText={setNewChatroomName}
              placeholder="Enter chatroom name"
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewChatroomName('');
                }}
              >
                <ThemedText style={styles.buttonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.createModalButton,
                  !newChatroomName.trim() && styles.disabledButton,
                ]}
                onPress={handleCreateChatroom}
                disabled={!newChatroomName.trim() || creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <ThemedText style={styles.buttonText}>Create</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join Chatroom Modal */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Join Existing Chatroom</ThemedText>
            <TextInput
              style={styles.input}
              value={chatroomIdToJoin}
              onChangeText={setChatroomIdToJoin}
              placeholder="Enter chatroom ID"
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowJoinModal(false);
                  setChatroomIdToJoin('');
                }}
              >
                <ThemedText style={styles.buttonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.createModalButton,
                  !chatroomIdToJoin.trim() && styles.disabledButton,
                ]}
                onPress={handleJoinChatroom}
                disabled={!chatroomIdToJoin.trim() || joining}
              >
                {joining ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <ThemedText style={styles.buttonText}>Join</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  chatroomList: {
    padding: 16,
  },
  chatroomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chatroomAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chatroomAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  chatroomInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  chatroomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chatroomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  chatroomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  memberBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatroomMembers: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  createButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    // Add a subtle gradient effect with a border
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: Colors.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 24,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  createModalButton: {
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#FFF',
  },
  actionButtonsContainer: {
    width: '100%',
    marginVertical: 16,
  },
  actionButton: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    marginRight: 16,
  },
  actionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  actionSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
