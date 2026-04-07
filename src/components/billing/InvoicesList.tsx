/**
 * Invoices List Component
 * Displays and manages invoice records
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { invoicesAPI } from '../../services/api';

interface InvoicesListProps {
    onBack: () => void;
    onCreateInvoice: () => void;
    filter?: 'all' | 'paid' | 'unpaid' | 'overdue' | 'drafts';
    orbColor?: string;
}

export default function InvoicesList({
    onBack,
    onCreateInvoice,
    filter = 'all',
    orbColor = '#1E6FF7',
}: InvoicesListProps) {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>(filter === 'all' ? 'all' : filter.toUpperCase());
    const [showStatusPicker, setShowStatusPicker] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await invoicesAPI.list();
            setInvoices(res.data.invoices);
        } catch (err) {
            console.error('Failed to load invoices:', err);
        }
    };

    const getStatusColor = (status: Invoice['status']) => {
        switch (status) {
            case 'PAID': return '#059669'; // Green
            case 'ISSUED': return '#d97706'; // Amber
            case 'OVERDUE': return '#dc2626'; // Red
            case 'DRAFT': return '#6b7280'; // Gray
            case 'VOID': return '#1f2937'; // Dark Gray
            default: return '#6b7280';
        }
    };

    const getStatusBadge = (status: Invoice['status']) => {
        const color = getStatusColor(status);
        return (
            <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
                <Text style={[styles.statusText, { color }]}>{status}</Text>
            </View>
        );
    };

    // Filter invoices
    const filteredInvoices = invoices
        .filter(invoice => {
            const matchesSearch =
                searchTerm === '' ||
                invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                invoice.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                invoice.client.nif.includes(searchTerm);

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'unpaid' ? invoice.status === 'ISSUED' :
                    statusFilter === 'drafts' ? invoice.status === 'DRAFT' :
                        invoice.status === statusFilter.toUpperCase());

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const renderInvoiceItem = ({ item }: { item: Invoice }) => (
        <TouchableOpacity style={styles.invoiceCard} activeOpacity={0.7}>
            <View style={styles.invoiceContent}>
                <View style={styles.invoiceHeader}>
                    <View>
                        <Text style={styles.invoiceNumber}>{item.number}</Text>
                        <Text style={styles.clientName}>{item.client.name}</Text>
                    </View>
                    <View style={styles.amountContainer}>
                        <Text style={styles.amount}>€{item.total.toFixed(2)}</Text>
                        {getStatusBadge(item.status)}
                    </View>
                </View>

                <View style={styles.invoiceFooter}>
                    <View style={styles.footerItem}>
                        <Icon name="calendar-outline" size={14} color="#6b7280" />
                        <Text style={styles.footerText}>{item.date}</Text>
                    </View>
                    {item.status === 'ISSUED' && (
                        <View style={styles.footerItem}>
                            <Icon name="clock-outline" size={14} color="#d97706" />
                            <Text style={[styles.footerText, { color: '#d97706' }]}>Due: {item.dueDate}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Invoices</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Filters */}
            <View style={styles.filtersContainer}>
                <View style={styles.searchContainer}>
                    <Icon name="magnify" size={16} color="#9ca3af" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search invoice #, client..."
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setShowStatusPicker(true)}>
                    <Text style={styles.filterButtonText}>
                        Status: {statusFilter === 'all' ? 'All' : statusFilter}
                    </Text>
                    <Icon name="chevron-down" size={14} color="#6b7280" />
                </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
                data={filteredInvoices}
                renderItem={renderInvoiceItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="file-document-outline" size={48} color="#d1d5db" />
                        <Text style={styles.emptyText}>No invoices found</Text>
                    </View>
                }
            />

            {/* Floating Add Button */}
            <TouchableOpacity
                style={[styles.floatingButton, { backgroundColor: orbColor }]}
                onPress={onCreateInvoice}>
                <Icon name="plus" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Status Picker Modal */}
            <Modal visible={showStatusPicker} transparent animationType="slide">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowStatusPicker(false)}>
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Filter Status</Text>
                            <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                                <Text style={[styles.pickerDone, { color: orbColor }]}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <Picker
                            selectedValue={statusFilter}
                            onValueChange={value => {
                                setStatusFilter(value);
                                setShowStatusPicker(false);
                            }}>
                            <Picker.Item label="All Statuses" value="all" />
                            <Picker.Item label="Paid" value="PAID" />
                            <Picker.Item label="Unpaid (Issued)" value="unpaid" />
                            <Picker.Item label="Overdue" value="OVERDUE" />
                            <Picker.Item label="Drafts" value="DRAFT" />
                        </Picker>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#f8fafc',
    },
    filtersContainer: {
        backgroundColor: '#1e293b',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        gap: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#334155', // Darker input bg
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 40,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#f8fafc',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
    },
    filterButtonText: {
        fontSize: 14,
        color: '#f8fafc',
        textTransform: 'capitalize',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    invoiceCard: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
        // Removed heavy shadows for dark mode feeling
    },
    invoiceContent: {
        gap: 12,
    },
    invoiceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    invoiceNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94a3b8',
        marginBottom: 4,
    },
    clientName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#f8fafc',
    },
    amountContainer: {
        alignItems: 'flex-end',
        gap: 4,
    },
    amount: {
        fontSize: 18,
        fontWeight: '700',
        color: '#f8fafc',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    invoiceFooter: {
        flexDirection: 'row',
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: '#334155',
        paddingTop: 12,
        marginTop: 4,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerText: {
        fontSize: 12,
        color: '#94a3b8',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
    },
    emptyText: {
        fontSize: 16,
        color: '#94a3b8',
        marginTop: 16,
    },
    floatingButton: {
        position: 'absolute',
        right: 24,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    pickerContainer: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#f8fafc',
    },
    pickerDone: {
        fontSize: 16,
        fontWeight: '600',
    },
});
