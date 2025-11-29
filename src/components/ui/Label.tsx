/**
 * Label Component for React Native
 * For form labels and text labels
 */

import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { Colors } from '../../shared/constants/colors';

export interface LabelProps {
  children: React.ReactNode;
  style?: TextStyle;
  required?: boolean;
}

export function Label({ children, style, required }: LabelProps) {
  return (
    <Text style={[styles.label, style]}>
      {children}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.foreground,
    marginBottom: 4,
  },
  required: {
    color: Colors.destructive,
  },
});


