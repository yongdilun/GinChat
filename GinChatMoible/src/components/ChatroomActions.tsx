import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GoldTheme } from '../../constants/GoldTheme';
import { Chatroom } from '../services/api';

interface ChatroomActionsProps {
  chatroom: Chatroom;
  isVisible: boolean;
  onClose: () => void;
  onDelete: (chatroomId: string) => Promise<void>;
  currentUserId: number;
}

export function ChatroomActions({
  chatroom,
  isVisible,
  onClose,
  onDelete,
  currentUserId,
}: ChatroomActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showRoomCodeModal, setShowRoomCodeModal] = useState(false);

  // Only show delete option for chatroom creator
  const canDelete = chatroom.created_by === currentUserId;

  const handleDelete = () => {
    Alert.alert(
      'Delete Chatroom',
      `Are you sure you want to delete "${chatroom.name}"?\n\nThis will permanently delete:\n• The entire chatroom\n• All messages and media\n• All member data\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await onDelete(chatroom.id);
              onClose();
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.message || 'Failed to delete chatroom. Please try again.'
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleViewMembers = () => {
    setShowMembersModal(true);
  };

  const handleCopyRoomCode = () => {
    if (chatroom.room_code) {
      try {
        Clipboard.setString(chatroom.room_code);
        Alert.alert(
          'Copied!',
          `Room code "${chatroom.room_code}" has been copied to clipboard.`,
          [{ text: 'OK' }]
        );
      } catch (error) {
        console.error('Failed to copy room code:', error);
        Alert.alert('Error', 'Failed to copy room code to clipboard.');
      }
    } else {
      setShowRoomCodeModal(true);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.actionsContainer}>
          <LinearGradient
            colors={[GoldTheme.background.card, GoldTheme.background.secondary]}
            style={styles.actionsGradient}
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{chatroom.name}</Text>
              <Text style={styles.headerSubtitle}>Chatroom Options</Text>
            </View>

            <View style={styles.actionSeparator} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleViewMembers}
            >
              <Ionicons name="people-outline" size={20} color={GoldTheme.gold.primary} />
              <Text style={styles.actionText}>
                View Members ({chatroom.members.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleCopyRoomCode}
            >
              <Ionicons name="copy-outline" size={20} color={GoldTheme.gold.primary} />
              <Text style={styles.actionText}>Room Code</Text>
            </TouchableOpacity>

            {canDelete && (
              <>
                <View style={styles.actionSeparator} />
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={GoldTheme.status.error} />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color={GoldTheme.status.error} />
                  )}
                  <Text style={[styles.actionText, { color: GoldTheme.status.error }]}>
                    Delete Chatroom
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.actionSeparator} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={onClose}
            >
              <Ionicons name="close-outline" size={20} color={GoldTheme.text.muted} />
              <Text style={[styles.actionText, { color: GoldTheme.text.muted }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </TouchableOpacity>

      {/* Members Modal */}
      <Modal
        visible={showMembersModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMembersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chatroom Members</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowMembersModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={GoldTheme.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.memberCount}>
                {chatroom.members.length} member{chatroom.members.length !== 1 ? 's' : ''}
              </Text>

              {chatroom.members.map((member, index) => (
                <View key={index} style={styles.memberItem}>
                  <View style={styles.memberAvatar}>
                    <Ionicons name="person" size={20} color={GoldTheme.gold.primary} />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.username}</Text>
                    {member.user_id === chatroom.created_by && (
                      <Text style={styles.memberRole}>Creator</Text>
                    )}
                  </View>
                  {member.user_id === currentUserId && (
                    <Text style={styles.youLabel}>You</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Room Code Modal */}
      <Modal
        visible={showRoomCodeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRoomCodeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Room Code</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowRoomCodeModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={GoldTheme.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.roomCodeContainer}>
                <Text style={styles.roomCodeLabel}>Share this code to invite others:</Text>
                <View style={styles.roomCodeBox}>
                  <Text style={styles.roomCodeText}>
                    {chatroom.room_code || 'No room code available'}
                  </Text>
                  {chatroom.room_code && (
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => {
                        try {
                          Clipboard.setString(chatroom.room_code);
                          Alert.alert('Copied!', 'Room code copied to clipboard.');
                          setShowRoomCodeModal(false);
                        } catch (error) {
                          Alert.alert('Error', 'Failed to copy room code.');
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="copy" size={20} color="#fff" />
                      <Text style={styles.copyButtonText}>Copy</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.roomCodeDescription}>
                  Others can join this chatroom by searching for this code in the "Join Chat" section.
                </Text>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsContainer: {
    minWidth: 280,
    maxWidth: 320,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    margin: 20,
  },
  actionsGradient: {
    padding: 8,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTitle: {
    color: GoldTheme.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: GoldTheme.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionText: {
    color: GoldTheme.text.primary,
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
    flex: 1,
  },
  actionSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    marginHorizontal: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: GoldTheme.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GoldTheme.text.primary,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  // Members modal styles
  memberCount: {
    fontSize: 14,
    color: GoldTheme.text.secondary,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: GoldTheme.text.primary,
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    color: GoldTheme.gold.primary,
    fontWeight: '600',
  },
  youLabel: {
    fontSize: 12,
    color: GoldTheme.text.secondary,
    fontStyle: 'italic',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
  },
  // Room code modal styles
  roomCodeContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  roomCodeLabel: {
    fontSize: 16,
    color: GoldTheme.text.primary,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  roomCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  roomCodeDescription: {
    fontSize: 14,
    color: GoldTheme.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
