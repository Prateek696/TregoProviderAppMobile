/**
 * Pause Job Modal
 * For pausing a job with optional reason
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
import { useTranslation } from 'react-i18next';

interface PauseJobModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  jobTitle?: string;
}

export function PauseJobModal({
  visible,
  onClose,
  onConfirm,
  jobTitle,
}: PauseJobModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
    setReason('');
  };

  const handleClose = () => {
    setReason('');
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
            <Text style={styles.title}>{t('modals.pause.title')}</Text>
            {jobTitle && (
              <Text style={styles.subtitle}>{jobTitle}</Text>
            )}
            <Text style={styles.description}>
              {t('modals.pause.description')}
            </Text>

            <View style={styles.inputContainer}>
              <Label>{t('modals.pause.reasonLabel')}</Label>
              <TextInput
                style={styles.input}
                placeholder={t('modals.pause.reasonPlaceholder')}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                placeholderTextColor={Colors.mutedForeground}
              />
            </View>

            <View style={styles.actions}>
              <Button
                title={t('common.cancel')}
                variant="outline"
                onPress={handleClose}
                style={styles.button}
              />
              <Button
                title={t('modals.pause.title')}
                onPress={handleConfirm}
                style={[styles.button, { backgroundColor: Colors.statusPausedText }]}
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
    minHeight: 100,
    backgroundColor: Colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.foreground,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlignVertical: 'top',
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


