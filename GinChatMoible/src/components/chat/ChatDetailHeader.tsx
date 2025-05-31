import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Chatroom, Message, chatAPI } from '@/services/api';
import { GoldTheme } from '../../../constants/GoldTheme';
import { Logger } from '@/utils/logger';
import { AudioPlayer } from './AudioPlayer';
import { VideoPlayer } from './VideoPlayer';
import { ImageModal } from './ImageModal';
import { chatHeaderStyles } from './styles/chatHeaderStyles';

interface ChatDetailHeaderProps {
  chatroom: Chatroom | null;
  onThreeDotPress?: () => void;
  refreshTrigger?: number; // Simple trigger to refresh media (increment to refresh)
}

export function ChatDetailHeader({
  chatroom,
  onThreeDotPress,
  refreshTrigger
}: ChatDetailHeaderProps) {
  const [showContent, setShowContent] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'images' | 'videos' | 'audio'>('members');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mediaMessages, setMediaMessages] = useState<Message[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Fetch media messages when chatroom changes or when content is shown
  useEffect(() => {
    const fetchMediaMessages = async () => {
      if (!chatroom?.id || !showContent) {
        return;
      }

      setLoadingMedia(true);
      setMediaError(null);

      try {
        Logger.debug('[ChatDetailHeader] Fetching media for chatroom:', chatroom.id);
        const response = await chatAPI.getChatroomMedia(chatroom.id);
        Logger.debug('[ChatDetailHeader] Media fetched successfully:', {
          count: response.count,
          messages: response.messages.length
        });
        setMediaMessages(response.messages);
      } catch (error) {
        Logger.error('[ChatDetailHeader] Failed to fetch media:', error);
        setMediaError('Failed to load media');
        setMediaMessages([]);
      } finally {
        setLoadingMedia(false);
      }
    };

    fetchMediaMessages();
  }, [chatroom?.id, showContent, refreshTrigger]); // Add refreshTrigger to dependencies

  // Filter media messages by type
  const images = mediaMessages.filter(m => {
    const hasImageType = m.message_type && (
      m.message_type.includes('picture') ||
      m.message_type === 'picture' ||
      m.message_type === 'text_and_picture'
    );
    const hasMediaUrl = m.media_url && m.media_url.trim() !== '';
    return hasImageType && hasMediaUrl;
  });

  const videos = mediaMessages.filter(m => {
    const hasVideoType = m.message_type && (
      m.message_type.includes('video') ||
      m.message_type === 'video' ||
      m.message_type === 'text_and_video'
    );
    const hasMediaUrl = m.media_url && m.media_url.trim() !== '';
    return hasVideoType && hasMediaUrl;
  });

  const audios = mediaMessages.filter(m => {
    const hasAudioType = m.message_type && (
      m.message_type.includes('audio') ||
      m.message_type === 'audio' ||
      m.message_type === 'text_and_audio'
    );
    const hasMediaUrl = m.media_url && m.media_url.trim() !== '';
    return hasAudioType && hasMediaUrl;
  });

  // Debug logging (only in development)
  if (mediaMessages.length > 0) {
    Logger.debug('[ChatDetailHeader] Media loaded:', {
      total: mediaMessages.length,
      images: images.length,
      videos: videos.length,
      audios: audios.length
    });
  }

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
        style={chatHeaderStyles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={chatHeaderStyles.headerContent}>
            <TouchableOpacity
              style={chatHeaderStyles.backButtonInHeader}
              onPress={() => {
                Logger.debug('[Header] Back button pressed');
                router.back();
              }}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
                style={chatHeaderStyles.backButtonGradient}
              >
                <Ionicons name="arrow-back" size={24} color={GoldTheme.gold.primary} />
              </LinearGradient>
            </TouchableOpacity>

            <LinearGradient
              colors={chatGradient}
              style={chatHeaderStyles.chatAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={chatHeaderStyles.chatAvatarText}>
                {chatroom.name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>

            <View style={chatHeaderStyles.headerTextContainer}>
              <Text style={chatHeaderStyles.headerTitle}>{chatroom.name}</Text>
              <View style={chatHeaderStyles.headerInfo}>
                <View style={chatHeaderStyles.memberCountBadge}>
                  <Ionicons name="people" size={12} color={GoldTheme.gold.primary} style={{ marginRight: 4 }} />
                  <Text style={chatHeaderStyles.memberCountText}>
                    {members.length} {members.length === 1 ? 'member' : 'members'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={chatHeaderStyles.headerButton}
                  onPress={() => {
                    Logger.debug('[Header] Details button pressed, current showContent:', showContent);
                    setShowContent(!showContent);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={chatHeaderStyles.headerButtonText}>
                    {showContent ? 'Hide' : 'Details'}
                  </Text>
                  <Ionicons
                    name={showContent ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={GoldTheme.gold.primary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={chatHeaderStyles.headerButton}
                  onPress={() => {
                    Logger.debug('[Chat] Three-dot menu pressed');
                    if (onThreeDotPress) {
                      onThreeDotPress();
                    } else {
                      Alert.alert('Info', 'Chatroom actions not available');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={20}
                    color={GoldTheme.gold.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {showContent && (
        <View style={chatHeaderStyles.headerPanel}>
          <LinearGradient
            colors={[GoldTheme.background.card, GoldTheme.background.secondary]}
            style={chatHeaderStyles.headerPanelGradient}
          >
            <View style={chatHeaderStyles.tabRow}>
              <TouchableOpacity
                style={[chatHeaderStyles.tabButton, activeTab === 'members' && chatHeaderStyles.tabActive]}
                onPress={() => setActiveTab('members')}
              >
                <Ionicons
                  name="people-outline"
                  size={18}
                  color={activeTab === 'members' ? GoldTheme.gold.primary : GoldTheme.text.muted}
                />
                <Text style={[chatHeaderStyles.tabText, activeTab === 'members' && chatHeaderStyles.tabTextActive]}>Members</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[chatHeaderStyles.tabButton, activeTab === 'images' && chatHeaderStyles.tabActive]}
                onPress={() => setActiveTab('images')}
              >
                <Ionicons
                  name="image-outline"
                  size={18}
                  color={activeTab === 'images' ? GoldTheme.gold.primary : GoldTheme.text.muted}
                />
                <Text style={[chatHeaderStyles.tabText, activeTab === 'images' && chatHeaderStyles.tabTextActive]}>Images</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[chatHeaderStyles.tabButton, activeTab === 'videos' && chatHeaderStyles.tabActive]}
                onPress={() => setActiveTab('videos')}
              >
                <Ionicons
                  name="videocam-outline"
                  size={18}
                  color={activeTab === 'videos' ? GoldTheme.gold.primary : GoldTheme.text.muted}
                />
                <Text style={[chatHeaderStyles.tabText, activeTab === 'videos' && chatHeaderStyles.tabTextActive]}>Videos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[chatHeaderStyles.tabButton, activeTab === 'audio' && chatHeaderStyles.tabActive]}
                onPress={() => setActiveTab('audio')}
              >
                <Ionicons
                  name="mic-outline"
                  size={18}
                  color={activeTab === 'audio' ? GoldTheme.gold.primary : GoldTheme.text.muted}
                />
                <Text style={[chatHeaderStyles.tabText, activeTab === 'audio' && chatHeaderStyles.tabTextActive]}>Audio</Text>
              </TouchableOpacity>
            </View>

            <View style={chatHeaderStyles.tabContent}>
              {activeTab === 'members' && (
                <ScrollView style={chatHeaderStyles.membersContainer} showsVerticalScrollIndicator={false}>
                  {members.map((member, index) => (
                    <View key={index} style={chatHeaderStyles.memberItem}>
                      <LinearGradient
                        colors={getGoldGradient(member.username)}
                        style={chatHeaderStyles.memberAvatar}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={chatHeaderStyles.memberAvatarText}>
                          {member.username.charAt(0).toUpperCase()}
                        </Text>
                      </LinearGradient>
                      <Text style={chatHeaderStyles.memberName}>{member.username}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}

              {activeTab === 'images' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={chatHeaderStyles.mediaScrollView}>
                  {loadingMedia ? (
                    <View style={chatHeaderStyles.loadingContainer}>
                      <ActivityIndicator size="small" color={GoldTheme.gold.primary} />
                      <Text style={chatHeaderStyles.loadingText}>Loading images...</Text>
                    </View>
                  ) : mediaError ? (
                    <Text style={chatHeaderStyles.errorText}>{mediaError}</Text>
                  ) : images.length > 0 ? (
                    images.map((msg, index) => (
                      <TouchableOpacity
                        key={`image-${msg.id}-${index}`}
                        onPress={() => setSelectedImage(msg.media_url!)}
                      >
                        <Image
                          source={{ uri: msg.media_url! }}
                          style={chatHeaderStyles.mediaThumbnail}
                          onError={(error) => {
                            Logger.error('[ChatDetailHeader] Image load error:', error, 'URL:', msg.media_url);
                          }}
                        />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={chatHeaderStyles.loadingContainer}>
                      <Text style={chatHeaderStyles.emptyTabText}>No images uploaded</Text>
                    </View>
                  )}
                </ScrollView>
              )}

              {activeTab === 'videos' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={chatHeaderStyles.mediaScrollView}>
                  {loadingMedia ? (
                    <View style={chatHeaderStyles.loadingContainer}>
                      <ActivityIndicator size="small" color={GoldTheme.gold.primary} />
                      <Text style={chatHeaderStyles.loadingText}>Loading videos...</Text>
                    </View>
                  ) : mediaError ? (
                    <Text style={chatHeaderStyles.errorText}>{mediaError}</Text>
                  ) : videos.length > 0 ? (
                    videos.map((msg, index) => (
                      <View key={`video-${msg.id}-${index}`} style={chatHeaderStyles.mediaVideoWrap}>
                        <VideoPlayer
                          uri={msg.media_url!}
                          isCompact={true}
                          isHeaderMode={true}
                        />
                      </View>
                    ))
                  ) : (
                    <View style={chatHeaderStyles.loadingContainer}>
                      <Text style={chatHeaderStyles.emptyTabText}>No videos uploaded</Text>
                    </View>
                  )}
                </ScrollView>
              )}

              {activeTab === 'audio' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={chatHeaderStyles.mediaScrollView}>
                  {loadingMedia ? (
                    <View style={chatHeaderStyles.loadingContainer}>
                      <ActivityIndicator size="small" color={GoldTheme.gold.primary} />
                      <Text style={chatHeaderStyles.loadingText}>Loading audio...</Text>
                    </View>
                  ) : mediaError ? (
                    <Text style={chatHeaderStyles.errorText}>{mediaError}</Text>
                  ) : audios.length > 0 ? (
                    audios.map((msg, index) => (
                      <View key={`audio-${msg.id}-${index}`} style={chatHeaderStyles.mediaAudioWrap}>
                        <AudioPlayer
                          uri={msg.media_url!}
                          isCompact={true}
                        />
                      </View>
                    ))
                  ) : (
                    <View style={chatHeaderStyles.loadingContainer}>
                      <Text style={chatHeaderStyles.emptyTabText}>No audio uploaded</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </LinearGradient>
        </View>
      )}

      <ImageModal
        visible={!!selectedImage}
        imageUri={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  );
}
