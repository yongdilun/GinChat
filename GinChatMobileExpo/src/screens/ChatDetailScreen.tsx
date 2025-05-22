import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  AppState,
  AppStateStatus
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import uuid from 'react-native-uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

import websocketService, { ConnectionState } from '@/services/websocket';
import { chatAPI } from '@/services/api';
import MessageBubble from '../components/MessageBubble';
import IconButton from '../components/IconButton';
import { colors } from '../utils/theme';
import { Message } from '../types';

const ChatDetailScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    websocketService.getConnectionState()
  );
  const [page, setPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const route = useRoute();
  const navigation = useNavigation();
  const { conversationId, recipientName } = route.params as { 
    conversationId: string;
    recipientName: string;
  };
  const appStateRef = useRef(AppState.currentState);

  // Handle app state changes for websocket
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        // App came to foreground
        websocketService.setAppActive(true);
      } else if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App went to background
        websocketService.setAppActive(false);
      }
      
      appStateRef.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Set up header title
  useEffect(() => {
    navigation.setOptions({
      title: recipientName,
      headerRight: () => (
        <View style={styles.connectionIndicator}>
          <View 
            style={[
              styles.connectionDot, 
              { backgroundColor: getConnectionColor(connectionState) }
            ]} 
          />
        </View>
      ),
    });
  }, [navigation, recipientName, connectionState]);

  // Load user ID
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        setUserId(storedUserId);
      } catch (error) {
        console.error('Error loading user ID:', error);
      }
    };
    loadUserId();
  }, []);

  // Monitor connection state
  useEffect(() => {
    const unsubscribe = websocketService.onConnectionStateChanged((state) => {
      setConnectionState(state);
      
      // Reconnected - refresh messages
      if (state === ConnectionState.CONNECTED && !isLoading) {
        loadMessages();
      }
    });
    
    return unsubscribe;
  }, [isLoading]);

  // Load initial messages and set up WebSocket
  useFocusEffect(
    useCallback(() => {
      loadMessages();
      
      // Connect to WebSocket
      websocketService.connect();
      
      // Listen for new messages
      const messageUnsubscribe = websocketService.onMessage((newMessage: Message) => {
        if (newMessage.conversationId === conversationId) {
          setMessages(prev => [newMessage, ...prev]);
        }
      });
      
      const errorUnsubscribe = websocketService.onError((error) => {
        console.error('WebSocket error:', error);
      });
      
      // Clean up
      return () => {
        messageUnsubscribe();
        errorUnsubscribe();
      };
    }, [conversationId])
  );

  // Load messages from API
  const loadMessages = async (pageToLoad = 1) => {
    try {
      const isInitialLoad = pageToLoad === 1;
      
      if (isInitialLoad) {
        setIsLoading(true);
        setLoadingError(null);
      } else {
        setIsLoadingMore(true);
      }
      
      const response = await chatAPI.getMessages(conversationId, pageToLoad, 20);
      
      if (isInitialLoad) {
        setMessages(response.messages || []);
      } else {
        setMessages(prev => [...prev, ...(response.messages || [])]);
      }
      
      setHasMoreMessages(response.hasMore || false);
      setPage(pageToLoad);
    } catch (error) {
      console.error('Error loading messages:', error);
      setLoadingError('Failed to load messages. Please try again.');
      
      if (pageToLoad === 1 && (!messages || messages.length === 0)) {
        // Set dummy messages for development
        setMessages([
          {
            id: '1',
            content: 'Hello there!',
            senderId: 'other-user',
            conversationId,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: '2',
            content: 'Hi! How are you?',
            senderId: userId || 'current-user',
            conversationId,
            timestamp: new Date(Date.now() - 3500000).toISOString(),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Load more messages when scrolling up
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreMessages) {
      loadMessages(page + 1);
    }
  };

  // Get connection status indicator color
  const getConnectionColor = (state: ConnectionState) => {
    switch(state) {
      case ConnectionState.CONNECTED:
        return '#4CAF50'; // Green
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return '#FFC107'; // Yellow
      case ConnectionState.DISCONNECTED:
      case ConnectionState.FAILED:
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Gray
    }
  };

  // Send message
  const sendMessage = () => {
    if (!inputText.trim() || !userId) return;

    const newMessage: Message = {
      id: uuid.v4() as string,
      content: inputText.trim(),
      senderId: userId,
      conversationId,
      timestamp: new Date().toISOString(),
    };

    // Optimistically add to UI
    setMessages(prev => [newMessage, ...prev]);
    
    // Clear input first for better UX
    setInputText('');
    
    // Send via websocket
    websocketService.sendMessage(newMessage);
    
    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  };

  // Retry connection
  const handleRetryConnection = () => {
    websocketService.connect();
  };

  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Render error state
  if (loadingError && (!messages || messages.length === 0)) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{loadingError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadMessages()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {connectionState === ConnectionState.FAILED && (
        <TouchableOpacity 
          style={styles.connectionBanner}
          onPress={handleRetryConnection}
        >
          <Text style={styles.connectionBannerText}>
            Connection lost. Tap to reconnect.
          </Text>
        </TouchableOpacity>
      )}
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwnMessage={item.senderId === userId}
            />
          )}
          contentContainerStyle={styles.messageList}
          inverted={true}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loadingMore} />
            ) : null
          }
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            multiline
            maxLength={1000}
          />
          <IconButton
            name="send"
            size={24}
            color={colors.primary}
            onPress={sendMessage}
            disabled={!inputText.trim() || connectionState !== ConnectionState.CONNECTED}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
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
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    fontSize: 16,
  },
  connectionIndicator: {
    marginRight: 16,
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectionBanner: {
    backgroundColor: '#f44336',
    padding: 10,
    alignItems: 'center',
  },
  connectionBannerText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingMore: {
    paddingVertical: 20,
  },
});

export default ChatDetailScreen; 