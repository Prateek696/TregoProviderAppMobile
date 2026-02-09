import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';

interface AddJobModalProps {
    visible: boolean;
    onClose: () => void;
    onAddJob: (job: any) => void;
    selectedDate: Date;
}

const JOB_TYPES = [
    { label: 'Select service type', value: '' },
    { label: 'Plumbing', value: 'Plumbing' },
    { label: 'Electrical', value: 'Electrical' },
    { label: 'HVAC', value: 'HVAC' },
    { label: 'Handyman', value: 'Handyman' },
    { label: 'Cleaning', value: 'Cleaning' },
    { label: 'Appliance', value: 'Appliance' },
];

type TabType = 'Job' | 'Break' | 'Personal' | 'Note';

export default function AddJobModal({ visible, onClose, onAddJob, selectedDate }: AddJobModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('Job');

    // Job Form State
    const [clientName, setClientName] = useState('');
    const [title, setTitle] = useState(''); // Used as "Service Type" or "Job Title"
    const [startTime, setStartTime] = useState('09:00');
    const [duration, setDuration] = useState('60');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');

    const handleSave = () => {
        // Basic validation for Job tab
        if (activeTab === 'Job') {
            if (!clientName || !category || !startTime || !duration) {
                Alert.alert('Missing Fields', 'Please fill in all required fields.');
                return;
            }
        }

        // Calculate end time
        const [hours, minutes] = startTime.split(':').map(Number);
        const startTotalMinutes = hours * 60 + minutes;
        const durationMinutes = parseInt(duration, 10);
        const endTotalMinutes = startTotalMinutes + durationMinutes;

        const endH = Math.floor(endTotalMinutes / 60);
        const endM = endTotalMinutes % 60;
        const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

        const newJob = {
            id: `new_${activeTab.toLowerCase()}_${Date.now()}`,
            title: category || activeTab, // Use category as title for jobs
            client: clientName,
            location: 'Client Location', // Default for now
            scheduledTime: `${startTime} - ${endTime}`,
            scheduledDate: selectedDate.toISOString(),
            duration: durationMinutes,
            status: 'confirmed',
            category: category || activeTab,
            bidAmount: '€120', // Default placeholder
            description,
            type: activeTab.toLowerCase() === 'job' ? 'job' : 'break', // Map to supported types
            priority: 'medium',
            timePosted: 'Just now'
        };

        onAddJob(newJob);
        resetForm();
        onClose();
    };

    const resetForm = () => {
        setClientName('');
        setTitle('');
        setStartTime('09:00');
        setDuration('60');
        setDescription('');
        setCategory('');
        setActiveTab('Job');
    };

    const renderTab = (tab: TabType, icon: string) => (
        <TouchableOpacity
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
        >
            <Icon
                name={icon}
                size={18}
                color={activeTab === tab ? '#f97316' : '#64748b'}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
            </Text>
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleRow}>
                            <Icon name="calendar-plus" size={20} color="#f8fafc" />
                            <Text style={styles.headerTitle}>
                                Add from {selectedDate.toLocaleDateString()} at {startTime}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Icon name="close" size={20} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.headerSubtitle}>
                        Create a new job, break, personal item, or note for the selected time slot
                    </Text>

                    {/* Tabs */}
                    <View style={styles.tabContainer}>
                        {renderTab('Job', 'briefcase-outline')}
                        {renderTab('Break', 'coffee-outline')}
                        {renderTab('Personal', 'account-outline')}
                        {renderTab('Note', 'file-document-outline')}
                    </View>

                    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
                        {/* Time Row */}
                        <View style={styles.timeRowContainer}>
                            <View style={styles.timeInputGroup}>
                                <Icon name="clock-time-four-outline" size={18} color="#64748b" style={styles.timeIcon} />
                                <Text style={styles.timeLabel}>Start:</Text>
                                <TextInput
                                    style={styles.timeInput}
                                    value={startTime}
                                    onChangeText={setStartTime}
                                    placeholder="00:00"
                                    placeholderTextColor="#475569"
                                    keyboardType="numbers-and-punctuation"
                                    maxLength={5}
                                />
                            </View>
                            <View style={styles.timeInputGroup}>
                                <Text style={styles.timeLabel}>Duration:</Text>
                                <View style={styles.durationInputWrapper}>
                                    <TextInput
                                        style={styles.durationInput}
                                        value={duration}
                                        onChangeText={setDuration}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <Text style={styles.timeLabel}>min</Text>
                            </View>
                        </View>

                        {/* Client Field */}
                        <View style={styles.inputGroup}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>Client *</Text>
                            </View>
                            <View style={styles.row}>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                                    placeholder="Search or enter client name"
                                    placeholderTextColor="#475569"
                                    value={clientName}
                                    onChangeText={setClientName}
                                />
                                <TouchableOpacity style={styles.secondaryButton}>
                                    <Text style={styles.secondaryButtonText}>Contacts</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Service Type Picker */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Service Type *</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={category}
                                    onValueChange={(itemValue) => setCategory(itemValue)}
                                    style={styles.picker}
                                    dropdownIconColor="#94a3b8"
                                    mode="dropdown"
                                >
                                    {JOB_TYPES.map((type) => (
                                        <Picker.Item
                                            key={type.value}
                                            label={type.label}
                                            value={type.value}
                                            color={type.value === '' ? '#64748b' : '#f8fafc'}
                                            fontFamily="System"
                                        />
                                    ))}
                                </Picker>
                            </View>
                        </View>

                        {/* Notes */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Notes</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Additional details..."
                                placeholderTextColor="#475569"
                                value={description}
                                onChangeText={setDescription}
                                multiline={true}
                                numberOfLines={4}
                            />
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelFooterButton} onPress={onClose}>
                            <Text style={styles.cancelFooterButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.addFooterButton} onPress={handleSave}>
                            <Text style={styles.addFooterButtonText}>Add</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: '#0f172a', // Slate 900
        borderRadius: 12,
        maxHeight: '85%',
        padding: 20,
        borderWidth: 1,
        borderColor: '#1e293b',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f8fafc',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#94a3b8',
        marginBottom: 20,
    },
    closeButton: {
        padding: 4,
    },
    // Tabs
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        marginBottom: 20,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        marginRight: 24,
        gap: 6,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#f97316', // Orange
    },
    tabText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#f8fafc',
        fontWeight: '600',
    },
    // Form
    formContainer: {
        marginBottom: 20,
    },
    // Time Row Box
    timeRowContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    timeInputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    timeIcon: {
        marginRight: 8,
    },
    timeLabel: {
        fontSize: 14,
        color: '#475569',
        marginRight: 8,
    },
    timeInput: {
        fontSize: 14,
        color: '#0f172a',
        padding: 0,
        width: 50,
    },
    durationInputWrapper: {
        backgroundColor: '#cbd5e1', // Grey background for duration
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginRight: 8,
    },
    durationInput: {
        fontSize: 14,
        color: '#0f172a',
        padding: 0,
        minWidth: 30,
        textAlign: 'center',
    },
    // Inputs
    inputGroup: {
        marginBottom: 20,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 6,
        padding: 12,
        fontSize: 14,
        color: '#f8fafc',
        backgroundColor: '#111827',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    secondaryButton: {
        backgroundColor: '#1e293b',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#334155',
    },
    secondaryButtonText: {
        color: '#f8fafc',
        fontSize: 14,
        fontWeight: '500',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 6,
        backgroundColor: '#111827',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        width: '100%',
        color: '#f8fafc',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        backgroundColor: '#111827',
    },
    // Footer
    footer: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'flex-end',
        marginTop: 'auto',
    },
    cancelFooterButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#1e293b',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    cancelFooterButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f8fafc',
    },
    addFooterButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#f97316', // Orange
        alignItems: 'center',
    },
    addFooterButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
});
