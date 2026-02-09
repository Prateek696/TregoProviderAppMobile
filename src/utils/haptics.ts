import { Vibration, Platform } from 'react-native';

/**
 * Simple Haptic Feedback utility using standard Vibration API
 * Falls back to simple vibrations since we might not have 'react-native-haptic-feedback' installed
 */

const Haptics = {
    // Light feedback for toggles, tabs, small interactions
    light: () => {
        if (Platform.OS === 'android') {
            Vibration.vibrate(10);
        } else {
            // iOS doesn't support duration-based Vibration.vibrate without haptic engine
            // This is a best-effort fallback
            Vibration.vibrate([0, 10], false);
        }
    },

    // Medium feedback for buttons, success states
    medium: () => {
        Vibration.vibrate(40);
    },

    // Heavy feedback for warnings, destructive actions, or "Day End"
    heavy: () => {
        Vibration.vibrate(100);
    },

    // Success pattern
    success: () => {
        Vibration.vibrate([0, 30, 100, 30]);
    },

    // Error pattern
    error: () => {
        Vibration.vibrate([0, 50, 50, 50, 50, 100]);
    }
};

export default Haptics;
