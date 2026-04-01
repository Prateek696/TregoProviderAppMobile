/**
 * Complete Job Modal
 * For completing a job with optional final price and cash payment logging (3.4).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Colors } from '../../shared/constants/colors';

export interface CompleteJobResult {
  finalPrice?: string;
  paymentReceived: boolean;
  cashAmount?: string;
}

interface CompleteJobModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (result: CompleteJobResult) => void;
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
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [cashAmount, setCashAmount] = useState(estimatedPrice || '');

  const handleConfirm = () => {
    onConfirm({
      finalPrice: finalPrice.trim() || undefined,
      paymentReceived,
      cashAmount: paymentReceived ? (cashAmount.trim() || undefined) : undefined,
    });
    resetState();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const resetState = () => {
    setFinalPrice(estimatedPrice || '');
    setPaymentReceived(false);
    setCashAmount(estimatedPrice || '');
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
              Mark this job as completed. Update the final price if it differs from the estimate.
            </Text>

            {/* Final price */}
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
                <Text style={styles.hint}>Estimated: €{estimatedPrice}</Text>
              )}
            </View>

            {/* Payment received toggle (3.4) */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelGroup}>
                <Text style={styles.toggleLabel}>Payment received</Text>
                <Text style={styles.toggleHint}>Record a cash or immediate payment</Text>
              </View>
              <Switch
                value={paymentReceived}
                onValueChange={setPaymentReceived}
                trackColor={{ false: Colors.border, true: '#10b981' }}
                thumbColor={paymentReceived ? '#fff' : '#9ca3af'}
              />
            </View>

            {paymentReceived && (
              <View style={styles.inputContainer}>
                <Label>Amount Received</Label>
                <TextInput
                  style={styles.input}
                  placeholder={finalPrice || estimatedPrice || 'Enter amount...'}
                  value={cashAmount}
                  onChangeText={setCashAmount}
                  keyboardType="decimal-pad"
                  placeholderTextColor={Colors.mutedForeground}
                  autoFocus
                />
              </View>
            )}

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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLabelGroup: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.foreground,
  },
  toggleHint: {
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
