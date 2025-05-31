import { StyleSheet } from 'react-native';
import { GoldTheme } from '../../../../constants/GoldTheme';

export const messageItemStyles = StyleSheet.create({
  messageContainer: {
    maxWidth: '85%',
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    ...GoldTheme.shadow.dark,
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  ownMessageGradient: {
    padding: 16,
    borderBottomRightRadius: 4,
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  otherMessageBackground: {
    backgroundColor: GoldTheme.background.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
    padding: 16,
    borderBottomLeftRadius: 4,
  },
  messageUsername: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: 'bold',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: GoldTheme.text.inverse,
  },
  otherMessageText: {
    color: GoldTheme.text.primary,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  messageTime: {
    fontSize: 10,
    opacity: 0.7,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherMessageTime: {
    color: GoldTheme.text.muted,
  },
  readIcon: {
    marginLeft: 4,
  },
  mediaContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: 250,
    alignSelf: 'flex-start',
  },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
  },
  videoPlayerContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    width: 250,
    height: 180,
    backgroundColor: '#000',
  },
  audioPlayerContainer: {
    width: 240,
    minHeight: 50,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(45, 45, 45, 0.8)',
  },
  editedIndicator: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
    opacity: 0.7,
  },
  ownEditedIndicator: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right',
  },
  otherEditedIndicator: {
    color: GoldTheme.text.muted,
    textAlign: 'left',
  },
});
