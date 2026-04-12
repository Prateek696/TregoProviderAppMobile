/**
 * Complete Setup Screen
 * Exact match with web version - Step 10: Complete Setup
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';

interface CompleteSetupScreenProps {
  orbColor?: string;
  firstName: string;
  assistantName: string;
  onComplete: () => void;
}

export default function CompleteSetupScreen({
  orbColor = '#3b82f6',
  firstName,
  assistantName,
  onComplete,
}: CompleteSetupScreenProps) {
  const { t } = useTranslation();
  const scaleAnim = React.useRef(new Animated.Value(0.3)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const ring1Anim = React.useRef(new Animated.Value(0.8)).current;
  const ring2Anim = React.useRef(new Animated.Value(0.8)).current;
  const textAnim = React.useRef(new Animated.Value(20)).current;
  const loadingAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate checkmark
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate rings
    Animated.parallel([
      Animated.timing(ring1Anim, {
        toValue: 1.3,
        duration: 1000,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(ring2Anim, {
        toValue: 1.6,
        duration: 1200,
        delay: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate text
    Animated.parallel([
      Animated.timing(textAnim, {
        toValue: 0,
        duration: 500,
        delay: 500,
        useNativeDriver: true,
      }),
      Animated.timing(loadingAnim, {
        toValue: 1,
        duration: 500,
        delay: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-complete after animation
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Checkmark Circle */}
        <View style={styles.checkmarkContainer}>
          <Animated.View
            style={[
              styles.checkmarkCircle,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}>
            <Text style={styles.checkmark}>✓</Text>
          </Animated.View>

          {/* Success Rings */}
          <Animated.View
            style={[
              styles.ring,
              styles.ring1,
              {
                transform: [{ scale: ring1Anim }],
                opacity: ring1Anim.interpolate({
                  inputRange: [0.8, 1.3],
                  outputRange: [0.8, 0],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              styles.ring2,
              {
                transform: [{ scale: ring2Anim }],
                opacity: ring2Anim.interpolate({
                  inputRange: [0.8, 1.6],
                  outputRange: [0.6, 0],
                }),
              },
            ]}
          />
        </View>

        {/* Text Content */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              transform: [{ translateY: textAnim }],
              opacity: opacityAnim,
            },
          ]}>
          <Text style={styles.title}>{t('completeSetup.title')}</Text>
          <Text style={styles.subtitle}>
            {t('completeSetup.welcome')} <Text style={styles.bold}>{t('completeSetup.brand')}</Text>,{' '}
            <Text style={styles.bold}>{firstName}</Text>.{' '}
            <Text style={styles.bold}>{assistantName}</Text> {t('completeSetup.ready')}
          </Text>
        </Animated.View>

        {/* Loading Indicator */}
        <Animated.View
          style={[
            styles.loadingContainer,
            {
              opacity: loadingAnim,
            },
          ]}>
          <ActivityIndicator size="small" color="#10b981" />
          <Text style={styles.loadingText}>{t('completeSetup.loading')}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkContainer: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkmarkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'absolute',
  },
  checkmark: {
    fontSize: 48,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  ring1: {
    borderColor: '#86efac',
  },
  ring2: {
    borderColor: '#d1fae5',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
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
    maxWidth: 320,
  },
  bold: {
    fontWeight: '700',
    color: '#f3f4f6',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});





