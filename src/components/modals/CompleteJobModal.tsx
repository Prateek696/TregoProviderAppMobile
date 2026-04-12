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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
            <Text style={styles.title}>{t('modals.complete.title')}</Text>
            {jobTitle && (
              <Text style={styles.subtitle}>{jobTitle}</Text>
            )}
            <Text style={styles.description}>
              {t('modals.complete.description')}
            </Text>

            {/* Final price */}
            <View style={styles.inputContainer}>
              <Label>{t('modals.complete.finalPriceLabel')}</Label>
              <TextInput
                style={styles.input}
                placeholder={estimatedPrice || t('modals.complete.finalPricePlaceholder')}
                value={finalPrice}
                onChangeText={setFinalPrice}
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.mutedForeground}
              />
              {estimatedPrice && (
                <Text style={styles.hint}>{t('modals.complete.estimatedHint', { price: estimatedPrice })}</Text>
              )}
            </View>

            {/* Payment received toggle (3.4) */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelGroup}>
                <Text style={styles.toggleLabel}>{t('modals.complete.paymentReceived')}</Text>
                <Text style={styles.toggleHint}>{t('modals.complete.paymentReceivedHint')}</Text>
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
                <Label>{t('modals.complete.amountReceivedLabel')}</Label>
                <TextInput
                  style={styles.input}
                  placeholder={finalPrice || estimatedPrice || t('modals.complete.amountPlaceholder')}
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
                title={t('common.cancel')}
                variant="outline"
                onPress={handleClose}
                style={styles.button}
              />
              <Button
                title={t('modals.complete.title')}
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
