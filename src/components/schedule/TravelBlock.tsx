import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface TravelBlockProps {
    duration: number;
    mode?: string;
    from?: string;
}

export const TravelBlock: React.FC<TravelBlockProps> = ({ duration, mode = 'car', from }) => {
    return (
        <View style={styles.container}>
            <View style={styles.line} />
            <View style={styles.badge}>
                <Icon name={mode === 'walk' ? 'walk' : 'car'} size={12} color="#64748b" />
                <Text style={styles.text}>{duration}m</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 2,
        marginHorizontal: 16,
        height: 20,
    },
    line: {
        position: 'absolute',
        left: 20, // Align with typical content padding or similar
        right: 20,
        height: 1,
        backgroundColor: '#e2e8f0',
        zIndex: 0,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        gap: 4,
        zIndex: 1,
    },
    text: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
    },
});
