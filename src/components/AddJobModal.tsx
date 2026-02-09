import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Platform,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Mock Data
const JOB_TYPES = [
    { value: 'house-cleaning', label: 'House Cleaning', duration: 120, price: 80 },
    { value: 'deep-cleaning', label: 'Deep Cleaning', duration: 240, price: 150 },
    { value: 'office-cleaning', label: 'Office Cleaning', duration: 90, price: 60 },
    { value: 'move-in-cleaning', label: 'Move-in/Move-out Cleaning', duration: 180, price: 120 },
    { value: 'post-construction', label: 'Post-Construction Cleanup', duration: 300, price: 200 },
    { value: 'carpet-cleaning', label: 'Carpet Cleaning', duration: 120, price: 90 },
    { value: 'window-cleaning', label: 'Window Cleaning', duration: 60, price: 40 },
    { value: 'custom', label: 'Custom Job', duration: 120, price: 80 }
];

const MOCK_CLIENTS = [
    { id: '1', firstName: 'Sarah', lastName: 'Williams', phone: '+351 912 345 678', address: '123 Main St', city: 'Lisbon', type: 'individual' },
    { id: '2', firstName: 'Michael', lastName: 'Thompson', phone: '+351 999 888 777', address: '456 Oak Ave', city: 'Porto', type: 'individual' },
    { id: '3', businessName: 'Tech Corp', nif: '500111222', phone: '+351 211 222 333', address: '789 Biz Blvd', city: 'Lisbon', type: 'business' },
];

const COLORS = {
    background: '#0f172a',
    card: '#1e293b',
    primary: '#3b82f6',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#334155',
    inputBg: '#334155',
    success: '#16a34a',
    cardHighlight: '#1e293b',
};

interface AddJobModalProps {
    visible: boolean;
    onClose: () => void;
    onJobCreated: (job: any) => void;
}

