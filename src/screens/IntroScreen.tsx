/**
 * Intro/Onboarding Screen
 * Optimized version - smooth animations without lag
 * Shows after Google login
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { StartupOrb } from '../components/StartupOrb';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTranslation } from 'react-i18next';

type IntroScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Intro'>;

const { width, height } = Dimensions.get('window');

export default function IntroScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<IntroScreenNavigationProp>();
  const [showButton, setShowButton] = useState(false);
  const [orbIntensity, setOrbIntensity] = useState<'normal' | 'strong'>('normal');
  const [taglineIndex, setTaglineIndex] = useState(0);

  // Cycling taglines
  const cyclingTaglines = [
    t('intro.tagline1'),
    t('intro.tagline2'),
    t('intro.tagline3'),
    t('intro.tagline4'),
    t('intro.tagline5'),
    t('intro.tagline6'),
    t('intro.tagline7'),
  ];

  // Brand text animation
  const brandOpacity = useSharedValue(0);
  const brandTranslateY = useSharedValue(-20);

  // Orb animation
  const orbOpacity = useSharedValue(0);
  const orbScale = useSharedValue(0.8);

  // Tagline animation - simple fade in/out
  const taglineOpacity = useSharedValue(0);

  // Action words animations
  const jobsTranslateX = useSharedValue(-80);
  const jobsOpacity = useSharedValue(0);
  const jobsScale = useSharedValue(0.8);
  const scheduleTranslateX = useSharedValue(40);
  const scheduleOpacity = useSharedValue(0);
  const scheduleScale = useSharedValue(0.8);
  const handledTranslateY = useSharedValue(-40);
  const handledOpacity = useSharedValue(0);
  const handledScale = useSharedValue(1.2);

  // Button animation
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);
  const buttonScale = useSharedValue(0.9);

  const cycleTimeoutRef = useRef<NodeJS.Timeout>();

  // Simple brand fade in
  useEffect(() => {
    brandOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    brandTranslateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) });

    // Show orb after brand
    setTimeout(() => {
      orbOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
      orbScale.value = withSpring(1, { damping: 12, stiffness: 100 });

      // Show first tagline with simple fade
      setTimeout(() => {
        taglineOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
        setOrbIntensity('strong');

        // Show action words
        setTimeout(() => {
          // Jobs
          jobsTranslateX.value = withSpring(0, { damping: 12, stiffness: 300, mass: 0.8 });
          jobsOpacity.value = withTiming(1, { duration: 400 });
          jobsScale.value = withSpring(1, { damping: 12, stiffness: 300, mass: 0.8 });

          // Schedule
          setTimeout(() => {
            scheduleTranslateX.value = withSpring(0, { damping: 12, stiffness: 300, mass: 0.8 });
            scheduleOpacity.value = withTiming(1, { duration: 400 });
            scheduleScale.value = withSpring(1, { damping: 12, stiffness: 300, mass: 0.8 });

            // Handled
            setTimeout(() => {
              handledTranslateY.value = withSpring(0, { damping: 10, stiffness: 400, mass: 1 });
              handledOpacity.value = withTiming(1, { duration: 400 });
              handledScale.value = withSpring(1, { damping: 10, stiffness: 400, mass: 1 });

              // Show button
              setTimeout(() => {
                setShowButton(true);
                buttonOpacity.value = withSpring(1, {
                  damping: 20,
                  stiffness: 200,
                });
                buttonTranslateY.value = withSpring(0, {
                  damping: 20,
                  stiffness: 200,
                });
                buttonScale.value = withSpring(1, {
                  damping: 20,
                  stiffness: 200,
                });

                // Start cycling taglines (simple fade in/out)
                startCycling();
              }, 800);
            }, 320);
          }, 350);
        }, 1000);
      }, 800);
    }, 600);
  }, []);

  // Simple cycling - ensures ALL taglines are shown (including first one)
  const startCycling = useCallback(() => {
    // Start from index 1 since index 0 (first tagline) is already shown
    let currentIndex = 0; // Will increment to 1 on first cycle

    const updateTagline = (newIndex: number) => {
      setTaglineIndex(newIndex);
      setOrbIntensity('strong');
      setTimeout(() => setOrbIntensity('normal'), 200);
    };

    const cycle = () => {
      // Fade out current tagline
      taglineOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          // Move to next tagline - cycle through ALL taglines (0, 1, 2, 3, 4, 5, 6, then back to 0)
          currentIndex = (currentIndex + 1) % cyclingTaglines.length;
          runOnJS(updateTagline)(currentIndex);

          // Fade in new tagline
          taglineOpacity.value = withTiming(1, { duration: 300 });

          // Schedule next cycle - ensures ALL taglines cycle properly
          cycleTimeoutRef.current = setTimeout(runOnJS(cycle), 3000); // 3 seconds per tagline
        }
      });
    };

    // Start cycling after showing first tagline for 3 seconds
    // This ensures first tagline is visible, then cycles through all others
    cycleTimeoutRef.current = setTimeout(runOnJS(cycle), 3000);
  }, [cyclingTaglines, taglineOpacity]);

  useEffect(() => {
    return () => {
      if (cycleTimeoutRef.current) {
        clearTimeout(cycleTimeoutRef.current);
      }
    };
  }, []);

  const brandAnimatedStyle = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
    transform: [{ translateY: brandTranslateY.value }],
  }));

  const orbAnimatedStyle = useAnimatedStyle(() => ({
    opacity: orbOpacity.value,
    transform: [{ scale: orbScale.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const jobsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: jobsOpacity.value,
    transform: [
      { translateX: jobsTranslateX.value },
      { scale: jobsScale.value },
    ],
  }));

  const scheduleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: scheduleOpacity.value,
    transform: [
      { translateX: scheduleTranslateX.value },
      { scale: scheduleScale.value },
    ],
  }));

  const handledAnimatedStyle = useAnimatedStyle(() => ({
    opacity: handledOpacity.value,
    transform: [
      { translateY: handledTranslateY.value },
      { scale: handledScale.value },
    ],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [
      { translateY: buttonTranslateY.value },
      { scale: buttonScale.value },
    ],
  }));

  const handleGetStarted = useCallback(() => {
    try {
      // Ensure navigation is available and Auth screen is registered
      if (navigation && navigation.replace) {
        navigation.replace('Auth'); // Navigate to Auth screen (second page) after Intro
      } else {
        console.error('[IntroScreen] Navigation not available');
        // Fallback: try navigate instead of replace
        if (navigation && navigation.navigate) {
          navigation.navigate('Auth');
        }
      }
    } catch (error) {
      console.error('[IntroScreen] Navigation error:', error);
      // Fallback navigation attempt
      try {
        if (navigation && navigation.navigate) {
          navigation.navigate('Auth');
        }
      } catch (fallbackError) {
        console.error('[IntroScreen] Fallback navigation also failed:', fallbackError);
      }
    }
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Dark background */}
      <View style={styles.backgroundGradient} />

      {/* Brand text - top center */}
      <Animated.View style={[styles.brandContainer, brandAnimatedStyle]}>
        <Text style={styles.brandText}>{t('intro.brand')}</Text>
      </Animated.View>

      {/* Orb - center - Always render to prevent animation stopping */}
      <Animated.View style={[styles.orbContainer, orbAnimatedStyle]}>
        <StartupOrb size="lg" intensity={orbIntensity} color="#3b82f6" />
      </Animated.View>

      {/* Tagline and action words - below orb */}
      <View style={styles.textContainer}>
        {/* Tagline - simple fade in/out */}
        <Animated.View style={taglineAnimatedStyle}>
          <Text style={styles.tagline}>{cyclingTaglines[taglineIndex]}</Text>
        </Animated.View>

        {/* Action words */}
        <View style={styles.actionWordsContainer}>
          <Animated.Text style={[styles.actionWord, jobsAnimatedStyle]}>
            {t('intro.jobs')}
          </Animated.Text>
          <Animated.Text style={[styles.actionWord, scheduleAnimatedStyle]}>
            {t('intro.schedule')}
          </Animated.Text>
          <Animated.Text style={[styles.actionWord, styles.actionWordHandled, handledAnimatedStyle]}>
            {t('intro.handled')}
          </Animated.Text>
        </View>
      </View>

      {/* Let's start button */}
      {showButton && (
        <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{t('intro.letsStart')}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a',
  },
  brandContainer: {
    position: 'absolute',
    top: height * 0.20, // Brand text position - matching second pic
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  brandText: {
    fontSize: 47,
    fontWeight: '500',
    color: '#ffffff',
    textAlign: 'center',
  },
  orbContainer: {
    position: 'absolute',
    top: height * 0.38 - 73.5, // More gap: orb center at 38%, matching second pic spacing
    left: width / 2 - 73.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    position: 'absolute',
    top: height * 0.50, // Moved closer to orb (was 0.65, now 0.50)
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  tagline: {
    fontSize: 18,
    color: '#ffffff', // White text matching second pic
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
    fontWeight: '400',
    minHeight: 24,
  },
  actionWordsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
    minHeight: 40,
  },
  actionWord: {
    fontSize: 24,
    fontWeight: '500',
    color: '#ffffff',
  },
  actionWordHandled: {
    fontWeight: '600',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  button: {
    width: '100%',
    maxWidth: 300,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
});
