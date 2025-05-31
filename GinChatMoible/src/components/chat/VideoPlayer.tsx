import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { GoldTheme } from '../../../constants/GoldTheme';
import { videoPlayerStyles } from './styles/videoPlayerStyles';

interface VideoPlayerProps {
  uri: string;
  isCompact?: boolean;
  isHeaderMode?: boolean; // New prop for header display
  isPreview?: boolean; // New prop for message input preview
}

export function VideoPlayer({ uri, isCompact = false, isHeaderMode = false, isPreview = false }: VideoPlayerProps) {
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
        console.log('[VideoPlayer] Video finished, resetting to beginning');
        setIsPlaying(false);
        setShowControls(true);
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
        // Reset video to beginning when it finishes and stop playback
        setTimeout(async () => {
          const currentVideoRef = isFullscreen ? fullscreenVideoRef.current : videoRef.current;
          if (currentVideoRef) {
            try {
              await currentVideoRef.setPositionAsync(0);
              await currentVideoRef.pauseAsync();
              console.log('[VideoPlayer] Video reset to beginning and stopped');
            } catch (error) {
              console.error('[VideoPlayer] Error resetting video:', error);
            }
          }
        }, 100);
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
        console.log('[VideoPlayer] Pausing video');
        await currentVideoRef.pauseAsync();
      } else {
        // Check if video has ended (position is at or near the end)
        if (playbackStatus?.isLoaded) {
          const duration = playbackStatus.durationMillis || 0;
          const position = playbackStatus.positionMillis || 0;
          const isAtEnd = duration > 0 && position >= duration - 500; // Within 0.5 second of end

          if (isAtEnd) {
            console.log('[VideoPlayer] Video at end, resetting to beginning');
            // Reset to beginning if video has ended
            await currentVideoRef.setPositionAsync(0);
          }
        }

        console.log('[VideoPlayer] Starting video playback');
        await currentVideoRef.playAsync();
      }
      resetControlsTimeout();
    } catch (error) {
      console.error('[VideoPlayer] Error controlling video playback:', error);
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
  const hasEnded = playbackStatus?.isLoaded && playbackStatus.didJustFinish;

  // Error state
  if (videoError) {
    return (
      <View style={videoPlayerStyles.videoPlayerContainer}>
        <LinearGradient
          colors={[GoldTheme.background.card, GoldTheme.background.secondary]}
          style={videoPlayerStyles.videoErrorContainer}
        >
          <Ionicons name="videocam-off" size={32} color={GoldTheme.text.muted} />
          <Text style={videoPlayerStyles.videoErrorText}>Video Unavailable</Text>
          <TouchableOpacity
            style={videoPlayerStyles.videoActionButton}
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
      <View style={[
        videoPlayerStyles.videoPlayerContainer,
        isCompact && videoPlayerStyles.videoPlayerCompact,
        isPreview && videoPlayerStyles.videoPlayerPreview
      ]}>
        <Video
          ref={videoRef}
          source={{ uri }}
          style={videoPlayerStyles.videoPlayer}
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
            style={videoPlayerStyles.videoTouchOverlay}
            onPress={handleVideoPress}
            activeOpacity={1}
          />
        )}

        {/* Loading overlay */}
        {(!videoReady && !videoError) || isBuffering && (
          <View style={videoPlayerStyles.videoLoadingOverlay}>
            <ActivityIndicator size="large" color={GoldTheme.gold.primary} />
            <Text style={videoPlayerStyles.videoLoadingText}>
              {isBuffering ? 'Buffering...' : 'Loading video...'}
            </Text>
          </View>
        )}

        {/* Video Controls Overlay */}
        {videoReady && showControls && !isBuffering && (
          <View style={videoPlayerStyles.videoOverlay}>
            <LinearGradient
              colors={['rgba(0, 0, 0, 0.3)', 'transparent', 'rgba(0, 0, 0, 0.7)']}
              style={videoPlayerStyles.videoOverlayGradient}
              pointerEvents="none"
            />

            {/* Background touch area for showing/hiding controls */}
            <TouchableOpacity
              style={videoPlayerStyles.videoBackgroundTouch}
              onPress={() => {
                console.log('Background touch pressed');
                handleVideoPress();
              }}
              activeOpacity={1}
            />

            {/* Top Controls */}
            <View style={videoPlayerStyles.videoTopControls}>
              <View style={videoPlayerStyles.videoTopRightControls}>
                <TouchableOpacity
                  style={videoPlayerStyles.videoActionButton}
                  onPress={() => {
                    console.log('Expand button pressed');
                    setIsFullscreen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="expand" size={20} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={videoPlayerStyles.videoActionButton}
                  onPress={() => {
                    console.log('Download button pressed');
                    handleDownloadVideo();
                  }}
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

            {/* Center controls area - play button (hidden in header mode) */}
            {!isHeaderMode && (
              <View style={videoPlayerStyles.videoCenterControls}>
                <TouchableOpacity
                  style={[
                    videoPlayerStyles.videoPlayButton,
                    isCompact && videoPlayerStyles.videoPlayButtonCompact
                  ]}
                  onPress={() => {
                    console.log('Play/pause button pressed');
                    handlePlayPause();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={hasEnded ? "refresh" : isPlaying ? "pause" : "play"}
                    size={isCompact ? 24 : 40}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom Controls (hidden in header mode) */}
            {!isHeaderMode && (
              <View style={videoPlayerStyles.videoBottomControls}>
                <Text style={videoPlayerStyles.videoTimeText}>
                  {formatTime(position)} / {formatTime(duration)}
                </Text>

                {/* Progress bar */}
                <View style={videoPlayerStyles.videoProgressContainer}>
                  <TouchableOpacity
                    style={videoPlayerStyles.videoProgressBar}
                    onPress={(event) => {
                      if (duration > 0) {
                        const { locationX } = event.nativeEvent;
                        const progressBarWidth = 256; // Approximate width
                        const seekRatio = Math.max(0, Math.min(1, locationX / progressBarWidth));
                        const seekPosition = seekRatio * duration;
                        console.log('Progress bar pressed:', { locationX, seekRatio, seekPosition });
                        seekToPosition(seekPosition);
                      }
                    }}
                    activeOpacity={1}
                  >
                    <View
                      style={[
                        videoPlayerStyles.videoProgressFill,
                        { width: `${progress * 100}%` }
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
        <View style={videoPlayerStyles.fullscreenVideoContainer}>
          <TouchableOpacity
            style={videoPlayerStyles.fullscreenCloseButton}
            onPress={() => setIsFullscreen(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <Video
            ref={fullscreenVideoRef}
            source={{ uri }}
            style={videoPlayerStyles.fullscreenVideo}
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
