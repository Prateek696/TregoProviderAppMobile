import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface GapBlockProps {
    item: any;
    onNotesUpdate?: (notes: string) => void;
}

export const GapBlock: React.FC<GapBlockProps> = ({ item, onNotesUpdate }) => {
    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Free Time</Text>
                <Text style={styles.time}>{item.time} - {item.endTime}</Text>
            </View>

            <View style={styles.infoRow}>
                <Icon name="clock-outline" size={14} color="#64748b" />
                <Text style={styles.infoText} numberOfLines={1}>
                    {item.duration} min available
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#cbd5e1', // Gray
        marginHorizontal: 16,
        marginVertical: 4,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        gap: 4,
    },
    headerRow: {
        marginBottom: 2,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 2,
    },
    time: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoText: {
        fontSize: 13,
        color: '#64748b',
        flex: 1,
    },
});
