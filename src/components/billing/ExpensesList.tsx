/**
 * Expenses List Component
 * Displays and manages expense records
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
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { loadExpenses, saveExpenses, deleteExpense } from '../../shared/utils/billingStorage';
import { Expense } from '../../shared/types/billingTypes';

interface ExpensesListProps {
    onBack: () => void;
    onCreateExpense: () => void;
    onScanExpense: () => void;
    orbColor?: string;
}

const categoryIcons: Record<string, string> = {
    Office: 'paperclip',
    Travel: 'car',
    Materials: 'wrench',
    Food: 'silverware-fork-knife',
    Equipment: 'cog',
};

export default function ExpensesList({
    onBack,
    onCreateExpense,
    onScanExpense,
    orbColor = '#1E6FF7',
}: ExpensesListProps) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [periodFilter, setPeriodFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showPeriodPicker, setShowPeriodPicker] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const loadedExpenses = await loadExpenses();
        setExpenses(loadedExpenses);
    };

    const handleDeleteExpense = (expenseId: string) => {
        Alert.alert(
            'Delete Expense?',
            'This action cannot be undone. The expense will be permanently deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteExpense(expenseId);
                        loadData();
                    },
                },
            ]
        );
    };

    // Filter expenses
    const filteredExpenses = expenses
        .filter(expense => {
            const matchesSearch =
                searchTerm === '' ||
                expense.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (expense.description && expense.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (expense.nif && expense.nif.includes(searchTerm));

            const matchesCategory =
                categoryFilter === 'all' || expense.category === categoryFilter;

            // TODO: Add period filtering logic

            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const renderExpenseItem = ({ item }: { item: Expense }) => (
        <View style={styles.expenseCard}>
            <View style={styles.expenseContent}>
                {/* Category Icon */}
                <View style={styles.categoryIconContainer}>
                    <Icon
                        name={categoryIcons[item.category] || 'file-document-outline'}
                        size={16}
                        color={orbColor}
                    />
                </View>

                {/* Main Content */}
                <View style={styles.expenseMain}>
                    {/* Date & Amount */}
                    <View style={styles.expenseHeader}>
                        <Text style={styles.expenseDate}>
                            {new Date(item.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </Text>
                        <Text style={styles.expenseAmount}>€{item.amount.toFixed(2)}</Text>
                    </View>

                    {/* Description */}
                    <Text style={styles.expenseDescription} numberOfLines={1}>
                        {item.description || item.supplier || 'Expense'}
                    </Text>

                    {/* Secondary Info */}
                    <View style={styles.expenseSecondary}>
                        <Text style={styles.expenseSecondaryText}>{item.category}</Text>
                        {item.supplier && item.supplier !== 'N/A' && (
                            <>
                                <Text style={styles.expenseSecondaryText}>•</Text>
                                <Text style={styles.expenseSecondaryText} numberOfLines={1}>
                                    {item.supplier}
                                </Text>
                            </>
                        )}
                        {item.vat > 0 && (
                            <>
                                <Text style={styles.expenseSecondaryText}>•</Text>
                                <Text style={styles.expenseSecondaryText}>VAT: €{item.vat.toFixed(2)}</Text>
                            </>
                        )}
                    </View>
                </View>

                {/* Delete Button */}
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteExpense(item.id)}>
                    <Icon name="trash-can-outline" size={14} color="#dc2626" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Search and Filters */}
            <View style={styles.filtersContainer}>
                {/* Search */}
                <View style={styles.searchContainer}>
                    <Icon name="magnify" size={16} color="#9ca3af" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search: Supplier, NIF..."
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* Filter Buttons */}
                <View style={styles.filterButtons}>
                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => setShowPeriodPicker(true)}>
                        <Text style={styles.filterButtonText}>
                            {periodFilter === 'all' ? 'All Time' : periodFilter}
                        </Text>
                        <Icon name="chevron-down" size={14} color="#6b7280" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => setShowCategoryPicker(true)}>
                        <Text style={styles.filterButtonText}>
                            {categoryFilter === 'all' ? 'All Categories' : categoryFilter}
                        </Text>
                        <Icon name="chevron-down" size={14} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                {/* Results Count */}
                <Text style={styles.resultsText}>
                    {filteredExpenses.length} {filteredExpenses.length === 1 ? 'expense' : 'expenses'} • Total: €
                    {totalExpenses.toFixed(2)}
                </Text>
            </View>

            {/* Expenses List */}
            <FlatList
                data={filteredExpenses}
                renderItem={renderExpenseItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="camera-outline" size={48} color="#d1d5db" />
                        <Text style={styles.emptyText}>No expenses found</Text>
                        <Text style={styles.emptySubtext}>Add an expense to get started</Text>
                    </View>
                }
            />

            {/* Floating Add Button */}
            <TouchableOpacity
                style={[styles.floatingButton, { backgroundColor: orbColor }]}
                onPress={onCreateExpense}>
                <Icon name="plus" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Period Picker Modal */}
            <Modal visible={showPeriodPicker} transparent animationType="slide">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPeriodPicker(false)}>
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Time Period</Text>
                            <TouchableOpacity onPress={() => setShowPeriodPicker(false)}>
                                <Text style={styles.pickerDone}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <Picker
                            selectedValue={periodFilter}
                            onValueChange={value => {
                                setPeriodFilter(value);
                                setShowPeriodPicker(false);
                            }}>
                            <Picker.Item label="All Time" value="all" />
                            <Picker.Item label="This Week" value="this-week" />
                            <Picker.Item label="Last Week" value="last-week" />
                            <Picker.Item label="Last Month" value="last-month" />
                            <Picker.Item label="Last Quarter" value="last-quarter" />
                        </Picker>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Category Picker Modal */}
            <Modal visible={showCategoryPicker} transparent animationType="slide">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowCategoryPicker(false)}>
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Category</Text>
                            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                                <Text style={styles.pickerDone}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <Picker
                            selectedValue={categoryFilter}
                            onValueChange={value => {
                                setCategoryFilter(value);
                                setShowCategoryPicker(false);
                            }}>
                            <Picker.Item label="All Categories" value="all" />
                            <Picker.Item label="Office" value="Office" />
                            <Picker.Item label="Travel" value="Travel" />
                            <Picker.Item label="Materials" value="Materials" />
                            <Picker.Item label="Food" value="Food" />
                            <Picker.Item label="Equipment" value="Equipment" />
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
    filtersContainer: {
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        padding: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#334155',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 14,
        color: '#f8fafc',
    },
    filterButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    filterButton: {
        flex: 1,
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
        fontSize: 12,
        fontWeight: '500',
        color: '#f8fafc',
    },
    resultsText: {
        fontSize: 14,
        color: '#94a3b8',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    expenseCard: {
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        marginBottom: 8,
    },
    expenseContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        gap: 8,
    },
    categoryIconContainer: {
        width: 28,
        height: 28,
        backgroundColor: '#334155',
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryIcon: {
        fontSize: 16,
    },
    expenseMain: {
        flex: 1,
    },
    expenseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 4,
    },
    expenseDate: {
        fontSize: 14,
        fontWeight: '700',
        color: '#f8fafc',
    },
    expenseAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: '#f8fafc',
    },
    expenseDescription: {
        fontSize: 14,
        color: '#cbd5e1',
        marginBottom: 4,
    },
    expenseSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    expenseSecondaryText: {
        fontSize: 12,
        color: '#94a3b8',
    },
    deleteButton: {
        width: 28,
        height: 28,
        backgroundColor: '#450a0a',
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 16,
        color: '#94a3b8',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 8,
    },
    floatingButton: {
        position: 'absolute',
        right: 24,
        bottom: 80,
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
        color: '#1E6FF7',
    },
});
