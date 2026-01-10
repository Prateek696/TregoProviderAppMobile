/**
 * Personal Information Screen
 * Exact match with web version - Your Personal Information
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { StartupOrb } from '../components/StartupOrb';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';

interface PersonalInformationScreenProps {
  orbColor?: string;
  onBack: () => void;
  onContinue: (data: {
    firstName: string;
    lastName: string;
    countryCode: string;
    vatNif: string;
  }) => void;
  initialData?: {
    firstName?: string;
    lastName?: string;
    countryCode?: string;
    vatNif?: string;
  };
}

const COUNTRY_CODES = [
  { code: 'PT', label: 'PT' },
  // Future country codes can be added here
];

// Validate Portuguese VAT/NIF format (9 digits)
const validateVatNif = (value: string): boolean => {
  const cleanValue = value.replace(/\D/g, '');
  return cleanValue.length === 9;
};

export default function PersonalInformationScreen({
  orbColor = '#3b82f6',
  onBack,
  onContinue,
  initialData,
}: PersonalInformationScreenProps) {
  const [firstName, setFirstName] = useState(initialData?.firstName || '');
  const [lastName, setLastName] = useState(initialData?.lastName || '');
  const [countryCode, setCountryCode] = useState(initialData?.countryCode || 'PT');
  const [vatNif, setVatNif] = useState(initialData?.vatNif || '');
  const [showCertificationSection, setShowCertificationSection] = useState(false);
  const [vatNifError, setVatNifError] = useState('');

  const handleVatNifChange = (value: string) => {
    // Only allow digits, max 9 characters
    const cleanValue = value.replace(/\D/g, '').slice(0, 9);
    setVatNif(cleanValue);
    
    // Validate if value is entered
    if (cleanValue.length > 0 && !validateVatNif(cleanValue)) {
      setVatNifError('Enter a valid 9-digit VAT/NIF number');
    } else {
      setVatNifError('');
    }
  };

  const handleContinue = () => {
    // Validate required fields
    if (!firstName.trim()) {
      return;
    }
    if (!lastName.trim()) {
      return;
    }
    if (vatNif && !validateVatNif(vatNif)) {
      setVatNifError('Enter a valid 9-digit VAT/NIF number');
      return;
    }

    onContinue({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      countryCode,
      vatNif: vatNif.trim(),
    });
  };

  const canContinue = firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}>
        {/* Orb at top */}
        <View style={styles.orbContainer}>
          <StartupOrb size="lg" intensity="normal" color={orbColor} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Personal Information</Text>
          <Text style={styles.subtitle}>
            We need some basic details to set up your provider account.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Name Fields - 2 columns */}
          <View style={styles.nameRow}>
            <View style={styles.firstNameContainer}>
              <Label style={styles.label}>First Name</Label>
              <Input
                placeholder="João"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                style={styles.input}
              />
            </View>
            <View style={styles.lastNameContainer}>
              <Label style={styles.label}>Last Name</Label>
              <Input
                placeholder="Silva Santos"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                style={styles.input}
              />
            </View>
          </View>

          {/* VAT/NIF */}
          <View style={styles.vatNifContainer}>
            <Label style={styles.label}>VAT/NIF</Label>
            <View style={styles.vatNifRow}>
              <View style={styles.countryCodePickerContainer}>
                <Text style={styles.countryCodeDisplayText}>{countryCode}</Text>
                <Picker
                  selectedValue={countryCode}
                  onValueChange={setCountryCode}
                  style={styles.countryCodePicker}
                  itemStyle={styles.pickerItem}>
                  {COUNTRY_CODES.map(country => (
                    <Picker.Item key={country.code} label={country.label} value={country.code} />
                  ))}
                </Picker>
              </View>
              <View style={styles.vatNifInputContainer}>
                <Input
                  placeholder="123456789"
                  value={vatNif}
                  onChangeText={handleVatNifChange}
                  keyboardType="numeric"
                  maxLength={9}
                  style={[
                    styles.vatNifInput,
                    vatNifError && styles.vatNifInputError,
                  ]}
                />
              </View>
            </View>
            {vatNifError ? (
              <Text style={styles.errorText}>{vatNifError}</Text>
            ) : null}
          </View>
        </View>

        {/* Optional: Get Certified Now */}
        <View style={styles.certificationSection}>
          <TouchableOpacity
            onPress={() => setShowCertificationSection(!showCertificationSection)}
            style={[
              styles.certificationButton,
              showCertificationSection && styles.certificationButtonExpanded,
            ]}>
            <View style={styles.certificationButtonContent}>
              <View style={styles.certificationButtonLeft}>
                <View style={styles.shieldIconContainer}>
                  <Text style={styles.shieldIcon}>🛡️</Text>
                </View>
                <View style={styles.certificationTextContainer}>
                  <Text style={styles.certificationTitle}>
                    Want to get certified now?
                  </Text>
                  <Text style={styles.certificationSubtitle}>
                    Build trust with clients • Verified badge • Boost your profile
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.chevronIcon,
                  showCertificationSection && styles.chevronIconRotated,
                ]}>
                ⌄
              </Text>
            </View>
          </TouchableOpacity>

          {/* Expanded Certification Section */}
          {showCertificationSection && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={styles.certificationExpanded}>
              <Text style={styles.certificationNote}>
                Certification can be completed later in Settings. This is optional
                for now.
              </Text>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Footer with Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={onBack} style={styles.backButtonTouchable}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={!canContinue}
          style={[styles.continueButton, { backgroundColor: orbColor }]}
          textStyle={styles.continueButtonText}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 140, // Extra padding to prevent content from being hidden behind footer
  },
  orbContainer: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  form: {
    gap: 16,
    marginBottom: 24,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  firstNameContainer: {
    flex: 2,
  },
  lastNameContainer: {
    flex: 3,
  },
  label: {
    fontSize: 14,
    color: '#f3f4f6',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 44,
    backgroundColor: '#374151',
    borderColor: '#4b5563',
    color: '#f3f4f6',
    fontSize: 14,
  },
  vatNifContainer: {
    gap: 8,
  },
  vatNifRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCodePickerContainer: {
    width: 80,
    height: 44,
    backgroundColor: '#374151',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4b5563',
    overflow: 'hidden',
    position: 'relative',
  },
  countryCodeDisplayText: {
    position: 'absolute',
    left: 12,
    top: 12,
    fontSize: 14,
    color: '#f3f4f6',
    zIndex: 10,
    pointerEvents: 'none',
  },
  countryCodePicker: {
    height: 44,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0.001,
    zIndex: 1,
  },
  pickerItem: {
    color: '#f3f4f6',
    fontSize: 14,
  },
  vatNifInputContainer: {
    flex: 1,
  },
  vatNifInput: {
    height: 44,
    backgroundColor: '#374151',
    borderColor: '#4b5563',
    color: '#f3f4f6',
    fontSize: 14,
  },
  vatNifInputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  certificationSection: {
    marginTop: 24,
    gap: 12,
  },
  certificationButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  certificationButtonExpanded: {
    borderColor: '#16a34a',
  },
  certificationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  certificationButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  shieldIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldIcon: {
    fontSize: 20,
  },
  certificationTextContainer: {
    flex: 1,
  },
  certificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  certificationSubtitle: {
    fontSize: 12,
    color: '#15803d',
  },
  chevronIcon: {
    fontSize: 20,
    color: '#16a34a',
    transform: [{ rotate: '0deg' }],
  },
  chevronIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  certificationExpanded: {
    padding: 16,
    backgroundColor: 'rgba(16, 163, 74, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 163, 74, 0.3)',
  },
  certificationNote: {
    fontSize: 12,
    color: '#16a34a',
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32, // Extra bottom padding for safe area
    alignItems: 'center',
    justifyContent: 'space-between', // Back on left, Continue on right
    gap: 12,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 50,
  },
  backButtonTouchable: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  continueButton: {
    flex: 1,
    maxWidth: 384,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '500',
  },
});

