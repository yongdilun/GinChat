import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';

interface MessageInputProps {
  onSendMessage: (text: string, media?: { uri: string; type: 'image' | 'video' | 'audio'; name?: string }) => void;
  sending?: boolean;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  sending = false,
  disabled = false,
}) => {
  const [messageText, setMessageText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{
    uri: string;
    type: 'image' | 'video' | 'audio';
    name?: string;
  } | null>(null);

  const handlePickMedia = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your media library');
        return;
      }

      // Show action sheet for media type selection
      Alert.alert(
        'Select Media',
        'Choose the type of media you want to attach',
        [
          {
            text: 'Photo/Video',
            onPress: () => pickImageOrVideo(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const pickImageOrVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const mediaType = asset.type === 'video' ? 'video' : 'image';
        
        setSelectedMedia({
          uri: asset.uri,
          type: mediaType,
          name: asset.fileName || `${mediaType}_${Date.now()}`,
        });
      }
    } catch (error) {
      console.error('Error selecting media:', error);
      Alert.alert('Error', 'Failed to select media');
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
  };

  const handleSend = () => {
    if ((!messageText.trim() && !selectedMedia) || sending || disabled) return;

    onSendMessage(messageText.trim(), selectedMedia || undefined);
    
    // Clear the input after sending
    setMessageText('');
    setSelectedMedia(null);
  };

  const canSend = (messageText.trim() || selectedMedia) && !sending && !disabled;

  return (
    <View style={styles.container}>
      {/* Media Preview */}
      {selectedMedia && (
        <View style={styles.mediaPreview}>
          <View style={styles.mediaPreviewContent}>
            {selectedMedia.type === 'image' && (
              <Image source={{ uri: selectedMedia.uri }} style={styles.previewImage} />
            )}
            {selectedMedia.type === 'video' && (
              <View style={styles.videoPreview}>
                <Ionicons name="videocam" size={40} color={Colors.primary} />
                <Text style={styles.videoText}>Video</Text>
              </View>
            )}
            {selectedMedia.type === 'audio' && (
              <View style={styles.audioPreview}>
                <Ionicons name="musical-note" size={40} color={Colors.primary} />
                <Text style={styles.audioText}>Audio</Text>
              </View>
            )}
            
            <TouchableOpacity onPress={handleRemoveMedia} style={styles.removeButton}>
              <Ionicons name="close-circle" size={24} color="#ff4444" />
            </TouchableOpacity>
          </View>
          
          {selectedMedia.name && (
            <Text style={styles.fileName}>{selectedMedia.name}</Text>
          )}
        </View>
      )}

      {/* Input Row */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          onPress={handlePickMedia}
          style={[styles.attachButton, (sending || disabled) && styles.disabledButton]}
          disabled={sending || disabled}
        >
          <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
        </TouchableOpacity>

        <TextInput
          style={[styles.textInput, (sending || disabled) && styles.disabledInput]}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
          editable={!sending && !disabled}
        />

        <TouchableOpacity
          onPress={handleSend}
          style={[
            styles.sendButton,
            canSend ? styles.sendButtonActive : styles.sendButtonDisabled,
          ]}
          disabled={!canSend}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="send" size={24} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  mediaPreview: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mediaPreviewContent: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  videoPreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPreview: {
    width: 120,
    height: 80,
    borderRadius: 8,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  audioText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  fileName: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    maxWidth: 120,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    maxHeight: 120,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  disabledInput: {
    opacity: 0.5,
    backgroundColor: '#f0f0f0',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default MessageInput;
