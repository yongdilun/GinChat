import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '../constants/Colors';

interface ChatroomMember {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
}

interface Chatroom {
  id: string;
  name: string;
  members: ChatroomMember[];
}

interface ChatHeaderProps {
  chatroom: Chatroom | null;
  onBack?: () => void;
}

export default function ChatHeader({ chatroom, onBack }: ChatHeaderProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!chatroom) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">No chatroom selected</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header Bar */}
      <ThemedView style={styles.headerBar}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.titleContainer} 
          onPress={() => setShowDetails(!showDetails)}
        >
          <ThemedText style={styles.title}>{chatroom.name}</ThemedText>
          <ThemedView style={styles.memberCount}>
            <ThemedText style={styles.memberCountText}>
              {chatroom.members.length} members
            </ThemedText>
          </ThemedView>
        </TouchableOpacity>
      </ThemedView>

      {/* Details Panel */}
      {showDetails && (
        <ThemedView style={styles.detailsPanel}>
          <ThemedView style={styles.tabHeader}>
            <ThemedText style={styles.sectionTitle}>Members</ThemedText>
          </ThemedView>

          <ScrollView style={styles.membersList}>
            {chatroom.members.map((member, index) => (
              <ThemedView key={index} style={styles.memberItem}>
                <ThemedView style={styles.avatar}>
                  <ThemedText style={styles.avatarText}>
                    {member.name.charAt(0).toUpperCase()}
                  </ThemedText>
                </ThemedView>
                <ThemedText style={styles.memberName}>
                  {member.name || member.username || `User ${member.id}`}
                </ThemedText>
              </ThemedView>
            ))}
          </ScrollView>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    marginRight: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberCount: {
    marginTop: 2,
  },
  memberCountText: {
    fontSize: 12,
    opacity: 0.7,
  },
  detailsPanel: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  tabHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  membersList: {
    maxHeight: 200,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 14,
  },
}); 