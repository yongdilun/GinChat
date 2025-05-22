import React from 'react';
import { Pressable, GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';

interface HapticTabProps {
  onPress?: (e: GestureResponderEvent) => void;
  children: React.ReactNode;
  style?: any;
}

export const HapticTab: React.FC<HapticTabProps> = ({ onPress, children, style, ...props }) => {
  const handlePress = (e: GestureResponderEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(e);
  };

  return (
    <Pressable onPress={handlePress} style={style} {...props}>
      {children}
    </Pressable>
  );
}; 