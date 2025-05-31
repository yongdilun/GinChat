import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GoldTheme } from '../../../constants/GoldTheme';

interface FixedUnreadDividerProps {
  unreadCount: number;
}

export function FixedUnreadDivider({ unreadCount }: FixedUnreadDividerProps) {
  if (unreadCount <= 0) return null;

  return (
    <View style={styles.container}>
      {/* Natural curved divider lines */}
      <View style={styles.leftCurve}>
        <View style={styles.curvedLine} />
      </View>

      {/* Floating badge with natural design */}
      <View style={styles.badgeContainer}>
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 165, 0, 0.1)']}
          style={styles.badgeBackground}
        >
          <View style={styles.badgeContent}>
            <Ionicons
              name="mail-unread-outline"
              size={14}
              color={GoldTheme.gold.primary}
              style={styles.icon}
            />
            <Text style={styles.badgeText}>
              unread message
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Natural curved divider lines */}
      <View style={styles.rightCurve}>
        <View style={styles.curvedLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    marginHorizontal: 20,
    height: 40,
  },
  leftCurve: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rightCurve: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  curvedLine: {
    height: 1,
    backgroundColor: GoldTheme.gold.primary,
    opacity: 0.2,
    borderRadius: 0.5,
    transform: [{ scaleY: 0.8 }],
  },
  badgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  badgeBackground: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 6,
    opacity: 0.8,
  },
  badgeText: {
    color: GoldTheme.gold.primary,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.9,
  },
});
