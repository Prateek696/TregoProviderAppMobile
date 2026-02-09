/**
 * Create Invoice Component
 * Form for creating and issuing new invoices
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Button } from '../ui/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker'; // Ensure this package is installed or use a custom select
import { mockClients } from '../../shared/data/billingData';
import { Invoice, InvoiceLine, Client } from '../../shared/types/billingTypes';
import { saveInvoice } from '../../shared/utils/billingStorage';

interface CreateInvoiceProps {
    onBack: () => void;
}

export default function CreateInvoice({ onBack }: CreateInvoiceProps) {
    const [loading, setLoading] = useState(false);

    // Invoice Details
    const [selectedClientId, setSelectedClientId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    // Line Items
    const [lines, setLines] = useState<InvoiceLine[]>([]);

    // Totals
    const [subtotal, setSubtotal] = useState(0);
    const [vatTotal, setVatTotal] = useState(0);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        calculateTotals();
    }, [lines]);

    const calculateTotals = () => {
        const sub = lines.reduce((acc, line) => acc + (line.quantity * line.unitPrice), 0);
        const vat = lines.reduce((acc, line) => acc + (line.quantity * line.unitPrice * (line.vatRate / 100)), 0);
        setSubtotal(sub);
        setVatTotal(vat);
        setTotal(sub + vat);
    };

    const handleAddLine = () => {
        const newLine: InvoiceLine = {
            id: Date.now().toString(),
            description: '',
            quantity: 1,
            unit: 'un',
            unitPrice: 0,
            vatRate: 23,
            netAmount: 0,
            vatAmount: 0,
            totalAmount: 0
        };
        setLines([...lines, newLine]);
    };

    const updateLine = (id: string, field: keyof InvoiceLine, value: any) => {
        const updatedLines = lines.map(line => {
            if (line.id === id) {
                const updatedLine = { ...line, [field]: value };
                // Recalculate line totals
                const price = parseFloat(updatedLine.unitPrice.toString()) || 0;
                const qty = parseFloat(updatedLine.quantity.toString()) || 0;
                const rate = parseFloat(updatedLine.vatRate.toString()) || 0;

                updatedLine.netAmount = price * qty;
                updatedLine.vatAmount = updatedLine.netAmount * (rate / 100);
                updatedLine.totalAmount = updatedLine.netAmount + updatedLine.vatAmount;

                return updatedLine;
            }
            return line;
        });
        setLines(updatedLines);
    };

    const removeLine = (id: string) => {
        setLines(lines.filter(line => line.id !== id));
    };

    const handleSave = async (status: 'DRAFT' | 'ISSUED') => {
        if (!selectedClientId) {
            Alert.alert('Missing Client', 'Please select a client for this invoice.');
            return;
        }
        if (lines.length === 0) {
            Alert.alert('Empty Invoice', 'Please add at least one line item.');
            return;
        }
        // Basic validation for empty descriptions
        if (lines.some(l => !l.description)) {
            Alert.alert('Incomplete Lines', 'Please provide a description for all items.');
            return;
        }

        setLoading(true);

        try {
            const client = mockClients.find(c => c.id === selectedClientId) as Client;

            const newInvoice: Invoice = {
                id: Date.now().toString(),
                number: status === 'DRAFT' ? 'DRAFT' : `FT-2026/${Math.floor(Math.random() * 1000)}`,
                series: '2026',
                date,
                dueDate,
                status,
                client,
                lines,
                netTotal: subtotal,
                vatTotal: vatTotal,
                total,
                notes
            };

            await saveInvoice(newInvoice);
            Alert.alert('Success', `Invoice ${status === 'DRAFT' ? 'saved as draft' : 'issued'} successfully!`, [
                { text: 'OK', onPress: onBack }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to save invoice.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Icon name="close" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Invoice</Text>
                <TouchableOpacity onPress={() => handleSave('ISSUED')} disabled={loading}>
                    <Text style={styles.headerAction}>Issue</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {/* Client Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Client</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={selectedClientId}
                            onValueChange={setSelectedClientId}>
                            <Picker.Item label="Select Client..." value="" />
                            {mockClients.map(client => (
                                <Picker.Item key={client.id} label={client.name} value={client.id} />
                            ))}
                        </Picker>
                    </View>
                </View>

                {/* Dates */}
                <View style={styles.row}>
                    <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Date</Text>
                        <TextInput
                            style={styles.input}
                            value={date}
                            onChangeText={setDate}
                            placeholder="YYYY-MM-DD"
                        />
                    </View>
                    <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Due Date</Text>
                        <TextInput
                            style={styles.input}
                            value={dueDate}
                            onChangeText={setDueDate}
                            placeholder="YYYY-MM-DD"
                        />
                    </View>
                </View>

                {/* Line Items */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    {lines.map((line, index) => (
                        <View key={line.id} style={styles.lineItem}>
                            <View style={styles.lineHeader}>
                                <Text style={styles.lineIndex}>#{index + 1}</Text>
                                <TouchableOpacity onPress={() => removeLine(line.id)}>
                                    <Icon name="trash-can-outline" size={18} color="#ef4444" />
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                style={[styles.input, styles.lineInput]}
                                placeholder="Description"
                                value={line.description}
                                onChangeText={(text) => updateLine(line.id, 'description', text)}
                            />

                            <View style={styles.lineRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.miniLabel}>Qty</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={line.quantity.toString()}
                                        onChangeText={(text) => updateLine(line.id, 'quantity', text)}
                                    />
                                </View>
                                <View style={{ flex: 2, marginHorizontal: 8 }}>
                                    <Text style={styles.miniLabel}>Price</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={line.unitPrice.toString()}
                                        onChangeText={(text) => updateLine(line.id, 'unitPrice', text)}
                                    />
                                </View>
                                <View style={{ flex: 1.5 }}>
                                    <Text style={styles.miniLabel}>VAT %</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={line.vatRate.toString()}
                                        onChangeText={(text) => updateLine(line.id, 'vatRate', text)}
                                    />
                                </View>
                            </View>
                        </View>
                    ))}

                    <Button
                        title="Add Item"
                        onPress={handleAddLine}
                        variant="outline"
                        style={{ marginTop: 8 }}
                    />
                </View>

                {/* Totals */}
                <View style={styles.totalsSection}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Subtotal</Text>
                        <Text style={styles.totalValue}>€{subtotal.toFixed(2)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>VAT</Text>
                        <Text style={styles.totalValue}>€{vatTotal.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.totalRow, styles.finalTotal]}>
                        <Text style={styles.finalTotalLabel}>Total</Text>
                        <Text style={styles.finalTotalValue}>€{total.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Notes */}
                <View style={styles.section}>
                    <Text style={styles.label}>Notes</Text>
                    <TextInput
                        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                        multiline
                        placeholder="Additional notes..."
                        value={notes}
                        onChangeText={setNotes}
                    />
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.footer}>
                <Button
                    title="Save Draft"
                    onPress={() => handleSave('DRAFT')}
                    variant="secondary"
                    style={{ flex: 1, marginRight: 8 }}
                    loading={loading}
                />
                <Button
                    title="Issue Invoice"
                    onPress={() => handleSave('ISSUED')}
                    variant="default"
                    style={{ flex: 1, marginLeft: 8 }}
                    loading={loading}
                />
            </View>
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
    headerAction: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E6FF7',
    },
    content: {
        flex: 1,
        padding: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 12,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#475569',
        borderRadius: 8,
        backgroundColor: '#334155',
        overflow: 'hidden', // Ensures picker doesn't bleed
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#e2e8f0',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#475569',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#f8fafc',
        backgroundColor: '#334155',
    },
    row: {
        flexDirection: 'row',
    },
    lineItem: {
        backgroundColor: '#1e293b',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    lineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    lineIndex: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94a3b8',
    },
    lineInput: {
        marginBottom: 8,
    },
    lineRow: {
        flexDirection: 'row',
    },
    miniLabel: {
        fontSize: 11,
        color: '#94a3b8',
        marginBottom: 2,
    },
    totalsSection: {
        borderTopWidth: 1,
        borderTopColor: '#334155',
        paddingTop: 16,
        marginBottom: 24,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    totalLabel: {
        fontSize: 14,
        color: '#94a3b8',
    },
    totalValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#f8fafc',
    },
    finalTotal: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    finalTotalLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: '#f8fafc',
    },
    finalTotalValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E6FF7',
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#334155',
        backgroundColor: '#0f172a',
    },
});
