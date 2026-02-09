import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Image,
    Dimensions,
    Linking,
    StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from '@react-native-community/blur';

interface JobDetailModalProps {
    visible: boolean;
    onClose: () => void;
    job: any; // Using any for now to match flexible web props, but should be typed ideally
    orbColor?: string;
    onNavigate?: () => void;
    onCall?: () => void;
    onMessage?: () => void;
    onStatusChange?: (id: string, status: string) => void;
}

const { width, height } = Dimensions.get('window');

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
    visible,
    onClose,
    job,
    orbColor = '#f97316',
    onNavigate,
    onCall,
    onMessage,
    onStatusChange
}) => {
    const [activeTab, setActiveTab] = useState('details');

    if (!job) return null;

    // Helper to get status color (matching web)
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' };
            case 'pending': return { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' };
            case 'in-progress': return { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' };
            case 'completed': return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
            case 'cancelled': return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
            default: return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
        }
    };

    const statusStyle = getStatusColor(job.status || 'pending');

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return '#ef4444';
            case 'high': return '#f97316';
            case 'medium': return '#eab308';
            case 'low': return '#22c55e';
            default: return '#6b7280';
        }
    };

    // Mock Data Generators (to match Web's mock data)
    const clientInfo = {
        name: job.client || 'Unknown Client',
        type: 'Individual',
        phone: job.clientPhone || '+351 912 345 678',
        email: `${(job.client || 'client').toLowerCase().replace(' ', '.')}@email.com`,
        rating: 4.9,
        completedJobs: 12,
        totalSpent: '€3,450',
        memberSince: 'March 2024',
        paymentMethod: 'Visa •••• 4521',
        serviceAddress: job.location || 'Unknown Address',
        notes: 'Prefers morning appointments. Has a dog.'
    };

    const jobTimeline = [
        { event: 'Job Posted', date: 'Oct 18, 2024 • 8:00 AM', icon: 'package-variant' },
        { event: 'Bid Submitted', date: 'Oct 18, 2024 • 9:15 AM', icon: 'file-document-outline' },
        { event: 'Accepted by Client', date: 'Oct 18, 2024 • 10:30 AM', icon: 'check-circle-outline' },
        { event: 'Scheduled', date: 'Jan 21, 2026 • 7:01 PM', icon: 'calendar-clock' },
    ];

    // Render Helpers
    const renderSectionHeader = (icon: string, title: string, rightElement?: React.ReactNode) => (
        <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
                <Icon name={icon} size={20} color={orbColor} />
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            {rightElement}
        </View>
    );

    const renderInfoRow = (label: string, value: string, icon?: string) => (
        <View style={styles.infoRow}>
            {icon && <Icon name={icon} size={16} color="#64748b" style={styles.infoIcon} />}
            <View>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <StatusBar barStyle="light-content" backgroundColor="#000000" />
            <View style={styles.container}>
                {/* Header Background & Close Button */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Icon name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{job.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border, borderWidth: 1 }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusStyle.text }]} />
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>{job.status || 'Pending'}</Text>
                    </View>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>

                    {/* Quick Actions Bar */}
                    <View style={styles.quickActionsContainer}>
                        <Text style={styles.sectionTitleSmall}>Contact Client</Text>
                        <View style={styles.actionButtonsRow}>
                            <TouchableOpacity style={styles.actionButton} onPress={onMessage}>
                                <Icon name="message-text-outline" size={18} color="#fff" />
                                <Text style={styles.actionButtonText}>Message</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton} onPress={onCall}>
                                <Icon name="phone-outline" size={18} color="#fff" />
                                <Text style={styles.actionButtonText}>Call</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }]} onPress={onNavigate}>
                                <Icon name="navigation-variant-outline" size={18} color="#fff" />
                                <Text style={styles.actionButtonText}>Navigate</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Scheduling Section */}
                    <View style={styles.card}>
                        {renderSectionHeader('calendar-clock', 'Scheduling')}
                        <View style={styles.grid}>
                            <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>Start Time</Text>
                                <Text style={styles.gridValue}>{job.time}</Text>
                            </View>
                            <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>End Time</Text>
                                <Text style={styles.gridValue}>{job.endTime}</Text>
                            </View>
                            <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>Duration</Text>
                                <Text style={styles.gridValue}>{job.duration} min</Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.row}>
                            <View>
                                <Text style={styles.gridLabel}>Date</Text>
                                <Text style={styles.gridValue}>Wednesday, January 21, 2026</Text>
                                <Text style={styles.subText}>Posted 1 week ago</Text>
                            </View>
                        </View>

                        {/* Job Actions */}
                        <View style={styles.jobActionsRow}>
                            <TouchableOpacity style={styles.secondaryButton}>
                                <Icon name="calendar-refresh" size={16} color="#fff" />
                                <Text style={styles.secondaryButtonText}>Reschedule</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.secondaryButton}>
                                <Icon name="calendar-month" size={16} color="#fff" />
                                <Text style={styles.secondaryButtonText}>View Calendar</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: '#3b82f6' }]}
                            onPress={() => onStatusChange && onStatusChange(job.id, 'en_route')}
                        >
                            <Icon name="play" size={20} color="#fff" />
                            <Text style={styles.primaryButtonText}>Resume Job</Text>
                        </TouchableOpacity>

                    </View>

                    {/* Billing Actions */}
                    <View style={styles.card}>
                        {renderSectionHeader('credit-card-outline', 'Billing & Expenses')}
                        <View style={styles.actionButtonsRow}>
                            <TouchableOpacity style={styles.secondaryButton}>
                                <Icon name="plus" size={16} color="#fff" />
                                <Text style={styles.secondaryButtonText}>Add Expense</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.secondaryButton}>
                                <Icon name="file-document-outline" size={16} color="#fff" />
                                <Text style={styles.secondaryButtonText}>Create Invoice</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Job Details Section */}
                    <View style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionHeaderLeft}>
                                <Icon name="file-document-outline" size={20} color={orbColor} />
                                <Text style={styles.sectionTitle}>Job Details</Text>
                            </View>
                            <View style={styles.priceTag}>
                                <Icon name="currency-usd" size={16} color="#15803d" />
                            </View>
                        </View>

                        <View style={styles.tagsRow}>
                            <View style={styles.tag}>
                                <Icon name="briefcase-outline" size={12} color={orbColor} />
                                <Text style={[styles.tagText, { color: orbColor }]}>Fixed Price</Text>
                            </View>
                            <View style={styles.tag}>
                                <Text style={[styles.tagText, { color: '#3b82f6' }]}>{job.category || 'Service'}</Text>
                            </View>
                        </View>

                        <View style={styles.detailBlock}>
                            <Text style={styles.detailLabel}>SUMMARY DESCRIPTION</Text>
                            <View style={styles.detailBox}>
                                <Text style={styles.detailText}>{job.description}</Text>
                            </View>
                        </View>

                        <View style={styles.detailBlock}>
                            <Text style={styles.detailLabel}>FULL DESCRIPTION (CLIENT DETAILS)</Text>
                            <View style={[styles.detailBox, { minHeight: 80 }]}>
                                <Text style={styles.detailText}>{job.description}</Text>
                            </View>
                        </View>

                        <View style={styles.infoList}>
                            <View style={styles.infoListItem}>
                                <Icon name="clock-outline" size={16} color="#9ca3af" />
                                <Text style={styles.infoListText}>Estimated Duration</Text>
                            </View>
                            <View style={styles.infoListItem}>
                                <Icon name="alert-circle-outline" size={16} color="#9ca3af" />
                                <Text style={styles.infoListText}>Priority Level</Text>
                                <View style={[styles.priorityBadge, { backgroundColor: '#fef3c7' }]}>
                                    <Text style={[styles.priorityText, { color: '#d97706' }]}>MEDIUM</Text>
                                </View>
                            </View>
                            <View style={styles.infoListItem}>
                                <Icon name="calendar-blank-outline" size={16} color="#9ca3af" />
                                <Text style={styles.infoListText}>Posted</Text>
                            </View>
                        </View>

                        {/* Photos Section */}
                        <View style={styles.photosSection}>
                            <View style={styles.photosHeader}>
                                <Icon name="camera-outline" size={16} color={orbColor} />
                                <Text style={styles.photosTitle}>Client Photos</Text>
                                <View style={styles.photoCountBadge}>
                                    <Text style={styles.photoCountText}>3</Text>
                                </View>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                                {[1, 2, 3].map((i) => (
                                    <View key={i} style={styles.photoPlaceholder}>
                                        <Image
                                            source={{ uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400' }}
                                            style={styles.photo}
                                        />
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    {/* Location Section */}
                    <View style={styles.card}>
                        {renderSectionHeader('map-marker-outline', 'Location')}
                        <Text style={styles.addressTitle}>Service Address</Text>
                        <Text style={styles.addressText}>{job.location}</Text>
                        <View style={styles.distanceRow}>
                            <Icon name="map-marker-distance" size={14} color="#9ca3af" />
                            <Text style={styles.distanceText}>5.7 km away</Text>
                        </View>
                    </View>

                    {/* Client Information */}
                    <View style={styles.card}>
                        {renderSectionHeader('account-outline', 'Client Information')}
                        <View style={styles.clientProfile}>
                            <View style={[styles.avatar, { backgroundColor: '#3b82f6' }]}>
                                <Text style={styles.avatarText}>{clientInfo.name.substring(0, 2).toUpperCase()}</Text>
                            </View>
                            <View>
                                <Text style={styles.clientName}>{clientInfo.name}</Text>
                                <View style={styles.ratingRow}>
                                    <Icon name="star" size={12} color="#facc15" />
                                    <Text style={styles.ratingText}>4.9 • 12 jobs</Text>
                                </View>
                                <Text style={styles.clientRef}>#10285</Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.clientDetails}>
                            <View style={styles.clientDetailRow}>
                                <Icon name="phone-outline" size={16} color="#9ca3af" />
                                <View>
                                    <Text style={styles.clientDetailLabel}>Phone</Text>
                                    <Text style={styles.clientDetailValueLink}>{clientInfo.phone}</Text>
                                </View>
                            </View>
                            <View style={styles.clientDetailRow}>
                                <Icon name="email-outline" size={16} color="#9ca3af" />
                                <View>
                                    <Text style={styles.clientDetailLabel}>Email</Text>
                                    <Text style={styles.clientDetailValueLink}>{clientInfo.email}</Text>
                                </View>
                            </View>
                            <View style={styles.clientDetailRow}>
                                <Icon name="domain" size={16} color="#9ca3af" />
                                <View>
                                    <Text style={styles.clientDetailLabel}>Client Type</Text>
                                    <Text style={styles.clientDetailValue}>Individual</Text>
                                </View>
                            </View>
                            <View style={styles.clientDetailRow}>
                                <Icon name="file-document-outline" size={16} color="#9ca3af" />
                                <View>
                                    <Text style={styles.clientDetailLabel}>NIF / VAT Number</Text>
                                    <Text style={styles.clientDetailValue}>212345678</Text>
                                </View>
                            </View>
                            <View style={styles.clientDetailRow}>
                                <Icon name="chart-line" size={16} color="#9ca3af" />
                                <View>
                                    <Text style={styles.clientDetailLabel}>Total Spent</Text>
                                    <Text style={styles.clientDetailValue}>{clientInfo.totalSpent}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Billing Address & Payment */}
                        <View style={styles.clientDetails}>
                            <View style={styles.clientDetailRow}>
                                <Icon name="map-outline" size={16} color="#9ca3af" />
                                <View>
                                    <Text style={styles.clientDetailLabel}>Billing Address</Text>
                                    <Text style={styles.clientDetailValue}>{job.location}</Text>
                                </View>
                            </View>
                            <View style={styles.clientDetailRow}>
                                <Icon name="credit-card-outline" size={16} color="#9ca3af" />
                                <View>
                                    <Text style={styles.clientDetailLabel}>Payment Method</Text>
                                    <Text style={styles.clientDetailValue}>{clientInfo.paymentMethod}</Text>
                                    <Text style={styles.verifiedText}>Verified</Text>
                                </View>
                            </View>
                        </View>

                    </View>

                    {/* Timeline History */}
                    <View style={styles.card}>
                        {renderSectionHeader('history', 'Job Timeline')}
                        <View style={styles.timelineContainer}>
                            {jobTimeline.map((item, index) => (
                                <View key={index} style={styles.timelineItem}>
                                    <View style={styles.timelineIconContainer}>
                                        <Icon name={item.icon} size={14} color="#3b82f6" />
                                    </View>
                                    <View style={styles.timelineContent}>
                                        <Text style={styles.timelineEvent}>{item.event}</Text>
                                        <Text style={styles.timelineDate}>{item.date}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Expenses List Check */}
                    <View style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionHeaderLeft}>
                                <Icon name="wallet-outline" size={20} color={orbColor} />
                                <Text style={styles.sectionTitle}>Job Expenses</Text>
                            </View>
                        </View>
                        <View style={styles.expenseRow}>
                            <Text style={styles.expenseDate}>Oct 19, 2024</Text>
                            <View style={styles.expenseBadge} />
                        </View>
                        <View style={styles.expenseRow}>
                            <Text style={styles.expenseDate}>Oct 19, 2024</Text>
                            <View style={styles.expenseBadge} />
                        </View>
                    </View>

                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a', // Dark background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
        backgroundColor: '#0f172a',
    },
    closeButton: {
        marginRight: 12,
    },
    headerTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    quickActionsContainer: {
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1e293b',
        borderRadius: 12,
        padding: 12,
        backgroundColor: '#0f172a',
    },
    sectionTitleSmall: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1e293b',
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        gap: 8,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    card: {
        backgroundColor: '#0f172a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1e293b',
        marginBottom: 16,
        padding: 16,
        overflow: 'hidden',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    grid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    gridItem: {
        flex: 1,
    },
    gridLabel: {
        fontSize: 11,
        color: '#94a3b8',
        marginBottom: 4,
    },
    gridValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    subText: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#1e293b',
        marginVertical: 12,
    },
    row: {
        marginBottom: 16,
    },
    jobActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1e293b',
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        gap: 8,
    },
    secondaryButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    priceTag: {
        backgroundColor: '#dcfce7',
        padding: 4,
        borderRadius: 4,
    },
    tagsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155',
        gap: 4,
    },
    tagText: {
        fontSize: 11,
        fontWeight: '600',
    },
    detailBlock: {
        marginBottom: 16,
    },
    detailLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94a3b8',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    detailBox: {
        backgroundColor: '#1e293b',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
    },
    detailText: {
        color: '#e2e8f0',
        fontSize: 13,
        lineHeight: 20,
    },
    infoList: {
        gap: 8,
        marginBottom: 16,
    },
    infoListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    infoListText: {
        flex: 1,
        fontSize: 13,
        color: '#475569',
    },
    priorityBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    priorityText: {
        fontSize: 10,
        fontWeight: '700',
    },
    photosSection: {
        marginTop: 8,
    },
    photosHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    photosTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
    },
    photoCountBadge: {
        backgroundColor: '#334155',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    photoCountText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: '700',
    },
    photosScroll: {
        flexDirection: 'row',
    },
    photoPlaceholder: {
        width: 120,
        height: 80,
        marginRight: 8,
        borderRadius: 8,
        overflow: 'hidden',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    addressTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    addressText: {
        fontSize: 13,
        color: '#cbd5e1',
        marginBottom: 8,
    },
    distanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    distanceText: {
        fontSize: 12,
        color: '#94a3b8',
    },
    clientProfile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    clientName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 2,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 12,
        color: '#cbd5e1',
    },
    clientRef: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    clientDetails: {
        gap: 16,
    },
    clientDetailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    clientDetailLabel: {
        fontSize: 11,
        color: '#64748b',
        marginBottom: 2,
    },
    clientDetailValue: {
        fontSize: 13,
        color: '#fff',
        fontWeight: '500',
    },
    clientDetailValueLink: {
        fontSize: 13,
        color: '#3b82f6',
        fontWeight: '500',
    },
    verifiedText: {
        fontSize: 11,
        color: '#22c55e',
        marginTop: 2,
    },
    timelineContainer: {
        gap: 16,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    timelineIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timelineContent: {
        flex: 1,
    },
    timelineEvent: {
        fontSize: 13,
        fontWeight: '500',
        color: '#fff',
        marginBottom: 2,
    },
    timelineDate: {
        fontSize: 11,
        color: '#64748b',
    },
    infoLabel: {
        fontSize: 11,
        color: '#64748b',
    },
    infoValue: {
        fontSize: 13,
        color: '#fff',
    },
    infoIcon: {
        marginTop: 2,
    },
    infoRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    expenseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        height: 48,
    },
    expenseDate: {
        color: '#cbd5e1',
        fontSize: 12,
    },
    expenseBadge: {
        width: 40,
        height: 20,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 4,
    }
});
