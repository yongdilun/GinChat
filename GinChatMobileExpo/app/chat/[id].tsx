import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  View,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { chatAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';
import { Video, ResizeMode } from 'expo-av';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

// Message types from backend
type MessageType = 'text' | 'picture' | 'audio' | 'video' | 'text_and_picture' | 'text_and_audio' | 'text_and_video';

interface Message {
  id: string;  // MongoDB ObjectID as string
  chatroom_id: string;  // MongoDB ObjectID as string
  sender_id: number;  // uint in backend
  sender_name: string;
  message_type: MessageType;
  text_content?: string;
  media_url?: string;
  sent_at: string;
}

interface Chatroom {
  id: string;  // MongoDB ObjectID as string
  name: string;
  members: {
    user_id: number;  // uint in backend
    username: string;
    joined_at: string;
  }[];
  created_at: string;
}

function AudioPlayer({ uri }: { uri: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function playSound() {
    setIsLoading(true);
    if (sound) {
      await sound.replayAsync();
      setIsPlaying(true);
      setIsLoading(false);
      return;
    }
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true },
      (status) => {
        if ('didJustFinish' in status && status.didJustFinish) setIsPlaying(false);
      }
    );
    setSound(newSound);
    setIsPlaying(true);
    setIsLoading(false);
  }

  async function stopSound() {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  }

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  return (
    <TouchableOpacity onPress={isPlaying ? stopSound : playSound} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color={Colors.primary} />
      <ThemedText style={{ marginLeft: 8 }}>{isPlaying ? 'Pause' : isLoading ? 'Loading...' : 'Play Audio'}</ThemedText>
    </TouchableOpacity>
  );
}

