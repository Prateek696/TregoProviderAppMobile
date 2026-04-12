/**
 * Calendar Screen — real jobs data, dark theme
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { jobsAPI } from '../services/api';
import { mapBackendJob } from '../services/jobActions';
import { CalendarScreenSkeleton } from '../components/ui/Skeleton';
import LanguageToggle from '../components/LanguageToggle';
import { Job } from '../shared/types/job';
import { useTranslation } from 'react-i18next';

const D = {
  bg: '#0f172a',
  surface: '#1e293b',
  border: '#334155',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  blue: '#3b82f6',
};

const DAY_KEYS = ['sunShort', 'monShort', 'tueShort', 'wedShort', 'thuShort', 'friShort', 'satShort'];
const MONTH_KEYS = ['januaryLong', 'februaryLong', 'marchLong', 'aprilLong', 'mayLong', 'juneLong',
  'julyLong', 'augustLong', 'septemberLong', 'octoberLong', 'novemberLong', 'decemberLong'];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const DAYS = DAY_KEYS.map(k => t(`days.${k}` as any));
  const MONTHS = MONTH_KEYS.map(k => t(`months.${k}` as any));
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(today));
  const [jobsByDate, setJobsByDate] = useState<Record<string, Job[]>>({});
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(today.getMonth());

  const years = Array.from({ length: 10 }, (_, i) => today.getFullYear() - 5 + i);

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [])
  );

  const loadJobs = async () => {
    try {
      setLoading(true);
      const res = await jobsAPI.list();
      const mapped = res.data.jobs.map(mapBackendJob);
      const grouped: Record<string, Job[]> = {};
      for (const job of mapped) {
        if (job.scheduledDate) {
          const key = toDateKey(new Date(job.scheduledDate));
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(job as Job);
        }
      }
      setJobsByDate(grouped);
    } catch (err) {
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'confirmed': return '#3b82f6';
      case 'en-route': return '#f59e0b';
      case 'on-site': return '#8b5cf6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  const calDays = getCalendarDays(viewYear, viewMonth);
  const todayKey = toDateKey(today);
  const selectedJobs = jobsByDate[selectedDate] || [];

  if (loading && Object.keys(jobsByDate).length === 0) return <CalendarScreenSkeleton />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('calendar.title')}</Text>
        <View style={{ marginLeft: 'auto' }}><LanguageToggle /></View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Icon name="chevron-left" size={24} color={D.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.monthTitleBtn}
            onPress={() => { setPickerMonth(viewMonth); setPickerYear(viewYear); setShowPicker(true); }}>
            <Text style={styles.monthTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
            <Icon name="menu-down" size={20} color={D.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Icon name="chevron-right" size={24} color={D.text} />
          </TouchableOpacity>
        </View>

        {/* Month/Year Picker Modal */}
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
            <View style={styles.pickerContainer} onStartShouldSetResponder={() => true}>
              <Text style={styles.pickerHeading}>{t('calendar.selectMonthYear')}</Text>
              <View style={styles.pickerColumns}>
                {/* Month column */}
                <FlatList
                  data={MONTHS}
                  keyExtractor={(_, i) => String(i)}
                  style={styles.pickerList}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      style={[styles.pickerItem, pickerMonth === index && styles.pickerItemActive]}
                      onPress={() => setPickerMonth(index)}>
                      <Text style={[styles.pickerItemText, pickerMonth === index && styles.pickerItemTextActive]}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
                {/* Year column */}
                <FlatList
                  data={years}
                  keyExtractor={(y) => String(y)}
                  style={styles.pickerList}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.pickerItem, pickerYear === item && styles.pickerItemActive]}
                      onPress={() => setPickerYear(item)}>
                      <Text style={[styles.pickerItemText, pickerYear === item && styles.pickerItemTextActive]}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
              <TouchableOpacity style={styles.pickerConfirm} onPress={() => { setViewMonth(pickerMonth); setViewYear(pickerYear); setShowPicker(false); }}>
                <Text style={styles.pickerConfirmText}>{t('calendar.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Day headers */}
        <View style={styles.dayHeaders}>
          {DAYS.map(d => (
            <Text key={d} style={styles.dayHeader}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.grid}>
          {calDays.map((day, idx) => {
            if (!day) return <View key={`empty-${idx}`} style={styles.cell} />;
            const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasJobs = !!jobsByDate[key]?.length;
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.cell,
                  isSelected && styles.cellSelected,
                  isToday && !isSelected && styles.cellToday,
                ]}
                onPress={() => setSelectedDate(key)}>
                <Text style={[
                  styles.cellText,
                  isSelected && styles.cellTextSelected,
                  isToday && !isSelected && styles.cellTextToday,
                ]}>{day}</Text>
                {hasJobs && (
                  <View style={[styles.dot, { backgroundColor: isSelected ? '#fff' : D.blue }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected day jobs */}
        <View style={styles.daySection}>
          <Text style={styles.daySectionTitle}>
            {selectedDate === todayKey ? t('calendar.today') : selectedDate} · {t('calendar.jobsCount', { count: selectedJobs.length })}
          </Text>
          {selectedJobs.length === 0 ? (
            <View style={styles.emptyDay}>
              <Icon name="calendar-blank-outline" size={40} color={D.textMuted} />
              <Text style={styles.emptyDayText}>{t('calendar.noJobsScheduled')}</Text>
            </View>
          ) : (
            selectedJobs.map(job => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Jobs', params: { screen: 'JobDetail', params: { jobId: job.id } } })}>
                <View style={[styles.statusBar, { backgroundColor: getStatusColor(job.status) }]} />
                <View style={styles.jobInfo}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <Text style={styles.jobTime}>{job.scheduledTime}</Text>
                  {job.address ? <Text style={styles.jobLocation} numberOfLines={1}>{job.address}</Text> : null}
                </View>
                <View style={styles.jobRight}>
                  <Text style={styles.jobPrice}>{job.bidAmount || job.estimatedPrice || ''}</Text>
                  <Text style={[styles.jobStatus, { color: getStatusColor(job.status) }]}>
                    {job.status ? job.status.replace('-', ' ') : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: D.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    backgroundColor: D.surface,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: D.text },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  navBtn: { padding: 8 },
  monthTitleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthTitle: { fontSize: 18, fontWeight: '600', color: D.text },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  pickerContainer: { backgroundColor: D.surface, borderRadius: 16, padding: 20, width: 300, borderWidth: 1, borderColor: D.border },
  pickerHeading: { fontSize: 16, fontWeight: '700', color: D.text, marginBottom: 16, textAlign: 'center' },
  pickerColumns: { flexDirection: 'row', gap: 8, height: 200 },
  pickerList: { flex: 1 },
  pickerItem: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 2 },
  pickerItemActive: { backgroundColor: D.blue },
  pickerItemText: { fontSize: 14, color: D.textMuted, textAlign: 'center' },
  pickerItemTextActive: { color: '#fff', fontWeight: '700' },
  pickerConfirm: { backgroundColor: D.blue, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  pickerConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  dayHeaders: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: D.surface,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: D.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: D.surface,
    marginBottom: 8,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  cellSelected: { backgroundColor: D.blue },
  cellToday: { backgroundColor: `${D.blue}22` },
  cellText: { fontSize: 14, color: D.text },
  cellTextSelected: { color: '#fff', fontWeight: '700' },
  cellTextToday: { color: D.blue, fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  daySection: { padding: 16 },
  daySectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: D.text,
    marginBottom: 12,
  },
  emptyDay: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyDayText: { fontSize: 14, color: D.textMuted },
  jobCard: {
    flexDirection: 'row',
    backgroundColor: D.surface,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: D.border,
  },
  statusBar: { width: 4 },
  jobInfo: { flex: 1, padding: 12, gap: 3 },
  jobTitle: { fontSize: 14, fontWeight: '600', color: D.text },
  jobTime: { fontSize: 12, color: D.textMuted },
  jobLocation: { fontSize: 12, color: D.textMuted },
  jobRight: { padding: 12, alignItems: 'flex-end', justifyContent: 'space-between' },
  jobPrice: { fontSize: 14, fontWeight: '600', color: D.text },
  jobStatus: { fontSize: 11, fontWeight: '500', textTransform: 'capitalize' },
});
