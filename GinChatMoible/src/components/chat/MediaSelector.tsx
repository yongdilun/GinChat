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
import * as DocumentPicker from 'expo-document-picker';
import { GoldTheme } from '../../../constants/GoldTheme';
import { SelectedMediaType } from '../../hooks/useMediaPicker';

// Compatibility layer for different expo-image-picker versions
const getMediaTypes = () => {
  if (ImagePicker.MediaType) {
    return {
      Images: [ImagePicker.MediaType.Images],
      Videos: [ImagePicker.MediaType.Videos],
    };
  } else if (ImagePicker.MediaTypeOptions) {
    return {
      Images: ImagePicker.MediaTypeOptions.Images,
      Videos: ImagePicker.MediaTypeOptions.Videos,
    };
  } else {
    return {
      Images: 'Images',
      Videos: 'Videos',
    };
  }
};

const MediaTypes = getMediaTypes();

interface MediaSelectorProps {
  onMediaSelected: (media: SelectedMediaType) => void;
  disabled?: boolean;
}

export function MediaSelector({ onMediaSelected, disabled = false }: MediaSelectorProps) {
  const pickImage = async (source: 'camera' | 'library') => {
    try {
      // Request permissions
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to take photos.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Media library permission is required to select photos.');
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: MediaTypes.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      };

      let result;
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        const image: SelectedMediaType = {
          uri: asset.uri,
          type: 'image',
          mimeType: 'image/jpeg',
          name: asset.fileName || `image_${Date.now()}.jpg`,
          size: asset.fileSize ? Math.round(asset.fileSize / 1024) : undefined,
          backendType: 'picture',
        };

        console.log('[MediaSelector] Image selected:', {
          uri: image.uri.substring(0, 50) + '...',
          type: image.type,
          name: image.name,
          size: image.size
        });

        onMediaSelected(image);
      }
    } catch (error) {
      console.error('[MediaSelector] Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

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

        const video: SelectedMediaType = {
          uri: asset.uri,
          type: 'video',
          mimeType: 'video/mp4',
          name: asset.fileName || `video_${Date.now()}.mp4`,
          size: asset.fileSize ? Math.round(asset.fileSize / 1024) : undefined,
          backendType: 'video',
        };

        console.log('[MediaSelector] Video selected:', {
          uri: video.uri.substring(0, 50) + '...',
          type: video.type,
          name: video.name,
          size: video.size,
          duration: asset.duration
        });

        onMediaSelected(video);
      }
    } catch (error) {
      console.error('[MediaSelector] Error picking video:', error);
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  };

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        const audio: SelectedMediaType = {
          uri: asset.uri,
          type: 'audio',
          mimeType: asset.mimeType || 'audio/mpeg',
          name: asset.name,
          size: asset.size ? Math.round(asset.size / 1024) : undefined,
          backendType: 'audio',
        };

        console.log('[MediaSelector] Audio selected:', {
          uri: audio.uri.substring(0, 50) + '...',
          type: audio.type,
          name: audio.name,
          size: audio.size
        });

        onMediaSelected(audio);
      }
    } catch (error) {
      console.error('[MediaSelector] Error picking audio:', error);
      Alert.alert('Error', 'Failed to select audio file. Please try again.');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add an image',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => pickImage('camera') },
        { text: 'Choose from Gallery', onPress: () => pickImage('library') },
      ]
    );
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
    <View style={styles.container}>
      {/* Image Button */}
      <TouchableOpacity
        style={[styles.mediaButton, disabled && styles.disabledButton]}
        onPress={showImageOptions}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name="image"
          size={20}
          color={disabled ? GoldTheme.text.muted : GoldTheme.gold.primary}
        />
      </TouchableOpacity>

      {/* Video Button */}
      <TouchableOpacity
        style={[styles.mediaButton, disabled && styles.disabledButton]}
        onPress={showVideoOptions}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name="videocam"
          size={20}
          color={disabled ? GoldTheme.text.muted : GoldTheme.gold.primary}
        />
      </TouchableOpacity>

      {/* Audio Button */}
      <TouchableOpacity
        style={[styles.mediaButton, disabled && styles.disabledButton]}
        onPress={pickAudio}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name="musical-notes"
          size={20}
          color={disabled ? GoldTheme.text.muted : GoldTheme.gold.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
});
