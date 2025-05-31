import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GoldTheme } from '../../constants/GoldTheme';
import { GoldButton } from './GoldButton';
import { Message, chatAPI, mediaAPI } from '../services/api';
import { MediaSelector } from './chat/MediaSelector';
import { SelectedMediaType } from '../hooks/useMediaPicker';

interface MessageActionsProps {
  message: Message;
  isVisible: boolean;
  onClose: () => void;
  onEdit: (messageId: string, newText: string, newMediaUrl?: string, newMessageType?: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onInfo: () => void;
  currentUserId: number;
}

export function MessageActions({
  message,
  isVisible,
  onClose,
  onEdit,
  onDelete,
  onInfo,
  currentUserId,
}: MessageActionsProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editText, setEditText] = useState(message.text_content || '');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMediaType | null>(null);
  const [editMessageType, setEditMessageType] = useState(message.message_type || 'text');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize with existing media when edit modal opens
  useEffect(() => {
    if (showEditModal && message.media_url) {
      // Create a media object from existing message media
      const existingMedia: SelectedMediaType = {
        uri: message.media_url,
        type: message.message_type.includes('video') ? 'video' :
              message.message_type.includes('audio') ? 'audio' : 'image',
        mimeType: message.message_type.includes('video') ? 'video/mp4' :
                  message.message_type.includes('audio') ? 'audio/mpeg' : 'image/jpeg',
        name: `existing_${message.message_type}.${
          message.message_type.includes('video') ? 'mp4' :
          message.message_type.includes('audio') ? 'mp3' : 'jpg'
        }`,
        backendType: message.message_type.includes('video') ? 'video' :
                     message.message_type.includes('audio') ? 'audio' : 'picture',
      };
      setSelectedMedia(existingMedia);
    } else if (showEditModal && !message.media_url) {
      // No existing media
      setSelectedMedia(null);
    }
  }, [showEditModal, message.media_url, message.message_type]);

  // Only show actions for user's own messages
  const canModify = message.sender_id === currentUserId;

  console.log('[MessageActions] Component rendered:', {
    messageId: message.id,
    isVisible,
    canModify,
    senderId: message.sender_id,
    currentUserId,
    showEditModal
  });

  // Track showEditModal changes
  useEffect(() => {
    console.log('[MessageActions] showEditModal changed to:', showEditModal);
  }, [showEditModal]);

  const handleEdit = () => {
    console.log('[MessageActions] Edit button pressed');
    console.log('[MessageActions] Setting showEditModal to true');

    setShowEditModal(true);
    console.log('[MessageActions] NOT calling onClose to keep modal open');
    // Don't call onClose() immediately - let the edit modal show first
    // onClose();
  };

