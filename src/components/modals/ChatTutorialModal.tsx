/**
 * Chat Tutorial Modal
 * Exact match with web version - InterfaceTutorial
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';

interface ChatTutorialModalProps {
  isVisible: boolean;
  onDismiss: () => void;
  assistantName: string;
  orbColor: string;
}

export default function ChatTutorialModal({
  isVisible,
  onDismiss,
  assistantName,
  orbColor,
}: ChatTutorialModalProps) {
  const { t } = useTranslation();
  const tutorialSteps = [
    { id: 'orb-interaction', title: t('modals.tutorial.step1Title'), description: t('modals.tutorial.step1Desc') },
    { id: 'text-input', title: t('modals.tutorial.step2Title'), description: t('modals.tutorial.step2Desc') },
  ];
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isVisible) {
      setCurrentStep(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const handleNextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onDismiss();
    }
  };

  const handleSkip = () => {
    onDismiss();
  };

  if (!isVisible) return null;

  const currentTutorialStep = tutorialSteps[currentStep];

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onDismiss}
        />

        {/* Tutorial Instruction Box */}
        <Animated.View
          style={[
            styles.tutorialBox,
            {
              opacity: fadeAnim,
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
            },
          ]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.dot, { backgroundColor: orbColor }]} />
              <Text style={styles.title}>{currentTutorialStep.title}</Text>
            </View>
            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.skipText}>{t('modals.tutorial.skip')}</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.description}>{currentTutorialStep.description}</Text>

          {/* Step Indicators and Next Button */}
          <View style={styles.footer}>
            <View style={styles.stepIndicators}>
              {tutorialSteps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor:
                        index === currentStep ? orbColor : '#E5E7EB',
                    },
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleNextStep}
              style={[styles.nextButton, { backgroundColor: orbColor }]}>
              <Text style={styles.nextButtonText}>
                {currentStep === tutorialSteps.length - 1 ? t('modals.tutorial.gotIt') : t('modals.tutorial.next')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  backdrop: {
    flex: 1,
  },
  tutorialBox: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  skipText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepIndicators: {
    flexDirection: 'row',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});





