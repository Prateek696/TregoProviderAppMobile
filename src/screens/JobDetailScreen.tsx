import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { Job, JobStatus } from '../shared/types/job';
import { formatScheduleDate } from '../shared/utils/dateUtils';
import {
  startJob, markOnSite, pauseJob, resumeJob, completeJob, cancelJob, mapBackendJob,
} from '../services/jobActions';
import { jobsAPI } from '../services/api';
import { PauseJobModal, CancelJobModal, CompleteJobModal } from '../components/modals';

const { width, height } = Dimensions.get('window');

// ── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg:          '#0a0f1e',
  surface:     '#111827',
  card:        '#151f2e',
  border:      '#1e2d3d',
  borderLight: '#243447',
  text:        '#f1f5f9',
  textSub:     '#94a3b8',
  textMuted:   '#4b5c6e',
  blue:        '#3b82f6',
  blueLight:   '#1d3a5f',
  green:       '#10b981',
  amber:       '#f59e0b',
  red:         '#ef4444',
  purple:      '#8b5cf6',
};

type JobDetailScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'JobDetail'>;

// ── Status config ─────────────────────────────────────────────────────────
function statusConfig(status: JobStatus) {
  switch (status) {
    case 'pending':   return { label: 'Pending',   color: C.amber,  bg: '#2d1f05' };
    case 'confirmed': return { label: 'Confirmed', color: C.blue,   bg: '#0f2040' };
    case 'en-route':  return { label: 'En Route',  color: '#a78bfa', bg: '#2d1b69' };
    case 'on-site':   return { label: 'On Site',   color: C.green,  bg: '#052e16' };
    case 'paused':    return { label: 'Paused',    color: C.red,    bg: '#2d0a0a' };
    case 'completed': return { label: 'Completed', color: C.green,  bg: '#052e16' };
    case 'cancelled': return { label: 'Cancelled', color: C.textSub, bg: '#1a1f2e' };
    default:          return { label: status,      color: C.textSub, bg: '#1a1f2e' };
  }
}

// ── Reusable card ─────────────────────────────────────────────────────────
function SectionCard({ title, children, icon }: { title: string; children: React.ReactNode; icon: string }) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.cardIconBox}>
          <Icon name={icon} size={14} color={C.blue} />
        </View>
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      <View style={s.cardDivider} />
      <View style={s.cardBody}>{children}</View>
    </View>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────
