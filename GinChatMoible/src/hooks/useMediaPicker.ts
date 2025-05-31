import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

// Compatibility layer for different expo-image-picker versions
const getMediaTypes = () => {
  // Try new API first, fallback to old API
  if (ImagePicker.MediaType) {
    return {
      All: [ImagePicker.MediaType.Images, ImagePicker.MediaType.Videos],
      Images: [ImagePicker.MediaType.Images],
      Videos: [ImagePicker.MediaType.Videos],
    };
  } else if (ImagePicker.MediaTypeOptions) {
    return {
      All: ImagePicker.MediaTypeOptions.All,
      Images: ImagePicker.MediaTypeOptions.Images,
      Videos: ImagePicker.MediaTypeOptions.Videos,
    };
  } else {
    // Fallback for very old versions
    return {
      All: 'All',
      Images: 'Images',
      Videos: 'Videos',
    };
  }
};

const MediaTypes = getMediaTypes();

export interface SelectedMediaType {
  uri: string;
  type: 'image' | 'video' | 'audio';
  mimeType?: string;
  name?: string;
  size?: number;
  backendType: string;
}

export function useMediaPicker() {
  const [selectedMedia, setSelectedMedia] = useState<SelectedMediaType | null>(null);
  const [pickingMedia, setPickingMedia] = useState(false);

  // Web file picker function
  const pickFileForWeb = useCallback((acceptTypes: string): Promise<SelectedMediaType | null> => {
    console.log('[Web File Picker] Starting file picker with accept types:', acceptTypes);

    return new Promise<SelectedMediaType | null>((resolve, reject) => {
      try {
        // Check if we're actually in a web environment
        if (typeof document === 'undefined' || typeof window === 'undefined') {
          console.error('[Web File Picker] document or window is undefined - not in web environment');
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

        // Timeout fallback
        setTimeout(() => {
          if (!fileProcessed) {
            console.log('[Web File Picker] Timeout reached, cleaning up...');
            try {
              if (document.body.contains(input)) {
                document.body.removeChild(input);
              }
            } catch (cleanupError) {
              console.warn('[Web File Picker] Error during timeout cleanup:', cleanupError);
            }
            resolve(null);
          }
        }, 30000); // 30 second timeout

      } catch (error) {
        console.error('[Web File Picker] Error in pickFileForWeb:', error);
        reject(error);
      }
    });
  }, []);

  const handlePickMedia = useCallback(async () => {
    if (pickingMedia) return;

    setPickingMedia(true);
    try {
      if (Platform.OS === 'web') {
        console.log('[Media Picker] Using web file picker');
        const media = await pickFileForWeb('image/*,video/*,audio/*');
        if (media) {
          setSelectedMedia(media);
        }
      } else {
        // Native platforms
        Alert.alert(
          'Select Media',
          'Choose the type of media you want to send',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Photo/Video', onPress: () => pickFromGallery() },
            { text: 'Camera', onPress: () => pickFromCamera() },
            { text: 'Audio File', onPress: () => pickDocument() },
          ]
        );
      }
    } catch (error) {
      console.error('[Media Picker] Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media');
    } finally {
      setPickingMedia(false);
    }
  }, [pickingMedia, pickFileForWeb]);

  const pickFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: MediaTypes.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedMedia({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          mimeType: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
          name: asset.fileName || `${asset.type}_${Date.now()}`,
          size: asset.fileSize ? Math.round(asset.fileSize / 1024) : undefined,
          backendType: asset.type === 'video' ? 'video' : 'picture',
        });
      }
    } catch (error) {
      console.error('Error picking from camera:', error);
      Alert.alert('Error', 'Failed to access camera');
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: MediaTypes.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedMedia({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          mimeType: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
          name: asset.fileName || `${asset.type}_${Date.now()}`,
          size: asset.fileSize ? Math.round(asset.fileSize / 1024) : undefined,
          backendType: asset.type === 'video' ? 'video' : 'picture',
        });
      }
    } catch (error) {
      console.error('Error picking from gallery:', error);
      Alert.alert('Error', 'Failed to access gallery');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedMedia({
          uri: asset.uri,
          type: 'audio',
          mimeType: asset.mimeType || 'audio/mpeg',
          name: asset.name,
          size: asset.size ? Math.round(asset.size / 1024) : undefined,
          backendType: 'audio',
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleRemoveMedia = useCallback(() => {
    setSelectedMedia(null);
  }, []);

  return {
    selectedMedia,
    pickingMedia,
    handlePickMedia,
    handleRemoveMedia,
    setSelectedMedia,
  };
}
