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
        placeholderTextColor={Colors.mutedForeground}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  input: {
    height: 36,
    width: '100%',
    minWidth: 0,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.foreground,
  },
  inputError: {
    borderColor: Colors.destructive,
  },
});

