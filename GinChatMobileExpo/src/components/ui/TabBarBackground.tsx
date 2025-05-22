import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

interface TabBarBackgroundProps {
  style?: any;
}

const TabBarBackground: React.FC<TabBarBackgroundProps> = ({ style }) => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        tint="light"
        intensity={75}
        style={[styles.container, style]}
      />
    );
  }

  return (
    <View
      style={[
        styles.container,
        styles.androidBackground,
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  androidBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
});

export default TabBarBackground; 