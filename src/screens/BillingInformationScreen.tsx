/**
 * Billing Information Screen
 * Exact match with web version - Billing Information
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StartupOrb } from '../components/StartupOrb';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';

interface BaseLocation {
  address: string;
  city: string;
  zipCode: string;
}

interface PersonalInfo {
  firstName: string;
  lastName: string;
  vatNif: string;
}

interface BillingInformationScreenProps {
  orbColor?: string;
  onBack: () => void;
  onContinue: (data: {
    usePersonalInfo: boolean;
    name?: string;
    vat?: string;
    address?: string;
    city?: string;
    postalCode?: string;
  }) => void;
  personalInfo?: PersonalInfo;
  baseLocation?: BaseLocation;
}

const BillingInformationScreen = memo(function BillingInformationScreen({
  orbColor = '#3b82f6',
  onBack,
  onContinue,
  personalInfo,
  baseLocation,
}: BillingInformationScreenProps) {
  const [usePersonalInfo, setUsePersonalInfo] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [businessVAT, setBusinessVAT] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessCity, setBusinessCity] = useState('');
  const [businessZipCode, setBusinessZipCode] = useState('');

  const handleVATChange = useCallback((value: string) => {
    // Only allow digits, max 9 characters
    const cleanValue = value.replace(/\D/g, '').slice(0, 9);
    setBusinessVAT(cleanValue);
  }, []);

  const handleContinue = useCallback(() => {
    if (usePersonalInfo) {
      // Use personal info
      onContinue({
        usePersonalInfo: true,
        name: personalName,
        vat: personalVAT,
        address: primaryBase?.address || '',
        city: primaryBase?.city || '',
        postalCode: primaryBase?.zipCode || '',
      });
    } else {
      // Validate custom business fields
      if (!businessName.trim()) return;
      if (!businessVAT || businessVAT.length !== 9) return;
      if (!businessAddress.trim()) return;
      if (!businessCity.trim()) return;
      if (!businessZipCode.trim()) return;

      onContinue({
        usePersonalInfo: false,
        name: businessName.trim(),
        vat: businessVAT,
        address: businessAddress.trim(),
        city: businessCity.trim(),
        postalCode: businessZipCode.trim(),
      });
    }
  }, [usePersonalInfo, personalName, personalVAT, primaryBase, businessName, businessVAT, businessAddress, businessCity, businessZipCode, onContinue]);

  const handleTogglePersonalInfo = useCallback(() => {
    setUsePersonalInfo(prev => !prev);
  }, []);

  // Calculate derived values - memoized to prevent recalculation
  const { personalName, personalVAT, primaryBase } = useMemo(() => {
    return {
      personalName: personalInfo
        ? `${personalInfo.firstName} ${personalInfo.lastName}`.trim()
        : '',
      personalVAT: personalInfo?.vatNif || '',
      primaryBase: baseLocation,
    };
  }, [personalInfo, baseLocation]);

  // Memoize orb to prevent re-renders
  const orbElement = useMemo(
    () => <StartupOrb size="lg" intensity="normal" color={orbColor} />,
    [orbColor]
  );

  // Validation logic - explicit checks
  const canContinue = useMemo(() => {
    if (usePersonalInfo) {
      // For personal info: need personalInfo and valid vatNif
      const hasPersonalInfo = !!personalInfo;
      const hasValidVat = !!(personalInfo?.vatNif && personalInfo.vatNif.trim().length > 0);
      return hasPersonalInfo && hasValidVat;
    } else {
      // For business info: all fields required
      return !!(
        businessName.trim().length > 0 &&
        businessVAT.length === 9 &&
        businessAddress.trim().length > 0 &&
        businessCity.trim().length > 0 &&
        businessZipCode.trim().length > 0
      );
    }
  }, [usePersonalInfo, personalInfo, businessName, businessVAT, businessAddress, businessCity, businessZipCode]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        removeClippedSubviews={true}
        keyboardDismissMode="on-drag">
        {/* Orb at top - memoized to prevent re-renders */}
        <View style={styles.orbContainer} collapsable={false} pointerEvents="none">
          {orbElement}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Billing Information</Text>
          <Text style={styles.subtitle}>
            Enter your billing details. Used for invoices you send to clients, and for any invoices we send to you.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Combined Personal Info Checkbox */}
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              onPress={handleTogglePersonalInfo}
              style={styles.checkboxRow}
              activeOpacity={0.7}>
              <View style={styles.checkboxWrapper}>
                <View
                  style={[
                    styles.checkbox,
                    usePersonalInfo && { backgroundColor: orbColor, borderColor: orbColor },
                  ]}>
                  {usePersonalInfo && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </View>
              <View style={styles.checkboxLabelContainer}>
                <Text style={styles.checkboxLabel}>
                  I use my personal VAT number for business, and my base address is the billing address
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Display Personal Information when checked - fixed height to prevent layout shift */}
          <View style={[styles.personalInfoBoxContainer, !(usePersonalInfo && personalVAT) && styles.hidden]}>
            {usePersonalInfo && personalVAT ? (
              <View style={styles.personalInfoBox}>
                <Text style={styles.personalInfoTitle}>Billing Information</Text>
                <View style={styles.personalInfoContent}>
                  <View style={styles.personalInfoRow}>
                    <Text style={styles.personalInfoLabel}>Name:</Text>
                    <Text style={styles.personalInfoValue}>{personalName || 'Not set'}</Text>
                  </View>
                  <View style={styles.personalInfoRow}>
                    <Text style={styles.personalInfoLabel}>VAT:</Text>
                    <Text style={styles.personalInfoValue}>{personalVAT}</Text>
                  </View>
                  {primaryBase && (
                    <>
                      <View style={styles.personalInfoRow}>
                        <Text style={styles.personalInfoLabel}>Address:</Text>
                        <Text style={styles.personalInfoValue}>{primaryBase.address || 'Not set'}</Text>
                      </View>
                      <View style={styles.personalInfoRow}>
                        <Text style={styles.personalInfoLabel}>City:</Text>
                        <Text style={styles.personalInfoValue}>
                          {primaryBase.zipCode} {primaryBase.city}
                        </Text>
                      </View>
                    </>
                  )}
                  {!primaryBase && (
                    <View style={styles.personalInfoRow}>
                      <Text style={styles.personalInfoValue}>Address: Not set</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : null}
          </View>

          {/* Custom Business Information Section (only if not using personal) - fixed height to prevent layout shift */}
          <View style={[styles.businessInfoSectionContainer, usePersonalInfo && styles.hidden]}>
            {!usePersonalInfo ? (
              <View style={styles.businessInfoSection}>
                <Text style={styles.businessInfoTitle}>Custom Business Information</Text>
                
                <View style={styles.businessInfoFields}>
                  <View style={styles.field}>
                    <Label style={styles.label}>Business/Personal Name</Label>
                    <Input
                      placeholder="Your name or business name"
                      value={businessName}
                      onChangeText={setBusinessName}
                      autoCapitalize="words"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.field}>
                    <Label style={styles.label}>VAT Number</Label>
                    <Input
                      placeholder="123456789"
                      value={businessVAT}
                      onChangeText={handleVATChange}
                      keyboardType="numeric"
                      maxLength={9}
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.field}>
                    <Label style={styles.label}>Address</Label>
                    <Input
                      placeholder="Street address"
                      value={businessAddress}
                      onChangeText={setBusinessAddress}
                      autoCapitalize="words"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.addressRow}>
                    <View style={styles.zipCodeContainer}>
                      <Label style={styles.label}>Zip Code</Label>
                      <Input
                        placeholder="1234-567"
                        value={businessZipCode}
                        onChangeText={setBusinessZipCode}
                        style={styles.input}
                      />
                    </View>
                    <View style={styles.cityContainer}>
                      <Label style={styles.label}>City</Label>
                      <Input
                        placeholder="City"
                        value={businessCity}
                        onChangeText={setBusinessCity}
                        autoCapitalize="words"
                        style={styles.input}
                      />
                    </View>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
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
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 140, // Extra padding to prevent content from being hidden behind footer
    flexGrow: 1,
  },
  orbContainer: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
    height: 147, // Fixed height to prevent layout shift
    width: '100%',
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
    lineHeight: 20,
  },
  form: {
    gap: 16,
    minHeight: 200, // Prevent layout shift
  },
  checkboxContainer: {
    padding: 16,
    backgroundColor: 'rgba(55, 65, 81, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkboxWrapper: {
    marginTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#6b7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabelContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#f3f4f6',
    lineHeight: 20,
  },
  personalInfoBoxContainer: {
    minHeight: 0,
    overflow: 'hidden',
  },
  hidden: {
    height: 0,
    minHeight: 0,
    overflow: 'hidden',
  },
  personalInfoBox: {
    padding: 24,
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  personalInfoTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 16,
  },
  personalInfoContent: {
    gap: 12,
  },
  personalInfoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  personalInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    minWidth: 60,
  },
  personalInfoValue: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  businessInfoSectionContainer: {
    minHeight: 0,
    overflow: 'hidden',
  },
  businessInfoSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 16,
  },
  businessInfoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#f3f4f6',
  },
  businessInfoFields: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#f3f4f6',
    fontWeight: '500',
  },
  input: {
    height: 44,
    backgroundColor: '#374151',
    borderColor: '#4b5563',
    color: '#f3f4f6',
    fontSize: 14,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 12,
  },
  zipCodeContainer: {
    flex: 1,
    gap: 8,
  },
  cityContainer: {
    flex: 1,
    gap: 8,
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
    elevation: 10,
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

export default BillingInformationScreen;