function ChatDetailHeader({ chatroom, messages }: { chatroom: Chatroom | null; messages: Message[] }) {
  const [showContent, setShowContent] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'images' | 'videos' | 'audio'>('members');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const screenWidth = Dimensions.get('window').width;

  // Filter media messages
  const images = messages.filter(m => m.message_type.includes('picture') && m.media_url);
  const videos = messages.filter(m => m.message_type === 'video' && m.media_url);
  const audios = messages.filter(m => m.message_type === 'audio' && m.media_url);

  if (!chatroom) {
    return (
      <ThemedView style={styles.header}>
        <ThemedText style={styles.headerTitle}>Select a chatroom to start chatting</ThemedText>
      </ThemedView>
    );
  }

  // Ensure members is always an array
  const members = Array.isArray(chatroom.members) ? chatroom.members : [];

  return (
    <>
      <TouchableOpacity style={styles.header} onPress={() => setShowContent(!showContent)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText style={styles.headerTitle}>{chatroom.name}</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {members.length} members
            </ThemedText>
          </View>
          <Ionicons name={showContent ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
        </View>
      </TouchableOpacity>
      {showContent && (
        <ThemedView style={styles.headerPanel}>
          <View style={styles.tabRow}>
            <TouchableOpacity style={[styles.tabButton, activeTab === 'members' && styles.tabActive]} onPress={() => setActiveTab('members')}>
              <Ionicons name="people-outline" size={18} color={activeTab === 'members' ? Colors.primary : '#666'} />
              <ThemedText style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>Members</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabButton, activeTab === 'images' && styles.tabActive]} onPress={() => setActiveTab('images')}>
              <Ionicons name="image-outline" size={18} color={activeTab === 'images' ? Colors.primary : '#666'} />
              <ThemedText style={[styles.tabText, activeTab === 'images' && styles.tabTextActive]}>Images</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabButton, activeTab === 'videos' && styles.tabActive]} onPress={() => setActiveTab('videos')}>
              <Ionicons name="videocam-outline" size={18} color={activeTab === 'videos' ? Colors.primary : '#666'} />
              <ThemedText style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>Videos</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabButton, activeTab === 'audio' && styles.tabActive]} onPress={() => setActiveTab('audio')}>
              <Ionicons name="mic-outline" size={18} color={activeTab === 'audio' ? Colors.primary : '#666'} />
              <ThemedText style={[styles.tabText, activeTab === 'audio' && styles.tabTextActive]}>Audio</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={{ minHeight: 80 }}>
            {activeTab === 'members' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 8 }}>
                {members.map((member, idx) => (
                  <View key={idx} style={styles.memberItem}>
                    <View style={styles.memberAvatar}>
                      <ThemedText style={styles.memberAvatarText}>{member.username?.charAt(0).toUpperCase() || 'U'}</ThemedText>
                    </View>
                    <ThemedText style={styles.memberName}>{member.username || `User ${member.user_id}`}</ThemedText>
                  </View>
                ))}
              </ScrollView>
            )}
            {activeTab === 'images' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 8 }}>
                {images.length > 0 ? images.map((msg, idx) => (
                  <TouchableOpacity key={idx} onPress={() => setSelectedImage(msg.media_url!)}>
                    <Image source={{ uri: msg.media_url! }} style={styles.mediaThumb} resizeMode="cover" />
                  </TouchableOpacity>
                )) : <ThemedText style={styles.emptyTabText}>No images in this chatroom</ThemedText>}
              </ScrollView>
            )}
            {activeTab === 'videos' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 8 }}>
                {videos.length > 0 ? videos.map((msg, idx) => (
                  <View key={idx} style={styles.mediaVideoWrap}>
                    <Video source={{ uri: msg.media_url! }} style={styles.mediaVideo} useNativeControls resizeMode={ResizeMode.COVER} />
                  </View>
                )) : <ThemedText style={styles.emptyTabText}>No videos in this chatroom</ThemedText>}
              </ScrollView>
            )}
            {activeTab === 'audio' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 8 }}>
                {audios.length > 0 ? audios.map((msg, idx) => (
                  <View key={idx} style={styles.mediaAudioWrap}>
                    <AudioPlayer uri={msg.media_url!} />
                  </View>
                )) : <ThemedText style={styles.emptyTabText}>No audio files in this chatroom</ThemedText>}
              </ScrollView>
            )}
          </View>
        </ThemedView>
      )}
      {/* Image Modal */}
      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalOverlayImg}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={{ width: screenWidth - 40, height: screenWidth - 40, borderRadius: 12 }} resizeMode="contain" />
          )}
          {selectedImage && (
            <TouchableOpacity
              style={{ position: 'absolute', bottom: 32, right: 32, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 24, padding: 12, zIndex: 10 }}
              onPress={async () => {
                try {
                  const { status } = await MediaLibrary.requestPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert('Permission required', 'Please allow access to save images.');
                    return;
                  }
                  const downloadResumable = FileSystem.createDownloadResumable(
                    selectedImage,
                    FileSystem.documentDirectory + (selectedImage.split('/').pop() || 'image.jpg')
                  );
                  const downloadResult = await downloadResumable.downloadAsync();
                  if (!downloadResult) {
                    throw new Error('Download failed');
                  }
                  const uri = downloadResult.uri;
                  await MediaLibrary.saveToLibraryAsync(uri);
                  Alert.alert('Saved', 'Image saved to your gallery.');
                } catch (e) {
                  Alert.alert('Error', 'Could not save image.');
                }
              }}
            >
              <Ionicons name="download" size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </>
  );
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatroom, setChatroom] = useState<Chatroom | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video' | 'audio'; name?: string } | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchChatroom();
    fetchMessages();
  }, [id]);

  const fetchChatroom = async () => {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid chatroom ID');
      }

      const response = await chatAPI.getConversationById(id);
      setChatroom(response.chatroom || response);
    } catch (err) {
      console.error('Error fetching chatroom:', err);
      Alert.alert('Error', 'Failed to load chatroom details');
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid chatroom ID');
      }

      const response = await chatAPI.getMessages(id);
      setMessages(response.messages || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Media picker handler
  const handlePickMedia = async () => {
    // Ask user to pick image or video
    // Use ImagePicker to select media
    const imageResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, // Using enum despite deprecation warning
      allowsEditing: false,
      quality: 0.8,
    });
    if (!imageResult.canceled && imageResult.assets && imageResult.assets.length > 0) {
      const asset = imageResult.assets[0];
      const type = asset.type === 'video' ? 'video' : 'image';
      // Use asset.fileName if available, otherwise extract from URI
      const fileName = asset.fileName || asset.uri.split('/').pop() || `${type}.${type === 'video' ? 'mp4' : 'jpg'}`;
      setSelectedMedia({ uri: asset.uri, type, name: fileName });
      return;
    }
    // If not image/video, try audio
    const audioResult = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
    if (!audioResult.canceled && audioResult.assets && audioResult.assets.length > 0) {
      const asset = audioResult.assets[0];
      setSelectedMedia({ uri: asset.uri, type: 'audio', name: asset.name });
    }
  };

  // Media upload handler
  const uploadMedia = async (media: { uri: string; type: string; name?: string }) => {
    setMediaUploading(true);
    try {
      const formData = new FormData();
      // Need to cast to any because React Native's FormData implementation
      // accepts objects with uri, but TypeScript's FormData type doesn't
      formData.append('file', {
        uri: media.uri,
        name: media.name || `upload.${media.type}`,
        type: media.type === 'image' ? 'image/jpeg' : media.type === 'video' ? 'video/mp4' : 'audio/mpeg',
      } as any);
      // Replace with your backend upload endpoint
      const res = await fetch('https://ginchat-14ry.onrender.com/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
      const data = await res.json();
      setMediaUploading(false);
      return data.media_url || data.url;
    } catch (e) {
      setMediaUploading(false);
      Alert.alert('Upload failed', 'Could not upload media.');
      return null;
    }
  };

  // Update handleSendMessage
  const handleSendMessage = async () => {
    if ((!messageText.trim() && !selectedMedia) || sending) return;
    try {
      setSending(true);
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid chatroom ID');
      }
      let mediaUrl = null;
      let messageType: MessageType = 'text';
      if (selectedMedia) {
        mediaUrl = await uploadMedia(selectedMedia);
        if (!mediaUrl) throw new Error('Media upload failed');
        if (selectedMedia.type === 'image') messageType = messageText.trim() ? 'text_and_picture' : 'picture';
        if (selectedMedia.type === 'video') messageType = messageText.trim() ? 'text_and_video' : 'video';
        if (selectedMedia.type === 'audio') messageType = messageText.trim() ? 'text_and_audio' : 'audio';
      }
      await chatAPI.sendMessage(id, {
        message_type: messageType,
        text_content: messageText.trim(),
        media_url: mediaUrl,
      });
      setMessageText('');
      setSelectedMedia(null);
      fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = user?.id === item.sender_id;  // Compare with sender_id

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        {!isOwnMessage && (
          <ThemedText style={styles.messageUsername}>{item.sender_name}</ThemedText>  // Use sender_name
        )}

        {item.text_content && (
          <ThemedText style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.text_content}
          </ThemedText>
        )}

        {item.media_url && (
          <View style={styles.mediaContainer}>
            {item.message_type.includes('picture') && (
              <Image
                source={{ uri: item.media_url }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            )}
            {/* Video and audio player implementations will be added later */}
          </View>
        )}

        <ThemedText style={styles.messageTime}>
          {new Date(item.sent_at).toLocaleTimeString([], {  // Use sent_at
            hour: '2-digit',
            minute: '2-digit'
          })}
        </ThemedText>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ChatDetailHeader chatroom={chatroom} messages={messages} />

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted
      />

      <View style={styles.inputContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          {selectedMedia && (
            <View style={{ marginRight: 8 }}>
              {selectedMedia.type === 'image' && (
                <Image source={{ uri: selectedMedia.uri }} style={{ width: 48, height: 48, borderRadius: 8 }} />
              )}
              {selectedMedia.type === 'video' && (
                <Ionicons name="videocam" size={32} color={Colors.primary} />
              )}
              {selectedMedia.type === 'audio' && (
                <Ionicons name="mic" size={32} color={Colors.primary} />
              )}
              <TouchableOpacity onPress={() => setSelectedMedia(null)} style={{ position: 'absolute', top: -8, right: -8 }}>
                <Ionicons name="close-circle" size={20} color="#c00" />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={handlePickMedia} style={{ marginRight: 8 }}>
            <Ionicons name="attach" size={28} color={Colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="send" size={24} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  headerPanel: {
    padding: 16,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  tabTextActive: {
    color: '#FFF',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  memberName: {
    fontSize: 14,
    marginLeft: 8,
  },
  mediaThumb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 8,
  },
  mediaVideoWrap: {
    width: 120,
    height: 160,
    borderRadius: 8,
    marginRight: 8,
  },
  mediaVideo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  mediaAudioWrap: {
    padding: 8,
    marginRight: 8,
  },
  emptyTabText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalOverlayImg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 2,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e0e0',
  },
  messageUsername: {
    fontSize: 12,
    marginBottom: 4,
    color: '#666',
  },
  messageText: {
    fontSize: 16,
  },
  ownMessageText: {
    color: '#FFF',
  },
  otherMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.7,
  },
  mediaContainer: {
    marginTop: 8,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    marginHorizontal: 12,
    padding: 8,
    maxHeight: 100,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  sendButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});