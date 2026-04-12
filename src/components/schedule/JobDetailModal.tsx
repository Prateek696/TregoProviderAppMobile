import React, { useState, useEffect } from 'react';
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
    StatusBar,
    Alert,
    ActivityIndicator,
    Platform,
    PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from '@react-native-community/blur';
import { useNavigation } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { jobsAPI } from '../../services/api';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('details');
    const [photos, setPhotos] = useState<Array<{ uri: string; phase: string }>>([]);
    const [uploading, setUploading] = useState(false);
    const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

    const navigation = useNavigation<any>();

    // Fetch all photos for this job when modal opens
    useEffect(() => {
        if (visible && job?.id) {
            jobsAPI.getPhotos(job.id)
                .then(res => setPhotos(res.data.photos.map((p: any) => ({ uri: p.photo_url, phase: p.phase || 'during' }))))
                .catch(() => { if (job.photoUrl) setPhotos([{ uri: job.photoUrl, phase: 'during' }]); });
        }
    }, [visible, job?.id]);

    const handleAddPhoto = () => {
        // Step 1 — pick phase
        Alert.alert(t('modals.photo.phaseTitle'), t('modals.photo.phaseMessage'), [
            { text: t('jobs.before'), onPress: () => pickSource('before') },
            { text: t('jobs.during'), onPress: () => pickSource('during') },
            { text: t('jobs.after'),  onPress: () => pickSource('after') },
            { text: t('common.cancel'), style: 'cancel' },
        ]);
    };

    const pickSource = (phase: 'before' | 'during' | 'after') => {
        // Step 2 — pick camera or gallery
        Alert.alert(t('jobs.addPhoto'), t('jobs.chooseSource'), [
            {
                text: t('common.camera'),
                onPress: async () => {
                    if (Platform.OS === 'android') {
                        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
                        if (granted !== PermissionsAndroid.RESULTS.GRANTED) { Alert.alert(t('common.permissionRequired'), t('common.cameraPermissionNeeded')); return; }
                    }
                    launchCamera({ mediaType: 'photo', quality: 0.8 }, async (res) => {
                        if (res.assets?.[0]?.uri) await uploadPhoto(res.assets[0].uri, phase);
                    });
                },
            },
            {
                text: t('common.gallery'),
                onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async (res) => {
                    if (res.assets?.[0]?.uri) await uploadPhoto(res.assets[0].uri, phase);
                }),
            },
            { text: t('common.cancel'), style: 'cancel' },
        ]);
    };

    const uploadPhoto = async (uri: string, phase: 'before' | 'during' | 'after') => {
        try {
            setUploading(true);
            // Optimistically show the local URI immediately
            setPhotos(prev => [...prev, { uri, phase }]);
            await jobsAPI.uploadPhoto(job.id, uri, phase);
        } catch {
            // Remove the optimistic photo on failure
            setPhotos(prev => prev.filter(p => p.uri !== uri));
            Alert.alert(t('jobDetail.uploadFailed'), t('jobDetail.uploadFailedMsg'));
        } finally {
            setUploading(false);
        }
    };

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
            case 'normal': return '#3b82f6';
            case 'low': return '#22c55e';
            default: return '#3b82f6';
        }
    };

    const clientPhone = job.phoneNumber || job.clientPhone || null;
    const clientEmail = job.clientEmail || null;

    const rawDate = job.scheduledDate || job.date;
    const scheduledDate = rawDate
        ? new Date(rawDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : null;

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
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>{job.status || t('jobDetail.statusPending')}</Text>
                    </View>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>


                    {/* Scheduling Section */}
                    <View style={styles.card}>
                        {renderSectionHeader('calendar-clock', t('jobDetail.scheduling'))}
                        <View style={styles.grid}>
                            <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>{t('jobDetail.startTime')}</Text>
                                <Text style={styles.gridValue}>{job.scheduledTime || job.time || '—'}</Text>
                            </View>
                            <View style={styles.gridItem}>
                                <Text style={styles.gridLabel}>{t('jobDetail.duration')}</Text>
                                <Text style={styles.gridValue}>{t('jobDetail.minutes', { n: job.estimatedDurationMinutes || job.duration || 60 })}</Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        {scheduledDate && (
                            <View style={styles.row}>
                                <View>
                                    <Text style={styles.gridLabel}>{t('jobDetail.date')}</Text>
                                    <Text style={styles.gridValue}>{scheduledDate}</Text>
                                </View>
                            </View>
                        )}

                        {/* Job Actions */}
                        <View style={styles.jobActionsRow}>
                            <TouchableOpacity style={styles.secondaryButton}>
                                <Icon name="calendar-refresh" size={16} color="#fff" />
                                <Text style={styles.secondaryButtonText}>{t('jobDetail.reschedule')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.secondaryButton} onPress={() => { onClose(); navigation.navigate('Calendar'); }}>
                                <Icon name="calendar-month" size={16} color="#fff" />
                                <Text style={styles.secondaryButtonText}>{t('jobDetail.viewCalendar')}</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: '#3b82f6' }]}
                            onPress={() => onStatusChange && onStatusChange(job.id, 'en-route')}
                        >
                            <Icon name="play" size={20} color="#fff" />
                            <Text style={styles.primaryButtonText}>{t('jobDetail.resumeJob')}</Text>
                        </TouchableOpacity>

                    </View>

                    {/* Billing Actions */}
                    <View style={styles.card}>
                        {renderSectionHeader('credit-card-outline', t('jobDetail.billingExpenses'))}
                        <View style={styles.actionButtonsRow}>
                            <TouchableOpacity style={styles.secondaryButton}>
                                <Icon name="plus" size={16} color="#fff" />
                                <Text style={styles.secondaryButtonText}>{t('jobDetail.addExpense')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.secondaryButton}>
                                <Icon name="file-document-outline" size={16} color="#fff" />
                                <Text style={styles.secondaryButtonText}>{t('jobDetail.createInvoice')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Job Details Section */}
                    <View style={styles.card}>
                        {renderSectionHeader('file-document-outline', t('jobDetail.details'))}

                        {job.category && (
                            <View style={styles.tagsRow}>
                                <View style={styles.tag}>
                                    <Text style={[styles.tagText, { color: '#3b82f6' }]}>{job.category}</Text>
                                </View>
                            </View>
                        )}

                        {job.description ? (
                            <View style={styles.detailBlock}>
                                <Text style={styles.detailLabel}>{t('jobDetail.description')}</Text>
                                <View style={styles.detailBox}>
                                    <Text style={styles.detailText}>{job.description}</Text>
                                </View>
                            </View>
                        ) : null}

                        {job.notes ? (
                            <View style={styles.detailBlock}>
                                <Text style={styles.detailLabel}>{t('jobDetail.notes')}</Text>
                                <View style={styles.detailBox}>
                                    <Text style={styles.detailText}>{job.notes}</Text>
                                </View>
                            </View>
                        ) : null}

                        <View style={styles.infoList}>
                            {job.priority && (
                                <View style={styles.infoListItem}>
                                    <Icon name="alert-circle-outline" size={16} color="#9ca3af" />
                                    <Text style={styles.infoListText}>{t('jobDetail.priority')}</Text>
                                    <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(job.priority)}33` }]}>
                                        <Text style={[styles.priorityText, { color: getPriorityColor(job.priority) }]}>{job.priority.toUpperCase()}</Text>
                                    </View>
                                </View>
                            )}
                            {job.estimatedPrice && (
                                <View style={styles.infoListItem}>
                                    <Icon name="currency-eur" size={16} color="#9ca3af" />
                                    <Text style={styles.infoListText}>{t('jobDetail.price')}</Text>
                                    <Text style={[styles.infoListText, { color: '#10b981' }]}>{job.estimatedPrice}</Text>
                                </View>
                            )}
                        </View>

                    </View>

                    {/* Photos Card */}
                    <View style={styles.card}>
                        {renderSectionHeader('camera-outline', t('jobDetail.photos'), (
                            <TouchableOpacity
                                style={styles.addPhotoBtn}
                                onPress={handleAddPhoto}
                                disabled={uploading}>
                                {uploading
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <><Icon name="plus" size={14} color="#fff" /><Text style={styles.addPhotoBtnText}>{t('jobDetail.add')}</Text></>
                                }
                            </TouchableOpacity>
                        ))}
                        {photos.length === 0 ? (
                            <TouchableOpacity style={styles.emptyPhotos} onPress={handleAddPhoto}>
                                <Icon name="camera-plus-outline" size={32} color="#334155" />
                                <Text style={styles.emptyPhotosText}>{t('jobDetail.tapToAddPhoto')}</Text>
                            </TouchableOpacity>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                                {photos.map((p, i) => (
                                    <TouchableOpacity key={i} style={styles.photoThumb} onPress={() => setViewingPhoto(p.uri)}>
                                        <Image source={{ uri: p.uri }} style={styles.photo} resizeMode="cover" />
                                        <View style={[styles.phaseBadge, p.phase === 'before' ? styles.phaseBefore : p.phase === 'after' ? styles.phaseAfter : styles.phaseDuring]}>
                                            <Text style={styles.phaseBadgeText}>{p.phase}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity style={styles.addMoreThumb} onPress={handleAddPhoto}>
                                    <Icon name="plus" size={24} color="#334155" />
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>

                    {/* Location Section */}
                    {(job.address || job.location) && (
                        <View style={styles.card}>
                            {renderSectionHeader('map-marker-outline', t('jobDetail.location'))}
                            <Text style={styles.addressText}>{job.address || job.location}</Text>
                        </View>
                    )}

                    {/* Client Information */}
                    {job.client && (
                        <View style={styles.card}>
                            {renderSectionHeader('account-outline', t('jobDetail.clientInfo'))}
                            <View style={styles.clientProfile}>
                                <View style={[styles.avatar, { backgroundColor: '#3b82f6' }]}>
                                    <Text style={styles.avatarText}>{job.client.substring(0, 2).toUpperCase()}</Text>
                                </View>
                                <Text style={styles.clientName}>{job.client}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.clientDetails}>
                                {clientPhone && (
                                    <View style={styles.clientDetailRow}>
                                        <Icon name="phone-outline" size={16} color="#9ca3af" />
                                        <View>
                                            <Text style={styles.clientDetailLabel}>{t('jobDetail.phoneLabel')}</Text>
                                            <Text style={styles.clientDetailValueLink}>{clientPhone}</Text>
                                        </View>
                                    </View>
                                )}
                                {clientEmail && (
                                    <View style={styles.clientDetailRow}>
                                        <Icon name="email-outline" size={16} color="#9ca3af" />
                                        <View>
                                            <Text style={styles.clientDetailLabel}>{t('jobDetail.emailLabel')}</Text>
                                            <Text style={styles.clientDetailValueLink}>{clientEmail}</Text>
                                        </View>
                                    </View>
                                )}
                                {job.clientNif && (
                                    <View style={styles.clientDetailRow}>
                                        <Icon name="file-document-outline" size={16} color="#9ca3af" />
                                        <View>
                                            <Text style={styles.clientDetailLabel}>{t('jobDetail.nifLabel')}</Text>
                                            <Text style={styles.clientDetailValue}>PT{job.clientNif}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}


                    {/* Timeline History */}
                    <View style={styles.card}>
                        {renderSectionHeader('history', t('jobDetail.timeline'))}
                        <Text style={{ color: '#64748b', fontSize: 13 }}>{t('jobDetail.noTimeline')}</Text>
                    </View>

                    {/* Expenses */}
                    <View style={styles.card}>
                        {renderSectionHeader('wallet-outline', t('jobDetail.jobExpenses'))}
                        <Text style={{ color: '#64748b', fontSize: 13 }}>{t('jobDetail.noExpenses')}</Text>
                    </View>

                </ScrollView>
            </View>
        {/* Full-screen photo viewer */}
        <Modal visible={!!viewingPhoto} transparent animationType="fade" onRequestClose={() => setViewingPhoto(null)}>
            <View style={styles.photoViewer}>
                <TouchableOpacity style={styles.photoViewerClose} onPress={() => setViewingPhoto(null)}>
                    <Icon name="close" size={28} color="#fff" />
                </TouchableOpacity>
                {viewingPhoto && (
                    <Image source={{ uri: viewingPhoto }} style={styles.photoViewerImage} resizeMode="contain" />
                )}
            </View>
        </Modal>
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
        backgroundColor: '#1e293b',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        gap: 8,
    },
    infoListText: {
        flex: 1,
        fontSize: 13,
        color: '#94a3b8',
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
    addPhotoBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 6, borderWidth: 1, borderColor: '#334155',
    },
    addPhotoBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    emptyPhotos: {
        alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1,
        borderColor: '#334155', borderStyle: 'dashed', padding: 24,
    },
    emptyPhotosText: { color: '#64748b', fontSize: 13 },
    photoThumb: {
        width: 100, height: 100, borderRadius: 8,
        overflow: 'hidden', marginRight: 8,
    },
    photo: { width: '100%', height: '100%' },
    phaseBadge: {
        position: 'absolute', bottom: 4, left: 4,
        paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
    },
    phaseBefore: { backgroundColor: 'rgba(239,68,68,0.85)' },
    phaseDuring: { backgroundColor: 'rgba(59,130,246,0.85)' },
    phaseAfter:  { backgroundColor: 'rgba(16,185,129,0.85)' },
    phaseBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
    photoViewer: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
        alignItems: 'center', justifyContent: 'center',
    },
    photoViewerClose: {
        position: 'absolute', top: 48, right: 20, zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 6,
    },
    photoViewerImage: {
        width: width, height: height * 0.8,
    },
    addMoreThumb: {
        width: 100, height: 100, borderRadius: 8,
        backgroundColor: '#1e293b', borderWidth: 1,
        borderColor: '#334155', borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center',
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
        backgroundColor: '#1e293b',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
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
