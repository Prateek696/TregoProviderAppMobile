import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';

interface StartupOrbProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  intensity?: 'normal' | 'strong';
  color?: string;
}

const sizeConfig: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', { container: number; core: number; orbit: number; dot: number }> = {
  xs: { container: 44, core: 10, orbit: 14, dot: 4 }, // For chat list avatars (48x48 container)
  sm: { container: 73, core: 14, orbit: 18.4, dot: 5 },
  md: { container: 110, core: 18, orbit: 27.6, dot: 7 },
  lg: { container: 147, core: 23, orbit: 36.8, dot: 9 },
  xl: { container: 221, core: 28, orbit: 55.2, dot: 11 },
};

/**
 * Static StyleSheet object - always available and never conditionally assigned.
 * Declared at module level before component function to ensure it's always defined.
 * This styles object is never shadowed by props or reassigned.
 */
const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    // No shadows on glow rings - they should not extend outside
  },
  dotContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    // No outer shadows - shadows should not extend outside container
  },
  core: {
    position: 'absolute',
    // No outer shadows - shadows should not extend outside container
  },
  sparkleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  sparkleLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    left: '50%',
    marginLeft: -1,
  },
});

// Helper function to convert hex to RGB - matching web version
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 59, g: 130, b: 246 }; // Default blue fallback (#3b82f6)
};

