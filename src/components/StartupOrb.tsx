import React, { useEffect } from 'react';
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
} from 'react-native-reanimated';

interface StartupOrbProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  intensity?: 'normal' | 'strong';
  color?: string;
}

const sizeConfig: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', { container: number; core: number; orbit: number; dot: number }> = {
  xs: { container: 44, core: 10, orbit: 14, dot: 4 },
  sm: { container: 73, core: 14, orbit: 18.4, dot: 5 },
  md: { container: 110, core: 18, orbit: 27.6, dot: 7 },
  lg: { container: 147, core: 23, orbit: 36.8, dot: 9 },
  xl: { container: 221, core: 28, orbit: 55.2, dot: 11 },
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
  },
  dotContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
  },
  core: {
    position: 'absolute',
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

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 59, g: 130, b: 246 };
};

export function StartupOrb({ size = 'lg', intensity = 'normal', color = '#3b82f6' }: StartupOrbProps) {
  const config = sizeConfig[size] || sizeConfig.lg;
  const dotCount = 8;
  const isStrong = intensity === 'strong';

  const rgb = hexToRgb(color);
  const primaryColor = `${rgb.r}, ${rgb.g}, ${rgb.b}`;

  const complementaryRgb = {
    r: Math.min(255, Math.max(0, rgb.r + 30)),
    g: Math.min(255, Math.max(0, rgb.g + 50)),
    b: Math.min(255, Math.max(0, rgb.b + 30))
  };
  const complementaryColor = `${complementaryRgb.r}, ${complementaryRgb.g}, ${complementaryRgb.b}`;

  const orbitRotation = useSharedValue(0);
  const corePulse = useSharedValue(0);
  const sparkleRotation = useSharedValue(0);

  const dotScales = Array.from({ length: dotCount }, () => useSharedValue(0));
  const dotOpacities = Array.from({ length: dotCount }, () => useSharedValue(0));

  useEffect(() => {
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
      -1,
      false
    );

    // Static dots - movement stopped per user request
    orbitRotation.value = 0;

    sparkleRotation.value = withRepeat(
      withTiming(360, {
        duration: isStrong ? 4000 : 6000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    dotScales.forEach((dotScale, i) => {
      dotScale.value = withDelay(
        i * 80,
        withRepeat(
          withSequence(
            withTiming(1, {
              duration: isStrong ? 1500 : 2500,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(0, {
              duration: isStrong ? 1500 : 2500,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          false
        )
      );
    });

    dotOpacities.forEach((dotOpacity, i) => {
      dotOpacity.value = withDelay(
        i * 80,
        withRepeat(
          withSequence(
            withTiming(1, {
              duration: isStrong ? 1500 : 2500,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(0, {
              duration: isStrong ? 1500 : 2500,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          false
        )
      );
    });
  }, []);

  const outerGlowStyle = useAnimatedStyle(() => {
    const scale = interpolate(corePulse.value, [0, 1], [1, isStrong ? 1.1 : 1.05]);
    const opacity = interpolate(corePulse.value, [0, 1], [0.1, 0.3]);
    return {
      transform: [{ scale }],
      opacity,
      backgroundColor: `rgba(${primaryColor}, ${opacity})`,
    };
  });

  const middleGlowStyle = useAnimatedStyle(() => {
    const scale = interpolate(corePulse.value, [0, 1], [1, isStrong ? 1.15 : 1.08]);
    const opacity = interpolate(corePulse.value, [0, 1], [0.15, 0.4]);
    return {
      transform: [{ scale }],
      opacity,
      backgroundColor: `rgba(${complementaryColor}, ${opacity})`,
    };
  });

  const coreStyle = useAnimatedStyle(() => {
    const scale = interpolate(corePulse.value, [0, 1], [isStrong ? 1 : 0.8, isStrong ? 1.4 : 1.2]);
    return {
      transform: [{ scale }],
    };
  });

  const sparkleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(corePulse.value, [0, 1], [0.1, 0.2]);
    return {
      transform: [{ rotate: `${sparkleRotation.value}deg` }],
      opacity,
    };
  });

  return (
    <View style={[styles.container, { width: config.container, height: config.container }]}>
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: config.container,
            height: config.container,
            borderRadius: config.container / 2,
          },
          outerGlowStyle,
        ]}
      />

      <Animated.View
        style={[
          styles.glowRing,
          {
            width: config.container - 8,
            height: config.container - 8,
            borderRadius: (config.container - 8) / 2,
          },
          middleGlowStyle,
        ]}
      />

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

      {Array.from({ length: dotCount }, (_, i) => {
        const initialAngle = (i * 360) / dotCount;
        const initialAngleRadians = (initialAngle * Math.PI) / 180;

        const dotStyle = useAnimatedStyle(() => {
          const rotationRadians = (orbitRotation.value * Math.PI) / 180;
          const currentAngle = initialAngleRadians + rotationRadians;

          const translateX = Math.cos(currentAngle) * config.orbit;
          const translateY = Math.sin(currentAngle) * config.orbit;

          const scale = interpolate(
            dotScales[i].value,
            [0, 1],
            [isStrong ? 0.8 : 0.6, isStrong ? 1.4 : 1.2]
          );

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

      <Animated.View
        style={[
          styles.core,
          {
            width: config.core,
            height: config.core,
            borderRadius: config.core / 2,
            backgroundColor: color,
          },
          coreStyle,
        ]}
      />
    </View>
  );
}