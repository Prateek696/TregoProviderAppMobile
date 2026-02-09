import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    SafeAreaView,
    TouchableWithoutFeedback
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export type CalendarViewType = 'day' | 'multi-day' | 'week' | 'month' | 'year' | 'map';

interface CalendarViewOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    currentView: CalendarViewType;
    onViewChange: (view: CalendarViewType) => void;
}

const VIEW_OPTIONS: { label: string; value: CalendarViewType }[] = [
    { label: 'Day', value: 'day' },
    { label: 'Multi-Day', value: 'multi-day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Year', value: 'year' },
    { label: 'Map', value: 'map' },
];

export default function CalendarViewOptionsModal({
    visible,
    onClose,
    currentView,
    onViewChange,
}: CalendarViewOptionsModalProps) {
    const [selectedView, setSelectedView] = useState<CalendarViewType>(currentView);
    const [selectedMembers, setSelectedMembers] = useState<string[]>(['1']);

    // Sync internal state when modal opens
    React.useEffect(() => {
        if (visible) {
            setSelectedView(currentView);
        }
    }, [visible, currentView]);

    const handleApply = () => {
        onViewChange(selectedView);
        onClose();
    };

    const toggleMember = (id: string) => {
        if (selectedMembers.includes(id)) {
            setSelectedMembers(selectedMembers.filter(m => m !== id));
        } else {
            setSelectedMembers([...selectedMembers, id]);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            {/* Header */}
                            <View style={styles.header}>
                                <View style={styles.headerTitleRow}>
                                    <Icon name="tune-variant" size={20} color="#e2e8f0" />
                                    <Text style={styles.title}>View Options</Text>
                                </View>
                                <TouchableOpacity onPress={onClose}>
                                    <Icon name="close" size={24} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.scrollContent}>
                                {/* View Section */}
                                <Text style={styles.sectionTitle}>View</Text>
                                <View style={styles.grid}>
                                    {VIEW_OPTIONS.map((option) => (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[
                                                styles.optionButton,
                                                selectedView === option.value && styles.optionButtonSelected
                                            ]}
                                            onPress={() => setSelectedView(option.value)}
                                        >
                                            <Text
                                                style={[
                                                    styles.optionText,
                                                    selectedView === option.value && styles.optionTextSelected
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Team Members Section */}
                                <View style={styles.teamHeaderRow}>
                                    <Text style={styles.sectionTitle}>Team Members</Text>
                                </View>

                                <View style={styles.searchContainer}>
                                    <Icon name="magnify" size={20} color="#94a3b8" style={styles.searchIcon} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search"
                                        placeholderTextColor="#64748b"
                                    />
                                </View>

                                <View style={styles.listHeaderRow}>
                                    <Text style={styles.selectionCount}>1 selected</Text>
                                    <TouchableOpacity>
                                        <Text style={styles.deselectAll}>Deselect all</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Mock Member */}
                                <TouchableOpacity
                                    style={styles.memberRow}
                                    onPress={() => toggleMember('1')}
                                >
                                    <Text style={styles.memberName}>aljdasd</Text>
                                    <View style={[
                                        styles.checkbox,
                                        selectedMembers.includes('1') && styles.checkboxSelected
                                    ]}>
                                        {selectedMembers.includes('1') && (
                                            <Icon name="check" size={14} color="#fff" />
                                        )}
                                    </View>
                                </TouchableOpacity>

                            </ScrollView>

                            {/* Footer */}
                            <View style={styles.footer}>
                                <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                                    <Text style={styles.applyButtonText}>Apply</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: 'rgba(30, 41, 59, 0.95)', // Semi-transparent slate
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#e2e8f0',
    },
    scrollContent: {
        padding: 16,
        maxHeight: 400,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#cbd5e1',
        marginBottom: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
    },
    optionButton: {
        width: '31%', // roughly 3 per row
        paddingVertical: 10,
        backgroundColor: '#0f172a',
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    optionButtonSelected: {
        backgroundColor: '#f8fafc',
        borderColor: '#f8fafc',
    },
    optionText: {
        color: '#e2e8f0',
        fontSize: 13,
        fontWeight: '500',
    },
    optionTextSelected: {
        color: '#0f172a',
        fontWeight: '600',
    },
    teamHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 40,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: '#e2e8f0',
        fontSize: 14,
    },
    listHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    selectionCount: {
        fontSize: 12,
        color: '#94a3b8',
    },
    deselectAll: {
        fontSize: 12,
        color: '#f97316',
    },
    memberRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    memberName: {
        fontSize: 14,
        color: '#e2e8f0',
        fontWeight: '500',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#64748b',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#f97316',
        borderColor: '#f97316',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    applyButton: {
        backgroundColor: '#f97316',
        borderRadius: 8,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
