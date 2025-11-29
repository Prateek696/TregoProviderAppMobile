/**
 * Complete Job Modal
 * For completing a job with optional final price
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Colors } from '../../shared/constants/colors';

interface CompleteJobModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (finalPrice?: string) => void;
  jobTitle?: string;
  estimatedPrice?: string;
}

export function CompleteJobModal({
  visible,
  onClose,
  onConfirm,
  jobTitle,
  estimatedPrice,
}: CompleteJobModalProps) {
  const [finalPrice, setFinalPrice] = useState(estimatedPrice || '');

  const handleConfirm = () => {
    onConfirm(finalPrice.trim() || undefined);
    setFinalPrice('');
  };

  const handleClose = () => {
    setFinalPrice(estimatedPrice || '');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          <View style={styles.modal}>
            <Text style={styles.title}>Complete Job</Text>
            {jobTitle && (
              <Text style={styles.subtitle}>{jobTitle}</Text>
            )}
            <Text style={styles.description}>
              Mark this job as completed. You can update the final price if it differs from the estimate.
            </Text>

            <View style={styles.inputContainer}>
              <Label>Final Price (Optional)</Label>
              <TextInput
                style={styles.input}
                placeholder={estimatedPrice || 'Enter final price...'}
                value={finalPrice}
                onChangeText={setFinalPrice}
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.mutedForeground}
              />
              {estimatedPrice && (
                <Text style={styles.hint}>
                  Estimated: {estimatedPrice}
                </Text>
              )}
            </View>

            <View style={styles.actions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={handleClose}
                style={styles.button}
              />
              <Button
                title="Complete Job"
                onPress={handleConfirm}
                style={[styles.button, { backgroundColor: '#10b981' }]}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  modal: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.foreground,
    marginTop: -8,
  },
  description: {
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  inputContainer: {
    gap: 8,
  },
  input: {
    height: 44,
    backgroundColor: Colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.foreground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hint: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    marginBottom: 0,
  },
});

