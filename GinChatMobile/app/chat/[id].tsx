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
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { chatAPI, Message, Chatroom, MessageType, mediaAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket, WebSocketMessage as WSMessage } from '@/contexts/WebSocketContext';
import { GoldTheme } from '../../constants/GoldTheme';
import { GoldButton } from '../../src/components/GoldButton';
import { Video, ResizeMode, Audio, AVPlaybackStatus } from 'expo-av';

import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

function AudioPlayer({ uri, isCompact = false }: { uri: string; isCompact?: boolean }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [waveAnimationValues, setWaveAnimationValues] = useState(Array(10).fill(0.3));

  useEffect(() => {
    // Set audio mode for proper playback
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Error setting audio mode:', error);
      }
    };

    setupAudio();

    return () => {
      if (sound) {
        sound.unloadAsync().catch(console.error);
      }
    };
  }, [sound]);

  // Wave animation effect
  useEffect(() => {
    let animationInterval: ReturnType<typeof setInterval>;
    
    if (isPlaying) {
      animationInterval = setInterval(() => {
        setWaveAnimationValues(prev => 
          prev.map(() => Math.random() * 0.7 + 0.3)
        );
      }, 150);
    } else {
      setWaveAnimationValues(Array(10).fill(0.3));
    }

    return () => {
      if (animationInterval) {
        clearInterval(animationInterval);
      }
    };
  }, [isPlaying]);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying || false);
      setAudioError(false);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    } else {
      if (status.error) {
        console.error('Audio playback error:', status.error);
        setAudioError(true);
        setIsLoading(false);
      }
    }
  };

  const playSound = async () => {
    if (audioError) return;
    
    setIsLoading(true);
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { 
            shouldPlay: true,
            volume: 1.0,
            rate: 1.0,
            shouldCorrectPitch: true,
          },
          onPlaybackStatusUpdate
        );
        
        setSound(newSound);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setAudioError(true);
      Alert.alert('Playback Error', 'Could not play audio file');
    } finally {
      setIsLoading(false);
    }
  };

  const seekToPosition = async (seekPosition: number) => {
    if (sound && duration > 0) {
      try {
        const newPosition = Math.max(0, Math.min(seekPosition, duration));
        await sound.setPositionAsync(newPosition);
        setPosition(newPosition);
      } catch (error) {
        console.error('Error seeking audio:', error);
      }
    }
  };

  const handleDownload = async () => {
    if (!uri) {
      Alert.alert('Error', 'No audio URL available');
      return;
    }
    
    try {
      setIsDownloading(true);
      
      // Create filename
      const filename = uri.split('/').pop()?.split('?')[0] || `audio-${Date.now()}.mp3`;
      
      if (Platform.OS === 'web') {
        // Web platform - direct download
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          Alert.alert('Success', 'Audio file has been downloaded');
        } catch (error) {
          throw new Error('Failed to download audio file for web');
        }
      } else {
        // Native platforms (iOS/Android)
        // Request permissions
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to save audio files to your device');
          return;
        }
        
        const localPath = `${FileSystem.documentDirectory}${filename}`;
        
        console.log('Downloading audio from:', uri);
        console.log('Saving to:', localPath);
        
        // Download the file
        const downloadResumable = FileSystem.createDownloadResumable(
          uri,
          localPath,
          {},
          (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            console.log('Audio download progress:', Math.round(progress * 100) + '%');
          }
        );
        
        const downloadResult = await downloadResumable.downloadAsync();
        
        if (downloadResult && downloadResult.uri) {
          console.log('Audio download completed:', downloadResult.uri);
          
          // Save to device gallery
          const asset = await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
          console.log('Audio saved to gallery:', asset);
          
          Alert.alert(
            'Success', 
            'Audio has been saved to your device',
            [{ text: 'OK' }]
          );
        } else {
          throw new Error('Download failed - no file created');
        }
      }
      
    } catch (error) {
      console.error('Audio download error:', error);
      Alert.alert(
        'Download Failed', 
        `Could not download audio: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const formatTime = (millis: number) => {
    if (!millis || millis < 0) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  if (audioError) {
    return (
      <View style={[styles.audioPlayerContainer, isCompact && styles.audioPlayerCompact]}>
        <View style={[styles.audioErrorContainer, isCompact && styles.audioErrorCompact]}>
          <Ionicons name="musical-notes" size={isCompact ? 16 : 24} color={GoldTheme.text.muted} />
          <Text style={[styles.audioErrorText, isCompact && styles.audioErrorTextCompact]}>
            {isCompact ? 'Audio Error' : 'Audio Unavailable'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.audioPlayerContainer, isCompact && styles.audioPlayerCompact]}>
      <LinearGradient
        colors={isCompact 
          ? ['rgba(255, 215, 0, 0.08)', 'rgba(255, 215, 0, 0.02)']
          : ['rgba(255, 215, 0, 0.12)', 'rgba(255, 215, 0, 0.04)']}
        style={[styles.audioPlayerGradient, isCompact && styles.audioPlayerGradientCompact]}
      >
        {/* Audio wave visualization background */}
        <View style={[styles.audioWaveBackground, isCompact && styles.audioWaveBackgroundCompact]}>
          {waveAnimationValues.map((height, index) => (
            <View 
              key={index}
              style={[
                styles.audioWaveBar, 
                { 
                  height: isCompact 
                    ? Math.max(3, height * (isPlaying ? 12 : 6))
                    : Math.max(6, height * (isPlaying ? 22 : 8)),
                  opacity: isPlaying ? height : 0.3
                }
              ]} 
            />
          ))}
        </View>
        
        <TouchableOpacity 
          onPress={playSound} 
          style={[styles.audioPlayButton, isCompact && styles.audioPlayButtonCompact]}
          disabled={isLoading || audioError}
        >
          <LinearGradient
            colors={GoldTheme.gradients.goldButton}
            style={[styles.audioButtonGradient, isCompact && styles.audioButtonGradientCompact]}
          >
            <View style={styles.playButtonIcon}>
              <Ionicons 
                name={isLoading ? 'hourglass-outline' : isPlaying ? 'pause' : 'play'} 
                size={isCompact ? 16 : 22} 
                color={GoldTheme.text.inverse} 
                style={{ marginLeft: isPlaying || isLoading ? 0 : 2 }}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.audioInfoContainer}>
          {!isCompact && (
            <View style={styles.audioHeader}>
              <View style={styles.audioTitleContainer}>
                <View style={styles.audioIconWrapper}>
                  <Ionicons name="musical-notes" size={18} color={GoldTheme.gold.primary} />
                </View>
                <View style={styles.audioTitleText}>
                  <Text style={styles.audioTitle}>Audio Message</Text>
                  <Text style={styles.audioSubtitle}>
                    {isPlaying ? 'Playing...' : isLoading ? 'Loading...' : 'Tap to play'}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity 
                onPress={handleDownload}
                disabled={isDownloading}
                style={styles.audioDownloadButton}
              >
                <LinearGradient
                  colors={isDownloading ? ['#888', '#666'] : ['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
                  style={styles.downloadButtonGradient}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color={GoldTheme.gold.primary} />
                  ) : (
                    <Ionicons name="download-outline" size={18} color={GoldTheme.gold.primary} />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
          
          {isCompact && (
            <View style={styles.audioHeader}>
              <View style={styles.audioTitleText}>
                <Text style={[styles.audioTitle, { fontSize: 12 }]}>
                  {formatTime(position)} / {formatTime(duration)}
                </Text>
                <Text style={[styles.audioSubtitle, { fontSize: 10 }]}>
                  {isPlaying ? '♪ Playing' : isLoading ? 'Loading...' : 'Audio'}
                </Text>
              </View>
              
              <TouchableOpacity 
                onPress={handleDownload}
                disabled={isDownloading}
                style={[styles.audioDownloadButton, { marginLeft: 8 }]}
              >
                <LinearGradient
                  colors={isDownloading ? ['#888', '#666'] : ['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
                  style={[styles.downloadButtonGradient, { padding: 6 }]}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color={GoldTheme.gold.primary} />
                  ) : (
                    <Ionicons name="download-outline" size={14} color={GoldTheme.gold.primary} />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
          
          {!isCompact && (
            <View style={styles.audioProgressBar}>
              <TouchableOpacity 
                style={styles.audioProgressBarContainer}
                onPress={(event) => {
                  if (duration > 0) {
                    const { locationX, pageX } = event.nativeEvent;
                    const progressBarWidth = 220;
                    const seekRatio = Math.max(0, Math.min(1, locationX / progressBarWidth));
                    const seekPosition = seekRatio * duration;
                    console.log('Audio seek:', { locationX, seekRatio, seekPosition, duration });
                    seekToPosition(seekPosition);
                  }
                }}
              >
                <View style={styles.audioProgressBarTrack}>
                  <LinearGradient
                    colors={GoldTheme.gradients.goldButton}
                    style={[
                      styles.audioProgress, 
                      { width: `${Math.max(0, Math.min(100, progress * 100))}%` }
                    ]}
                  />
                  <View style={[styles.audioProgressThumb, { left: `${Math.max(0, Math.min(94, progress * 100))}%` }]} />
                </View>
              </TouchableOpacity>
            </View>
          )}
          
          {isCompact && (
            <View style={[styles.audioProgressBar, { marginBottom: 4 }]}>
              <TouchableOpacity 
                style={[styles.audioProgressBarContainer, { paddingVertical: 4 }]}
                onPress={(event) => {
                  if (duration > 0) {
                    const { locationX } = event.nativeEvent;
                    const progressBarWidth = 140; // Smaller for compact mode
                    const seekRatio = Math.max(0, Math.min(1, locationX / progressBarWidth));
                    const seekPosition = seekRatio * duration;
                    seekToPosition(seekPosition);
                  }
                }}
              >
                <View style={[styles.audioProgressBarTrack, { height: 2 }]}>
                  <LinearGradient
                    colors={GoldTheme.gradients.goldButton}
                    style={[
                      styles.audioProgress, 
                      { width: `${Math.max(0, Math.min(100, progress * 100))}%` }
                    ]}
                  />
                  <View style={[styles.audioProgressThumb, { width: 6, height: 6, top: -2, left: `${Math.max(0, Math.min(94, progress * 100))}%` }]} />
                </View>
              </TouchableOpacity>
            </View>
          )}
          
          {!isCompact && (
            <View style={styles.audioTimeContainer}>
              <View style={styles.audioTimeWrapper}>
                <Text style={styles.audioTimeText}>
                  {formatTime(position)}
                </Text>
                <View style={styles.audioTimeSeparator} />
                <Text style={styles.audioDurationText}>
                  {formatTime(duration)}
                </Text>
              </View>
              
              <View style={styles.audioQualityBadge}>
                <Text style={styles.audioQualityText}>HQ</Text>
              </View>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

function ChatDetailHeader({ chatroom, messages }: { chatroom: Chatroom | null; messages: Message[] }) {
  const [showContent, setShowContent] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'images' | 'videos' | 'audio'>('members');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const screenWidth = Dimensions.get('window').width;

  const images = messages.filter(m => m.message_type.includes('picture') && m.media_url);
  const videos = messages.filter(m => m.message_type.includes('video') && m.media_url);
  const audios = messages.filter(m => m.message_type.includes('audio') && m.media_url);

  if (!chatroom) {
    return null;
  }

  const members = chatroom.members || [];
  
  const getGoldGradient = (name: string) => {
    const colors = [
      ['#FFD700', '#FFA500'] as const,
      ['#DAA520', '#B8860B'] as const,
      ['#F4E4BC', '#D4AF37'] as const,
      ['#FFED4E', '#FFD700'] as const,
      ['#FFA500', '#FF8C00'] as const,
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const chatGradient = getGoldGradient(chatroom.name);

  return (
    <>
      <LinearGradient
        colors={[GoldTheme.background.primary, GoldTheme.background.secondary]}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButtonInHeader}
              onPress={() => router.back()}
            activeOpacity={0.7}
          >
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
                style={styles.backButtonGradient}
              >
                <Ionicons name="arrow-back" size={24} color={GoldTheme.gold.primary} />
              </LinearGradient>
          </TouchableOpacity>

            <LinearGradient
              colors={chatGradient}
              style={styles.chatAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.chatAvatarText}>
              {chatroom.name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>

          <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{chatroom.name}</Text>
            <View style={styles.headerInfo}>
              <View style={styles.memberCountBadge}>
                  <Ionicons name="people" size={12} color={GoldTheme.gold.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.memberCountText}>
                    {members.length} {members.length === 1 ? 'member' : 'members'}
                  </Text>
              </View>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowContent(!showContent)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.headerButtonText}>
                    {showContent ? 'Hide' : 'Details'}
                  </Text>
                <Ionicons
                  name={showContent ? 'chevron-up' : 'chevron-down'}
                  size={16}
                    color={GoldTheme.gold.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </SafeAreaView>
      </LinearGradient>
      
      {showContent && (
        <View style={styles.headerPanel}>
          <LinearGradient
            colors={[GoldTheme.background.card, GoldTheme.background.secondary]}
            style={styles.headerPanelGradient}
          >
          <View style={styles.tabRow}>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'members' && styles.tabActive]} 
                onPress={() => setActiveTab('members')}
              >
                <Ionicons 
                  name="people-outline" 
                  size={18} 
                  color={activeTab === 'members' ? GoldTheme.gold.primary : GoldTheme.text.muted} 
                />
                <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>Members</Text>
            </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'images' && styles.tabActive]} 
                onPress={() => setActiveTab('images')}
              >
                <Ionicons 
                  name="image-outline" 
                  size={18} 
                  color={activeTab === 'images' ? GoldTheme.gold.primary : GoldTheme.text.muted} 
                />
                <Text style={[styles.tabText, activeTab === 'images' && styles.tabTextActive]}>Images</Text>
            </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'videos' && styles.tabActive]} 
                onPress={() => setActiveTab('videos')}
              >
                <Ionicons 
                  name="videocam-outline" 
                  size={18} 
                  color={activeTab === 'videos' ? GoldTheme.gold.primary : GoldTheme.text.muted} 
                />
                <Text style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>Videos</Text>
            </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'audio' && styles.tabActive]} 
                onPress={() => setActiveTab('audio')}
              >
                <Ionicons 
                  name="mic-outline" 
                  size={18} 
                  color={activeTab === 'audio' ? GoldTheme.gold.primary : GoldTheme.text.muted} 
                />
                <Text style={[styles.tabText, activeTab === 'audio' && styles.tabTextActive]}>Audio</Text>
            </TouchableOpacity>
          </View>

            <View style={styles.tabContent}>
              {activeTab === 'members' && (
                <ScrollView style={styles.membersContainer} showsVerticalScrollIndicator={false}>
                  {members.map((member, index) => (
                    <View key={index} style={styles.memberItem}>
                      <LinearGradient
                        colors={getGoldGradient(member.username)}
                        style={styles.memberAvatar}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.memberAvatarText}>
                          {member.username.charAt(0).toUpperCase()}
                        </Text>
                      </LinearGradient>
                      <Text style={styles.memberName}>{member.username}</Text>
                      </View>
                  ))}
              </ScrollView>
            )}
              
            {activeTab === 'images' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScrollView}>
                  {images.length > 0 ? (
                    images.map((msg, index) => (
                      <TouchableOpacity key={index} onPress={() => setSelectedImage(msg.media_url!)}>
                        <Image source={{ uri: msg.media_url! }} style={styles.mediaThumbnail} />
                  </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.emptyTabText}>No images yet</Text>
                  )}
              </ScrollView>
            )}
              
            {activeTab === 'videos' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScrollView}>
                  {videos.length > 0 ? (
                    videos.map((msg, index) => (
                      <View key={index} style={styles.mediaVideoWrap}>
                    <VideoPlayer uri={msg.media_url!} />
                  </View>
                    ))
                  ) : (
                    <Text style={styles.emptyTabText}>No videos yet</Text>
                  )}
              </ScrollView>
            )}
              
            {activeTab === 'audio' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScrollView}>
                  {audios.length > 0 ? (
                    audios.map((msg, index) => (
                      <View key={index} style={styles.mediaAudioWrap}>
                    <AudioPlayer uri={msg.media_url!} isCompact={true} />
                  </View>
                    ))
                  ) : (
                    <Text style={styles.emptyTabText}>No audio files yet</Text>
                  )}
              </ScrollView>
            )}
          </View>
          </LinearGradient>
        </View>
      )}

      {/* Full Screen Image Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalOverlayImg}>
            <TouchableOpacity
            style={styles.modalCloseBtn}
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
    </>
  );
}

function VideoPlayer({ uri }: { uri: string }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<AVPlaybackStatus | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const videoRef = useRef<Video>(null);
  const fullscreenVideoRef = useRef<Video>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Set audio mode for video playback
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Error setting audio mode for video:', error);
      }
    };

    setupAudio();

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isFullscreen) {
        setShowControls(false);
      }
    }, 3000);
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    setPlaybackStatus(status);
    
    if (status.isLoaded) {
      setVideoLoaded(true);
      setVideoError(false);
      setIsPlaying(status.isPlaying || false);
      setIsBuffering(status.isBuffering || false);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setShowControls(true);
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      }
    } else {
      if (status.error) {
        console.error('Video playback error:', status.error);
        setVideoError(true);
        setVideoLoaded(false);
        setVideoReady(false);
      }
    }
  };

  const handlePlayPause = async () => {
    if (videoError || !videoReady) return;

    const currentVideoRef = isFullscreen ? fullscreenVideoRef.current : videoRef.current;
    if (!currentVideoRef) return;

    try {
      if (isPlaying) {
        await currentVideoRef.pauseAsync();
      } else {
        await currentVideoRef.playAsync();
      }
      resetControlsTimeout();
    } catch (error) {
      console.error('Error controlling video playback:', error);
      setVideoError(true);
    }
  };

  const seekToPosition = async (seekPosition: number) => {
    if (!playbackStatus?.isLoaded || !videoReady) return;
    
    const currentVideoRef = isFullscreen ? fullscreenVideoRef.current : videoRef.current;
    if (!currentVideoRef) return;

    try {
      const duration = playbackStatus.durationMillis || 0;
      const newPosition = Math.max(0, Math.min(seekPosition, duration));
      await currentVideoRef.setPositionAsync(newPosition);
    } catch (error) {
      console.error('Error seeking video:', error);
    }
  };

  const handleVideoPress = () => {
    if (videoError || !videoReady) return;
    
    if (showControls) {
      resetControlsTimeout();
    } else {
      setShowControls(true);
      resetControlsTimeout();
    }
  };

  const handleDownloadVideo = async () => {
    if (!uri) {
      Alert.alert('Error', 'No video URL available');
      return;
    }
    
    try {
      setIsDownloading(true);
      
      // Create filename
      const filename = uri.split('/').pop()?.split('?')[0] || `video-${Date.now()}.mp4`;
      
      if (Platform.OS === 'web') {
        // Web platform - direct download
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          Alert.alert('Success', 'Video file has been downloaded');
        } catch (error) {
          throw new Error('Failed to download video file for web');
        }
      } else {
        // Native platforms (iOS/Android)
        // Request permissions
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to save video files to your device');
          return;
        }
        
        const localPath = `${FileSystem.documentDirectory}${filename}`;
        
        console.log('Downloading video from:', uri);
        console.log('Saving to:', localPath);
        
        // Download the file
        const downloadResumable = FileSystem.createDownloadResumable(
          uri,
          localPath,
          {},
          (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            console.log('Download progress:', Math.round(progress * 100) + '%');
          }
        );
        
        const downloadResult = await downloadResumable.downloadAsync();
        
        if (downloadResult && downloadResult.uri) {
          console.log('Download completed:', downloadResult.uri);
          
          // Save to device gallery
          const asset = await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
          console.log('Saved to gallery:', asset);
          
          Alert.alert(
            'Success', 
            'Video has been saved to your device gallery',
            [{ text: 'OK' }]
          );
        } else {
          throw new Error('Download failed - no file created');
        }
      }
      
    } catch (error) {
      console.error('Video download error:', error);
      Alert.alert(
        'Download Failed', 
        `Could not download video: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const formatTime = (millis: number) => {
    if (!millis || millis < 0) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const duration = (playbackStatus?.isLoaded ? playbackStatus.durationMillis : 0) || 0;
  const position = (playbackStatus?.isLoaded ? playbackStatus.positionMillis : 0) || 0;
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  // Error state
  if (videoError) {
    return (
      <View style={styles.videoPlayerContainer}>
        <LinearGradient
          colors={[GoldTheme.background.card, GoldTheme.background.secondary]}
          style={styles.videoErrorContainer}
        >
          <Ionicons name="videocam-off" size={32} color={GoldTheme.text.muted} />
          <Text style={styles.videoErrorText}>Video Unavailable</Text>
          <TouchableOpacity 
            style={styles.videoActionButton}
            onPress={handleDownloadVideo}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={GoldTheme.gold.primary} />
            ) : (
              <Ionicons name="download-outline" size={20} color={GoldTheme.gold.primary} />
            )}
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <>
      <View style={styles.videoPlayerContainer}>
        <Video
          ref={videoRef}
          source={{ uri }}
          style={styles.videoPlayer}
          useNativeControls={false}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          isLooping={false}
          onLoad={(loadStatus) => {
            console.log('Video loaded successfully:', loadStatus);
            setVideoLoaded(true);
            setVideoError(false);
            setVideoReady(true);
          }}
          onError={(error) => {
            console.error('Video loading error:', error);
            setVideoError(true);
            setVideoLoaded(false);
            setVideoReady(false);
          }}
          onLoadStart={() => {
            console.log('Video loading started');
            setVideoReady(false);
          }}
        />

        {/* Touch overlay for controls - only when controls are hidden */}
        {!showControls && (
          <TouchableOpacity
            style={styles.videoTouchOverlay}
            onPress={handleVideoPress}
            activeOpacity={1}
          />
        )}
        
        {/* Loading overlay */}
        {(!videoReady && !videoError) || isBuffering && (
          <View style={styles.videoLoadingOverlay}>
            <ActivityIndicator size="large" color={GoldTheme.gold.primary} />
            <Text style={styles.videoLoadingText}>
              {isBuffering ? 'Buffering...' : 'Loading video...'}
            </Text>
          </View>
        )}
        
        {/* Video Controls Overlay */}
        {videoReady && showControls && !isBuffering && (
          <View style={styles.videoOverlay}>
            <LinearGradient
              colors={['rgba(0, 0, 0, 0.3)', 'transparent', 'rgba(0, 0, 0, 0.7)']}
              style={styles.videoOverlayGradient}
              pointerEvents="none"
            />
            
            {/* Top Controls */}
            <View style={styles.videoTopControls}>
              <View style={styles.videoTopRightControls}>
                <TouchableOpacity 
                  style={styles.videoActionButton}
                  onPress={() => setIsFullscreen(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="expand" size={20} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.videoActionButton}
                  onPress={handleDownloadVideo}
                  disabled={isDownloading}
                  activeOpacity={0.8}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="download-outline" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Center controls area - now just for spacing */}
            <View style={styles.videoCenterControls}>
              {/* No play button - users can only expand or download */}
            </View>

            {/* Bottom Controls - simplified for expand/download only */}
            <View style={styles.videoBottomControls}>
              <Text style={styles.videoInfoText}>
                Tap expand to play video
              </Text>
            </View>

            {/* Background touch area for showing/hiding controls */}
            <TouchableOpacity
              style={styles.videoBackgroundTouch}
              onPress={handleVideoPress}
              activeOpacity={1}
            />
          </View>
        )}
      </View>

      {/* Fullscreen Video Modal */}
      <Modal
        visible={isFullscreen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={styles.fullscreenVideoContainer}>
          <TouchableOpacity
            style={styles.fullscreenCloseButton}
            onPress={() => setIsFullscreen(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          <Video
            ref={fullscreenVideoRef}
            source={{ uri }}
            style={styles.fullscreenVideo}
            useNativeControls={true}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={isPlaying}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            onLoad={(loadStatus) => {
              console.log('Fullscreen video loaded:', loadStatus);
            }}
            onError={(error) => {
              console.error('Fullscreen video error:', error);
            }}
          />
        </View>
      </Modal>
    </>
  );
}

type SelectedMediaType = {
  uri: string;
  type: 'image' | 'video' | 'audio';
  mimeType: string;
  name: string;
  size?: number;
  backendType?: string;
};

interface AppWebSocketMessage extends WSMessage {
  data: Message;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GoldTheme.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: GoldTheme.background.primary,
  },
  header: {
    elevation: 8,
    shadowColor: GoldTheme.gold.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButtonInHeader: {
    marginRight: 12,
  },
  backButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...GoldTheme.shadow.gold,
  },
  chatAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: GoldTheme.text.inverse,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: GoldTheme.text.primary,
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
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  memberCountText: {
    fontSize: 12,
    color: GoldTheme.gold.primary,
    fontWeight: '600',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  headerButtonText: {
    fontSize: 12,
    color: GoldTheme.gold.primary,
    marginRight: 4,
    fontWeight: '600',
  },
  headerPanel: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  headerPanelGradient: {
    padding: 16,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: GoldTheme.background.card,
    ...GoldTheme.shadow.gold,
  },
  tabText: {
    fontSize: 12,
    marginLeft: 4,
    color: GoldTheme.text.muted,
    fontWeight: '500',
  },
  tabTextActive: {
    color: GoldTheme.gold.primary,
    fontWeight: '600',
  },
  tabContent: {
    minHeight: 120,
    maxHeight: 200,
  },
  membersContainer: {
    flex: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.1)',
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    ...GoldTheme.shadow.gold,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: GoldTheme.text.inverse,
  },
  memberName: {
    fontSize: 16,
    color: GoldTheme.text.primary,
    fontWeight: '500',
  },
  mediaScrollView: {
    flex: 1,
  },
  mediaThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: GoldTheme.gold.primary,
  },
  mediaVideoWrap: {
    width: 120,
    height: 160,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: GoldTheme.gold.primary,
  },
  mediaAudioWrap: {
    width: 220,
    minHeight: 60,
    backgroundColor: GoldTheme.background.card,
    borderRadius: 8,
    marginRight: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  emptyTabText: {
    fontSize: 14,
    color: GoldTheme.text.muted,
    textAlign: 'center',
    paddingVertical: 40,
    fontStyle: 'italic',
  },
  modalOverlayImg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width - 40,
    height: Dimensions.get('window').height - 200,
    borderRadius: 12,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 100,
  },
  messageContainer: {
    maxWidth: '85%',
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    ...GoldTheme.shadow.dark,
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  ownMessageGradient: {
    padding: 16,
    borderBottomRightRadius: 4,
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  otherMessageBackground: {
    backgroundColor: GoldTheme.background.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
    padding: 16,
    borderBottomLeftRadius: 4,
  },
  messageUsername: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: 'bold',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: GoldTheme.text.inverse,
  },
  otherMessageText: {
    color: GoldTheme.text.primary,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  messageTime: {
    fontSize: 10,
    opacity: 0.7,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherMessageTime: {
    color: GoldTheme.text.muted,
  },
  readIcon: {
    marginLeft: 4,
  },
  mediaContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
  },
  videoPlayerContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoPlayer: {
    width: 220,
    height: 165,
    backgroundColor: GoldTheme.background.primary,
  },
  videoTouchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
  videoLoadingText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 12,
  },
  videoOverlayGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoBackgroundTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  videoTopControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  videoTopRightControls: {
    flexDirection: 'row',
    gap: 8,
  },
  videoCenterControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBottomControls: {
    alignItems: 'center',
  },
  videoActionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  playButtonGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...GoldTheme.shadow.gold,
  },
  videoTimeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  videoInfoText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  videoProgressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  videoProgressBar: {
    width: '90%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  videoProgress: {
    height: '100%',
    backgroundColor: GoldTheme.gold.primary,
    borderRadius: 2,
  },
  fullscreenVideoContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenVideo: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 100,
  },
  videoErrorContainer: {
    width: 220,
    height: 165,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 12,
  },
  videoErrorText: {
    fontSize: 14,
    color: GoldTheme.text.muted,
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  videoDownloadButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPlayerContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    minWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    ...GoldTheme.shadow.dark,
    position: 'relative',
  },
  audioPlayerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
  },
  audioWaveBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    opacity: 0.1,
  },
  audioWaveBar: {
    width: 3,
    backgroundColor: GoldTheme.gold.primary,
    borderRadius: 2,
  },
  audioPlayButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginRight: 16,
    ...GoldTheme.shadow.gold,
  },
  audioButtonGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioInfoContainer: {
    flex: 1,
  },
  audioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  audioTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  audioIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  audioTitleText: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: GoldTheme.text.primary,
    marginBottom: 2,
  },
  audioSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: GoldTheme.gold.primary,
    opacity: 0.8,
  },
  audioProgressBar: {
    marginBottom: 8,
  },
  audioProgressBarContainer: {
    width: '100%',
    paddingVertical: 8,
  },
  audioProgressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 2,
  },
  audioErrorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  audioErrorText: {
    fontSize: 12,
    color: GoldTheme.text.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  audioProgress: {
    height: '100%',
    backgroundColor: GoldTheme.gold.primary,
    borderRadius: 2,
  },
  audioProgressThumb: {
    position: 'absolute',
    top: -2,
    width: 8,
    height: 8,
    backgroundColor: GoldTheme.gold.primary,
    borderRadius: 4,
    ...GoldTheme.shadow.gold,
  },
  audioTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audioTimeText: {
    fontSize: 12,
    color: GoldTheme.text.secondary,
    fontWeight: '500',
  },
  audioDurationText: {
    fontSize: 12,
    color: GoldTheme.text.muted,
    fontWeight: '400',
  },
  audioDownloadButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  downloadButtonGradient: {
    padding: 8,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioTimeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  audioTimeSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GoldTheme.text.muted,
    marginHorizontal: 6,
    opacity: 0.5,
  },
  audioQualityBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  audioQualityText: {
    fontSize: 10,
    fontWeight: '700',
    color: GoldTheme.gold.primary,
  },
  // Compact styles for header audio player
  audioPlayerCompact: {
    minWidth: 200,
    borderRadius: 12,
  },
  audioPlayerGradientCompact: {
    padding: 12,
  },
  audioWaveBackgroundCompact: {
    paddingHorizontal: 12,
  },
  audioPlayButtonCompact: {
    borderRadius: 18,
    marginRight: 10,
  },
  audioButtonGradientCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  audioErrorCompact: {
    padding: 10,
  },
  audioErrorTextCompact: {
    fontSize: 10,
    marginTop: 4,
  },
  inputContainer: {
    backgroundColor: GoldTheme.background.primary,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
  mediaPreview: {
    backgroundColor: GoldTheme.background.card,
    margin: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  mediaPreviewContent: {
    position: 'relative',
    alignItems: 'center',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  videoPreview: {
    width: 120,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
  },
  audioPreview: {
    width: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: GoldTheme.background.primary,
    borderRadius: 12,
    padding: 2,
  },
  fileInfoContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  fileName: {
    fontSize: 12,
    color: GoldTheme.text.secondary,
    textAlign: 'center',
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: GoldTheme.background.secondary,
  },
  attachButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  textInput: {
    flex: 1,
    backgroundColor: GoldTheme.background.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: GoldTheme.text.primary,
    maxHeight: 100,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  sendButton: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendButtonActive: {
    ...GoldTheme.shadow.gold,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledInput: {
    opacity: 0.7,
  },
  uploadingText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default function ChatDetailScreen() {
  const { id: chatroomIdFromParams } = useLocalSearchParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatroom, setChatroom] = useState<Chatroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const processedMessages = useRef(new Set<string>());
  
  const [messageText, setMessageText] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMediaType | null>(null);
  const [pickingMedia, setPickingMedia] = useState<boolean>(false);
  
  const {
    connectToRoom,
    disconnectFromRoom,
    addMessageHandler,
    removeMessageHandler,
    isConnected,
  } = useWebSocket();

  const chatroomId = typeof chatroomIdFromParams === 'string' ? chatroomIdFromParams : null;

  // WebSocket message handler
    const handleIncomingMessage = (newMessage: AppWebSocketMessage | WSMessage) => {
    console.log('[Chat] Received WebSocket message:', newMessage);
    
    if ('data' in newMessage && newMessage.data && typeof newMessage.data === 'object') {
      const messageData = newMessage.data as Message;
      
      if (messageData.id && !processedMessages.current.has(messageData.id)) {
        processedMessages.current.add(messageData.id);

          setMessages(prevMessages => {
          const messageExists = prevMessages.some(msg => msg.id === messageData.id);
          if (!messageExists) {
            const updatedMessages = [messageData, ...prevMessages];
            return updatedMessages.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
          }
          return prevMessages;
        });
      }
    }
  };

  // Connect to WebSocket
  useEffect(() => {
    if (chatroomId && user?.id) {
      console.log('[Chat] Setting up WebSocket connection for room:', chatroomId);

    addMessageHandler(handleIncomingMessage);
      connectToRoom(chatroomId);

    return () => {
        console.log('[Chat] Cleaning up WebSocket connection');
      removeMessageHandler(handleIncomingMessage);
        disconnectFromRoom();
    };
    }
  }, [chatroomId, user?.id]);

  const fetchChatroom = async () => {
    if (!chatroomId) return;
    
    try {
      const response = await chatAPI.getConversationById(chatroomId);
      setChatroom(response.chatroom);
    } catch (error) {
      console.error('Error fetching chatroom:', error);
      Alert.alert('Error', 'Failed to load chatroom details');
    }
  };

  const fetchMessages = async () => {
    if (!chatroomId) return;
    
    try {
      setLoading(true);
      const response = await chatAPI.getMessages(chatroomId, 1, 50);
      const sortedMessages = (response.messages || []).sort((a, b) => 
        new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
      );
      setMessages(sortedMessages);
      
      sortedMessages.forEach(msg => {
        if (msg.id) processedMessages.current.add(msg.id);
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chatroomId) {
      fetchChatroom();
      fetchMessages();
    }
  }, [chatroomId]);

  // Web file picker function
  const pickFileForWeb = (acceptTypes: string): Promise<SelectedMediaType | null> => {
    console.log('[Web File Picker] Starting file picker with accept types:', acceptTypes);
    console.log('[Web File Picker] Platform.OS:', Platform.OS);
    console.log('[Web File Picker] typeof document:', typeof document);
    console.log('[Web File Picker] typeof window:', typeof window);
    console.log('[Web File Picker] navigator.userAgent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'undefined');
    
    return new Promise<SelectedMediaType | null>((resolve, reject) => {
      try {
        // Check if we're actually in a web environment
        if (typeof document === 'undefined' || typeof window === 'undefined') {
          console.error('[Web File Picker] document or window is undefined - not in web environment');
          console.error('[Web File Picker] document:', typeof document, 'window:', typeof window);
          reject(new Error('DOM APIs not available - not in web environment'));
          return;
        }
        
        // Additional check for DOM methods
        if (typeof document.createElement !== 'function') {
          console.error('[Web File Picker] document.createElement is not a function');
          reject(new Error('document.createElement not available'));
          return;
        }

        console.log('[Web File Picker] Creating input element...');
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = acceptTypes;
        input.style.display = 'none';
        input.style.position = 'absolute';
        input.style.left = '-9999px';
        
        console.log('[Web File Picker] Input element created:', {
          type: input.type,
          accept: input.accept,
          style: input.style.cssText
        });
        
        let fileProcessed = false;
        
        input.onchange = (event) => {
          console.log('[Web File Picker] Input change event triggered');
          
          if (fileProcessed) {
            console.log('[Web File Picker] File already processed, ignoring duplicate event');
            return;
          }
          
          try {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            
            console.log('[Web File Picker] Files from input:', target.files);
            console.log('[Web File Picker] Selected file:', file);
            
            if (file) {
              fileProcessed = true;
              console.log('[Web File Picker] File details:', {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
              });
              
              const reader = new FileReader();
              
              reader.onload = () => {
                try {
                  console.log('[Web File Picker] FileReader onload triggered');
                  const uri = reader.result as string;
                  const fileSize = Math.round(file.size / 1024);
                  
                  let mediaType: 'image' | 'video' | 'audio' = 'image';
                  let backendType = 'picture';
                  
                  if (file.type.startsWith('audio/')) {
                    mediaType = 'audio';
                    backendType = 'audio';
                  } else if (file.type.startsWith('video/')) {
                    mediaType = 'video';
                    backendType = 'video';
                  } else if (file.type.startsWith('image/')) {
                    mediaType = 'image';
                    backendType = 'picture';
                  }
                  
                  console.log('[Web File Picker] File processed:', {
                    mediaType,
                    backendType,
                    fileSize,
                    uriLength: uri.length,
                    uriStart: uri.substring(0, 50)
                  });
                  
                  const media: SelectedMediaType = {
                    uri,
                    type: mediaType,
                    mimeType: file.type,
                    name: file.name,
                    size: fileSize,
                    backendType,
                  };
                  
                  console.log('[Web File Picker] Resolving with media object');
                  resolve(media);
                } catch (error) {
                  console.error('[Web File Picker] Error in FileReader onload:', error);
                  reject(error);
                } finally {
                  // Cleanup
                  try {
                    if (document.body.contains(input)) {
                      document.body.removeChild(input);
                      console.log('[Web File Picker] Input element removed from DOM');
                    }
                  } catch (cleanupError) {
                    console.warn('[Web File Picker] Error during cleanup:', cleanupError);
                  }
                }
              };
              
              reader.onerror = (error) => {
                console.error('[Web File Picker] FileReader error:', error);
                reject(new Error('Failed to read file'));
                try {
                  if (document.body.contains(input)) {
                    document.body.removeChild(input);
                  }
                } catch (cleanupError) {
                  console.warn('[Web File Picker] Error during cleanup after FileReader error:', cleanupError);
                }
              };
              
              console.log('[Web File Picker] Starting to read file as data URL...');
              reader.readAsDataURL(file);
            } else {
              console.log('[Web File Picker] No file selected, resolving with null');
              resolve(null);
              try {
                if (document.body.contains(input)) {
                  document.body.removeChild(input);
                }
              } catch (cleanupError) {
                console.warn('[Web File Picker] Error during cleanup when no file selected:', cleanupError);
              }
            }
          } catch (error) {
            console.error('[Web File Picker] Error in input change handler:', error);
            reject(error);
          }
        };
        
        input.oncancel = () => {
          console.log('[Web File Picker] File selection canceled');
          resolve(null);
          try {
            if (document.body.contains(input)) {
              document.body.removeChild(input);
            }
          } catch (cleanupError) {
            console.warn('[Web File Picker] Error during cleanup on cancel:', cleanupError);
          }
        };
        
        // Add error handler for input element
        input.onerror = (error) => {
          console.error('[Web File Picker] Input element error:', error);
          reject(new Error('File input error'));
        };
        
        console.log('[Web File Picker] Appending input to document body...');
        document.body.appendChild(input);
        
        console.log('[Web File Picker] Triggering input click...');
        input.click();
        
        console.log('[Web File Picker] File picker should now be open');
        
        // Add a timeout as fallback
        setTimeout(() => {
          if (!fileProcessed) {
            console.warn('[Web File Picker] Timeout reached without file processing');
            try {
              if (document.body.contains(input)) {
                document.body.removeChild(input);
              }
            } catch (cleanupError) {
              console.warn('[Web File Picker] Error during timeout cleanup:', cleanupError);
            }
          }
        }, 60000); // 1 minute timeout
        
      } catch (error) {
        console.error('[Web File Picker] Error in pickFileForWeb setup:', error);
        reject(error);
      }
    });
  };

    const handlePickMedia = async () => {
    console.log('[handlePickMedia] Starting media picker process');
    console.log('[handlePickMedia] Platform.OS:', Platform.OS);
    console.log('[handlePickMedia] Current state - pickingMedia:', pickingMedia, 'selectedMedia:', !!selectedMedia);
    
    setPickingMedia(true);
    try {
      console.log('[handlePickMedia] About to show media type selection');
      
      // For web, directly trigger file picker for all files
      if (Platform.OS === 'web') {
        console.log('[handlePickMedia] Web platform detected - opening file picker for all files');
        
        try {
          const media = await pickFileForWeb('*/*');
          console.log('[handlePickMedia] Web file picker returned:', media);
          if (media) {
            console.log('[handlePickMedia] Setting selected media:', media);
            setSelectedMedia(media);
          } else {
            console.log('[handlePickMedia] No file selected from web picker');
          }
        } catch (error) {
          console.error('[handlePickMedia] Error with web file picker:', error);
          Alert.alert('Error', 'Failed to pick file. Please try again.');
        }
        
        setPickingMedia(false);
        return;
      }
      
      // For native platforms, use Alert.alert
      console.log('[handlePickMedia] Native platform - showing Alert.alert');
      Alert.alert(
        'Select Media Type',
        'What type of media would you like to add?',
        [
          {
            text: 'Photo/Video',
            onPress: async () => {
              try {
                console.log('[handlePickMedia] Photo/Video option selected (native)');
                console.log('[handlePickMedia] Using native image picker');
                // Request permissions for image picker
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                
                if (permissionResult.status !== 'granted') {
                  Alert.alert('Permission Required', 'Please allow access to your photo library to select images and videos.');
                  setPickingMedia(false);
                  return;
                }

                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.All,
                  allowsEditing: false,
                  quality: 0.8,
                  allowsMultipleSelection: false,
                });

                if (!result.canceled && result.assets && result.assets.length > 0) {
                  const asset = result.assets[0];
                  const fileSize = Math.round((asset.fileSize || 0) / 1024);

                  let mediaType: 'image' | 'video' | 'audio' = 'image';
                  let backendType = 'picture';
                  
                  if (asset.type === 'video') {
                    mediaType = 'video';
                    backendType = 'video';
                  }
                  
                  const media: SelectedMediaType = {
                    uri: asset.uri,
                    type: mediaType,
                    mimeType: asset.mimeType || 'image/jpeg',
                    name: asset.fileName || `${mediaType}-${Date.now()}.${mediaType === 'video' ? 'mp4' : 'jpg'}`,
                    size: fileSize,
                    backendType,
                  };
                  
                  setSelectedMedia(media);
                }
              } catch (error) {
                console.error('[handlePickMedia] Error picking image/video:', error);
                Alert.alert('Error', 'Failed to pick image/video. Please try again.');
              } finally {
                console.log('[handlePickMedia] Photo/Video picker finished, setting pickingMedia to false');
                setPickingMedia(false);
              }
            }
          },
          {
            text: 'Audio File',
            onPress: async () => {
              try {
                console.log('[handlePickMedia] Audio File option selected (native)');
                console.log('[handlePickMedia] Using native document picker for audio');
                const result = await DocumentPicker.getDocumentAsync({
                  type: ['audio/*', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac'],
                  copyToCacheDirectory: true,
                  multiple: false,
                });

                console.log('Document picker result:', result);

                if (!result.canceled && result.assets && result.assets.length > 0) {
                  const asset = result.assets[0];
                  const fileSize = Math.round((asset.size || 0) / 1024);
                  
                  console.log('Selected audio file:', {
                    name: asset.name,
                    size: fileSize,
                    mimeType: asset.mimeType,
                    uri: asset.uri.substring(0, 50) + '...'
                  });

                  const media: SelectedMediaType = {
                    uri: asset.uri,
                    type: 'audio',
                    mimeType: asset.mimeType || 'audio/mpeg',
                    name: asset.name || `audio-${Date.now()}.mp3`,
                    size: fileSize,
                    backendType: 'audio',
                  };
                  
                  setSelectedMedia(media);
                  console.log('Audio media selected successfully');
                } else {
                  console.log('Audio file selection was canceled or no file selected');
                }
              } catch (error) {
                console.error('[handlePickMedia] Error picking audio:', error);
                Alert.alert('Error', `Failed to pick audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
              } finally {
                console.log('[handlePickMedia] Audio picker finished, setting pickingMedia to false');
                setPickingMedia(false);
              }
            }
          },
          {
            text: 'All Files',
            onPress: async () => {
              try {
                console.log('[handlePickMedia] All Files option selected (native)');
                console.log('[handlePickMedia] Using native document picker for all files');
                const result = await DocumentPicker.getDocumentAsync({
                  type: '*/*',
                  copyToCacheDirectory: true,
                  multiple: false,
                });

                console.log('Document picker result:', result);

                if (!result.canceled && result.assets && result.assets.length > 0) {
                  const asset = result.assets[0];
                  const fileSize = Math.round((asset.size || 0) / 1024);
                  
                  // Determine file type from MIME type
                  let mediaType: 'image' | 'video' | 'audio' = 'image';
                  let backendType = 'picture';
                  
                  if (asset.mimeType) {
                    if (asset.mimeType.startsWith('audio/')) {
                      mediaType = 'audio';
                      backendType = 'audio';
                    } else if (asset.mimeType.startsWith('video/')) {
                      mediaType = 'video';
                      backendType = 'video';
                    } else if (asset.mimeType.startsWith('image/')) {
                      mediaType = 'image';
                      backendType = 'picture';
                    }
                  }
                  
                  console.log('Selected file:', {
                    name: asset.name,
                    size: fileSize,
                    mimeType: asset.mimeType,
                    type: mediaType,
                    uri: asset.uri.substring(0, 50) + '...'
                  });

                  const media: SelectedMediaType = {
                    uri: asset.uri,
                    type: mediaType,
                    mimeType: asset.mimeType || 'application/octet-stream',
                    name: asset.name || `file-${Date.now()}`,
                    size: fileSize,
                    backendType,
                  };
                  
                  setSelectedMedia(media);
                  console.log('File selected successfully');
                } else {
                  console.log('File selection was canceled or no file selected');
                }
              } catch (error) {
                console.error('[handlePickMedia] Error picking file:', error);
                Alert.alert('Error', `Failed to pick file: ${error instanceof Error ? error.message : 'Unknown error'}`);
              } finally {
                console.log('[handlePickMedia] All files picker finished, setting pickingMedia to false');
                setPickingMedia(false);
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              console.log('[handlePickMedia] Cancel button pressed');
              setPickingMedia(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('[handlePickMedia] Error in media picker setup:', error);
      Alert.alert('Error', 'Failed to open media picker');
      setPickingMedia(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !selectedMedia) || sending || isUploading || !chatroomId) {
      return;
    }

    try {
      setSending(true);
      let mediaUrl: string | null = null;
      let messageType: MessageType = 'text';

      if (selectedMedia) {
        setIsUploading(true);
        try {
                     const uploadResult = await mediaAPI.uploadMedia(
             {
            uri: selectedMedia.uri, 
            type: selectedMedia.mimeType,
            name: selectedMedia.name
             },
             selectedMedia.backendType || 'picture'
           );
           mediaUrl = uploadResult.media_url;
          messageType = selectedMedia.backendType as MessageType || 'picture';
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          Alert.alert('Upload Failed', 'Could not upload media. Please try again.');
          return;
        } finally {
          setIsUploading(false);
        }
      }

      const messageData: any = {
        text_content: messageText.trim() || null,
        message_type: messageType,
      };

      if (mediaUrl) {
        messageData.media_url = mediaUrl;
      }

      await chatAPI.sendMessage(chatroomId, messageData);
      
      setMessageText('');
      setSelectedMedia(null);

    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
  };

  const getUserGradient = (userId: number) => {
    const gradients = [
      ['#E91E63', '#AD1457'],
      ['#9C27B0', '#7B1FA2'],
      ['#673AB7', '#512DA8'],
      ['#3F51B5', '#303F9F'],
      ['#2196F3', '#1976D2'],
      ['#009688', '#00796B'],
      ['#4CAF50', '#388E3C'],
      ['#FF9800', '#F57C00'],
    ];
    return gradients[userId % gradients.length];
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = user?.id === item.sender_id;
    const messageDate = new Date(item.sent_at);
    const formattedTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

    const userGradient = !isOwnMessage ? getUserGradient(item.sender_id) : null;

    const handleImageClick = (imageUrl: string) => {
        setSelectedImage(imageUrl);
    };

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        {isOwnMessage ? (
          <LinearGradient
            colors={GoldTheme.gradients.goldButton}
            style={styles.ownMessageGradient}
          >
        {item.media_url && (
          <View style={styles.mediaContainer}>
            {item.message_type.includes('picture') && (
                  <TouchableOpacity onPress={() => handleImageClick(item.media_url!)}>
                <Image
                  source={{ uri: item.media_url }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            {item.message_type.includes('video') && (
                  <View style={styles.videoPlayerContainer}>
                <VideoPlayer uri={item.media_url!} />
              </View>
            )}
            {item.message_type.includes('audio') && (
                <AudioPlayer uri={item.media_url!} />
            )}
          </View>
        )}

        {item.text_content && (
              <Text style={[styles.messageText, styles.ownMessageText]}>
            {item.text_content}
              </Text>
        )}

        <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, styles.ownMessageTime]}>
            {formattedTime} • {formattedDate}
              </Text>
            <Ionicons
              name="checkmark-done"
              size={14}
                color="rgba(255, 255, 255, 0.8)"
              style={styles.readIcon}
            />
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.otherMessageBackground}>
            <Text style={[styles.messageUsername, { color: userGradient ? userGradient[0] : GoldTheme.gold.primary }]}>
              {item.sender_name}
            </Text>

            {item.media_url && (
              <View style={styles.mediaContainer}>
                {item.message_type.includes('picture') && (
                  <TouchableOpacity onPress={() => handleImageClick(item.media_url!)}>
                    <Image
                      source={{ uri: item.media_url }}
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
                {item.message_type.includes('video') && (
                  <View style={styles.videoPlayerContainer}>
                    <VideoPlayer uri={item.media_url!} />
        </View>
                )}
                {item.message_type.includes('audio') && (
                  <AudioPlayer uri={item.media_url!} />
                )}
              </View>
            )}

            {item.text_content && (
              <Text style={[styles.messageText, styles.otherMessageText]}>
                {item.text_content}
              </Text>
            )}

            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, styles.otherMessageTime]}>
                {formattedTime} • {formattedDate}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[GoldTheme.background.primary, GoldTheme.background.secondary]}
        style={styles.loadingContainer}
      >
        <StatusBar barStyle="light-content" backgroundColor={GoldTheme.background.primary} />
        <ActivityIndicator size="large" color={GoldTheme.gold.primary} />
        <Text style={{ color: GoldTheme.text.secondary, marginTop: 16 }}>Loading chat...</Text>
      </LinearGradient>
    );
  }

  if (!chatroomId) {
    return (
      <LinearGradient
        colors={[GoldTheme.background.primary, GoldTheme.background.secondary]}
        style={styles.loadingContainer}
      >
        <StatusBar barStyle="light-content" backgroundColor={GoldTheme.background.primary} />
        <Text style={{ color: GoldTheme.status.error, fontSize: 16, marginBottom: 20 }}>Error: Chatroom ID is missing.</Text>
        <GoldButton title="Go Back" onPress={() => router.back()} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[GoldTheme.background.primary, GoldTheme.background.secondary]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={GoldTheme.background.primary} />
      
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
        <ChatDetailHeader chatroom={chatroom} messages={messages} />

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
          inverted={true}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            // When inverted, no need to scroll to end manually
          }}
          onLayout={() => {
            // When inverted, the latest messages are automatically at the top
          }}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />

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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.inputContainer}
      >
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
                  <Ionicons name="close-circle" size={24} color={GoldTheme.status.error} />
              </TouchableOpacity>
            </View>

            {selectedMedia.name && (
              <View style={styles.fileInfoContainer}>
                  <Text style={styles.fileName}>
                  {selectedMedia.name} 
                  {selectedMedia.size ? ` (${selectedMedia.size} KB)` : ''}
                  </Text>
              </View>
            )}
          </View>
        )}

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
                <ActivityIndicator size="small" color={GoldTheme.gold.primary} />
            ) : (
                <Ionicons name="attach" size={24} color={GoldTheme.gold.primary} />
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
              placeholderTextColor={GoldTheme.text.muted}
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
              <LinearGradient
                colors={GoldTheme.gradients.goldButton}
                style={styles.sendButtonGradient}
          >
            {isUploading ? (
                  <View style={{ alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={GoldTheme.text.inverse} />
                    <Text style={styles.uploadingText}>Uploading</Text>
              </View>
            ) : sending ? (
                  <ActivityIndicator size="small" color={GoldTheme.text.inverse} />
            ) : (
                  <Ionicons name="send" size={22} color={GoldTheme.text.inverse} />
            )}
              </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </KeyboardAvoidingView>
    </LinearGradient>
  );
}