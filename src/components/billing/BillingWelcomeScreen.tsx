import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
} from 'react-native';
import { Button } from '../ui/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface BillingWelcomeScreenProps {
    onStartSetup: () => void;
    onSkip: () => void;
}

export default function BillingWelcomeScreen({
    onStartSetup,
    onSkip,
}: BillingWelcomeScreenProps) {
    const [showSkipWarning, setShowSkipWarning] = useState(false);

    // Theme Colors (Dark Mode Default to match screenshot)
    const billingBlue = '#3b82f6';
    const darkBg = '#111827'; // gray-900
    const cardBg = '#1f2937'; // gray-800
    const textColor = '#e5e7eb'; // gray-200
    const subTextColor = '#9ca3af'; // gray-400

    const features = [
        'Certified invoices with ATCUD + QR codes',
        'Automatic tax compliance',
        'Payment tracking & reminders',
        'Commercial proposals & quotes',
        'Expense tracking with receipts'
    ];

    const limitedFeatures = [
        { text: 'Certified invoices with ATCUD + QR codes', available: false },
        { text: 'Automatic tax compliance', available: false },
        { text: 'Payment tracking & reminders', available: false },
        { text: 'Commercial proposals & quotes', available: true },
        { text: 'Expense tracking with receipts', available: true },
    ];

    return (
        <View style={[styles.container, { backgroundColor: darkBg }]}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.card, { backgroundColor: cardBg, borderColor: `${billingBlue}40` }]}>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: `${billingBlue}15` }]}>
                            <Icon name="file-document-outline" size={32} color={billingBlue} />
                        </View>
                        <Text style={[styles.title, { color: billingBlue }]}>Welcome to Billing</Text>
                        <Text style={[styles.subtitle, { color: subTextColor }]}>
                            Complete setup to unlock all features
                        </Text>
                    </View>

                    {/* Features */}
                    <View style={[styles.featuresContainer, { backgroundColor: `${billingBlue}08` }]}>
                        <Text style={[styles.featuresTitle, { color: textColor }]}>What you'll get:</Text>
                        {features.map((feature, index) => (
                            <View key={index} style={styles.featureRow}>
                                <Icon name="check-circle-outline" size={16} color={billingBlue} />
                                <Text style={[styles.featureText, { color: textColor }]}>{feature}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Time Estimate */}
                    <View style={[styles.timeContainer, { backgroundColor: `${billingBlue}10`, borderColor: `${billingBlue}30` }]}>
                        <Text style={[styles.timeText, { color: billingBlue }]}>
                            <Icon name="clock-outline" size={14} color={billingBlue} /> <Text style={{ fontWeight: '700' }}>5-10 minutes</Text> • 6 easy steps
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Button
                            title="Start Setup"
                            onPress={onStartSetup}
                            variant="default"
                            size="lg"
                            style={{ backgroundColor: billingBlue, width: '100%' }}
                            icon="arrow-right"
                        />
                        <TouchableOpacity
                            onPress={() => setShowSkipWarning(true)}
                            style={styles.skipButton}
                        >
                            <Text style={styles.skipText}>Skip (Limited Access)</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Warning Overlay Modal */}
            <Modal
                transparent
                visible={showSkipWarning}
                animationType="fade"
                onRequestClose={() => setShowSkipWarning(false)}
            >
                <View style={styles.modalOverlay}>
                    {/* Overlay Backdrop */}
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowSkipWarning(false)}
                        activeOpacity={1}
                    />

                    <View style={styles.warningCard}>
                        {/* Warning Header */}
                        <View style={styles.header}>
                            <View style={[styles.iconContainer, { backgroundColor: '#fef2f2' }]}>
                                <Icon name="alert-circle" size={32} color="#ef4444" />
                            </View>
                            <Text style={[styles.title, { color: '#dc2626' }]}>Limited Access Mode</Text>
                            <Text style={[styles.subtitle, { color: '#4b5563' }]}>Most features will be disabled</Text>
                        </View>

                        {/* Limited Features List */}
                        <View style={[styles.featuresContainer, { backgroundColor: '#fef2f2', marginBottom: 16 }]}>
                            <Text style={[styles.featuresTitle, { color: '#374151' }]}>What you'll get:</Text>
                            {limitedFeatures.map((item, index) => (
                                <View key={index} style={styles.featureRow}>
                                    <Icon
                                        name={item.available ? "check-circle-outline" : "close"}
                                        size={16}
                                        color={item.available ? "#059669" : "#f87171"}
                                    />
                                    <Text style={[
                                        styles.featureText,
                                        { color: item.available ? '#374151' : '#9ca3af', marginLeft: 8 },
                                        !item.available && { textDecorationLine: 'line-through' }
                                    ]}>
                                        {item.text}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Warning Box */}
                        <View style={styles.warningBox}>
                            <Text style={styles.warningText}>
                                <Icon name="alert-outline" size={14} color="#b91c1c" /> <Text style={{ fontWeight: '600' }}>You can complete setup anytime from Settings</Text>
                            </Text>
                        </View>

                        {/* Modal Actions */}
                        <View style={styles.actions}>
                            <Button
                                title="Go Back & Start Setup"
                                onPress={() => setShowSkipWarning(false)}
                                variant="default"
                                size="lg"
                                style={{ backgroundColor: billingBlue, width: '100%' }}
                                icon="arrow-right"
                            />
                            <TouchableOpacity
                                onPress={() => {
                                    setShowSkipWarning(false);
                                    onSkip();
                                }}
                                style={styles.skipButton}
                            >
                                <Text style={[styles.skipText, { color: '#4b5563' }]}>Continue with Limited Access</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 16,
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    card: {
        borderRadius: 16,
        padding: 24,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
    },
    featuresContainer: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    featuresTitle: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    featureText: {
        fontSize: 14,
        flex: 1,
    },
    timeContainer: {
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    timeText: {
        fontSize: 13,
    },
    actions: {
        gap: 12,
    },
    skipButton: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    skipText: {
        fontSize: 14,
        color: '#9ca3af',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: 16,
    },
    warningCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        borderWidth: 2,
        borderColor: '#ef4444',
    },
    warningBox: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        alignItems: 'center',
    },
    warningText: {
        fontSize: 12,
        color: '#b91c1c',
        textAlign: 'center',
    },
});
