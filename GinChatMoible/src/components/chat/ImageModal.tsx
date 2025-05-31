import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { imageModalStyles } from './styles/imageModalStyles';

interface ImageModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

export function ImageModal({ visible, imageUri, onClose }: ImageModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={imageModalStyles.overlay}>
        <TouchableOpacity
          style={imageModalStyles.closeButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={imageModalStyles.fullScreenImage}
            resizeMode="contain"
          />
        )}
      </View>
    </Modal>
  );
}
