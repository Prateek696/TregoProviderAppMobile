/**
 * Document Type Drawer
 * Bottom sheet for selecting document type to create
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface DocumentTypeDrawerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (type: string) => void;
    isInvoiceEnabled: boolean;
}

export default function DocumentTypeDrawer({
    visible,
    onClose,
    onSelect,
    isInvoiceEnabled,
}: DocumentTypeDrawerProps) {
    const handleSelect = (type: string) => {
        onClose();
        // Small delay to allow modal to close before navigating
        setTimeout(() => {
            onSelect(type);
        }, 300);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}>
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />
                    <Text style={styles.title}>Create New Document</Text>

                    <View style={styles.grid}>
                        {/* Expense - Always Enabled */}
                        <TouchableOpacity
                            style={styles.option}
                            onPress={() => handleSelect('create-expense')}>
                            <View style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]}>
                                <Icon name="camera-outline" size={24} color="#d97706" />
                            </View>
                            <Text style={styles.optionTitle}>Expense</Text>
                        </TouchableOpacity>

                        {/* Proposal - Always Enabled */}
                        <TouchableOpacity
                            style={styles.option}
                            onPress={() => handleSelect('create-proposal')}>
                            <View style={[styles.iconContainer, { backgroundColor: '#f3e8ff' }]}>
                                <Icon name="send" size={24} color="#7c3aed" />
                            </View>
                            <Text style={styles.optionTitle}>Proposal</Text>
                        </TouchableOpacity>

                        {/* Invoice - Enabled if Onboarded */}
                        <TouchableOpacity
                            style={[styles.option, !isInvoiceEnabled && styles.disabledOption]}
                            disabled={!isInvoiceEnabled}
                            onPress={() => handleSelect('create-invoice')}>
                            <View style={[styles.iconContainer, { backgroundColor: '#dbeafe' }]}>
                                <Icon name="file-document-outline" size={24} color="#2563eb" />
                            </View>
                            <Text style={styles.optionTitle}>Invoice</Text>
                            {!isInvoiceEnabled && (
                                <Icon name="lock" size={12} color="#9ca3af" style={styles.lockIcon} />
                            )}
                        </TouchableOpacity>

                        {/* Receipt - Mocked */}
                        <TouchableOpacity
                            style={[styles.option, !isInvoiceEnabled && styles.disabledOption]}
                            disabled={!isInvoiceEnabled}
                            onPress={() => handleSelect('create-receipt')}>
                            <View style={[styles.iconContainer, { backgroundColor: '#e0e7ff' }]}>
                                <Icon name="receipt" size={24} color="#4f46e5" />
                            </View>
                            <Text style={styles.optionTitle}>Receipt</Text>
                            {!isInvoiceEnabled && (
                                <Icon name="lock" size={12} color="#9ca3af" style={styles.lockIcon} />
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 40,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#e5e7eb',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 24,
        textAlign: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    option: {
        width: '47%', // roughly half
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    disabledOption: {
        opacity: 0.5,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    lockIcon: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    cancelButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ef4444',
    },
});
