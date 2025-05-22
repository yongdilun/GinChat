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
  TextInput,
  Text,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { chatAPI, Message, Chatroom, MessageType, mediaAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';
import { Video, ResizeMode } from 'expo-av';
import { Audio } from 'expo-av';

import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';

function AudioPlayer({ uri }: { uri: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  async function playSound() {
    setIsLoading(true);
    try {
      if (sound) {
        await sound.playFromPositionAsync(position);
        setIsPlaying(true);
        return;
      }
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      
      setSound(newSound);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Playback Error', 'Could not play audio file');
    } finally {
      setIsLoading(false);
    }
  }

  function onPlaybackStatusUpdate(status: any) {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  }

  async function stopSound() {
    if (sound) {
      try {
        await sound.pauseAsync();
        setIsPlaying(false);
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
    }
  }

  async function handleDownload() {
    if (!uri) return;
    
    try {
      setIsDownloading(true);
      
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to save audio files');
        return;
      }
      
      // Get filename from URI or create one
      const filename = uri.split('/').pop() || `audio-${Date.now()}.mp3`;
      
      // Download file
      const downloadResumable = FileSystem.createDownloadResumable(
        uri,
        FileSystem.documentDirectory + filename
      );
      
      const downloadResult = await downloadResumable.downloadAsync();
      
      // Save file to media library
      if (downloadResult && downloadResult.uri) {
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        Alert.alert('Success', 'Audio saved to your device');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', 'Could not download audio file');
    } finally {
      setIsDownloading(false);
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

  // Format time (milliseconds to MM:SS)
  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={styles.audioPlayerContainer}>
      <TouchableOpacity 
        onPress={isPlaying ? stopSound : playSound} 
        style={styles.audioPlayButton}
        disabled={isLoading}
      >
        <Ionicons 
          name={isLoading ? 'hourglass-outline' : isPlaying ? 'pause' : 'play'} 
          size={28} 
          color={Colors.primary} 
        />
      </TouchableOpacity>
      
      <View style={styles.audioInfoContainer}>
        <View style={styles.audioProgressBar}>
          <View 
            style={[
              styles.audioProgress, 
              { width: duration ? `${(position / duration) * 100}%` : '0%' }
            ]} 
          />
        </View>
        
        <View style={styles.audioTimeContainer}>
          <ThemedText style={styles.audioTimeText}>
            {formatTime(position)} / {formatTime(duration)}
          </ThemedText>
          
          <TouchableOpacity 
            onPress={handleDownload}
            disabled={isDownloading}
            style={styles.audioDownloadButton}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="download-outline" size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
            onPress={() => {
              console.log('Back button pressed');
              router.back();
            }}
            activeOpacity={0.7}
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
                    <VideoPlayer uri={msg.media_url!} />
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

function VideoPlayer({ uri }: { uri: string }) {
  const video = useRef<Video>(null);
  const [status, setStatus] = useState({});
  const [isDownloading, setIsDownloading] = useState(false);

  // Handle downloading video
  async function handleDownloadVideo() {
    if (!uri) return;
    
    try {
      setIsDownloading(true);
      
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to save videos');
        return;
      }
      
      // Get filename from URI or create one
      const filename = uri.split('/').pop() || `video-${Date.now()}.mp4`;
      
      // Download file
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      const downloadResumable = FileSystem.createDownloadResumable(
        uri,
        fileUri
      );
      
      const downloadResult = await downloadResumable.downloadAsync();
      
      // Save file to media library
      if (downloadResult && downloadResult.uri) {
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        if (asset) {
          Alert.alert('Success', 'Video saved to your device');
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', 'Could not download video file');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <View style={styles.videoPlayerContainer}>
      <Video
        ref={video}
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
        onPlaybackStatusUpdate={status => setStatus(() => status)}
      />
      
      <TouchableOpacity 
        style={styles.videoDownloadButton}
        onPress={handleDownloadVideo}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="download-outline" size={22} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

// Define the type for our media selection
type SelectedMediaType = {
  uri: string;
  type: 'image' | 'video' | 'audio';
  mimeType: string;
  name: string;
  size?: number;
  backendType?: string;
};

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatroom, setChatroom] = useState<Chatroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  
  // Message input state - updated to match web implementation
  const [messageText, setMessageText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMediaType | null>(null);
  const [pickingMedia, setPickingMedia] = useState(false);

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

  // Media picker function
  const handlePickMedia = async () => {
    if (pickingMedia || sending || isUploading) return; // Prevent multiple calls

    try {
      setPickingMedia(true);

      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your media library');
        return;
      }

      // Launch the image picker with simplified options
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1.0, // Use highest quality
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Determine media type
        let mediaType: 'image' | 'video' | 'audio' = 'image';
        let backendMediaType = 'picture';
        
        // First check the asset.type field directly
        if (asset.type) {
          // In React Native, ImagePicker might have limited types 
          // Convert the string to our internal type representation
          const assetType = String(asset.type).toLowerCase();
          if (assetType === 'video' || assetType.includes('video')) {
            mediaType = 'video';
            backendMediaType = 'video';
          } else if (assetType === 'audio' || assetType.includes('audio')) {
            mediaType = 'audio';
            backendMediaType = 'audio';
          }
        }
        
        // Determine MIME type and extension
        let mimeType = '';
        let extension = '';
        
        // Check if it's a data URL
        if (asset.uri && asset.uri.startsWith('data:')) {
          const match = asset.uri.match(/^data:([^;]+);/);
          if (match) {
            mimeType = match[1];
            
            // Set mime type based on data URL
            if (mimeType.startsWith('image/')) {
              mediaType = 'image';
              backendMediaType = 'picture';
              
              if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
                extension = '.jpg';
              } else if (mimeType === 'image/png') {
                extension = '.png';
              } else if (mimeType === 'image/gif') {
                extension = '.gif';
              } else {
                extension = '.jpg'; // Default extension
              }
            } else if (mimeType.startsWith('video/')) {
              mediaType = 'video';
              backendMediaType = 'video';
              extension = mimeType === 'video/mp4' ? '.mp4' : mimeType === 'video/quicktime' ? '.mov' : '.mp4';
            } else if (mimeType.startsWith('audio/')) {
              mediaType = 'audio';
              backendMediaType = 'audio';
              extension = mimeType === 'audio/mpeg' ? '.mp3' : mimeType === 'audio/wav' ? '.wav' : '.mp3';
            }
          }
        } else {
          // Use URI extension as fallback
          const uriParts = asset.uri.split('.');
          if (uriParts.length > 1) {
            extension = '.' + uriParts.pop()?.toLowerCase();
            
            if (extension === '.jpg' || extension === '.jpeg' || extension === '.png' || extension === '.gif') {
              mediaType = 'image';
              backendMediaType = 'picture';
              mimeType = extension === '.png' ? 'image/png' : extension === '.gif' ? 'image/gif' : 'image/jpeg';
            } else if (extension === '.mp4' || extension === '.mov' || extension === '.avi') {
              mediaType = 'video';
              backendMediaType = 'video';
              mimeType = extension === '.mp4' ? 'video/mp4' : extension === '.mov' ? 'video/quicktime' : 'video/mp4';
            } else if (extension === '.mp3' || extension === '.wav' || extension === '.aac' || extension === '.m4a') {
              mediaType = 'audio';
              backendMediaType = 'audio';
              mimeType = extension === '.mp3' ? 'audio/mpeg' : extension === '.wav' ? 'audio/wav' : 'audio/mpeg';
            }
          }
        }
        
        // Ensure we have a mime type
        if (!mimeType) {
          // Fallbacks based on media type
          mimeType = mediaType === 'image' ? 'image/jpeg' : 
                     mediaType === 'video' ? 'video/mp4' : 
                     'audio/mpeg';
        }
        
        // Ensure we have an extension
        if (!extension) {
          extension = mediaType === 'image' ? '.jpg' : 
                     mediaType === 'video' ? '.mp4' : 
                     '.mp3';
        }

        // Create a unique filename with timestamp
        const timestamp = Date.now();
        const fileName = `upload_${timestamp}${extension}`;

        // Calculate file size in KB (if available)
        const fileSize = asset.fileSize ? Math.round(asset.fileSize / 1024) : undefined;
        
        setSelectedMedia({
          uri: asset.uri,
          type: mediaType,
          mimeType: mimeType,
          name: fileName,
          size: fileSize,
          backendType: backendMediaType,
        });
      }
    } catch (error) {
      console.error('Error selecting media:', error);
      Alert.alert('Error', 'Failed to select media');
    } finally {
      setPickingMedia(false);
    }
  };

  // Handle sending messages with or without media
  const handleSendMessage = async () => {
    if ((!messageText.trim() && !selectedMedia) || sending || isUploading) return;

    try {
      setSending(true);
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid chatroom ID');
      }

      let mediaUrl = null;
      let messageType: MessageType = 'text';

      // If there's media, upload it first
      if (selectedMedia) {
        setIsUploading(true);
        
        try {
          // Create file object with mime type exactly as expected
          const fileToUpload = {
            uri: selectedMedia.uri, 
            type: selectedMedia.mimeType,
            name: selectedMedia.name
          };
          
          // Match backend message types
          let uploadMessageType = selectedMedia.backendType || 'picture';

          // Call the upload API
          const uploadResponse = await mediaAPI.uploadMedia(fileToUpload, uploadMessageType);

          // Get media URL from response
          mediaUrl = uploadResponse.media_url;
          if (!mediaUrl) {
            throw new Error('Media upload successful but URL not found in response');
          }

          // Set message type based on media type and text content
          if (messageText.trim()) {
            if (selectedMedia.type === 'image') messageType = 'text_and_picture';
            else if (selectedMedia.type === 'video') messageType = 'text_and_video';
            else if (selectedMedia.type === 'audio') messageType = 'text_and_audio';
          } else {
            if (selectedMedia.type === 'image') messageType = 'picture';
            else if (selectedMedia.type === 'video') messageType = 'video';
            else if (selectedMedia.type === 'audio') messageType = 'audio';
          }
        } catch (uploadError: any) {
          Alert.alert('Upload Failed', 'Could not upload media. Please try again.');
          setIsUploading(false);
          setSending(false);
          return;
        } finally {
          setIsUploading(false);
        }
      } else {
        // Text-only message
        messageType = 'text';
      }

      // Send the message with or without media URL
      const response = await chatAPI.sendMessage(id, {
        message_type: messageType,
        text_content: messageText.trim() || undefined,
        media_url: mediaUrl || undefined,
      });

      // Clear the input after sending
      setMessageText('');
      setSelectedMedia(null);

      // Refresh messages
      fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
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
                <VideoPlayer uri={item.media_url!} />
              </View>
            )}
            {item.message_type.includes('audio') && (
              <View style={styles.audioContainer}>
                <AudioPlayer uri={item.media_url!} />
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

      {/* Message Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.inputContainer}
      >
        {/* Media Preview */}
        {selectedMedia && (
          <View style={styles.mediaPreview}>
            <View style={styles.mediaPreviewContent}>
              {selectedMedia.type === 'image' && (
                <Image source={{ uri: selectedMedia.uri }} style={styles.previewImage} />
              )}
              {selectedMedia.type === 'video' && (
                <View style={styles.videoPreview}>
                  <VideoPlayer uri={selectedMedia.uri} />
                </View>
              )}
              {selectedMedia.type === 'audio' && (
                <View style={styles.audioPreview}>
                  <AudioPlayer uri={selectedMedia.uri} />
                </View>
              )}

              <TouchableOpacity onPress={handleRemoveMedia} style={styles.removeButton}>
                <Ionicons name="close-circle" size={24} color="#ff4444" />
              </TouchableOpacity>
            </View>

            {selectedMedia.name && (
              <View style={styles.fileInfoContainer}>
                <ThemedText style={styles.fileName}>
                  {selectedMedia.name} 
                  {selectedMedia.size ? ` (${selectedMedia.size} KB)` : ''}
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Input Row */}
        <View style={styles.messageInputRow}>
          <TouchableOpacity
            onPress={handlePickMedia}
            style={[
              styles.attachButton, 
              (sending || pickingMedia || isUploading || !!selectedMedia) && styles.disabledButton
            ]}
            disabled={sending || pickingMedia || isUploading || !!selectedMedia}
            activeOpacity={0.7}
          >
            {pickingMedia ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="attach" size={26} color={Colors.primary} />
            )}
          </TouchableOpacity>

          <TextInput
            style={[
              styles.textInput, 
              (sending || isUploading) && styles.disabledInput
            ]}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            editable={!sending && !isUploading}
          />

          <TouchableOpacity
            onPress={handleSendMessage}
            style={[
              styles.sendButton,
              (messageText.trim() || selectedMedia) && !sending && !isUploading 
                ? styles.sendButtonActive 
                : styles.sendButtonDisabled,
            ]}
            disabled={(!messageText.trim() && !selectedMedia) || sending || isUploading}
          >
            {isUploading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FFF" />
                <ThemedText style={styles.uploadingText}>Uploading</ThemedText>
              </View>
            ) : sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={22} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    padding: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
    width: 280,
    minHeight: 80,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginRight: 12,
    padding: 8,
    overflow: 'hidden',
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
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  attachButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
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
    width: 220,
    height: 165,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
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
    position: 'relative',
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
  mediaPreview: {
    padding: 12,
    backgroundColor: '#f7f7f7',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  videoPreview: {
    width: 220,
    height: 165,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  audioPreview: {
    width: 220,
    minHeight: 80,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  videoText: {
    marginTop: 8,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  audioText: {
    marginTop: 8,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  fileInfoContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 8,
  },
  fileName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledInput: {
    opacity: 0.7,
    backgroundColor: '#f0f0f0',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  uploadingText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1,
  },
  messageVideo: {
    width: '100%',
    height: '100%',
  },
  videoPoster: {
    resizeMode: 'cover',
  },
  videoPlayButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaVideoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1,
  },
  audioPlayerContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  audioPlayButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  audioInfoContainer: {
    flex: 1,
  },
  audioProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
    marginBottom: 4,
  },
  audioProgress: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  audioTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audioTimeText: {
    fontSize: 12,
    color: '#666',
  },
  audioDownloadButton: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  videoPlayerContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoDownloadButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});