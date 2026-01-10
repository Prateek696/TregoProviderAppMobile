/**
 * Calendar Sync Screen
 * Exact match with web version - Calendar Sync (Step 9)
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
import { StartupOrb } from '../components/StartupOrb';
import { Button } from '../components/ui/Button';

interface CalendarSyncScreenProps {
  orbColor?: string;
  onBack: () => void;
  onContinue: (data: {
    calendarConnected: boolean;
    calendarProvider?: 'google' | 'outlook' | 'apple' | 'other';
  }) => void;
}

type CalendarOption = 'google' | 'outlook' | 'apple' | 'other' | 'skip' | null;

export default function CalendarSyncScreen({
  orbColor = '#3b82f6',
  onBack,
  onContinue,
}: CalendarSyncScreenProps) {
  const [selectedCalendarOption, setSelectedCalendarOption] = useState<CalendarOption>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleOptionSelect = (option: CalendarOption) => {
    setSelectedCalendarOption(option);
    
    // Show success message
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 2000);
  };

  const handleContinue = () => {
    if (selectedCalendarOption === 'skip') {
      onContinue({
        calendarConnected: false,
        calendarProvider: undefined,
      });
    } else if (selectedCalendarOption) {
      onContinue({
        calendarConnected: true,
        calendarProvider: selectedCalendarOption,
      });
    }
  };

  const getButtonText = () => {
    if (!selectedCalendarOption) return 'Continue';
    return selectedCalendarOption !== 'skip' ? 'Import & Complete Setup' : 'Complete Setup';
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        bounces={false}>
        {/* Orb at top */}
        <View style={styles.orbContainer}>
          <StartupOrb size="lg" intensity="normal" color={orbColor} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Want me to organize your schedule?</Text>
          <Text style={styles.subtitle}>
            Connect your calendar so I can automatically schedule jobs, avoid conflicts, and help you stay organized. I'll sync your existing appointments and block time for new bookings.
          </Text>
        </View>

        {/* Calendar Options */}
        <View style={styles.optionsContainer}>
          {/* Google Calendar */}
          <TouchableOpacity
            onPress={() => handleOptionSelect('google')}
            style={[
              styles.optionButton,
              selectedCalendarOption === 'google' && styles.optionButtonSelected,
            ]}>
            <View style={styles.optionContent}>
              <View style={[styles.optionIcon, styles.googleIcon]}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[
                  styles.optionTitle,
                  selectedCalendarOption === 'google' && styles.optionTitleSelected,
                ]}>Connect Google Calendar</Text>
                <Text style={[
                  styles.optionSubtitle,
                  selectedCalendarOption === 'google' && styles.optionSubtitleSelected,
                ]}>Most popular choice</Text>
              </View>
              {selectedCalendarOption === 'google' && (
                <View style={styles.checkIcon}>
                  <Text style={styles.checkIconText}>✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Microsoft Outlook */}
          <TouchableOpacity
            onPress={() => handleOptionSelect('outlook')}
            style={[
              styles.optionButton,
              selectedCalendarOption === 'outlook' && styles.optionButtonSelected,
            ]}>
            <View style={styles.optionContent}>
              <View style={[styles.optionIcon, styles.outlookIcon]}>
                <Text style={styles.outlookIconText}>M</Text>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[
                  styles.optionTitle,
                  selectedCalendarOption === 'outlook' && styles.optionTitleSelected,
                ]}>Connect Microsoft Outlook</Text>
                <Text style={[
                  styles.optionSubtitle,
                  selectedCalendarOption === 'outlook' && styles.optionSubtitleSelected,
                ]}>Office 365 & Exchange</Text>
              </View>
              {selectedCalendarOption === 'outlook' && (
                <View style={styles.checkIcon}>
                  <Text style={styles.checkIconText}>✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Apple Calendar */}
          <TouchableOpacity
            onPress={() => handleOptionSelect('apple')}
            style={[
              styles.optionButton,
              selectedCalendarOption === 'apple' && styles.optionButtonSelected,
            ]}>
            <View style={styles.optionContent}>
              <View style={[styles.optionIcon, styles.appleIcon]}>
                <Text style={styles.appleIconText}>🍎</Text>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[
                  styles.optionTitle,
                  selectedCalendarOption === 'apple' && styles.optionTitleSelected,
                ]}>Connect Apple Calendar</Text>
                <Text style={[
                  styles.optionSubtitle,
                  selectedCalendarOption === 'apple' && styles.optionSubtitleSelected,
                ]}>iCloud sync</Text>
              </View>
              {selectedCalendarOption === 'apple' && (
                <View style={styles.checkIcon}>
                  <Text style={styles.checkIconText}>✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Other Calendar */}
          <TouchableOpacity
            onPress={() => handleOptionSelect('other')}
            style={[
              styles.optionButton,
              selectedCalendarOption === 'other' && styles.optionButtonSelected,
            ]}>
            <View style={styles.optionContent}>
              <View style={[styles.optionIcon, styles.otherIcon]}>
                <Text style={styles.otherIconText}>📅</Text>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[
                  styles.optionTitle,
                  selectedCalendarOption === 'other' && styles.optionTitleSelected,
                ]}>Other Calendar</Text>
                <Text style={[
                  styles.optionSubtitle,
                  selectedCalendarOption === 'other' && styles.optionSubtitleSelected,
                ]}>Yahoo, Exchange, CalDAV</Text>
              </View>
              {selectedCalendarOption === 'other' && (
                <View style={styles.checkIcon}>
                  <Text style={styles.checkIconText}>✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Skip Option */}
          <TouchableOpacity
            onPress={() => handleOptionSelect('skip')}
            style={[
              styles.optionButton,
              styles.skipButton,
              selectedCalendarOption === 'skip' && styles.optionButtonSelected,
            ]}>
            <View style={styles.optionContent}>
              <View style={[styles.optionIcon, styles.skipIcon]}>
                <View style={styles.skipIconDot} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[
                  styles.optionTitle,
                  selectedCalendarOption === 'skip' && styles.optionTitleSelected,
                ]}>I don't want to setup my calendar for now</Text>
                <Text style={[
                  styles.optionSubtitle,
                  selectedCalendarOption === 'skip' && styles.optionSubtitleSelected,
                ]}>You can always connect later in settings</Text>
              </View>
              {selectedCalendarOption === 'skip' && (
                <View style={styles.checkIcon}>
                  <Text style={styles.checkIconText}>✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Success Message */}
        {showSuccessMessage && selectedCalendarOption && (
          <View style={styles.successMessage}>
            <Text style={styles.successMessageText}>✓</Text>
            <Text style={styles.successMessageText}>
              {selectedCalendarOption === 'google' && 'Google Calendar Connected'}
              {selectedCalendarOption === 'outlook' && 'Microsoft Outlook Connected'}
              {selectedCalendarOption === 'apple' && 'Apple Calendar Connected'}
              {selectedCalendarOption === 'other' && 'Calendar Connected'}
              {selectedCalendarOption === 'skip' && 'Calendar setup skipped'}
            </Text>
          </View>
        )}

        {/* Calendar Preview (when connected, not skipped) */}
        {selectedCalendarOption && selectedCalendarOption !== 'skip' && (
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <View style={styles.previewCheckIcon}>
                <Text style={styles.previewCheckText}>✓</Text>
              </View>
              <Text style={styles.previewTitle}>
                {selectedCalendarOption === 'google' && 'Google Calendar Connected'}
                {selectedCalendarOption === 'outlook' && 'Microsoft Outlook Connected'}
                {selectedCalendarOption === 'apple' && 'Apple Calendar Connected'}
                {selectedCalendarOption === 'other' && 'Calendar Connected'}
              </Text>
            </View>
            
            <Text style={styles.previewDescription}>
              I found these upcoming events. Import them?
            </Text>
            
            <View style={styles.eventsList}>
              <View style={styles.eventItem}>
                <Text style={styles.eventName}>Team meeting</Text>
                <Text style={styles.eventTime}>Tomorrow 10:00 AM</Text>
              </View>
              <View style={styles.eventItem}>
                <Text style={styles.eventName}>Client presentation</Text>
                <Text style={styles.eventTime}>Friday 2:00 PM</Text>
              </View>
              <View style={styles.eventItem}>
                <Text style={styles.eventName}>Dentist appointment</Text>
                <Text style={styles.eventTime}>Next week</Text>
              </View>
            </View>
            
            <View style={styles.autoSyncContainer}>
              <View style={styles.checkbox}>
                <Text style={styles.checkboxCheck}>✓</Text>
              </View>
              <Text style={styles.autoSyncText}>
                Auto-sync new events and block time for jobs
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer with Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={onBack} style={styles.backButtonTouchable}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Button
          title={getButtonText()}
          onPress={handleContinue}
          disabled={!selectedCalendarOption}
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
    fontWeight: '700',
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
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionButton: {
    height: 56,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#1f2937',
  },
  optionButtonSelected: {
    borderWidth: 2,
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  skipButton: {
    borderStyle: 'dashed',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleIconText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4285f4',
  },
  outlookIcon: {
    backgroundColor: '#0078d4',
  },
  outlookIconText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  appleIcon: {
    backgroundColor: '#000000',
  },
  appleIconText: {
    fontSize: 14,
  },
  otherIcon: {
    backgroundColor: 'transparent',
  },
  otherIconText: {
    fontSize: 20,
  },
  skipIcon: {
    backgroundColor: '#374151',
  },
  skipIconDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#9ca3af',
  },
  optionTextContainer: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f3f4f6',
  },
  optionTitleSelected: {
    color: '#000000',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  optionSubtitleSelected: {
    color: '#6b7280',
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#10b981',
    borderRadius: 8,
    marginBottom: 16,
  },
  successMessageText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  previewContainer: {
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
    marginTop: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previewCheckIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCheckText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  previewDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  eventsList: {
    gap: 8,
    marginBottom: 16,
  },
  eventItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 6,
  },
  eventName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  eventTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  autoSyncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCheck: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  autoSyncText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
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

