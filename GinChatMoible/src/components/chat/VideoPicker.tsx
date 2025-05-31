import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { GoldTheme } from '../../../constants/GoldTheme';

// Compatibility layer for different expo-image-picker versions
const getMediaTypes = () => {
  if (ImagePicker.MediaType) {
    return {
      Videos: [ImagePicker.MediaType.Videos],
    };
  } else if (ImagePicker.MediaTypeOptions) {
    return {
      Videos: ImagePicker.MediaTypeOptions.Videos,
    };
  } else {
    return {
      Videos: 'Videos',
    };
  }
};

const MediaTypes = getMediaTypes();

interface VideoPickerProps {
  onVideoSelected: (video: {
    uri: string;
    type: 'video';
    mimeType: string;
    name: string;
    size?: number;
    backendType: string;
  }) => void;
  disabled?: boolean;
}

export function VideoPicker({ onVideoSelected, disabled = false }: VideoPickerProps) {
  const pickVideo = async (source: 'camera' | 'library') => {
    try {
      // Request permissions
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to record videos.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Media library permission is required to select videos.');
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: MediaTypes.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max
        videoQuality: ImagePicker.VideoQuality?.Medium || 1,
      };

      let result;
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Validate that it's actually a video
        if (asset.type !== 'video') {
          Alert.alert('Invalid Selection', 'Please select a video file.');
          return;
        }

        // Check duration (max 60 seconds)
        if (asset.duration && asset.duration > 60000) {
          Alert.alert('Video Too Long', 'Please select a video shorter than 60 seconds.');
          return;
        }

        const video = {
          uri: asset.uri,
          type: 'video' as const,
          mimeType: 'video/mp4',
          name: asset.fileName || `video_${Date.now()}.mp4`,
          size: asset.fileSize ? Math.round(asset.fileSize / 1024) : undefined,
          backendType: 'video',
        };

        console.log('[VideoPicker] Video selected:', {
          uri: video.uri.substring(0, 50) + '...',
          type: video.type,
          name: video.name,
          size: video.size,
          duration: asset.duration
        });

        onVideoSelected(video);
      }
    } catch (error) {
      console.error('[VideoPicker] Error picking video:', error);
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  };

  const showVideoOptions = () => {
    Alert.alert(
      'Select Video',
      'Choose how you want to add a video',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Record Video', onPress: () => pickVideo('camera') },
        { text: 'Choose from Gallery', onPress: () => pickVideo('library') },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.videoButton, disabled && styles.disabledButton]}
      onPress={showVideoOptions}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons
        name="videocam"
        size={20}
        color={disabled ? GoldTheme.text.muted : GoldTheme.gold.primary}
      />
      <Text style={[styles.buttonText, disabled && styles.disabledText]}>
        Video
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    marginRight: 8,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: GoldTheme.gold.primary,
    marginLeft: 4,
  },
  disabledText: {
    color: GoldTheme.text.muted,
  },
});
