import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GoldTheme } from '../../../constants/GoldTheme';
import { Message, chatAPI } from '../../services/api';

interface ReadStatus {
  user_id: number;
  username: string;
  is_read: boolean;
  read_at?: string;
}

interface MessageInfoProps {
  message: Message;
  isVisible: boolean;
  onClose: () => void;
}

export function MessageInfo({ message, isVisible, onClose }: MessageInfoProps) {
  const [readStatusData, setReadStatusData] = useState<ReadStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load read status when modal opens
  useEffect(() => {
    if (isVisible && message.id) {
      loadReadStatus();
    }
  }, [isVisible, message.id]);

  const loadReadStatus = async () => {
    try {
      setIsLoading(true);
      console.log('[MessageInfo] Loading read status for message:', message.id);
      
      // Use the read_status from the message if available
      if (message.read_status && Array.isArray(message.read_status)) {
        setReadStatusData(message.read_status);
        console.log('[MessageInfo] Using cached read status:', message.read_status);
      } else {
        console.log('[MessageInfo] No read status available');
        setReadStatusData([]);
      }
    } catch (error) {
      console.error('[MessageInfo] Failed to load read status:', error);
      setReadStatusData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return dateString;
    }
  };

  const getMessageTypeDisplay = (type: string) => {
    switch (type) {
      case 'text': return 'Text';
      case 'picture': return 'Image';
      case 'audio': return 'Audio';
      case 'video': return 'Video';
      case 'text_and_picture': return 'Text & Image';
      case 'text_and_audio': return 'Text & Audio';
      case 'text_and_video': return 'Text & Video';
      default: return type;
    }
  };

  const readUsers = readStatusData.filter(status => status.is_read);
  const unreadUsers = readStatusData.filter(status => !status.is_read);

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Message Info</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={GoldTheme.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Message Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Message Details</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>{getMessageTypeDisplay(message.message_type)}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sent:</Text>
                <Text style={styles.detailValue}>{formatDate(message.sent_at)}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sender:</Text>
                <Text style={styles.detailValue}>{message.sender_name}</Text>
              </View>
              
              {message.edited && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[styles.detailValue, styles.editedText]}>Edited</Text>
                </View>
              )}
              
              {message.text_content && (
                <View style={styles.messagePreview}>
                  <Text style={styles.detailLabel}>Content:</Text>
                  <Text style={styles.messageText}>{message.text_content}</Text>
                </View>
              )}
            </View>

            {/* Read Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Read Status</Text>
              
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={GoldTheme.gold.primary} />
                  <Text style={styles.loadingText}>Loading read status...</Text>
                </View>
              ) : (
                <>
                  {/* Read by */}
                  {readUsers.length > 0 && (
                    <View style={styles.statusGroup}>
                      <View style={styles.statusHeader}>
                        <Ionicons name="checkmark-done" size={16} color={GoldTheme.status.success} />
                        <Text style={styles.statusTitle}>Read by {readUsers.length}</Text>
                      </View>
                      {readUsers.map((user, index) => (
                        <View key={index} style={styles.userRow}>
                          <Text style={styles.username}>{user.username}</Text>
                          {user.read_at && (
                            <Text style={styles.readTime}>{formatDate(user.read_at)}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Unread by */}
                  {unreadUsers.length > 0 && (
                    <View style={styles.statusGroup}>
                      <View style={styles.statusHeader}>
                        <Ionicons name="time-outline" size={16} color={GoldTheme.text.muted} />
                        <Text style={styles.statusTitle}>Unread by {unreadUsers.length}</Text>
                      </View>
                      {unreadUsers.map((user, index) => (
                        <View key={index} style={styles.userRow}>
                          <Text style={styles.username}>{user.username}</Text>
                          <Text style={styles.unreadText}>Not read</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {readStatusData.length === 0 && (
                    <View style={styles.noDataContainer}>
                      <Ionicons name="information-circle-outline" size={24} color={GoldTheme.text.muted} />
                      <Text style={styles.noDataText}>No read status information available</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GoldTheme.text.primary,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GoldTheme.gold.primary,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.1)',
  },
  detailLabel: {
    fontSize: 14,
    color: GoldTheme.text.secondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: GoldTheme.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  editedText: {
    color: GoldTheme.gold.primary,
    fontStyle: 'italic',
  },
  messagePreview: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: GoldTheme.gold.primary,
  },
  messageText: {
    fontSize: 14,
    color: GoldTheme.text.primary,
    marginTop: 4,
    lineHeight: 20,
  },
  statusGroup: {
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GoldTheme.text.primary,
    marginLeft: 8,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 6,
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: GoldTheme.text.primary,
    fontWeight: '500',
  },
  readTime: {
    fontSize: 12,
    color: GoldTheme.text.secondary,
  },
  unreadText: {
    fontSize: 12,
    color: GoldTheme.text.muted,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: GoldTheme.text.secondary,
    marginLeft: 8,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDataText: {
    fontSize: 14,
    color: GoldTheme.text.muted,
    marginTop: 8,
    textAlign: 'center',
  },
});
