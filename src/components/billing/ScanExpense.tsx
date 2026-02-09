/**
 * Scan Expense Component
 * Camera-based expense capture (simplified version)
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ScanExpenseProps {
    onBack: () => void;
    onManualEntry: () => void;
    orbColor?: string;
}

export default function ScanExpense({
    onBack,
    onManualEntry,
    orbColor = '#1E6FF7',
}: ScanExpenseProps) {
    const handleScanReceipt = () => {
        Alert.alert(
            'Camera Feature',
            'Camera scanning will be implemented in a future update. For now, please use manual entry.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Manual Entry', onPress: onManualEntry },
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan Expense</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Icon name="camera-outline" size={64} color={orbColor} />
                </View>
                <Text style={styles.title}>Scan Receipt</Text>
                <Text style={styles.subtitle}>
                    Take a photo of your receipt to automatically create an expense
                </Text>

                <TouchableOpacity
                    style={[styles.scanButton, { backgroundColor: orbColor }]}
                    onPress={handleScanReceipt}>
                    <Icon name="camera-outline" size={24} color="#fff" />
                    <Text style={styles.scanButtonText}>Open Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.manualButton} onPress={onManualEntry}>
                    <Icon name="pencil-outline" size={20} color={orbColor} />
                    <Text style={[styles.manualButtonText, { color: orbColor }]}>
                        Enter Manually
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 32,
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    scanButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    manualButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    manualButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
