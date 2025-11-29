/**
 * Animation Utilities
 * Reusable animation helpers for React Native
 * These replace Framer Motion animations from the web app
 */

import { useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat, withSequence } from 'react-native-reanimated';
import { useEffect } from 'react';

/**
 * Fade in animation
 */
export const useFadeIn = (duration = 300, delay = 0) => {
  const opacity = useSharedValue(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, { duration });
    }, delay);
    
    return () => clearTimeout(timer);
  }, []);
  
  return useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
};

/**
 * Scale animation (for buttons, cards)
 */
export const useScale = (initial = 0.8) => {
  const scale = useSharedValue(initial);
  
  const animateIn = (toValue = 1, duration = 300) => {
    scale.value = withSpring(toValue, { duration });
  };
  
  const animateOut = (toValue = initial, duration = 300) => {
    scale.value = withTiming(toValue, { duration });
  };
  
  useEffect(() => {
    animateIn();
  }, []);
  
  return {
    scale,
    animateIn,
    animateOut,
    animatedStyle: useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    })),
  };
};

/**
 * Breathing/pulsing animation (for orbs)
 */
export const useBreathing = (min = 0.8, max = 1.2, duration = 2000) => {
  const scale = useSharedValue(min);
  
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(max, { duration: duration / 2 }),
        withTiming(min, { duration: duration / 2 })
      ),
      -1, // Infinite
      false
    );
  }, []);
  
  return useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
};

/**
 * Slide animation (from left, right, top, bottom)
 */
export const useSlide = (direction: 'left' | 'right' | 'top' | 'bottom' = 'left', distance = 50, duration = 300) => {
  const translateX = useSharedValue(direction === 'left' ? -distance : direction === 'right' ? distance : 0);
  const translateY = useSharedValue(direction === 'top' ? -distance : direction === 'bottom' ? distance : 0);
  const opacity = useSharedValue(0);
  
  useEffect(() => {
    translateX.value = withTiming(0, { duration });
    translateY.value = withTiming(0, { duration });
    opacity.value = withTiming(1, { duration });
  }, []);
  
  return useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));
};

/**
 * Rotate animation (for loading spinners, orbiting elements)
 */
export const useRotate = (duration = 2000) => {
  const rotation = useSharedValue(0);
  
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration }),
      -1, // Infinite
      false
    );
  }, []);
  
  return useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
};

