import React, { useState } from 'react';
import { Modal, View, TextInput, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { chatAPI } from '@/services/api';
import { Colors } from '@/constants/Colors';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface CreateChatroomModalProps {
  visible: boolean;
  onClose: () => void;
  onChatroomCreated: (chatroom: any) => void;
}

const CreateChatroomModal: React.FC<CreateChatroomModalProps> = ({
  visible,
  onClose,
  onChatroomCreated,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter a chatroom name');
      return;
    }

    if (name.length < 3) {
      setError('Chatroom name must be at least 3 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await chatAPI.createConversation([], name.trim());
      console.log('Chatroom created successfully:', response);
      
      if (response && response.chatroom) {
        onChatroomCreated(response.chatroom);
        setName('');
        onClose();
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err: any) {
      console.error('Error creating chatroom:', err);
      setError(err.message || 'Failed to create chatroom');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.overlay}>
        <ThemedView style={styles.modalContent}>
          <ThemedText style={styles.title}>Create New Chatroom</ThemedText>
          
          {error ? (
            <ThemedText style={styles.error}>{error}</ThemedText>
          ) : null}
          
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter chatroom name"
            placeholderTextColor="#666"
          />
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <ThemedText style={styles.buttonText}>Cancel</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText style={[styles.buttonText, styles.createButtonText]}>
                  Create
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  error: {
    color: '#FF0000',
    marginBottom: 10,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  createButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  createButtonText: {
    color: '#FFFFFF',
  },
});

export default CreateChatroomModal; 