/**
 * Onboarding Screen
 * Simplified version migrated from web app's ProviderOnboardingFlow
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent } from '../components/ui/Card';
import { Colors } from '../shared/constants/colors';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

type OnboardingStep = 0 | 1 | 2 | 3;

const COLOR_OPTIONS = [
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Green', color: '#10b981' },
  { name: 'Purple', color: '#8b5cf6' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Teal', color: '#14b8a6' },
  { name: 'Indigo', color: '#6366f1' },
];

const SERVICE_OPTIONS = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Carpentry',
  'Painting',
  'Cleaning',
  'Landscaping',
  'Handyman',
  'Appliance Repair',
  'Roofing',
];

export default function OnboardingScreen() {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(0);
  const [firstName, setFirstName] = useState('');
  const [assistantName, setAssistantName] = useState('Alex');
  const [orbColor, setOrbColor] = useState('#3b82f6');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const handleServiceToggle = (service: string) => {
    setSelectedServices(prev =>
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((currentStep + 1) as OnboardingStep);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((currentStep - 1) as OnboardingStep);
    }
  };

  const handleComplete = async () => {
    try {
      // Save profile data
      const profile = {
        firstName,
        assistantName,
        orbColor,
        services: selectedServices,
        onboardingComplete: true,
      };

      await jsonStorage.setItem(STORAGE_KEYS.PROVIDER_PROFILE, profile);
      await jsonStorage.setItem(STORAGE_KEYS.ORB_COLOR, orbColor);
      await jsonStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, true);

      // Navigate to main app
      navigation.replace('Main');
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return firstName.trim().length > 0;
      case 1:
        return assistantName.trim().length > 0;
      case 2:
        return true; // Color always selected
      case 3:
        return selectedServices.length > 0;
      default:
        return false;
    }
  };

  const renderStep0 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Text style={styles.iconEmoji}>👋</Text>
      </View>
      <Text style={styles.stepTitle}>Welcome to Trego!</Text>
      <Text style={styles.stepDescription}>
        Let's set up your provider profile. This will only take a few minutes.
      </Text>
      <View style={styles.inputGroup}>
        <Label required>Your First Name</Label>
        <Input
          placeholder="Enter your name"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Text style={styles.iconEmoji}>🤖</Text>
      </View>
      <Text style={styles.stepTitle}>Name Your Assistant</Text>
      <Text style={styles.stepDescription}>
        Give your AI assistant a name. This is how it will address you.
      </Text>
      <View style={styles.inputGroup}>
        <Label required>Assistant Name</Label>
        <Input
          placeholder="Alex"
          value={assistantName}
          onChangeText={setAssistantName}
          autoCapitalize="words"
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Text style={styles.iconEmoji}>🎨</Text>
      </View>
      <Text style={styles.stepTitle}>Choose Your Color</Text>
      <Text style={styles.stepDescription}>
        Select a color theme for your app experience.
      </Text>
      <View style={styles.colorGrid}>
        {COLOR_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.color}
            style={[
              styles.colorOption,
              { backgroundColor: option.color },
              orbColor === option.color && styles.colorOptionSelected,
            ]}
            onPress={() => setOrbColor(option.color)}>
            {orbColor === option.color && (
              <Text style={styles.colorCheckmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.colorName}>
        {COLOR_OPTIONS.find(o => o.color === orbColor)?.name}
      </Text>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Text style={styles.iconEmoji}>🛠️</Text>
      </View>
      <Text style={styles.stepTitle}>Select Your Services</Text>
      <Text style={styles.stepDescription}>
        Choose the services you offer. You can add more later.
      </Text>
      <View style={styles.servicesGrid}>
        {SERVICE_OPTIONS.map(service => {
          const isSelected = selectedServices.includes(service);
          return (
            <TouchableOpacity
              key={service}
              style={[
                styles.serviceOption,
                isSelected && { backgroundColor: orbColor, borderColor: orbColor },
              ]}
              onPress={() => handleServiceToggle(service)}>
              <Text
                style={[
                  styles.serviceOptionText,
                  isSelected && { color: Colors.primaryForeground },
                ]}>
                {service}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedServices.length === 0 && (
        <Text style={styles.hint}>Select at least one service to continue</Text>
      )}
    </View>
  );

  const renderContent = () => {
    switch (currentStep) {
      case 0:
        return renderStep0();
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return renderStep0();
    }
  };

  const progress = ((currentStep + 1) / 4) * 100;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: orbColor },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Step {currentStep + 1} of 4
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {renderContent()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 0 && (
          <Button
            title="Back"
            variant="outline"
            onPress={handleBack}
            style={styles.backButton}
          />
        )}
        <Button
          title={currentStep === 3 ? 'Complete Setup' : 'Next'}
          onPress={handleNext}
          disabled={!canProceed()}
          style={[styles.nextButton, { backgroundColor: orbColor }]}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.muted,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconEmoji: {
    fontSize: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  inputGroup: {
    width: '100%',
    gap: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: Colors.foreground,
    transform: [{ scale: 1.1 }],
  },
  colorCheckmark: {
    fontSize: 24,
    color: Colors.primaryForeground,
    fontWeight: 'bold',
  },
  colorName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  serviceOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  serviceOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.foreground,
  },
  hint: {
    fontSize: 12,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
