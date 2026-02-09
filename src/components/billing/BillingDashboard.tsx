/**
 * Billing Dashboard Component
 * Main dashboard view for billing features
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { loadInvoices, loadOnboardingStatus, saveOnboardingStatus } from '../../shared/utils/billingStorage';
import { Invoice } from '../../shared/types/billingTypes';

interface BillingDashboardProps {
    onNavigate: (view: string, data?: any) => void;
    orbColor?: string;
}

export default function BillingDashboard({
    onNavigate,
    orbColor = '#1E6FF7',
}: BillingDashboardProps) {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [onboardingComplete, setOnboardingComplete] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const loadedInvoices = await loadInvoices();
        const isComplete = await loadOnboardingStatus();
        setInvoices(loadedInvoices);
        setOnboardingComplete(isComplete);
        setRefreshing(false);
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // Calculate invoice counts
    const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
    const unpaidInvoices = invoices.filter(inv => inv.status === 'ISSUED');
    const overdueInvoices = invoices.filter(inv => inv.status === 'OVERDUE');

    const ActionCard = ({
        title,
        subtitle,
        icon,
        color,
        bgColor = '#fff',
        textColor = '#111827',
        subTextColor = '#6b7280',
        onPress,
        disabled = false,
        iconBgColor,
    }: any) => (
        <TouchableOpacity
            style={[
                styles.actionCard,
                { backgroundColor: bgColor, borderColor: bgColor === '#fff' ? '#e5e7eb' : bgColor },
                disabled && styles.disabledCard,
            ]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.9}>
            <View style={styles.cardContent}>
                <View style={[
                    styles.iconBox,
                    { backgroundColor: iconBgColor || (bgColor === '#fff' ? `${color}15` : 'rgba(255,255,255,0.2)') }
                ]}>
                    <Icon name={icon} size={24} color={bgColor === '#fff' ? color : '#fff'} />
                </View>
                <View style={styles.cardText}>
                    <Text style={[styles.cardTitle, { color: textColor }]}>{title}</Text>
                    <Text style={[styles.cardSubtitle, { color: subTextColor }]}>{subtitle}</Text>
                </View>
                <Icon name="chevron-right" size={20} color={bgColor === '#fff' ? '#9ca3af' : 'rgba(255,255,255,0.8)'} />
            </View>
        </TouchableOpacity>
    );

    const StatCard = ({ title, count, subtitle, icon, color, onPress, disabled }: any) => (
        <TouchableOpacity
            style={[styles.statCard, disabled && styles.disabledCard]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
        >
            <View style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: `${color}10` }]}>
                    <Icon name={icon} size={20} color={color} />
                </View>
                <View style={styles.statText}>
                    <Text style={styles.statTitle}>{title}</Text>
                    <Text style={styles.statSubtitle}>
                        {count} {subtitle}
                    </Text>
                </View>
                <Icon name="chevron-right" size={16} color="#d1d5db" />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header Filters */}
            <View style={styles.headerContainer}>
                <View style={styles.filterRow}>
                    <TouchableOpacity style={styles.dropdownBtn}>
                        <Text style={styles.dropdownText}>Current Month</Text>
                        <Icon name="chevron-down" size={14} color="#374151" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dropdownBtn}>
                        <Text style={styles.dropdownText}>All Types</Text>
                        <Icon name="chevron-down" size={14} color="#374151" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn}>
                        <Icon name="magnify" size={18} color="#374151" />
                    </TouchableOpacity>
                </View>

                {/* Sub Filters */}
                <View style={styles.subFilterRow}>
                    <TouchableOpacity style={styles.chipBtn} onPress={() => onNavigate('contacts')}>
                        <Icon name="account-group" size={14} color="#4b5563" />
                        <Text style={styles.chipText}>Contacts</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.chipBtn} onPress={() => onNavigate('items')}>
                        <Icon name="package-variant" size={14} color="#4b5563" />
                        <Text style={styles.chipText}>Items</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
                {/* DEV: Reset Onboarding Button */}
                <TouchableOpacity
                    onPress={async () => {
                        await saveOnboardingStatus(false);
                        onNavigate('welcome');
                    }}
                    style={{ padding: 8, alignItems: 'center', marginBottom: 8, alignSelf: 'center' }}>
                    <Text style={{ color: '#ef4444', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>[DEV] Reset Setup</Text>
                </TouchableOpacity>

                {/* Main Actions */}
                <ActionCard
                    title="Expenses"
                    subtitle="View all receipts"
                    icon="camera-outline"
                    color="#fff"
                    bgColor="#eab308" // Yellow-500
                    textColor="#fff"
                    subTextColor="rgba(255,255,255,0.9)"
                    onPress={() => onNavigate('expenses-list')}
                />

                <ActionCard
                    title="Commercial Proposals"
                    subtitle="View all proposals"
                    icon="file-document-outline"
                    color="#fff"
                    bgColor="#a855f7" // Purple-500
                    textColor="#fff"
                    subTextColor="rgba(255,255,255,0.9)"
                    onPress={() => onNavigate('commercial-proposals-list')}
                />

                <View style={{ height: 12 }} />

                {/* Invoices Status (Matching simple list style from screenshot) */}
                <StatCard
                    title="Paid Invoices"
                    count={paidInvoices.length}
                    subtitle="invoices"
                    icon="check-circle-outline"
                    color="#3b82f6" // Blue
                    onPress={() => onboardingComplete && onNavigate('invoices-list', { filter: 'paid' })}
                    disabled={!onboardingComplete}
                />

                <StatCard
                    title="Unpaid"
                    count={unpaidInvoices.length}
                    subtitle="pending payment"
                    icon="circle-outline" // or clock
                    color="#f59e0b" // Amber
                    onPress={() => onboardingComplete && onNavigate('invoices-list', { filter: 'unpaid' })}
                    disabled={!onboardingComplete}
                />

                <StatCard
                    title="Overdue"
                    count={overdueInvoices.length}
                    subtitle="require attention"
                    icon="alert-circle-outline"
                    color="#ef4444" // Red
                    onPress={() => onboardingComplete && onNavigate('invoices-list', { filter: 'overdue' })}
                    disabled={!onboardingComplete}
                />

                <View style={{ height: 12 }} />

                {/* Recurring */}
                <StatCard
                    title="Recurring Documents"
                    count=""
                    subtitle="Saved templates"
                    icon="repeat"
                    color="#3b82f6"
                    onPress={() => onNavigate('recurring-documents-list')}
                />

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Floating Create Button - Centered/Right aligned per design */}
            <TouchableOpacity
                style={[styles.fab, { borderColor: orbColor }]}
                onPress={() => onNavigate('document-type-drawer')}
                activeOpacity={0.8}
            >
                <Icon name="plus" size={20} color={orbColor} />
                <Text style={[styles.fabText, { color: orbColor }]}>Create Document</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerContainer: {
        padding: 16,
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    dropdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flex: 1,
    },
    dropdownText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
    },
    iconBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    subFilterRow: {
        flexDirection: 'row',
        gap: 12,
    },
    chipBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#4b5563',
    },
    scrollView: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        padding: 16,
    },
    actionCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    disabledCard: {
        opacity: 0.6,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    cardText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
    },
    statCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    statContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    statText: {
        flex: 1,
    },
    statTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    statSubtitle: {
        fontSize: 13,
        color: '#9ca3af',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        borderWidth: 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        gap: 8,
    },
    fabText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