export default function AddJobModal({ visible, onClose, onJobCreated }: AddJobModalProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<any>(null);

    // Job Form
    const [jobForm, setJobForm] = useState({
        jobType: '',
        description: '',
        duration: 120,
        price: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        notes: '',
    });

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [newClient, setNewClient] = useState({
        nif: '',
        type: 'individual',
        firstName: '',
        lastName: '',
        businessName: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        postalCode: ''
    });

    useEffect(() => {
        if (visible) {
            setCurrentStep(1);
            setSearchTerm('');
            setSelectedClient(null);
            setJobForm({
                jobType: '',
                description: '',
                duration: 120,
                price: '',
                date: new Date().toISOString().split('T')[0],
                time: '09:00',
                notes: '',
            });
            setIsCreatingClient(false);
            setNewClient({
                nif: '',
                type: 'individual',
                firstName: '',
                lastName: '',
                businessName: '',
                phone: '',
                email: '',
                address: '',
                city: '',
                postalCode: ''
            });
        }
    }, [visible]);

    const filteredClients = MOCK_CLIENTS.filter(c =>
        c.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    const handleJobTypeSelect = (type: string) => {
        const job = JOB_TYPES.find(j => j.value === type);
        if (job) {
            setJobForm(prev => ({
                ...prev,
                jobType: type,
                description: job.label,
                duration: job.duration,
                price: job.price.toString()
            }));
        } else {
            setJobForm(prev => ({ ...prev, jobType: type }));
        }
    };

    const handleCreateClient = () => {
        const client = {
            id: Date.now().toString(),
            ...newClient,
        };
        setSelectedClient(client);
        setIsCreatingClient(false);
    };

    const handleSubmit = () => {
        onJobCreated({
            id: Date.now().toString(),
            client: selectedClient,
            ...jobForm,
            status: 'confirmed'
        });
        onClose();
    };

    // --- Calendar Logic ---
    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

        const days = [];
        const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

        // Empty slots
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
        }

        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const isSelected = jobForm.date === dateStr;

            days.push(
                <TouchableOpacity network
                    key={i}
                    style={[styles.calendarDay, isSelected && styles.calendarDaySelected]}
                    onPress={() => setJobForm({ ...jobForm, date: dateStr })}
                >
                    <Text style={[styles.calendarDayText, isSelected && { color: '#fff' }]}>{i}</Text>
                </TouchableOpacity>
            );
        }

        return (
            <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={() => setCurrentMonth(new Date(year, month - 1, 1))}>
                        <Icon name="chevron-left" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.calendarTitle}>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
                    <TouchableOpacity onPress={() => setCurrentMonth(new Date(year, month + 1, 1))}>
                        <Icon name="chevron-right" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                </View>
                <View style={styles.weekRow}>
                    {dayNames.map(d => <Text key={d} style={styles.weekDayText}>{d}</Text>)}
                </View>
                <View style={styles.daysGrid}>
                    {days}
                </View>
            </View>
        );
    };


    // --- Render Steps ---

    const renderStepIndicator = () => (
        <View style={styles.stepContainer}>
            {[1, 2, 3, 4].map(step => (
                <React.Fragment key={step}>
                    <View style={[styles.stepCircle, currentStep >= step ? styles.stepActive : styles.stepInactive]}>
                        <Text style={[styles.stepText, currentStep >= step ? { color: '#fff' } : { color: '#64748b' }]}>{step}</Text>
                    </View>
                    {step < 4 && <View style={[styles.stepLine, currentStep > step ? { backgroundColor: COLORS.primary } : { backgroundColor: COLORS.border }]} />}
                </React.Fragment>
            ))}
        </View>
    );

    const renderStep1 = () => (
        <View>
            {!isCreatingClient ? (
                <>
                    <Text style={styles.sectionTitle}>Find Client</Text>
                    <View style={styles.searchBox}>
                        <Icon name="magnify" size={20} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search name, phone or NIF..."
                            placeholderTextColor={COLORS.textSecondary}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                    </View>

                    {searchTerm.length > 0 && (
                        <View style={styles.resultsList}>
                            {filteredClients.map(client => (
                                <TouchableOpacity key={client.id} style={styles.clientItem} onPress={() => setSelectedClient(client)}>
                                    <View style={styles.avatar}>
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                            {(client.firstName?.[0] || client.businessName?.[0] || '?')}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.clientName}>{client.firstName ? `${client.firstName} ${client.lastName}` : client.businessName}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={styles.clientPhone}>{client.phone}</Text>
                                            {client.nif && <Text style={[styles.clientPhone, { marginLeft: 8 }]}>NIF: {client.nif}</Text>}
                                        </View>
                                    </View>
                                    {selectedClient?.id === client.id && <Icon name="check-circle" size={20} color={COLORS.primary} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity style={styles.createClientBtn} onPress={() => setIsCreatingClient(true)}>
                        <Icon name="plus" size={20} color={COLORS.primary} />
                        <Text style={styles.createClientText}>Create New Client</Text>
                    </TouchableOpacity>

                    {selectedClient && (
                        <View style={[styles.clientItem, { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary, marginTop: 16 }]}>
                            <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
                                <Icon name="account" size={16} color="#fff" />
                            </View>
                            <View>
                                <Text style={[styles.clientName, { color: COLORS.text }]}>
                                    Selected: {selectedClient.firstName ? `${selectedClient.firstName} ${selectedClient.lastName}` : selectedClient.businessName}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedClient(null)} style={{ marginLeft: 'auto' }}>
                                <Icon name="close" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            ) : (
                <View>
                    <Text style={styles.sectionTitle}>New Client Information</Text>

                    <Text style={styles.label}>NIF (Tax ID) *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="123456789"
                        placeholderTextColor={COLORS.textSecondary}
                        value={newClient.nif}
                        onChangeText={t => setNewClient({ ...newClient, nif: t })}
                    />

                    <Text style={styles.label}>Client Type</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                        <TouchableOpacity
                            style={[styles.typeChip, newClient.type === 'individual' && styles.typeChipActive]}
                            onPress={() => setNewClient({ ...newClient, type: 'individual' })}
                        >
                            <Text style={[styles.typeChipText, newClient.type === 'individual' && { color: '#fff' }]}>Individual</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeChip, newClient.type === 'business' && styles.typeChipActive]}
                            onPress={() => setNewClient({ ...newClient, type: 'business' })}
                        >
                            <Text style={[styles.typeChipText, newClient.type === 'business' && { color: '#fff' }]}>Business</Text>
                        </TouchableOpacity>
                    </View>

                    {newClient.type === 'individual' ? (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>First Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="João"
                                    placeholderTextColor={COLORS.textSecondary}
                                    value={newClient.firstName}
                                    onChangeText={t => setNewClient({ ...newClient, firstName: t })}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Last Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Silva"
                                    placeholderTextColor={COLORS.textSecondary}
                                    value={newClient.lastName}
                                    onChangeText={t => setNewClient({ ...newClient, lastName: t })}
                                />
                            </View>
                        </View>
                    ) : (
                        <View>
                            <Text style={styles.label}>Business Name *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Tech Solutions Lda"
                                placeholderTextColor={COLORS.textSecondary}
                                value={newClient.businessName}
                                onChangeText={t => setNewClient({ ...newClient, businessName: t })}
                            />
                        </View>
                    )}

                    <Text style={styles.label}>Address *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Av. da Liberdade, 123"
                        placeholderTextColor={COLORS.textSecondary}
                        value={newClient.address}
                        onChangeText={t => setNewClient({ ...newClient, address: t })}
                    />

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>City *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Lisboa"
                                placeholderTextColor={COLORS.textSecondary}
                                value={newClient.city}
                                onChangeText={t => setNewClient({ ...newClient, city: t })}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Postal Code *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="1250-142"
                                placeholderTextColor={COLORS.textSecondary}
                                value={newClient.postalCode}
                                onChangeText={t => setNewClient({ ...newClient, postalCode: t })}
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Phone Number *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="+351 912 345 678"
                        placeholderTextColor={COLORS.textSecondary}
                        value={newClient.phone}
                        onChangeText={t => setNewClient({ ...newClient, phone: t })}
                    />

                    <Text style={styles.label}>Email (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="email@example.com"
                        placeholderTextColor={COLORS.textSecondary}
                        value={newClient.email}
                        onChangeText={t => setNewClient({ ...newClient, email: t })}
                        keyboardType="email-address"
                    />

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                        <TouchableOpacity style={[styles.createClientBtn, { flex: 1, borderStyle: 'solid' }]} onPress={() => setIsCreatingClient(false)}>
                            <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.continueButton, { flex: 1, justifyContent: 'center' }]} onPress={handleCreateClient}>
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Create Client</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );

    const renderStep2 = () => (
        <View>
            <Text style={styles.sectionTitle}>Job Details</Text>

            <Text style={styles.label}>Job Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {JOB_TYPES.map(type => (
                    <TouchableOpacity
                        key={type.value}
                        style={[styles.chip, jobForm.jobType === type.value && styles.chipActive]}
                        onPress={() => handleJobTypeSelect(type.value)}
                    >
                        <Text style={[styles.chipText, jobForm.jobType === type.value && { color: '#fff' }]}>{type.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Text style={styles.label}>Job Description</Text>
            <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                multiline
                value={jobForm.description}
                onChangeText={t => setJobForm({ ...jobForm, description: t })}
                placeholder="Describe the specific work to be done..."
                placeholderTextColor={COLORS.textSecondary}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Duration (minutes)</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={jobForm.duration.toString()}
                        onChangeText={t => setJobForm({ ...jobForm, duration: parseInt(t) || 0 })}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Actual Price (€)</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={jobForm.price}
                        onChangeText={t => setJobForm({ ...jobForm, price: t })}
                        placeholder="0.00"
                        placeholderTextColor={COLORS.textSecondary}
                    />
                </View>
            </View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 10, marginTop: 4 }}>All jobs are created as "Confirmed" status</Text>
        </View>
    );

    const renderStep3 = () => (
        <View>
            <Text style={styles.sectionTitle}>Schedule Date & Time</Text>

            <Text style={styles.label}>Select Date</Text>
            {renderCalendar()}

            <Text style={styles.label}>Available Time Slots</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                    <TouchableOpacity
                        key={time}
                        style={[styles.chip, jobForm.time === time && styles.chipActive]}
                        onPress={() => setJobForm({ ...jobForm, time })}
                    >
                        <Text style={[styles.chipText, jobForm.time === time && { color: '#fff' }]}>{time}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: COLORS.textSecondary, marginRight: 8 }}>Custom:</Text>
                <TextInput
                    style={[styles.input, { width: 100, marginBottom: 0, height: 40 }]}
                    value={jobForm.time}
                    onChangeText={t => setJobForm({ ...jobForm, time: t })}
                    placeholder="00:00"
                    placeholderTextColor={COLORS.textSecondary}
                />
            </View>

            <Text style={styles.label}>Location (Optional)</Text>
            <TextInput
                style={styles.input}
                value={selectedClient?.address} // Default to client address
                placeholder="Enter job location"
                placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                value={jobForm.notes}
                onChangeText={t => setJobForm({ ...jobForm, notes: t })}
                placeholder="Any special instructions or notes..."
                placeholderTextColor={COLORS.textSecondary}
            />
        </View>
    );

    const renderStep4 = () => (
        <View>
            <Text style={styles.sectionTitle}>Review & Confirm</Text>

            <View style={styles.reviewCard}>
                <Text style={styles.reviewLabel}>Client Information</Text>
                <Text style={styles.reviewValue}>
                    {selectedClient?.firstName ? `${selectedClient?.firstName} ${selectedClient?.lastName}` : selectedClient?.businessName}
                </Text>
                <Text style={styles.reviewSub}>{selectedClient?.phone}</Text>
                <Text style={styles.reviewSub}>{selectedClient?.address}</Text>
            </View>

            <View style={styles.reviewCard}>
                <Text style={styles.reviewLabel}>Job Details</Text>
                <Text style={styles.reviewValue}>{jobForm.description}</Text>
                <Text style={styles.reviewSub}>{jobForm.duration} min • €{jobForm.price}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={[styles.reviewSub, { marginRight: 4 }]}>Status:</Text>
                    <View style={{ backgroundColor: '#172554', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#1e40af' }}>
                        <Text style={{ color: '#bfdbfe', fontSize: 10, fontWeight: 'bold' }}>CONFIRMED</Text>
                    </View>
                </View>
            </View>

            <View style={styles.reviewCard}>
                <Text style={styles.reviewLabel}>Schedule</Text>
                <Text style={styles.reviewValue}>{jobForm.date} at {jobForm.time}</Text>
                <Text style={styles.reviewSub}>{jobForm.notes || 'No notes'}</Text>
            </View>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>+ Add New Job</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Steps */}
                    {renderStepIndicator()}

                    {/* Content */}
                    <ScrollView contentContainerStyle={styles.content}>
                        {currentStep === 1 && renderStep1()}
                        {currentStep === 2 && renderStep2()}
                        {currentStep === 3 && renderStep3()}
                        {currentStep === 4 && renderStep4()}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        {currentStep > 1 ? (
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => setCurrentStep(currentStep - 1)}
                            >
                                <Icon name="arrow-left" size={16} color={COLORS.text} style={{ marginRight: 4 }} />
                                <Text style={styles.backButtonText}>Back</Text>
                            </TouchableOpacity>
                        ) : (<View />)}
                        <TouchableOpacity
                            style={[styles.continueButton, !selectedClient && currentStep === 1 && { opacity: 0.5 }]}
                            disabled={!selectedClient && currentStep === 1}
                            onPress={() => {
                                if (currentStep < 4) setCurrentStep(currentStep + 1);
                                else handleSubmit();
                            }}
                        >
                            {currentStep === 4 ? (
                                <Icon name="check-circle-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
                            ) : null}
                            <Text style={styles.continueButtonText}>{currentStep === 4 ? 'Create Job' : 'Continue'}</Text>
                            {currentStep < 4 && <Icon name="arrow-right" size={16} color="#fff" style={{ marginLeft: 8 }} />}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)', // Darker overlay
        justifyContent: 'center',
        padding: 16,
    },
    modalContainer: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        flex: 1,
        maxHeight: '90%',
        width: '100%',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    stepContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    stepActive: {
        backgroundColor: COLORS.primary,
    },
    stepInactive: {
        backgroundColor: '#f1f5f9', // Light gray for inactive to match screenshot white circles
    },
    stepText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    stepLine: {
        width: 40,
        height: 2,
    },
    content: {
        padding: 16,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 16,
    },
    // Search
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 44,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        color: COLORS.text,
        fontSize: 14,
    },
    resultsList: {
        marginBottom: 16,
    },
    clientItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: COLORS.card,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    clientName: {
        color: COLORS.text,
        fontWeight: '600',
        fontSize: 15,
        marginBottom: 2,
    },
    clientPhone: {
        color: COLORS.textSecondary,
        fontSize: 13,
    },
    createClientBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        backgroundColor: '#1e293b',
    },
    createClientText: {
        color: '#fff',
        marginLeft: 8,
        fontWeight: '600',
    },
    // Form
    label: {
        color: COLORS.text,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: COLORS.inputBg,
        borderRadius: 6,
        padding: 10,
        color: COLORS.text,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    typeChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: COLORS.border,
        flex: 1,
        alignItems: 'center',
    },
    typeChipActive: {
        backgroundColor: COLORS.inputBg, // Just slight change or keep select style
        // Actually screenshot shows dropdown, let's stick to chips for mobile ease
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    typeChipText: {
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: COLORS.inputBg,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    chipActive: {
        borderColor: COLORS.primary,
        backgroundColor: '#1e3a8a', // Dark blue
    },
    chipText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    // Calendar
    calendarContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    calendarTitle: {
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: 16,
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    weekDayText: {
        color: COLORS.textSecondary,
        width: 32,
        textAlign: 'center',
        fontSize: 12,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4, // Might need to calculate width
        justifyContent: 'space-between',
    },
    calendarDay: {
        width: 38,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 19,
    },
    calendarDaySelected: {
        backgroundColor: COLORS.primary,
    },
    calendarDayText: {
        color: COLORS.text,
        fontSize: 14,
    },
    // Review
    reviewCard: {
        backgroundColor: COLORS.card, // Dark background
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 0, // No border in screenshot
    },
    reviewLabel: {
        color: COLORS.text, // White title
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    reviewValue: {
        color: COLORS.textSecondary, // Light gray value
        fontSize: 14,
        marginBottom: 4,
    },
    reviewSub: {
        color: COLORS.textSecondary, // Light gray sub
        fontSize: 13,
    },
    // Buttons
    continueButton: {
        backgroundColor: '#fff', // White button per screenshot
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 6,
    },
    continueButtonText: {
        color: '#000', // Black text per screenshot
        fontWeight: '600',
    },
    backButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 6,
    },
    backButtonText: {
        color: COLORS.text,
        fontWeight: '600',
    },
});
