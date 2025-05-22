import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { GoldTheme } from '../../constants/GoldTheme';

interface GoldInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  icon?: React.ReactNode;
}

export const GoldInput: React.FC<GoldInputProps> = ({
  label,
  error,
  containerStyle,
  icon,
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError,
      ]}>
        {icon && (
          <View style={styles.iconContainer}>
            {icon}
          </View>
        )}
        
        <TextInput
          style={[
            styles.input,
            icon ? styles.inputWithIcon : null,
            style,
          ]}
          placeholderTextColor={GoldTheme.text.muted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      </View>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: GoldTheme.gold.primary,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GoldTheme.background.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: GoldTheme.border.dark,
    paddingHorizontal: 16,
    minHeight: 52,
    ...GoldTheme.shadow.dark,
  },
  inputContainerFocused: {
    borderColor: GoldTheme.gold.primary,
    backgroundColor: GoldTheme.background.secondary,
    ...GoldTheme.shadow.gold,
  },
  inputContainerError: {
    borderColor: GoldTheme.status.error,
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: GoldTheme.text.primary,
    paddingVertical: 16,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  errorText: {
    fontSize: 12,
    color: GoldTheme.status.error,
    marginTop: 6,
    marginLeft: 4,
  },
}); 