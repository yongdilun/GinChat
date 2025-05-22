import React, { useState } from 'react';
import { StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '../constants/Colors';
import { chatAPI } from '../services/api';

interface CreateChatroomModalProps {
  visible: boolean;
  onClose: () => void;
  onChatroomCreated: (chatroom: any) => void;
}

export default function CreateChatroomModal({ visible, onClose, onChatroomCreated }: CreateChatroomModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a chatroom name');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const newChatroom = await chatAPI.createConversation([], name);
      onChatroomCreated(newChatroom);
      setName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create chatroom. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <ThemedView 
          style={styles.modalContent}
          onTouchEnd={(e) => {
            e.stopPropagation();
          }}
        >
          <TouchableWithoutFeedback>
            <ThemedView>
              <ThemedView style={styles.header}>
                <ThemedText type="title">Create New Chatroom</ThemedText>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </ThemedView>

              {error ? <ThemedText type="error" style={styles.error}>{error}</ThemedText> : null}

              <ThemedText style={styles.label}>Chatroom Name</ThemedText>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter chatroom name"
                placeholderTextColor="#9E9E9E"
              />

              <ThemedView style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={onClose}
                  disabled={loading}
                >
                  <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.createButton, !name.trim() && styles.createButtonDisabled]} 
                  onPress={handleCreate}
                  disabled={!name.trim() || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ThemedText style={styles.createButtonText}>Create</ThemedText>
                  )}
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>
          </TouchableWithoutFeedback>
        </ThemedView>
      </TouchableOpacity>
    </Modal>
  );
}

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  error: {
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: Colors.text.primary,
    fontWeight: '500',
  },
  createButton: {
    flex: 1,
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  createButtonDisabled: {
    backgroundColor: Colors.gray[400],
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
}); 