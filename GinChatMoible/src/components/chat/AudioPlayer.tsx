import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { GoldTheme } from '../../../constants/GoldTheme';
import { audioPlayerStyles } from './styles/audioPlayerStyles';

interface AudioPlayerProps {
  uri: string;
  isCompact?: boolean;
  isPreview?: boolean;
}

export function AudioPlayer({ uri, isCompact = false, isPreview = false }: AudioPlayerProps) {
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

  // Render compact/preview version
  if (isCompact || isPreview) {
    return (
      <View style={audioPlayerStyles.compactContainer}>
        <TouchableOpacity
          onPress={playSound}
          style={audioPlayerStyles.compactPlayButton}
          disabled={isLoading || audioError}
        >
          <LinearGradient
            colors={GoldTheme.gradients.goldButton}
            style={audioPlayerStyles.compactButtonGradient}
          >
            <Ionicons
              name={isLoading ? 'hourglass-outline' : isPlaying ? 'pause' : 'play'}
              size={16}
              color={GoldTheme.text.inverse}
              style={{ marginLeft: isPlaying || isLoading ? 0 : 1 }}
            />
          </LinearGradient>
        </TouchableOpacity>

        <View style={audioPlayerStyles.compactInfo}>
          <View style={audioPlayerStyles.compactWaveform}>
            {waveAnimationValues.slice(0, 6).map((height, index) => (
              <View
                key={index}
                style={[
                  audioPlayerStyles.compactWaveBar,
                  {
                    height: Math.max(2, height * (isPlaying ? 8 : 4)),
                    opacity: isPlaying ? height : 0.4
                  }
                ]}
              />
            ))}
          </View>

          <Text style={audioPlayerStyles.compactDuration}>
            {duration > 0 ? formatTime(duration) : '0:00'}
          </Text>
        </View>

        {!isPreview && (
          <TouchableOpacity
            onPress={handleDownload}
            disabled={isDownloading}
            style={audioPlayerStyles.compactDownloadButton}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={GoldTheme.gold.primary} />
            ) : (
              <Ionicons name="download-outline" size={14} color={GoldTheme.gold.primary} />
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Error state for full version
  if (audioError) {
    return (
      <View style={audioPlayerStyles.audioPlayerContainer}>
        <View style={audioPlayerStyles.audioErrorContainer}>
          <Ionicons name="musical-notes" size={24} color={GoldTheme.text.muted} />
          <Text style={audioPlayerStyles.audioErrorText}>Audio Unavailable</Text>
        </View>
      </View>
    );
  }

  // Full version
  return (
    <View style={audioPlayerStyles.audioPlayerContainer}>
      <LinearGradient
        colors={['rgba(45, 45, 45, 0.85)', 'rgba(25, 25, 25, 0.95)']}
        style={audioPlayerStyles.audioPlayerGradient}
      >
        <View style={audioPlayerStyles.audioContent}>
          <TouchableOpacity
            onPress={playSound}
            style={audioPlayerStyles.audioPlayButton}
            disabled={isLoading || audioError}
          >
            <LinearGradient
              colors={GoldTheme.gradients.goldButton}
              style={audioPlayerStyles.audioButtonGradient}
            >
              <Ionicons
                name={isLoading ? 'hourglass-outline' : isPlaying ? 'pause' : 'play'}
                size={20}
                color={GoldTheme.text.inverse}
                style={{ marginLeft: isPlaying || isLoading ? 0 : 2 }}
              />
            </LinearGradient>
          </TouchableOpacity>

          <View style={audioPlayerStyles.audioInfoContainer}>
            <View style={audioPlayerStyles.audioHeader}>
              <View style={audioPlayerStyles.audioTitleContainer}>
                <View style={audioPlayerStyles.audioIconWrapper}>
                  <Ionicons name="musical-notes" size={18} color="#FFD700" />
                </View>
                <View style={audioPlayerStyles.audioTitleText}>
                  <Text style={audioPlayerStyles.audioTitle}>Audio Message</Text>
                  <Text style={audioPlayerStyles.audioSubtitle}>
                    {isPlaying ? 'Playing...' : isLoading ? 'Loading...' : 'Tap to play'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleDownload}
                disabled={isDownloading}
                style={audioPlayerStyles.audioDownloadButton}
              >
                <LinearGradient
                  colors={isDownloading ? ['#888', '#666'] : ['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
                  style={audioPlayerStyles.downloadButtonGradient}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color={GoldTheme.gold.primary} />
                  ) : (
                    <Ionicons name="download-outline" size={18} color={GoldTheme.gold.primary} />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={audioPlayerStyles.audioProgressBar}>
              <TouchableOpacity
                style={audioPlayerStyles.audioProgressBarContainer}
                onPress={(event) => {
                  if (duration > 0) {
                    const { locationX } = event.nativeEvent;
                    const progressBarWidth = 220;
                    const seekRatio = Math.max(0, Math.min(1, locationX / progressBarWidth));
                    const seekPosition = seekRatio * duration;
                    seekToPosition(seekPosition);
                  }
                }}
              >
                <View style={audioPlayerStyles.audioProgressBarTrack}>
                  <LinearGradient
                    colors={GoldTheme.gradients.goldButton}
                    style={[
                      audioPlayerStyles.audioProgress,
                      { width: `${Math.max(0, Math.min(100, progress * 100))}%` }
                    ]}
                  />
                  <View style={[audioPlayerStyles.audioProgressThumb, { left: `${Math.max(0, Math.min(94, progress * 100))}%` }]} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={audioPlayerStyles.audioTimeContainer}>
              <View style={audioPlayerStyles.audioTimeWrapper}>
                <Text style={audioPlayerStyles.audioTimeText}>
                  {formatTime(position)}
                </Text>
                <View style={audioPlayerStyles.audioTimeSeparator} />
                <Text style={audioPlayerStyles.audioDurationText}>
                  {formatTime(duration)}
                </Text>
              </View>

              <View style={audioPlayerStyles.audioQualityBadge}>
                <Text style={audioPlayerStyles.audioQualityText}>HQ</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