  const handleMediaSelected = async (media: SelectedMediaType) => {
    try {
      setIsUploading(true);
      console.log('[MessageActions] Uploading new media for edit:', media.name);

      // Prepare file object for upload
      const fileObject = {
        uri: media.uri,
        type: media.mimeType || 'application/octet-stream',
        name: media.name
      };

      // Upload new media to get URL
      const uploadResponse = await mediaAPI.uploadMedia(fileObject, media.backendType);

      // Replace existing media with the new uploaded media
      setSelectedMedia({
        ...media,
        uri: uploadResponse.media_url, // Use the uploaded URL
      });

      console.log('[MessageActions] ✅ New media uploaded successfully:', uploadResponse.media_url);
    } catch (error) {
      console.error('[MessageActions] ❌ Failed to upload new media:', error);
      Alert.alert('Error', 'Failed to upload media. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
  };

  const resetEditState = () => {
    setEditText(message.text_content || '');
    setSelectedMedia(null);
    setEditMessageType(message.message_type || 'text');
    setIsEditing(false);
    setIsUploading(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await onDelete(message.id);
              onClose();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete message. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
    onClose();
  };

  const handleSaveEdit = async () => {
    // Check if there's any content (text or media)
    const mediaUrl = selectedMedia?.uri || '';
    if (!editText.trim() && !mediaUrl) {
      Alert.alert('Error', 'Message cannot be empty');
      return;
    }

    try {
      setIsEditing(true);

      // Determine message type based on content
      let messageType = editMessageType;
      if (editText.trim() && mediaUrl) {
        // Both text and media
        if (selectedMedia?.backendType === 'video') {
          messageType = 'text_and_video';
        } else if (selectedMedia?.backendType === 'audio') {
          messageType = 'text_and_audio';
        } else {
          messageType = 'text_and_picture';
        }
      } else if (mediaUrl) {
        // Only media
        messageType = selectedMedia?.backendType || 'picture';
      } else {
        // Only text
        messageType = 'text';
      }

      await onEdit(message.id, editText.trim(), mediaUrl || undefined, messageType);
      resetEditState(); // Reset all edit state
      setShowEditModal(false);
      onClose(); // Close the parent message actions modal
    } catch (error) {
      Alert.alert('Error', 'Failed to edit message. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  if (!canModify) {
    return null;
  }

  return (
    <>
      {/* Actions Modal */}
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
              {/* Info Action - Always available */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onInfo();
                  onClose();
                }}
                disabled={isDeleting}
              >
                <Ionicons name="information-circle-outline" size={20} color={GoldTheme.gold.primary} />
                <Text style={styles.actionText}>Message Info</Text>
              </TouchableOpacity>

              {/* Edit and Delete - Only for own messages */}
              {canModify && (
                <>
                  <View style={styles.actionSeparator} />

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleEdit}
                    disabled={isDeleting}
                  >
                    <Ionicons name="create-outline" size={20} color={GoldTheme.gold.primary} />
                    <Text style={styles.actionText}>Edit Message</Text>
                  </TouchableOpacity>

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
                      Delete Message
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          console.log('[MessageActions] Edit modal onRequestClose called');
          setShowEditModal(false);
        }}
      >
        <View style={styles.editOverlay}>
          <View style={styles.editContainer}>
            <LinearGradient
              colors={[GoldTheme.background.card, GoldTheme.background.secondary]}
              style={styles.editGradient}
            >
              <View style={styles.editHeader}>
                <Text style={styles.editTitle}>Edit Message</Text>
                <TouchableOpacity
                  onPress={() => {
                    console.log('[MessageActions] Edit modal close button pressed');
                    resetEditState();
                    setShowEditModal(false);
                    onClose(); // Close the parent message actions modal
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={GoldTheme.text.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.editInputContainer}>
                <Text style={styles.inputLabel}>Message Text</Text>
                <TextInput
                  style={styles.editInput}
                  value={editText}
                  onChangeText={setEditText}
                  placeholder="Enter your message..."
                  placeholderTextColor={GoldTheme.text.muted}
                  multiline
                  maxLength={1000}
                  autoFocus
                />
              </View>

              {/* Media Picker Section */}
              <View style={styles.editInputContainer}>
                <Text style={styles.inputLabel}>Media (optional)</Text>

                {/* Media Picker */}
                <View style={styles.mediaPickerContainer}>
                  <MediaSelector
                    onMediaSelected={handleMediaSelected}
                    disabled={isUploading || isEditing}
                  />
                  {isUploading && (
                    <View style={styles.uploadingContainer}>
                      <ActivityIndicator size="small" color={GoldTheme.gold.primary} />
                      <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                  )}
                </View>

                {/* Selected Media Preview */}
                {selectedMedia && (
                  <View style={styles.mediaPreviewContainer}>
                    <View style={styles.mediaPreview}>
                      <Ionicons
                        name={
                          selectedMedia.backendType === 'video' ? 'videocam' :
                          selectedMedia.backendType === 'audio' ? 'musical-notes' : 'image'
                        }
                        size={20}
                        color={GoldTheme.gold.primary}
                      />
                      <View style={styles.mediaInfo}>
                        <Text style={styles.mediaFileName} numberOfLines={1}>
                          {selectedMedia.name.startsWith('existing_')
                            ? `Current ${selectedMedia.backendType}`
                            : selectedMedia.name}
                        </Text>
                        {selectedMedia.name.startsWith('existing_') && (
                          <Text style={styles.mediaSubtext}>
                            Tap media buttons to replace
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.removeMediaIconButton}
                        onPress={handleRemoveMedia}
                      >
                        <Ionicons name="close-circle" size={20} color={GoldTheme.status.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.editActions}>
                <GoldButton
                  title="Cancel"
                  onPress={() => {
                    console.log('[MessageActions] Cancel button pressed');
                    resetEditState();
                    setShowEditModal(false);
                    onClose(); // Close the parent message actions modal
                  }}
                  variant="outline"
                  style={styles.editButton}
                  disabled={isEditing}
                />
                <GoldButton
                  title={isEditing ? 'Saving...' : 'Save'}
                  onPress={handleSaveEdit}
                  style={styles.editButton}
                  disabled={isEditing || isUploading || (!editText.trim() && !selectedMedia)}
                />
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </>
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
    minWidth: 200,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  actionsGradient: {
    padding: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionText: {
    color: GoldTheme.text.primary,
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  actionSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    marginHorizontal: 16,
  },
  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  editGradient: {
    padding: 20,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editTitle: {
    color: GoldTheme.text.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  editInputContainer: {
    marginBottom: 20,
  },
  editInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: GoldTheme.text.primary,
    fontSize: 16,
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  editButton: {
    flex: 1,
  },
  inputLabel: {
    color: GoldTheme.text.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  // Media picker styles
  mediaPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  uploadingText: {
    color: GoldTheme.text.secondary,
    fontSize: 14,
    marginLeft: 8,
  },
  mediaPreviewContainer: {
    marginTop: 8,
  },
  mediaPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  mediaInfo: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  mediaFileName: {
    color: GoldTheme.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  mediaSubtext: {
    color: GoldTheme.text.muted,
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  removeMediaIconButton: {
    padding: 4,
  },
});
