import React from 'react';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { ViewStyle, StyleProp } from 'react-native';

interface AnimatedEntryProps {
    children: React.ReactNode;
    index: number;
    delay?: number;
    style?: StyleProp<ViewStyle>;
}

export default function AnimatedEntry({ children, index, delay = 100, style }: AnimatedEntryProps) {
    return (
        <Animated.View
            entering={FadeInDown.delay(index * delay).springify().damping(15)}
            layout={Layout.springify()}
            style={style}
        >
            {children}
        </Animated.View>
    );
}
