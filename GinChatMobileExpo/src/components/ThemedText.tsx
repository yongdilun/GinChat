import React from 'react';
import { Text, TextProps, useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';

export interface ThemedTextProps extends TextProps {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'link' | 'subtitle' | 'error';
}

export function ThemedText(props: ThemedTextProps) {
  const { style, lightColor, darkColor, type = 'default', ...otherProps } = props;
  const colorScheme = useColorScheme();

  const getTypeStyles = () => {
    switch (type) {
      case 'title':
        return {
          fontSize: 20,
          fontWeight: '600' as const,
          marginBottom: 8,
        };
      case 'subtitle':
        return {
          fontSize: 16,
          fontWeight: '500' as const,
          marginBottom: 4,
        };
      case 'link':
        return {
          fontSize: 16,
          color: Colors.primary,
          textDecorationLine: 'underline' as const,
        };
      case 'error':
        return {
          fontSize: 14,
          color: Colors.error,
        };
      default:
        return {
          fontSize: 16,
        };
    }
  };

  const color = type === 'link' || type === 'error'
    ? undefined
    : colorScheme === 'dark'
      ? darkColor ?? Colors.dark.text
      : lightColor ?? Colors.light.text;

  return (
    <Text 
      style={[
        getTypeStyles(),
        color ? { color } : undefined,
        style
      ]} 
      {...otherProps} 
    />
  );
} 