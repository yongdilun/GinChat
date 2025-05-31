import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '@/services/api';
import { GoldTheme } from '../../../constants/GoldTheme';
import { AudioPlayer } from './AudioPlayer';
import { VideoPlayer } from './VideoPlayer';
import { messageItemStyles } from './styles/messageItemStyles';

interface MessageItemProps {
  item: Message;
  isOwnMessage: boolean;
  userGradient: readonly [string, string] | null;
  onImageClick: (imageUrl: string) => void;
  onLongPress: (message: Message) => void;
  getReadStatus: (message: Message) => { icon: string; color: string; title: string; key?: string };
}

export function MessageItem({
  item,
  isOwnMessage,
  userGradient,
  onImageClick,
  onLongPress,
  getReadStatus
}: MessageItemProps) {
  const messageDate = new Date(item.sent_at);
  const formattedTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

  const handleImageClick = (imageUrl: string) => {
    onImageClick(imageUrl);
  };

  return (
    <TouchableOpacity
      style={[
        messageItemStyles.messageContainer,
        isOwnMessage ? messageItemStyles.ownMessageContainer : messageItemStyles.otherMessageContainer
      ]}
      onLongPress={() => onLongPress(item)}
      activeOpacity={0.8}
    >
      {isOwnMessage ? (
        <LinearGradient
          colors={GoldTheme.gradients.goldButton}
          style={messageItemStyles.ownMessageGradient}
        >
          {item.media_url && (
            <View style={messageItemStyles.mediaContainer}>
              {item.message_type.includes('picture') && (
                <TouchableOpacity onPress={() => handleImageClick(item.media_url!)}>
                  <Image
                    source={{ uri: item.media_url }}
                    style={messageItemStyles.messageImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
              {item.message_type.includes('video') && (
                <View style={messageItemStyles.videoPlayerContainer}>
                  <VideoPlayer uri={item.media_url!} />
                </View>
              )}
              {item.message_type.includes('audio') && (
                <View style={messageItemStyles.audioPlayerContainer}>
                  <AudioPlayer uri={item.media_url!} isCompact={true} />
                </View>
              )}
            </View>
          )}

          {item.text_content && (
            <View>
              <Text style={[messageItemStyles.messageText, messageItemStyles.ownMessageText]}>
                {item.text_content}
              </Text>
              {item.edited && (
                <Text style={[messageItemStyles.editedIndicator, messageItemStyles.ownEditedIndicator]}>
                  edited
                </Text>
              )}
            </View>
          )}

          <View style={messageItemStyles.messageFooter}>
            <Text style={[messageItemStyles.messageTime, messageItemStyles.ownMessageTime]}>
              {formattedTime} • {formattedDate}
            </Text>
            {(() => {
              const readStatus = getReadStatus(item);
              // Only render icon if it exists (for own messages)
              if (!readStatus.icon) return null;

              return (
                <Ionicons
                  key={readStatus.key || `read-${item.id}`} // Use key to force re-render
                  name={readStatus.icon as any}
                  size={14}
                  color={readStatus.color}
                  style={messageItemStyles.readIcon}
                />
              );
            })()}
          </View>
        </LinearGradient>
      ) : (
        <View style={messageItemStyles.otherMessageBackground}>
          <Text style={[messageItemStyles.messageUsername, { color: userGradient ? userGradient[0] : GoldTheme.gold.primary }]}>
            {item.sender_name}
          </Text>

          {item.media_url && (
            <View style={messageItemStyles.mediaContainer}>
              {item.message_type.includes('picture') && (
                <TouchableOpacity onPress={() => handleImageClick(item.media_url!)}>
                  <Image
                    source={{ uri: item.media_url }}
                    style={messageItemStyles.messageImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
              {item.message_type.includes('video') && (
                <View style={messageItemStyles.videoPlayerContainer}>
                  <VideoPlayer uri={item.media_url!} />
                </View>
              )}
              {item.message_type.includes('audio') && (
                <View style={messageItemStyles.audioPlayerContainer}>
                  <AudioPlayer uri={item.media_url!} isCompact={true} />
                </View>
              )}
            </View>
          )}

          {item.text_content && (
            <View>
              <Text style={[messageItemStyles.messageText, messageItemStyles.otherMessageText]}>
                {item.text_content}
              </Text>
              {item.edited && (
                <Text style={[messageItemStyles.editedIndicator, messageItemStyles.otherEditedIndicator]}>
                  edited
                </Text>
              )}
            </View>
          )}

          <View style={messageItemStyles.messageFooter}>
            <Text style={[messageItemStyles.messageTime, messageItemStyles.otherMessageTime]}>
              {formattedTime} • {formattedDate}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}
