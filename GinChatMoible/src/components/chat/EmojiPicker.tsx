import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Text,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoldTheme } from '../../../constants/GoldTheme';

interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
}

const { width, height } = Dimensions.get('window');

// Simple emoji data - common emojis organized by category
const emojiData = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
  'Gestures': ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗'],
  'Food': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐'],
  'Activities': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️'],
};

const categories = Object.keys(emojiData);

export function EmojiPicker({ visible, onClose, onEmojiSelect }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = React.useState(categories[0]);

  const handleEmojiSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    onClose();
  };

  const renderEmoji = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.emojiButton}
      onPress={() => handleEmojiSelect(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.emoji}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Choose Emoji</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={GoldTheme.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryTabs}
            contentContainerStyle={styles.categoryTabsContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryTab,
                  selectedCategory === category && styles.selectedCategoryTab
                ]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.categoryTabText,
                  selectedCategory === category && styles.selectedCategoryTabText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Emoji Grid */}
          <View style={styles.pickerContainer}>
            <FlatList
              data={emojiData[selectedCategory as keyof typeof emojiData]}
              renderItem={renderEmoji}
              numColumns={8}
              keyExtractor={(item, index) => `${selectedCategory}-${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.emojiGrid}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.6,
    maxHeight: 500,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GoldTheme.text.primary,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  categoryTabs: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  selectedCategoryTab: {
    backgroundColor: GoldTheme.gold.primary,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  selectedCategoryTabText: {
    color: '#fff',
  },
  pickerContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  emojiGrid: {
    paddingVertical: 16,
  },
  emojiButton: {
    width: (width - 64) / 8, // 8 columns with padding
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  emoji: {
    fontSize: 24,
    textAlign: 'center',
  },
});
