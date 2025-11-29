/**
 * Button Component for React Native
 * Based on the web app's button component
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../shared/constants/colors';

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  style,
  textStyle,
  testID,
}: ButtonProps) {
  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[`${size}Size`],
    disabled && styles.disabled,
    style,
  ];

  const buttonTextStyle = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      testID={testID}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.primaryForeground}
        />
      ) : (
        <Text style={buttonTextStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  // Variants
  default: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  destructive: {
    backgroundColor: Colors.destructive,
    borderColor: Colors.destructive,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
  },
  secondary: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  link: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  // Sizes
  defaultSize: {
    height: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  smSize: {
    height: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  lgSize: {
    height: 40,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  iconSize: {
    width: 36,
    height: 36,
    padding: 0,
  },
  // Text styles
  text: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  defaultText: {
    color: Colors.primaryForeground,
  },
  destructiveText: {
    color: Colors.destructiveForeground,
  },
  outlineText: {
    color: Colors.foreground,
  },
  secondaryText: {
    color: Colors.secondaryForeground,
  },
  ghostText: {
    color: Colors.foreground,
  },
  linkText: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  smText: {
    fontSize: 12,
  },
  lgText: {
    fontSize: 16,
  },
  // Disabled
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
});

