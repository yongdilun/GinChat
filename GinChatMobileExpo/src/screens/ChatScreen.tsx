import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { chatAPI } from '../services/api';

type Conversation = {
  id: string;
  participants: {
    id: string;
    name: string;
    avatar?: string;
  }[];
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
};

type RootStackParamList = {
  ChatDetail: { chatId: string; chatName: string };
};

type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ChatDetail'>;

const ChatScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const navigation = useNavigation<ChatScreenNavigationProp>();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await chatAPI.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations');
      // Set some dummy data for development
      setConversations([
        {
          id: '1',
          participants: [
            { id: '2', name: 'John Doe', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
          ],
          lastMessage: {
            content: 'Hey, how are you doing?',
            createdAt: '2023-05-21T10:30:00Z',
            senderId: '2',
          },
          unreadCount: 2,
        },
        {
          id: '2',
          participants: [
            { id: '3', name: 'Jane Smith', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
          ],
          lastMessage: {
            content: 'The meeting is scheduled for tomorrow',
            createdAt: '2023-05-20T15:45:00Z',
            senderId: '3',
          },
          unreadCount: 0,
        },
        {
          id: '3',
          participants: [
            { id: '4', name: 'Team GinChat', avatar: 'https://randomuser.me/api/portraits/lego/3.jpg' },
          ],
          lastMessage: {
            content: 'Welcome to the team chat!',
            createdAt: '2023-05-19T08:15:00Z',
            senderId: '4',
          },
          unreadCount: 5,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    // In a real app, you'd filter out the current user
    return conversation.participants[0];
  };

  const filteredConversations = conversations.filter(conversation => {
    const participant = getOtherParticipant(conversation);
    return (
      participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleChatPress = (conversation: Conversation) => {
    const otherParticipant = getOtherParticipant(conversation);
    navigation.navigate('ChatDetail', {
      chatId: conversation.id,
      chatName: otherParticipant.name,
    });
  };

  const renderChatItem = ({ item }: { item: Conversation }) => {
    const participant = getOtherParticipant(item);
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
      >
        <Image 
          source={{ uri: participant.avatar || 'https://via.placeholder.com/150' }} 
          style={styles.avatar} 
        />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{participant.name}</Text>
            <Text style={styles.chatTime}>{formatTimestamp(item.lastMessage.createdAt)}</Text>
          </View>
          <View style={styles.chatFooter}>
            <Text 
              style={styles.lastMessage} 
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.lastMessage.content}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchConversations}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={item => item.id}
          renderItem={renderChatItem}
          contentContainerStyle={styles.chatList}
          refreshing={loading}
          onRefresh={fetchConversations}
        />
      )}

      <TouchableOpacity style={styles.newChatButton}>
        <Icon name="chatbubble-ellipses" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 16,
    paddingHorizontal: 10,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  chatList: {
    paddingHorizontal: 16,
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  newChatButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
});

export default ChatScreen; 