import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GoldTheme } from '../../constants/GoldTheme';

interface GoldButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const GoldButton: React.FC<GoldButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  variant = 'primary',
  disabled = false,
  size = 'medium',
}) => {
  const getButtonStyle = () => {
    switch (size) {
      case 'small':
        return styles.smallButton;
      case 'large':
        return styles.largeButton;
      default:
        return styles.mediumButton;
    }
  };

  const getTextStyle = () => {
    switch (size) {
      case 'small':
        return styles.smallText;
      case 'large':
        return styles.largeText;
      default:
        return styles.mediumText;
    }
  };

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        style={[
          styles.baseButton,
          getButtonStyle(),
          styles.outlineButton,
          disabled && styles.disabledButton,
          style,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={[styles.outlineText, getTextStyle(), textStyle]}>
          {title}
        </Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        style={[
          styles.baseButton,
          getButtonStyle(),
          styles.secondaryButton,
          disabled && styles.disabledButton,
          style,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={[styles.secondaryText, getTextStyle(), textStyle]}>
          {title}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.baseButton,
        getButtonStyle(),
        disabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={GoldTheme.gradients.goldButton}
        style={[styles.gradient, getButtonStyle()]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[styles.primaryText, getTextStyle(), textStyle]}>
          {title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: 12,
    overflow: 'hidden',
    ...GoldTheme.shadow.gold,
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  mediumButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  largeButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 56,
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: GoldTheme.gold.primary,
    backgroundColor: 'transparent',
  },
  secondaryButton: {
    backgroundColor: GoldTheme.background.card,
    borderWidth: 1,
    borderColor: GoldTheme.border.gold,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryText: {
    color: GoldTheme.text.inverse,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  outlineText: {
    color: GoldTheme.gold.primary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryText: {
    color: GoldTheme.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
}); 