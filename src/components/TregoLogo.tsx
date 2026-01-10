/**
 * Trego Logo Component with Animations
 * React Native version with animated color cycle and breathing effect
 * Matches web version's animate-logo-color-cycle behavior
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';

interface TregoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'large';
  className?: string;
  glowColor?: string;
  animated?: boolean; // Enable color cycle animation
  breathing?: boolean; // Enable breathing/pulse animation
}

export function TregoLogo({ 
  size = 'md', 
  className, 
  glowColor, 
  animated = true,
  breathing = true 
}: TregoLogoProps) {
  const dimensions = {
    sm: 24,
    md: 32,
    lg: 48,
    large: 64,
  };

  const sizeValue = dimensions[size];

  // Color cycle: Yellow → Emerald → Amber → Purple → Pink → Yellow
  const colors = ['#fbbf24', '#10b981', '#f59e0b', '#a855f7', '#ec4899']; // yellow, emerald, amber, purple, pink
  const [currentColor, setCurrentColor] = useState(colors[0]);

  // Color animation progress (0 to 4 for 5 colors)
  const colorProgress = useSharedValue(0);

  // Breathing/pulse animation
  const scale = useSharedValue(1);

  // Continuous color cycle animation
  useEffect(() => {
    if (!animated || glowColor) {
      setCurrentColor(glowColor || colors[0]);
      return;
    }

    let animationFrame: number;
    let startTime = Date.now();
    const cycleDuration = 8000; // 8 seconds for full cycle

    const updateColor = () => {
      const elapsed = (Date.now() - startTime) % cycleDuration;
      const progress = (elapsed / cycleDuration) * 4; // 0 to 4 for 5 colors
      const index = Math.floor(progress) % colors.length;
      const nextIndex = (index + 1) % colors.length;
      const ratio = progress - Math.floor(progress);

      // Interpolate between current and next color
      const current = colors[index];
      const next = colors[nextIndex];

      // Simple RGB interpolation
      const interpolatedColor = interpolateColorHex(current, next, ratio);
      setCurrentColor(interpolatedColor);

      animationFrame = requestAnimationFrame(updateColor);
    };

    // Start animation
    colorProgress.value = withRepeat(
      withTiming(4, {
        duration: cycleDuration,
        easing: Easing.linear,
      }),
      -1, // Infinite
      false
    );

    updateColor();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [animated, glowColor]);

  // Breathing animation
  useEffect(() => {
    if (!breathing) {
      scale.value = 1;
      return;
    }

    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );
  }, [breathing]);

  // Breathing scale animation
  const animatedScale = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Helper function to interpolate hex colors
  function interpolateColorHex(color1: string, color2: string, ratio: number): string {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substring(0, 2), 16);
    const g1 = parseInt(hex1.substring(2, 4), 16);
    const b1 = parseInt(hex1.substring(4, 6), 16);
    
    const r2 = parseInt(hex2.substring(0, 2), 16);
    const g2 = parseInt(hex2.substring(2, 4), 16);
    const b2 = parseInt(hex2.substring(4, 6), 16);
    
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  return (
    <Animated.View style={[styles.container, { width: sizeValue, height: sizeValue }, animatedScale]}>
      <Svg
        width={sizeValue}
        height={sizeValue}
        viewBox="0 0 926.98669 1038.0933"
        fill="none">
        <G>
          <Path
            d="m 6952.13,2339.29 c 0,-433.23 -351.2,-784.43 -784.43,-784.43 -433.23,0 -784.43,351.2 -784.43,784.43 0,433.22 351.2,784.43 784.43,784.43 433.23,0 784.43,-351.21 784.43,-784.43"
            fill={currentColor}
            transform="matrix(0.13333333,0,0,-0.13333333,0,1038.0933)"
          />
          <Path
            d="m 6952.45,5447.18 c 0,-433.22 -351.2,-784.43 -784.43,-784.43 -433.23,0 -784.43,351.21 -784.43,784.43 0,433.23 351.2,784.43 784.43,784.43 433.23,0 784.43,-351.2 784.43,-784.43"
            fill={currentColor}
            transform="matrix(0.13333333,0,0,-0.13333333,0,1038.0933)"
          />
          <Path
            d="m 4260.77,7001.28 c 0,-433.23 -351.2,-784.43 -784.43,-784.43 -433.23,0 -784.43,351.2 -784.43,784.43 0,433.23 351.2,784.43 784.43,784.43 433.23,0 784.43,-351.2 784.43,-784.43"
            fill={currentColor}
            transform="matrix(0.13333333,0,0,-0.13333333,0,1038.0933)"
          />
          <Path
            d="m 1569.43,5447.03 c 0,-433.23 -351.2,-784.43 -784.43,-784.43 -433.23,0 -784.429687,351.2 -784.429687,784.43 0,433.23 351.199687,784.43 784.429687,784.43 433.23,0 784.43,-351.2 784.43,-784.43"
            fill={currentColor}
            transform="matrix(0.13333333,0,0,-0.13333333,0,1038.0933)"
          />
          <Path
            d="m 1568.86,2338.7 c 0,-433.23 -351.2,-784.43 -784.43,-784.43 C 351.199,1554.27 0,1905.47 0,2338.7 c 0,433.23 351.199,784.43 784.43,784.43 433.23,0 784.43,-351.2 784.43,-784.43"
            fill={currentColor}
            transform="matrix(0.13333333,0,0,-0.13333333,0,1038.0933)"
          />
          <Path
            d="m 4655.14,3892.54 c 0,651.18 -527.9,1179.08 -1179.05,1179.08 -651.18,0 -1179.08,-527.9 -1179.08,-1179.08 0,-375.25 175.32,-709.56 448.5,-925.47 0.03,-0.03 0.08,-0.06 0.11,-0.11 270.46,-250.97 432.96,-568.59 432.79,-912.68 0.22,-256.98 -91.97,-496.71 -248.95,-705.48 l -17.64,-19.41 C 2775.45,1188.28 2691.59,996.172 2691.59,784.449 2691.59,351.219 3042.78,0 3476.01,0 c 433.23,0 784.44,351.219 784.44,784.449 0,213.11 -85.01,406.361 -222.96,547.731 1.01,-1.02 2.02,-2.04 3.02,-3.07 l -17.63,19.69 c -156.98,208.77 -249.14,448.5 -248.95,705.48 -0.14,344.14 162.53,662.01 433.02,913 -0.09,-0.05 -0.18,-0.12 -0.27,-0.18 273.16,215.96 448.46,550.23 448.46,925.44"
            fill={currentColor}
            transform="matrix(0.13333333,0,0,-0.13333333,0,1038.0933)"
          />
        </G>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

