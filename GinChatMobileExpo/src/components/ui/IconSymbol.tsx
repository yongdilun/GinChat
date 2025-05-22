import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IconSymbolProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  style?: any;
}

export const IconSymbol: React.FC<IconSymbolProps> = ({ 
  name,
  size = 24,
  color = '#000',
  style,
  ...props 
}) => {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={[styles.icon, style]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  icon: {
    alignSelf: 'center',
  },
}); 