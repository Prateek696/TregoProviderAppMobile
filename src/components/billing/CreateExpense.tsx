/**
 * Create Expense Component
 * Form for manually creating expense records
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Modal,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { saveExpense } from '../../shared/utils/billingStorage';
import { Expense } from '../../shared/types/billingTypes';
import { Button } from '../ui/Button';

interface CreateExpenseProps {
    onBack: () => void;
    orbColor?: string;
}

export default function CreateExpense({
    onBack,
    orbColor = '#1E6FF7',
}: CreateExpenseProps) {
    const [supplier, setSupplier] = useState('');
    const [nif, setNif] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [vat, setVat] = useState('');
    const [category, setCategory] = useState<Expense['category']>('Materials');
    const [method, setMethod] = useState('Card');
    const [description, setDescription] = useState('');
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showMethodPicker, setShowMethodPicker] = useState(false);

    const handleSave = async () => {
        if (!supplier || !amount) {
            Alert.alert('Error', 'Please fill in supplier and amount');
            return;
        }

        const expense: Expense = {
            id: `exp_${Date.now()}`,
            supplier,
            nif: nif || undefined,
            date,
            amount: parseFloat(amount),
            vat: parseFloat(vat) || 0,
            category,
            method,
            status: 'pending',
            description: description || undefined,
        };

        await saveExpense(expense);
        Alert.alert('Success', 'Expense saved successfully', [
            { text: 'OK', onPress: onBack },
        ]);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color="#f8fafc" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Expense</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Form */}
            <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
                {/* Supplier */}
                <View style={styles.field}>
                    <Text style={styles.label}>Supplier *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter supplier name"
                        value={supplier}
                        onChangeText={setSupplier}
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* NIF */}
                <View style={styles.field}>
                    <Text style={styles.label}>NIF</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Tax identification number"
                        value={nif}
                        onChangeText={setNif}
                        keyboardType="numeric"
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* Date */}
                <View style={styles.field}>
                    <Text style={styles.label}>Date *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="YYYY-MM-DD"
                        value={date}
                        onChangeText={setDate}
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* Amount */}
                <View style={styles.field}>
                    <Text style={styles.label}>Amount (€) *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* VAT */}
                <View style={styles.field}>
                    <Text style={styles.label}>VAT (€)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        value={vat}
                        onChangeText={setVat}
                        keyboardType="decimal-pad"
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* Category */}
                <View style={styles.field}>
                    <Text style={styles.label}>Category *</Text>
                    <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowCategoryPicker(true)}>
                        <Text style={styles.pickerButtonText}>{category}</Text>
                        <Icon name="chevron-down" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                </View>

                {/* Payment Method */}
                <View style={styles.field}>
                    <Text style={styles.label}>Payment Method *</Text>
                    <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowMethodPicker(true)}>
                        <Text style={styles.pickerButtonText}>{method}</Text>
                        <Icon name="chevron-down" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                </View>

                {/* Description */}
                <View style={styles.field}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Add notes or description"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* Save Button */}
                <Button
                    title="Save Expense"
                    onPress={handleSave}
                    variant="default"
                    size="lg"
                    style={styles.saveButton}
                />
            </ScrollView>

            {/* Category Picker Modal */}
            <Modal visible={showCategoryPicker} transparent animationType="slide">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowCategoryPicker(false)}>
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Category</Text>
                            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                                <Text style={[styles.pickerDone, { color: orbColor }]}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <Picker
                            selectedValue={category}
                            onValueChange={value => {
                                setCategory(value as Expense['category']);
                                setShowCategoryPicker(false);
                            }}>
                            <Picker.Item label="Office" value="Office" />
                            <Picker.Item label="Travel" value="Travel" />
                            <Picker.Item label="Materials" value="Materials" />
                            <Picker.Item label="Food" value="Food" />
                            <Picker.Item label="Equipment" value="Equipment" />
                        </Picker>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Method Picker Modal */}
            <Modal visible={showMethodPicker} transparent animationType="slide">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMethodPicker(false)}>
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Payment Method</Text>
                            <TouchableOpacity onPress={() => setShowMethodPicker(false)}>
                                <Text style={[styles.pickerDone, { color: orbColor }]}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <Picker
                            selectedValue={method}
                            onValueChange={value => {
                                setMethod(value);
                                setShowMethodPicker(false);
                            }}>
                            <Picker.Item label="Cash" value="Cash" />
                            <Picker.Item label="Card" value="Card" />
                            <Picker.Item label="MBWay" value="MBWay" />
                            <Picker.Item label="Transfer" value="Transfer" />
                            <Picker.Item label="Multibanco" value="Multibanco" />
                            <Picker.Item label="Other" value="Other" />
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
    form: {
        flex: 1,
    },
    formContent: {
        padding: 16,
        paddingBottom: 32,
    },
    field: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#e2e8f0',
        marginBottom: 8,
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
    textArea: {
        height: 100,
        paddingTop: 10,
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#475569',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#334155',
    },
    pickerButtonText: {
        fontSize: 16,
        color: '#f8fafc',
    },
    saveButton: {
        marginTop: 8,
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