function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, valueColor ? { color: valueColor } : {}]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const DURATION_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function JobDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation<JobDetailScreenNavigationProp>();
  const { jobId, pendingAccept } = (route.params as { jobId: string; pendingAccept?: boolean }) || {};

  const [job, setJob]             = useState<Job | null>(null);
  const [photos, setPhotos]       = useState<Array<{ uri: string; phase: string }>>([]);
  const [showPauseModal, setShowPauseModal]     = useState(false);
  const [showCancelModal, setShowCancelModal]   = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [uploadingPhoto, setUploadingPhoto]     = useState(false);
  const [viewingPhoto, setViewingPhoto]         = useState<string | null>(null);

  // Accept flow state
  const [showAcceptModal, setShowAcceptModal]   = useState(false);
  const [acceptDate, setAcceptDate]             = useState('');
  const [acceptTime, setAcceptTime]             = useState('');
  const [acceptDuration, setAcceptDuration]     = useState(90);
  const [acceptSaving, setAcceptSaving]         = useState(false);
  const [showDatePicker, setShowDatePicker]     = useState(false);
  const [showTimePicker, setShowTimePicker]     = useState(false);
  const [pickerMonth, setPickerMonth]           = useState(new Date().getMonth());
  const [pickerYear, setPickerYear]             = useState(new Date().getFullYear());
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const MINS  = [0, 15, 30, 45];

  useFocusEffect(useCallback(() => { loadJob(); }, [jobId]));

  // Poll while AI is still processing
  useEffect(() => {
    if (!job) return;
    if (['structured', 'scheduled', 'billed'].includes(job.aiStatus || '')) return;
    const poll = setInterval(() => loadJob(), 5000);
    return () => clearInterval(poll);
  }, [job?.aiStatus]);

  const loadJob = async () => {
    try {
      const [jobRes, photosRes] = await Promise.all([
        jobsAPI.get(jobId),
        jobsAPI.getPhotos(jobId),
      ]);
      setJob(mapBackendJob(jobRes.data.job) as Job);
      setPhotos(photosRes.data.photos.map((p: any) => ({ uri: p.photo_url, phase: p.phase || 'during' })));
    } catch (e) { console.error('loadJob:', e); }
  };

  const openAcceptModal = (j: Job) => {
    // Pre-fill from existing scheduled data, or default to tomorrow at 09:00
    if (j.scheduledDate) {
      const d = new Date(j.scheduledDate);
      setAcceptDate(d.toISOString().split('T')[0]);
      setAcceptTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      );
      setPickerMonth(d.getMonth());
      setPickerYear(d.getFullYear());
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setAcceptDate(tomorrow.toISOString().split('T')[0]);
      setAcceptTime('09:00');
      setPickerMonth(tomorrow.getMonth());
      setPickerYear(tomorrow.getFullYear());
    }
    setAcceptDuration(j.estimatedDurationMinutes || 90);
    setShowAcceptModal(true);
  };

  // Returns list of missing required fields
  const getMissingFields = (j: Job): string[] => {
    const missing: string[] = [];
    if (!j.client) missing.push('Client name');
    if (!j.location && !j.address) missing.push('Location / address');
    if (!acceptDate) missing.push('Scheduled date');
    return missing;
  };

  const handleConfirmAccept = async () => {
    if (!job) return;
    const missing = getMissingFields(job);
    if (missing.length > 0) {
      Alert.alert(
        'Missing Details',
        `Please fill in the following before accepting:\n\n• ${missing.join('\n• ')}\n\nTap "Edit Job" to complete the details.`,
        [
          { text: 'Edit Job', onPress: () => { setShowAcceptModal(false); navigation.navigate('JobEdit', { jobId: job.id }); } },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    const scheduled_at = new Date(`${acceptDate}T${acceptTime || '09:00'}:00`).toISOString();
    try {
      setAcceptSaving(true);
      await jobsAPI.update(job.id, {
        exec_status: 'confirmed',
        scheduled_at,
        estimated_duration_minutes: acceptDuration,
      });
      setShowAcceptModal(false);
      await loadJob();
    } catch (e) {
      Alert.alert('Error', 'Could not confirm job. Try again.');
    } finally {
      setAcceptSaving(false);
    }
  };

  const handleAddPhoto = () => {
    Alert.alert('Photo Phase', 'When was this taken?', [
      { text: 'Before', onPress: () => pickPhotoSource('before') },
      { text: 'During', onPress: () => pickPhotoSource('during') },
      { text: 'After',  onPress: () => pickPhotoSource('after') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickPhotoSource = (phase: 'before' | 'during' | 'after') => {
    Alert.alert('Add Photo', 'Choose source', [
      { text: 'Camera',  onPress: () => launchCamera({ mediaType: 'photo', quality: 0.8 }, async r => { if (r.assets?.[0]?.uri) await uploadPhoto(r.assets[0].uri, phase); }) },
      { text: 'Gallery', onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async r => { if (r.assets?.[0]?.uri) await uploadPhoto(r.assets[0].uri, phase); }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadPhoto = async (uri: string, phase: 'before' | 'during' | 'after') => {
    if (!job) return;
    setUploadingPhoto(true);
    setPhotos(prev => [...prev, { uri, phase }]);
    try {
      await jobsAPI.uploadPhoto(job.id, uri, phase);
    } catch {
      setPhotos(prev => prev.filter(p => p.uri !== uri));
      Alert.alert('Upload Failed', 'Could not upload photo. Try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (!job) {
    return (
      <View style={[s.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ActivityIndicator color={C.blue} size="large" />
        <Text style={[s.infoLabel, { marginTop: 12 }]}>Loading job…</Text>
      </View>
    );
  }

  const st = statusConfig(job.status);
  const isProcessing = !['structured', 'scheduled', 'billed'].includes(job.aiStatus || '');

  // ── Format scheduled datetime ────────────────────────────────────────────
  let scheduledDisplay = '';
  if (job.scheduledDate) {
    try {
      scheduledDisplay = `${formatScheduleDate(new Date(job.scheduledDate))} · ${job.scheduledTime}`;
    } catch {
      scheduledDisplay = job.scheduledTime || '';
    }
  }

  // ── Bottom primary action ─────────────────────────────────────────────────
  const renderPrimaryAction = () => {
    switch (job.status) {
      case 'confirmed':
        return <ActionBtn label="Start Job" color={C.blue} icon="play-circle" onPress={async () => { const r = await startJob(job.id); if (r.success) loadJob(); }} />;
      case 'en-route':
        return <ActionBtn label="Mark On Site" color={C.green} icon="map-marker-check" onPress={async () => { const r = await markOnSite(job.id); if (r.success) loadJob(); }} />;
      case 'on-site':
        return <ActionBtn label="Complete Job" color={C.green} icon="check-circle" onPress={() => setShowCompleteModal(true)} />;
      case 'paused':
        return <ActionBtn label="Resume Job" color={C.amber} icon="play-circle-outline" onPress={async () => { const r = await resumeJob(job.id); if (r.success) loadJob(); }} />;
      case 'completed':
        return <ActionBtn label="Create Invoice" color={C.blue} icon="file-document-outline" onPress={async () => { try { await jobsAPI.bill(job.id); Alert.alert('Invoice Created', 'Moloni invoice issued.'); loadJob(); } catch { Alert.alert('Failed', 'Could not create invoice.'); } }} />;
      default:
        return null;
    }
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBack} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Job Details</Text>
        <TouchableOpacity
          style={s.headerEdit}
          onPress={() => navigation.navigate('JobEdit', { jobId: job.id })}>
          <Icon name="pencil-outline" size={18} color={C.blue} />
          <Text style={s.headerEditText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* ── Processing banner ── */}
      {isProcessing && (
        <View style={s.processingBanner}>
          <ActivityIndicator size="small" color={C.blue} />
          <Text style={s.processingText}>AI is structuring this job…</Text>
        </View>
      )}

      {/* ── Pending accept banner ── */}
      {pendingAccept && job.status === 'pending' && (() => {
        const missing = getMissingFields(job);
        return (
          <View style={[s.acceptBanner, missing.length > 0 && { backgroundColor: '#2d0a0a', borderBottomColor: C.red + '40' }]}>
            <Icon name={missing.length > 0 ? 'alert-circle-outline' : 'information-outline'} size={16} color={missing.length > 0 ? C.red : C.amber} />
            <Text style={[s.acceptBannerText, missing.length > 0 && { color: '#fca5a5' }]}>
              {missing.length > 0
                ? `Fill in: ${missing.join(', ')} — then tap Confirm & Accept.`
                : 'Review the details below, then confirm scheduling to accept this job.'}
            </Text>
          </View>
        );
      })()}

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Overview Card ── */}
        <View style={s.overviewCard}>
          <View style={s.overviewTop}>
            <View style={s.categoryPill}>
              <Icon name="tag-outline" size={11} color={C.blue} />
              <Text style={s.categoryText}>{job.category || 'General'}</Text>
            </View>
            <View style={[s.statusPill, { backgroundColor: st.bg, borderColor: st.color + '60' }]}>
              <View style={[s.statusDot, { backgroundColor: st.color }]} />
              <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>
          <Text style={s.jobTitle}>{job.title}</Text>
          {job.scheduledDate ? (
            <View style={s.overviewMeta}>
              <Icon name="calendar-outline" size={13} color={C.textSub} />
              <Text style={s.overviewMetaText}>{scheduledDisplay}</Text>
            </View>
          ) : null}
          {(job.bidAmount || job.actualPrice || job.estimatedPrice) ? (
            <View style={s.overviewMeta}>
              <Icon name="cash" size={13} color={C.green} />
              <Text style={[s.overviewMetaText, { color: C.green }]}>
                {job.actualPrice || job.bidAmount || job.estimatedPrice}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Description ── */}
        <SectionCard title="Description" icon="text-box-outline">
          <Text style={s.descriptionText}>
            {job.description || job.rawText || 'Description will appear once AI processes this job.'}
          </Text>
        </SectionCard>

        {/* ── Client Information ── */}
        <SectionCard title="Client Information" icon="account-outline">
          {job.client ? (
            <>
              <InfoRow label="Name" value={job.client} />
              {job.phoneNumber ? <InfoRow label="Phone" value={job.phoneNumber} valueColor={C.blue} /> : null}
              {job.clientEmail ? <InfoRow label="Email" value={job.clientEmail} /> : null}
              {job.clientNif    ? <InfoRow label="NIF"   value={job.clientNif} /> : null}
            </>
          ) : (
            <View style={s.emptyRow}>
              <Icon name="account-question-outline" size={20} color={C.textMuted} />
              <Text style={s.emptyText}>No client linked yet</Text>
            </View>
          )}
        </SectionCard>

        {/* ── Job Details ── */}
        <SectionCard title="Job Details" icon="clipboard-text-outline">
          {scheduledDisplay ? <InfoRow label="Scheduled" value={scheduledDisplay} /> : null}
          {job.location      ? <InfoRow label="Location"  value={job.location} /> : null}
          {job.address       ? <InfoRow label="Address"   value={job.address} /> : null}
          {job.notes         ? <InfoRow label="Notes"     value={typeof job.notes === 'string' ? job.notes : (job.notes as string[]).join(', ')} /> : null}
          {!scheduledDisplay && !job.location && !job.address ? (
            <View style={s.emptyRow}>
              <Icon name="map-marker-question-outline" size={20} color={C.textMuted} />
              <Text style={s.emptyText}>Details will appear after AI processing</Text>
            </View>
          ) : null}
        </SectionCard>

        {/* ── Photos (on-site / completed) ── */}
        {(job.status === 'on-site' || job.status === 'completed') && (
          <SectionCard title="Photos" icon="image-multiple-outline">
            {photos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                {photos.map((p, i) => (
                  <TouchableOpacity key={i} style={s.photoThumb} onPress={() => setViewingPhoto(p.uri)}>
                    <Image source={{ uri: p.uri }} style={s.photoThumbImg} resizeMode="cover" />
                    <View style={[s.phasePill,
                      p.phase === 'before' ? { backgroundColor: C.red + 'cc' } :
                      p.phase === 'after'  ? { backgroundColor: C.green + 'cc' } :
                                             { backgroundColor: C.blue + 'cc' }]}>
                      <Text style={s.phasePillText}>{p.phase}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={s.addPhotoThumb} onPress={handleAddPhoto}>
                  {uploadingPhoto
                    ? <ActivityIndicator color={C.blue} />
                    : <><Icon name="plus" size={22} color={C.blue} /><Text style={s.addPhotoText}>Add</Text></>}
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <TouchableOpacity style={s.emptyRow} onPress={handleAddPhoto}>
                <Icon name="camera-plus-outline" size={20} color={C.blue} />
                <Text style={[s.emptyText, { color: C.blue }]}>Add before/after photos</Text>
              </TouchableOpacity>
            )}
          </SectionCard>
        )}

        {/* bottom padding for fixed buttons */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Fixed Bottom Actions ── */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={s.btnSecondary}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Schedule' } as any)}>
          <Icon name="calendar-plus" size={18} color={C.text} />
          <Text style={s.btnSecondaryText}>Schedule</Text>
        </TouchableOpacity>

        {renderPrimaryAction() || (
          job.status === 'pending' ? (
            <TouchableOpacity
              style={[s.btnPrimary, { backgroundColor: C.green }]}
              onPress={() => openAcceptModal(job)}>
              <Icon name="check-circle-outline" size={18} color="#fff" />
              <Text style={s.btnPrimaryText}>Confirm & Accept</Text>
            </TouchableOpacity>
          ) : null
        )}
      </View>

      {/* ── Full-screen photo viewer ── */}
      <Modal visible={!!viewingPhoto} transparent animationType="fade" onRequestClose={() => setViewingPhoto(null)}>
        <View style={s.photoViewer}>
          <TouchableOpacity style={s.photoViewerClose} onPress={() => setViewingPhoto(null)}>
            <Icon name="close" size={26} color="#fff" />
          </TouchableOpacity>
          {viewingPhoto && <Image source={{ uri: viewingPhoto }} style={{ width, height: height * 0.82 }} resizeMode="contain" />}
        </View>
      </Modal>

      {/* ── Accept & Schedule Modal ── */}
      <Modal visible={showAcceptModal} transparent animationType="slide" onRequestClose={() => setShowAcceptModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.acceptSheet}>
            <View style={s.acceptSheetHandle} />
            <Text style={s.acceptSheetTitle}>Confirm & Accept Job</Text>
            <Text style={s.acceptSheetSub}>{job?.title}</Text>

            {/* Date */}
            <TouchableOpacity style={s.acceptField} onPress={() => setShowDatePicker(true)}>
              <Icon name="calendar-outline" size={18} color={C.blue} />
              <Text style={s.acceptFieldLabel}>Date</Text>
              <Text style={s.acceptFieldValue}>{acceptDate || 'Pick a date'}</Text>
              <Icon name="chevron-right" size={18} color={C.textMuted} />
            </TouchableOpacity>

            {/* Time */}
            <TouchableOpacity style={s.acceptField} onPress={() => setShowTimePicker(true)}>
              <Icon name="clock-outline" size={18} color={C.blue} />
              <Text style={s.acceptFieldLabel}>Time</Text>
              <Text style={s.acceptFieldValue}>{acceptTime || '09:00'}</Text>
              <Icon name="chevron-right" size={18} color={C.textMuted} />
            </TouchableOpacity>

            {/* Duration */}
            <View style={s.acceptField}>
              <Icon name="timer-outline" size={18} color={C.blue} />
              <Text style={s.acceptFieldLabel}>Duration</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 2 }}>
                  {DURATION_OPTIONS.map(d => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setAcceptDuration(d)}
                      style={[s.durationChip, acceptDuration === d && s.durationChipActive]}>
                      <Text style={[s.durationChipText, acceptDuration === d && s.durationChipTextActive]}>
                        {d < 60 ? `${d}m` : `${d / 60}h`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Missing fields warning */}
            {job && getMissingFields(job).length > 0 && (
              <View style={s.missingBox}>
                <Icon name="alert-circle-outline" size={16} color={C.red} />
                <View style={{ flex: 1 }}>
                  <Text style={s.missingTitle}>Required before accepting:</Text>
                  {getMissingFields(job).map(f => (
                    <Text key={f} style={s.missingItem}>• {f}</Text>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => { setShowAcceptModal(false); navigation.navigate('JobEdit', { jobId: job.id }); }}>
                  <Text style={s.missingEditLink}>Edit Job</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[s.acceptConfirmBtn, (acceptSaving || (job ? getMissingFields(job).length > 0 : false)) && { opacity: 0.4 }]}
              onPress={handleConfirmAccept}
              disabled={acceptSaving || (job ? getMissingFields(job).length > 0 : false)}>
              {acceptSaving
                ? <ActivityIndicator color="#fff" />
                : <><Icon name="check-circle" size={20} color="#fff" /><Text style={s.acceptConfirmText}>Confirm & Accept</Text></>}
            </TouchableOpacity>

            <TouchableOpacity style={s.acceptCancelBtn} onPress={() => setShowAcceptModal(false)}>
              <Text style={s.acceptCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker Sub-modal */}
        {showDatePicker && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
            <View style={s.modalOverlay}>
              <View style={s.pickerSheet}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <TouchableOpacity onPress={() => { const d = new Date(pickerYear, pickerMonth - 1); setPickerMonth(d.getMonth()); setPickerYear(d.getFullYear()); }}>
                    <Icon name="chevron-left" size={22} color={C.text} />
                  </TouchableOpacity>
                  <Text style={{ flex: 1, textAlign: 'center', color: C.text, fontWeight: '700', fontSize: 15 }}>
                    {MONTHS[pickerMonth]} {pickerYear}
                  </Text>
                  <TouchableOpacity onPress={() => { const d = new Date(pickerYear, pickerMonth + 1); setPickerMonth(d.getMonth()); setPickerYear(d.getFullYear()); }}>
                    <Icon name="chevron-right" size={22} color={C.text} />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                    <Text key={d} style={{ width: '14.28%', textAlign: 'center', color: C.textMuted, fontSize: 12, marginBottom: 4 }}>{d}</Text>
                  ))}
                  {Array.from({ length: new Date(pickerYear, pickerMonth, 1).getDay() }, (_, i) => (
                    <View key={`e${i}`} style={{ width: '14.28%' }} />
                  ))}
                  {Array.from({ length: getDaysInMonth(pickerMonth, pickerYear) }, (_, i) => {
                    const day = i + 1;
                    const iso = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isSelected = acceptDate === iso;
                    const isPast = new Date(iso) < new Date(new Date().toDateString());
                    return (
                      <TouchableOpacity
                        key={day}
                        disabled={isPast}
                        onPress={() => { setAcceptDate(iso); setShowDatePicker(false); }}
                        style={{ width: '14.28%', alignItems: 'center', marginBottom: 6 }}>
                        <View style={[{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, isSelected && { backgroundColor: C.blue }]}>
                          <Text style={{ color: isPast ? C.textMuted : isSelected ? '#fff' : C.text, fontSize: 14 }}>{day}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={s.pickerDoneBtn}>
                  <Text style={{ color: C.blue, fontWeight: '700' }}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Time Picker Sub-modal */}
        {showTimePicker && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
            <View style={s.modalOverlay}>
              <View style={s.pickerSheet}>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 15, textAlign: 'center', marginBottom: 12 }}>Select Time</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
                  <View style={{ maxHeight: 200 }}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {HOURS.map(h => {
                        const hh = String(h).padStart(2, '0');
                        const cur = (acceptTime || '09:00').split(':')[0];
                        const sel = cur === hh;
                        return (
                          <TouchableOpacity key={h} onPress={() => setAcceptTime(`${hh}:${(acceptTime || '09:00').split(':')[1] || '00'}`)}
                            style={{ paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, backgroundColor: sel ? C.blue : 'transparent' }}>
                            <Text style={{ color: sel ? '#fff' : C.text, fontSize: 16, fontWeight: sel ? '700' : '400' }}>{hh}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                  <Text style={{ color: C.text, fontSize: 24, alignSelf: 'center' }}>:</Text>
                  <View style={{ maxHeight: 200 }}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {MINS.map(m => {
                        const mm = String(m).padStart(2, '0');
                        const cur = (acceptTime || '09:00').split(':')[1];
                        const sel = cur === mm;
                        return (
                          <TouchableOpacity key={m} onPress={() => setAcceptTime(`${(acceptTime || '09:00').split(':')[0] || '09'}:${mm}`)}
                            style={{ paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, backgroundColor: sel ? C.blue : 'transparent' }}>
                            <Text style={{ color: sel ? '#fff' : C.text, fontSize: 16, fontWeight: sel ? '700' : '400' }}>{mm}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowTimePicker(false)} style={s.pickerDoneBtn}>
                  <Text style={{ color: C.blue, fontWeight: '700' }}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </Modal>

      {/* ── Job action modals ── */}
      <PauseJobModal
        visible={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        onConfirm={async (reason) => { if (job) { const r = await pauseJob(job.id, reason); if (r.success) loadJob(); } setShowPauseModal(false); }}
        jobTitle={job?.title}
      />
      <CancelJobModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={async (reason) => { if (job) { const r = await cancelJob(job.id, reason); if (r.success) loadJob(); } setShowCancelModal(false); }}
        jobTitle={job?.title}
      />
      <CompleteJobModal
        visible={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        onConfirm={async ({ finalPrice, paymentReceived, cashAmount }) => {
          if (job) { const r = await completeJob(job.id, finalPrice, paymentReceived, cashAmount); if (r.success) loadJob(); }
          setShowCompleteModal(false);
        }}
        jobTitle={job?.title}
        estimatedPrice={(job?.bidAmount || job?.estimatedPrice) as string}
      />
    </View>
  );
}

// ── ActionBtn helper ──────────────────────────────────────────────────────
function ActionBtn({ label, color, icon, onPress }: { label: string; color: string; icon: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.btnPrimary, { backgroundColor: color, flex: 1 }]} onPress={onPress}>
      <Icon name={icon} size={18} color="#fff" />
      <Text style={s.btnPrimaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    letterSpacing: 0.2,
  },
  headerEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.blueLight,
  },
  headerEditText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.blue,
  },

  // Processing banner
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0f2040',
    borderBottomWidth: 1,
    borderBottomColor: C.blueLight,
  },
  processingText: {
    fontSize: 13,
    color: C.blue,
    fontWeight: '500',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  // Overview card
  overviewCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderLight,
    padding: 20,
    gap: 10,
  },
  overviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.blueLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.blue,
    textTransform: 'capitalize',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  jobTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    letterSpacing: 0.1,
    lineHeight: 28,
  },
  overviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overviewMetaText: {
    fontSize: 13,
    color: C.textSub,
    fontWeight: '500',
  },

  // Section card
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: C.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSub,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardDivider: {
    height: 1,
    backgroundColor: C.border,
  },
  cardBody: {
    padding: 16,
    gap: 0,
  },

  // Info row
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  infoLabel: {
    fontSize: 13,
    color: C.textSub,
    fontWeight: '500',
    width: 80,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 14,
    color: C.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    lineHeight: 20,
  },

  // Description
  descriptionText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 22,
    fontWeight: '400',
  },

  // Empty state
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  emptyText: {
    fontSize: 13,
    color: C.textMuted,
    fontStyle: 'italic',
  },

  // Photos
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 8,
    overflow: 'hidden',
    backgroundColor: C.surface,
  },
  photoThumbImg: {
    width: '100%',
    height: '100%',
  },
  phasePill: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  phasePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  addPhotoThumb: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.blue,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: C.blueLight,
  },
  addPhotoText: {
    fontSize: 11,
    color: C.blue,
    fontWeight: '600',
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 28,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    backgroundColor: C.blue,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Accept banner
  acceptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#2d1f05',
    borderBottomWidth: 1,
    borderBottomColor: '#f59e0b40',
  },
  acceptBannerText: {
    flex: 1,
    fontSize: 13,
    color: C.amber,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Accept modal sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  acceptSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  acceptSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  acceptSheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
  },
  acceptSheetSub: {
    fontSize: 13,
    color: C.textSub,
    textAlign: 'center',
    marginBottom: 8,
  },
  acceptField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 50,
  },
  acceptFieldLabel: {
    fontSize: 13,
    color: C.textSub,
    fontWeight: '600',
    width: 56,
  },
  acceptFieldValue: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    fontWeight: '600',
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  durationChipActive: {
    backgroundColor: C.blue,
    borderColor: C.blue,
  },
  durationChipText: {
    fontSize: 13,
    color: C.textSub,
    fontWeight: '600',
  },
  durationChipTextActive: {
    color: '#fff',
  },
  missingBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#2d0a0a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.red + '50',
    padding: 12,
  },
  missingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.red,
    marginBottom: 4,
  },
  missingItem: {
    fontSize: 12,
    color: '#fca5a5',
    lineHeight: 18,
  },
  missingEditLink: {
    fontSize: 12,
    fontWeight: '700',
    color: C.blue,
    paddingTop: 2,
  },
  acceptConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 14,
    backgroundColor: C.green,
    marginTop: 8,
  },
  acceptConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  acceptCancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  acceptCancelText: {
    fontSize: 15,
    color: C.textSub,
    fontWeight: '500',
  },
  pickerSheet: {
    backgroundColor: C.surface,
    borderRadius: 20,
    margin: 20,
    padding: 20,
  },
  pickerDoneBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.blueLight,
  },

  // Photo viewer
  photoViewer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.97)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoViewerClose: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: 8,
  },
});
