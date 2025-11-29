/**
 * Badge Component for React Native
 * Based on the web app's badge component
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../../shared/constants/colors';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  children,
  variant = 'default',
  style,
  textStyle,
}: BadgeProps) {
  const badgeStyle = [
    styles.badge,
    styles[variant],
    style,
  ];

  const badgeTextStyle = [
    styles.text,
    styles[`${variant}Text`],
    textStyle,
  ];

  return (
    <View style={badgeStyle}>
      <Text style={badgeTextStyle}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  default: {
    backgroundColor: Colors.primary,
    borderColor: 'transparent',
  },
  secondary: {
    backgroundColor: Colors.secondary,
    borderColor: 'transparent',
  },
  destructive: {
    backgroundColor: Colors.destructive,
    borderColor: 'transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  defaultText: {
    color: Colors.primaryForeground,
  },
  secondaryText: {
    color: Colors.secondaryForeground,
  },
  destructiveText: {
    color: Colors.destructiveForeground,
  },
  outlineText: {
    color: Colors.foreground,
  },
});