export function StartupOrb({ size = 'lg', intensity = 'normal', color = '#3b82f6' }: StartupOrbProps) {
  // Ensure config is always defined - fallback to 'lg' if invalid size provided
  const config = sizeConfig[size] || sizeConfig.lg;
  const dotCount = 8;
  const isStrong = intensity === 'strong';

  // Convert color to RGB for animations
  const rgb = hexToRgb(color);
  const primaryColor = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
  
  // Create complementary color (matching web version logic)
  const complementaryRgb = {
    r: Math.min(255, Math.max(0, rgb.r + 30)),
    g: Math.min(255, Math.max(0, rgb.g + 50)),
    b: Math.min(255, Math.max(0, rgb.b + 30))
  };
  const complementaryColor = `${complementaryRgb.r}, ${complementaryRgb.g}, ${complementaryRgb.b}`;

  // Shared rotation for all dots orbiting together (more performant)
  const orbitRotation = useSharedValue(0);
  const corePulse = useSharedValue(0);
  const sparkleRotation = useSharedValue(0); // Sparkle effect rotation

  // Create shared values for each dot's individual animations (matching web staggered delays)
  const dotScales = Array.from({ length: dotCount }, () => useSharedValue(0));
  const dotOpacities = Array.from({ length: dotCount }, () => useSharedValue(0));

  // Initialize animations ONCE - matching web behavior (animations start immediately and loop forever)
  // CRITICAL FIX: Only initialize once, don't cancel/restart on re-renders
  useEffect(() => {
    // Core pulsing animation - matching web: duration 1.2s strong, 2s normal, repeat: Infinity
    corePulse.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: isStrong ? 1200 : 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: isStrong ? 1200 : 2000,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1, // Infinite repeat - EXACTLY like web: repeat: Infinity
      false // Don't reverse - matches web behavior
    );

    // Orbit rotation - matching web: duration 3s strong, 5s normal, repeat: Infinity, ease: linear
    // Web: rotate: 360 with repeat: Infinity
    orbitRotation.value = withRepeat(
      withTiming(360, {
        duration: isStrong ? 3000 : 5000, // Exact web timing
        easing: Easing.linear, // Exact web: ease: "linear"
      }),
      -1, // Infinite repeat - EXACTLY like web: repeat: Infinity
      false // Don't reverse
    );

    // Sparkle rotation - matching web: duration 4s strong, 6s normal, repeat: Infinity, ease: linear
    sparkleRotation.value = withRepeat(
      withTiming(360, {
        duration: isStrong ? 4000 : 6000, // Exact web timing
        easing: Easing.linear, // Exact web: ease: "linear"
      }),
      -1, // Infinite repeat - EXACTLY like web: repeat: Infinity
      false // Don't reverse
    );

    // Each dot's scale - matching web: duration 1.5s strong, 2.5s normal, delay: dot * 0.08, repeat: Infinity
    dotScales.forEach((dotScale, i) => {
      dotScale.value = withDelay(
        i * 80, // Exact web delay: dot * 0.08 seconds
        withRepeat(
          withSequence(
            withTiming(1, {
              duration: isStrong ? 1500 : 2500, // Exact web timing
              easing: Easing.inOut(Easing.ease), // Exact web: ease: "easeInOut"
            }),
            withTiming(0, {
              duration: isStrong ? 1500 : 2500,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1, // Infinite repeat - EXACTLY like web: repeat: Infinity
          false // Don't reverse
        )
      );
    });

    // Each dot's opacity - matching web: duration 1.5s strong, 2.5s normal, delay: dot * 0.08, repeat: Infinity
    dotOpacities.forEach((dotOpacity, i) => {
      dotOpacity.value = withDelay(
        i * 80, // Exact web delay: dot * 0.08 seconds
        withRepeat(
          withSequence(
            withTiming(1, {
              duration: isStrong ? 1500 : 2500, // Exact web timing
              easing: Easing.inOut(Easing.ease), // Exact web: ease: "easeInOut"
            }),
            withTiming(0, {
              duration: isStrong ? 1500 : 2500,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1, // Infinite repeat - EXACTLY like web: repeat: Infinity
          false // Don't reverse
        )
      );
    });

    // NO cleanup - animations run forever, just like web version
    // NO cancelAnimation - don't interrupt running animations
  }, []); // CRITICAL: Empty dependency array - initialize ONCE, never restart

  // Outer glow ring animation - matching web radial gradient effect
  const outerGlowStyle = useAnimatedStyle(() => {
    const scale = interpolate(corePulse.value, [0, 1], [1, isStrong ? 1.1 : 1.05]);
    const opacity = interpolate(corePulse.value, [0, 1], [0.1, 0.3]);
    return {
      transform: [{ scale }],
      opacity,
      backgroundColor: `rgba(${primaryColor}, ${opacity})`,
    };
  });

  // Middle glow ring animation - matching web complementary color effect
  const middleGlowStyle = useAnimatedStyle(() => {
    const scale = interpolate(corePulse.value, [0, 1], [1, isStrong ? 1.15 : 1.08]);
    const opacity = interpolate(corePulse.value, [0, 1], [0.15, 0.4]);
    return {
      transform: [{ scale }],
      opacity,
      backgroundColor: `rgba(${complementaryColor}, ${opacity})`,
    };
  });

  // Core animation - matching web pulsing (no outer shadows)
  const coreStyle = useAnimatedStyle(() => {
    const scale = interpolate(corePulse.value, [0, 1], [isStrong ? 1 : 0.8, isStrong ? 1.4 : 1.2]);
    return {
      transform: [{ scale }],
      // No shadowRadius, shadowOpacity - shadows stay inside container
    };
  });

  // Sparkle animation - matching web rotating conic gradient effect
  const sparkleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(corePulse.value, [0, 1], [0.1, 0.2]);
    // OPTIMIZED: Direct rotation - React Native handles angles > 360 automatically
    // No modulo needed - more performant
    return {
      transform: [{ rotate: `${sparkleRotation.value}deg` }],
      opacity,
    };
  });

  return (
    <View style={[styles.container, { width: config.container, height: config.container }]}>
      {/* Outer glow ring - matching web radial gradient (no outer shadows) */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: config.container,
            height: config.container,
            borderRadius: config.container / 2,
            // No shadowOffset, shadowRadius, elevation - shadows stay inside
          },
          outerGlowStyle,
        ]}
      />

      {/* Middle glow ring - matching web complementary color (no outer shadows) */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: config.container - 8,
            height: config.container - 8,
            borderRadius: (config.container - 8) / 2,
            // No shadowOffset, shadowRadius, elevation - shadows stay inside
          },
          middleGlowStyle,
        ]}
      />

      {/* Sparkle effect - rotating conic gradient (matching web) */}
      <Animated.View
        style={[
          styles.sparkleContainer,
          {
            width: config.container,
            height: config.container,
          },
          sparkleStyle,
        ]}
      >
        <View style={[styles.sparkleLine, { width: 2, height: config.container / 2 }]} />
        <View style={[styles.sparkleLine, { width: 2, height: config.container / 2, top: config.container / 2 }]} />
      </Animated.View>

      {/* Orbiting dots - continuous circular orbit motion (time-based, infinite loop) */}
      {Array.from({ length: dotCount }, (_, i) => {
        // Initial angle for each dot (spaced evenly around circle)
        const initialAngle = (i * 360) / dotCount;
        const initialAngleRadians = (initialAngle * Math.PI) / 180;

        const dotStyle = useAnimatedStyle(() => {
          // Continuous orbit rotation - dots move in circular path around center
          // OPTIMIZED: Direct calculation without modulo - Math.cos/sin handle angles > 360 automatically
          // This is more performant and eliminates any lag
          const rotationRadians = (orbitRotation.value * Math.PI) / 180;
          const currentAngle = initialAngleRadians + rotationRadians;

          // Calculate position on circle - continuous smooth motion (no jumps, no modulo overhead)
          const translateX = Math.cos(currentAngle) * config.orbit;
          const translateY = Math.sin(currentAngle) * config.orbit;

          // Scale animation (matching web: 0.6-1.2 normal, 0.8-1.4 strong)
          const scale = interpolate(
            dotScales[i].value,
            [0, 1],
            [isStrong ? 0.8 : 0.6, isStrong ? 1.4 : 1.2]
          );

          // Opacity animation (matching web: 0.5-0.9 normal, 0.8-1 strong)
          const opacity = interpolate(
            dotOpacities[i].value,
            [0, 1],
            [isStrong ? 0.8 : 0.5, isStrong ? 1 : 0.9]
          );

          return {
            transform: [
              { translateX },
              { translateY },
              { scale },
            ],
            opacity,
          };
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.dotContainer,
              {
                width: config.container,
                height: config.container,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
          >
            <Animated.View
              style={[
                styles.dot,
                {
                  width: config.dot,
                  height: config.dot,
                  borderRadius: config.dot / 2,
                  backgroundColor: color,
                },
                dotStyle,
              ]}
            />
          </Animated.View>
        );
      })}

      {/* Center core - matching web pulsing (no outer shadows) */}
      <Animated.View
        style={[
          styles.core,
          {
            width: config.core,
            height: config.core,
            borderRadius: config.core / 2,
            backgroundColor: color,
            // No shadowColor - no outer shadows
          },
          coreStyle,
        ]}
      />
    </View>
  );
}