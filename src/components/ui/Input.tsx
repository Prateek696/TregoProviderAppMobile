/**
 * Input Component for React Native
 * Based on the web app's input component
 */

import React from 'react';
import { TextInput, StyleSheet, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../../shared/constants/colors';

export interface InputProps extends TextInputProps {
  error?: boolean;
  containerStyle?: ViewStyle;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ style, error, containerStyle, ...props }, ref) => {
    const inputStyle = [
      styles.input,
      error && styles.inputError,
      style,
    ];

    return (
      <TextInput
        ref={ref}
        style={inputStyle}
        placeholderTextColor="#9ca3af" // Light muted color for dark theme
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  input: {
    height: 44,
    width: '100%',
    flexShrink: 1,
    minWidth: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563', // Dark border for dark theme
    backgroundColor: '#374151', // Dark background for dark theme
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#f3f4f6', // Light text for dark theme
  },
  inputError: {
    borderColor: Colors.destructive,
  },
});


