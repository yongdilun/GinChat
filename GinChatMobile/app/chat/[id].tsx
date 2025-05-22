import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  FlatList,
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
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { chatAPI, Message, Chatroom, MessageType } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';
import { Video, ResizeMode } from 'expo-av';
import { Audio } from 'expo-av';

import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import MessageInput from '../../src/components/MessageInput';

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
  const videos = messages.filter(m => m.message_type.includes('video') && m.media_url);
  const audios = messages.filter(m => m.message_type.includes('audio') && m.media_url);

  if (!chatroom) {
    return (
      <ThemedView style={styles.header}>
        <ThemedText style={styles.headerTitle}>Select a chatroom to start chatting</ThemedText>
      </ThemedView>
    );
  }

  // Ensure members is always an array and log for debugging
  const members = Array.isArray(chatroom.members) ? chatroom.members : [];
  console.log('Members in header:', members);

  // Generate a random but consistent color for the chatroom
  const getColorFromName = (name: string) => {
    const hue = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
    return `hsl(${hue}, 70%, 80%)`;
  };

  const chatColor = getColorFromName(chatroom.name);

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButtonInHeader}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>

          <View style={[styles.chatAvatar, { backgroundColor: chatColor }]}>
            <ThemedText style={styles.chatAvatarText}>
              {chatroom.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>

          <View style={styles.headerTextContainer}>
            <ThemedText style={styles.headerTitle}>{chatroom.name}</ThemedText>
            <View style={styles.headerInfo}>
              <View style={styles.memberCountBadge}>
                <Ionicons name="people" size={14} color="#fff" style={{ marginRight: 4 }} />
                <ThemedText style={styles.memberCountText}>
                  {members?.length || 0} {(members?.length || 0) === 1 ? 'member' : 'members'}
                </ThemedText>
              </View>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowContent(!showContent)}
              >
                <ThemedText style={styles.headerButtonText}>
                  {showContent ? 'Hide Details' : 'Show Details'}
                </ThemedText>
                <Ionicons
                  name={showContent ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
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
                {members && members.length > 0 ? members.map((member, idx) => {
                  console.log('Rendering member:', JSON.stringify(member, null, 2));
                  const memberKey = member.user_id || idx;
                  const memberName = member.username || `User ${member.user_id || 'Unknown'}`;
                  const avatarLetter = memberName.charAt(0).toUpperCase() || 'U';

                  return (
                    <View key={memberKey} style={styles.memberItem}>
                      <View style={styles.memberAvatar}>
                        <ThemedText style={styles.memberAvatarText}>
                          {avatarLetter}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.memberName}>
                        {memberName}
                      </ThemedText>
                    </View>
                  );
                }) : (
                  <ThemedText style={styles.emptyTabText}>
                    {members ? 'No members found' : 'Loading members...'}
                  </ThemedText>
                )}
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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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

      // Ensure the chatroom data is properly formatted
      const chatroomData = response.chatroom || response;

      console.log('Chatroom data received:', JSON.stringify(chatroomData, null, 2));

      // Ensure members array is properly formatted with numeric user_id
      if (chatroomData.members && Array.isArray(chatroomData.members)) {
        console.log('Original members before processing:', JSON.stringify(chatroomData.members, null, 2));
        chatroomData.members = chatroomData.members.map(member => ({
          ...member,
          user_id: typeof member.user_id === 'string' ? parseInt(member.user_id, 10) : member.user_id
        }));
        console.log('Processed members:', JSON.stringify(chatroomData.members, null, 2));
      } else {
        console.log('No members array found or not an array:', chatroomData.members);
        // Initialize empty members array if not present
        chatroomData.members = [];
      }

      setChatroom(chatroomData);
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



  // Media upload handler
  const uploadMedia = async (media: { uri: string; type: string; name?: string }) => {
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
      return data.media_url || data.url;
    } catch (e) {
      Alert.alert('Upload failed', 'Could not upload media.');
      return null;
    }
  };

  // Handle send message from the MessageInput component
  const handleSendMessageFromInput = async (text: string, media?: { uri: string; type: 'image' | 'video' | 'audio'; name?: string }) => {
    if ((!text.trim() && !media) || sending) return;

    try {
      setSending(true);
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid chatroom ID');
      }

      let mediaUrl = null;
      let messageType: MessageType = 'text';

      if (media) {
        mediaUrl = await uploadMedia(media);
        if (!mediaUrl) throw new Error('Media upload failed');

        // Set the message type based on media type and whether there's text
        if (media.type === 'image') {
          messageType = text.trim() ? 'text_and_picture' : 'picture';
        } else if (media.type === 'video') {
          messageType = text.trim() ? 'text_and_video' : 'video';
        } else if (media.type === 'audio') {
          messageType = text.trim() ? 'text_and_audio' : 'audio';
        }
      }

      // Send the message
      await chatAPI.sendMessage(id, {
        message_type: messageType,
        text_content: text.trim(),
        media_url: mediaUrl,
      });

      // Refresh messages
      fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = user?.id === item.sender_id;
    const messageDate = new Date(item.sent_at);
    const formattedTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

    // Generate a random but consistent color for each user
    const getUserColor = (userId: number) => {
      const colors = ['#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#009688', '#4CAF50', '#FF9800'];
      return colors[userId % colors.length];
    };

    const userColor = !isOwnMessage ? getUserColor(item.sender_id) : undefined;

    // Function to handle image click
    const handleImageClick = (imageUrl: string) => {
      // Set the selected image to show in the modal
      if (setSelectedImage && typeof setSelectedImage === 'function') {
        setSelectedImage(imageUrl);
      }
    };

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        {!isOwnMessage && (
          <ThemedText style={[styles.messageUsername, { color: userColor }]}>
            {item.sender_name}
          </ThemedText>
        )}

        {/* Display media BEFORE text content */}
        {item.media_url && (
          <View style={styles.mediaContainer}>
            {item.message_type.includes('picture') && (
              <TouchableOpacity
                onPress={() => handleImageClick(item.media_url!)}
              >
                <Image
                  source={{ uri: item.media_url }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
                {item.message_type === 'picture' && !item.text_content && (
                  <View style={styles.mediaOverlay}>
                    <Ionicons name="image" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            )}
            {item.message_type.includes('video') && (
              <View style={styles.videoContainer}>
                <Ionicons name="play-circle" size={40} color="#fff" style={styles.playIcon} />
                <ThemedText style={styles.mediaLabel}>Video</ThemedText>
              </View>
            )}
            {item.message_type.includes('audio') && (
              <View style={styles.audioContainer}>
                <Ionicons name="musical-note" size={24} color={Colors.primary} />
                <ThemedText style={styles.mediaLabel}>Audio Message</ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Display text content AFTER media */}
        {item.text_content && (
          <ThemedText style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.text_content}
          </ThemedText>
        )}

        <View style={styles.messageFooter}>
          <ThemedText style={styles.messageTime}>
            {formattedTime} • {formattedDate}
          </ThemedText>
          {isOwnMessage && (
            <Ionicons
              name="checkmark-done"
              size={14}
              color="#fff"
              style={styles.readIcon}
            />
          )}
        </View>
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
      <View style={styles.headerContainer}>
        <ChatDetailHeader chatroom={chatroom} messages={messages} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted
      />

      {/* Image Viewer Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalCloseButton}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      <MessageInput
        onSendMessage={handleSendMessageFromInput}
        sending={sending}
        disabled={loading}
      />
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
  headerContainer: {
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonInHeader: {
    marginRight: 12,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  chatAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 6,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  headerButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 4,
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
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    minWidth: 80,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  memberName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
    fontWeight: '500',
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
    marginBottom: 16,
    padding: 14,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4, // Creates a tail effect
    marginRight: 8,
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4, // Creates a tail effect
    marginLeft: 8,
  },
  messageUsername: {
    fontSize: 12,
    marginBottom: 4,
    color: '#666',
    fontWeight: 'bold',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#FFF',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 6,
    opacity: 0.7,
    alignSelf: 'flex-end',
  },
  mediaContainer: {
    marginBottom: 8, // Changed from marginTop to marginBottom to separate from text
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  input: {
    flex: 1,
    marginHorizontal: 12,
    padding: 12,
    maxHeight: 120,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sendButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#ccc',
  },
  selectedMediaPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    marginHorizontal: 8,
  },
  mediaPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  mediaPreviewIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  mediaTypeText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  attachButton: {
    padding: 8,
    marginRight: 4,
  },
  mediaOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  videoContainer: {
    width: 200,
    height: 150,
    backgroundColor: '#333',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  playIcon: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  mediaLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
  },
  readIcon: {
    marginLeft: 4,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width - 40,
    height: Dimensions.get('window').height - 200,
    borderRadius: 12,
  },
  mediaPreviewModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreviewOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreviewContainer: {
    width: '90%',
    maxHeight: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mediaPreviewCloseButton: {
    position: 'absolute',
    top: -50,
    right: 10,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreviewContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPreviewImageLarge: {
    width: '100%',
    height: 400,
    borderRadius: 12,
  },
  mediaPreviewVideoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    width: '100%',
    minHeight: 300,
  },
  mediaPreviewVideoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  mediaPreviewAudioContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    width: '100%',
    minHeight: 300,
  },
  mediaPreviewAudioText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  mediaPreviewFileName: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 12,
    textAlign: 'center',
  },
  mediaIndicator: {
    marginRight: 8,
    padding: 4,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 12,
  },
});