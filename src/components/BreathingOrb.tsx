/**
 * BreathingOrb - React Native Version
 * Migrated from web version: BreathingOrb.tsx
 * 
 * Animations exported and converted:
 * 1. Press scale animation (spring)
 * 2. Core pulse animation (breathing)
 * 3. Orbiting dots (rotate + scale + opacity)
 * 4. Background glow (opacity pulse - simplified for RN)
 */

import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Colors, Spacing } from '../shared/constants';

interface BreathingOrbProps {
  isListening?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { container: 32, dot: 6, core: 12, orbit: 12 },
  md: { container: 48, dot: 6, core: 12, orbit: 18 },
  lg: { container: 64, dot: 6, core: 12, orbit: 24 },
};

export function BreathingOrb({ isListening = false, onPress, size = 'md' }: BreathingOrbProps) {
  const [isPressed, setIsPressed] = useState(false);
  const dotCount = 6;
  const sizes = SIZE_MAP[size];

  // Animation 1: Press scale (spring animation)
  const pressScale = useSharedValue(1);

  // Animation 2: Core pulse
  const coreScale = useSharedValue(isListening ? 1 : 0.8);

  // Animation 3: Background glow opacity (simplified - RN doesn't support gradient animations)
  const glowOpacity = useSharedValue(isListening ? 0.3 : 0.1);

  // Animation 4: Dot animations (arrays for each dot)
  const dotRotations = Array(dotCount).fill(0).map(() => useSharedValue(0));
  const dotScales = Array(dotCount).fill(0).map(() => useSharedValue(isListening ? 0.8 : 0.6));
  const dotOpacities = Array(dotCount).fill(0).map(() => useSharedValue(isListening ? 0.7 : 0.4));

  // Setup core pulse animation
  useEffect(() => {
    coreScale.value = withRepeat(
      withSequence(
        withTiming(isListening ? 1.3 : 1.1, {
          duration: isListening ? 500 : 1000,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(isListening ? 1 : 0.8, {
          duration: isListening ? 500 : 1000,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1, // Infinite
      false
    );
  }, [isListening]);

  // Setup glow opacity animation
  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(isListening ? 0.5 : 0.2, {
          duration: isListening ? 750 : 1500,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(isListening ? 0.3 : 0.1, {
          duration: isListening ? 750 : 1500,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );
  }, [isListening]);

  // Setup dot animations
  useEffect(() => {
    dotRotations.forEach((rotation, i) => {
      rotation.value = withRepeat(
        withTiming(360, {
          duration: isListening ? 2000 : 4000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    });

    dotScales.forEach((scale, i) => {
      scale.value = withRepeat(
        withSequence(
          withTiming(isListening ? 1.2 : 1, {
            duration: isListening ? 500 : 1000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(isListening ? 0.8 : 0.6, {
            duration: isListening ? 500 : 1000,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      );
    });

    dotOpacities.forEach((opacity, i) => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(isListening ? 1 : 0.8, {
            duration: isListening ? 500 : 1000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(isListening ? 0.7 : 0.4, {
            duration: isListening ? 500 : 1000,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      );
    });
  }, [isListening]);

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }],
  }));

  const handlePressIn = () => {
    setIsPressed(true);
    pressScale.value = withSpring(0.95, {
      stiffness: 400,
      damping: 30,
    });
  };

  const handlePressOut = () => {
    setIsPressed(false);
    pressScale.value = withSpring(1, {
      stiffness: 400,
      damping: 30,
    });
  };

  // Calculate dot positions (orbiting)
  const getDotPosition = (index: number) => {
    const angle = (index * 60) * (Math.PI / 180);
    return {
      x: Math.cos(angle) * sizes.orbit,
      y: Math.sin(angle) * sizes.orbit,
    };
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.container}
    >
      <Animated.View
        style={[
          {
            width: sizes.container,
            height: sizes.container,
          },
          containerStyle,
        ]}
      >
        {/* Background glow */}
        <Animated.View
          style={[
            styles.glow,
            {
              width: sizes.container * 1.5,
              height: sizes.container * 1.5,
              borderRadius: (sizes.container * 1.5) / 2,
            },
            glowStyle,
          ]}
        />

        {/* Orbiting dots */}
        {Array.from({ length: dotCount }, (_, i) => {
          const position = getDotPosition(i);
          const dotRotationStyle = useAnimatedStyle(() => ({
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate: `${dotRotations[i].value}deg` },
            ],
          }));

          const dotScaleStyle = useAnimatedStyle(() => ({
            transform: [{ scale: dotScales[i].value }],
            opacity: dotOpacities[i].value,
          }));

          return (
            <Animated.View
              key={i}
              style={[
                styles.dotContainer,
                {
                  width: sizes.container,
                  height: sizes.container,
                },
                dotRotationStyle,
              ]}
            >
              <Animated.View
                style={[
                  styles.dot,
                  {
                    width: sizes.dot,
                    height: sizes.dot,
                    borderRadius: sizes.dot / 2,
                  },
                  dotScaleStyle,
                ]}
              />
            </Animated.View>
          );
        })}

        {/* Center core */}
        <Animated.View
          style={[
            styles.core,
            {
              width: sizes.core,
              height: sizes.core,
              borderRadius: sizes.core / 2,
            },
            coreStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: Colors.tregoBlue,
    opacity: 0.2,
  },
  dotContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    backgroundColor: Colors.tregoBlue,
  },
  core: {
    backgroundColor: '#2563eb', // blue-600
    position: 'absolute',
    alignSelf: 'center',
  },
});


