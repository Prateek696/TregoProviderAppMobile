/**
 * Jobs Screen - DARK THEME - EXACT match with web version
 * Pixel-perfect dark aesthetics, Slate palette, and refined layout
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { TregoLogo } from '../components/TregoLogo';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';
import { fullWeekDemoJobs } from '../shared/data/fullWeekJobsData';

type JobsScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'JobsList'>;

type FilterType = 'week' | 'pending' | 'completed' | 'review';

interface Job {
  id: string;
  jobNumber?: string;
  title: string;
  description: string;
  client: string;
  clientRating: number;
  location: string;
  address: string;
  bidAmount?: string;
  actualPrice?: string;
  estimatedPrice?: string;
  scheduledTime?: string;
  scheduledDate?: string;
  estimatedDuration?: string;
  status: string;
  priority: string;
  category: string;
  jobType: string;
  technician?: string;
  timePosted?: string;
}

const { width } = Dimensions.get('window');

// Dark Theme Colors
const COLORS = {
  background: '#0f172a',    // Slate 950
  surface: '#1e293b',       // Slate 800
  surfaceLight: '#334155',  // Slate 700
  border: '#334155',        // Slate 700
  textPrimary: '#f1f5f9',   // Slate 100
  textSecondary: '#94a3b8', // Slate 400
  accent: '#f97316',        // Orange 500
  success: '#10b981',       // Emerald 500
  danger: '#ef4444',        // Red 500
  warning: '#f59e0b',       // Amber 500
  info: '#3b82f6',          // Blue 500
  purple: '#a855f7',        // Purple 500
};

export default function JobsScreen() {
  const navigation = useNavigation<JobsScreenNavigationProp>();
  const [jobs] = useState<Job[]>(fullWeekDemoJobs as Job[]);
  const [filter, setFilter] = useState<FilterType>('week');
  const [orbColor, setOrbColor] = useState(COLORS.accent);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const color = await jsonStorage.getItem<string>(STORAGE_KEYS.ORB_COLOR);
      if (color) setOrbColor(color);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredJobs = useMemo(() => {
    let filtered = jobs;

    if (filter === 'week') {
      const selectedDate = new Date(today);
      selectedDate.setDate(today.getDate() + selectedDayOffset);
      selectedDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);

      filtered = filtered.filter(job => {
        if (!job.scheduledDate) return false;
        const jobDate = new Date(job.scheduledDate);
        jobDate.setHours(0, 0, 0, 0);
        return jobDate >= selectedDate && jobDate < nextDay;
      });
    } else if (filter === 'pending') {
      filtered = filtered.filter(job => job.status === 'pending');
    } else if (filter === 'completed') {
      filtered = filtered.filter(job => job.status === 'completed');
    } else if (filter === 'review') {
      filtered = filtered.filter(job => job.status === 'completed');
    }

    return filtered.sort((a, b) => {
      // Keep paused jobs at the top within their category or time
      if (a.status === 'paused' && b.status !== 'paused') return -1;
      if (a.status !== 'paused' && b.status === 'paused') return 1;

      if (a.scheduledDate && b.scheduledDate) {
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      }
      return 0;
    });
  }, [jobs, filter, selectedDayOffset]);

  const delayedJobsCount = useMemo(() => filteredJobs.filter(job => job.status === 'delayed').length, [filteredJobs]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#450a0a', border: '#991b1b', text: '#fecaca' };
      case 'confirmed':
        return { bg: '#172554', border: '#1e40af', text: '#bfdbfe' };
      case 'en-route':
        return { bg: '#3b0764', border: '#6b21a8', text: '#e9d5ff' };
      case 'on-site':
        return { bg: '#422006', border: '#854d0e', text: '#fef3c7' };
      case 'paused':
        return { bg: '#450a0a', border: '#ef4444', text: '#fca5a5' }; // Brighter red for paused
      case 'delayed':
        return { bg: '#2e1065', border: '#7c3aed', text: '#ddd6fe' };
      case 'completed':
        return { bg: '#064e3b', border: '#059669', text: '#d1fae5' };
      case 'cancelled':
        return { bg: '#1f2937', border: '#374151', text: '#d1d5db' };
      default:
        return { bg: '#1f2937', border: '#374151', text: '#d1d5db' };
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent': return COLORS.danger;
      case 'high': return COLORS.accent;
      case 'medium': return COLORS.warning;
      case 'low': return COLORS.success;
      default: return COLORS.textSecondary;
    }
  };

  const formatJobDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === todayDate.getTime()) return 'Today';
    if (dateOnly.getTime() === tomorrow.getTime()) return 'Tomorrow';

    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  };

  const formatWeekDay = (offset: number) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return {
      letter: offset === 0 ? 'Today' : days[date.getDay()],
      number: date.getDate(),
    };
  };

  const getBorderColor = (status: string): string => {
    if (status === 'paused') return COLORS.danger;
    if (status === 'delayed') return COLORS.purple;
    if (status === 'confirmed') return COLORS.info;
    if (status === 'pending') return COLORS.warning;
    return COLORS.border;
  };

  const renderJobCard = (job: Job) => {
    const statusStyle = getStatusStyle(job.status);
    const priorityColor = getPriorityColor(job.priority);
    const isPaused = job.status === 'paused';
    const isDelayed = job.status === 'delayed';
    const isConfirmed = job.status === 'confirmed';
    const isPending = job.status === 'pending';
    const borderColor = getBorderColor(job.status);
    const borderWidth = (isPending || isConfirmed || isDelayed || isPaused) ? 2 : 1;

    return (
      <View
        key={job.id}
        style={[
          styles.jobCard,
          {
            borderColor,
            borderWidth,
          },
        ]}>
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}>
          <Text style={styles.infoIcon}>ℹ️</Text>
        </TouchableOpacity>

        <View style={styles.jobHeader}>
          <View style={styles.jobHeaderTop}>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {job.status.replace('-', ' ').toUpperCase()}
              </Text>
            </View>
            {job.jobNumber && <Text style={styles.jobNumberText}>{job.jobNumber}</Text>}
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          </View>

          <View style={styles.jobHeaderMiddle}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{job.category}</Text>
            </View>
            <Text style={styles.jobTitle} numberOfLines={2}>
              {job.title}
            </Text>
          </View>

          <View style={styles.jobClientRow}>
            <Text style={styles.clientText}>
              {job.technician || job.client} ⭐ {job.clientRating.toFixed(1)}
            </Text>
          </View>
        </View>

        <View style={styles.jobDetails}>
          <Text style={styles.jobDescription}>{job.description}</Text>

          {job.scheduledDate && (
            <View style={styles.jobDetailRow}>
              <Text style={styles.jobDetailIcon}>🕐</Text>
              <Text style={styles.jobDetailText}>
                {formatJobDate(job.scheduledDate)}
                {job.scheduledTime && ` • ${job.scheduledTime}`}
                {job.estimatedDuration && `, ${job.estimatedDuration}`}
              </Text>
            </View>
          )}

          <View style={styles.jobDetailRow}>
            <Text style={styles.jobDetailIcon}>📍</Text>
            <Text style={styles.jobDetailText} numberOfLines={1}>
              {job.location} • {job.address}
            </Text>
          </View>

          {(job.bidAmount || job.actualPrice || job.estimatedPrice) && (
            <View style={styles.jobDetailRow}>
              <Text style={styles.jobDetailIcon}>💰</Text>
              <Text style={styles.jobDetailText}>
                {job.bidAmount || job.actualPrice || job.estimatedPrice}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.jobActions}>
          {isPaused && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: orbColor }]}>
                <Text style={styles.actionButtonTextPrimary}>✓ Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonOutline}>
                <Text style={styles.actionButtonText}>📅 Reschedule</Text>
              </TouchableOpacity>
            </View>
          )}
          {isDelayed && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButtonOutline}>
                <Text style={styles.actionButtonText}>💬 Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonOutline}>
                <Text style={styles.actionButtonText}>📅 Reschedule</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: orbColor }]}>
                <Text style={styles.actionButtonTextPrimary}>+ Expense</Text>
              </TouchableOpacity>
            </View>
          )}
          {isPending && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButtonOutline}>
                <Text style={styles.actionButtonText}>💬 Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonOutline}>
                <Text style={styles.actionButtonText}>📅 Schedule</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: orbColor }]}>
                <Text style={styles.actionButtonTextPrimary}>+ Expense</Text>
              </TouchableOpacity>
            </View>
          )}
          {isConfirmed && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButtonOutline}>
                <Text style={styles.actionButtonText}>💬 Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: orbColor }]}>
                <Text style={styles.actionButtonTextPrimary}>+ Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: orbColor }]}>
                <Text style={styles.actionButtonTextPrimary}>Start Job</Text>
              </TouchableOpacity>
            </View>
          )}
          {job.status === 'completed' && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButtonOutline}>
                <Text style={styles.actionButtonText}>➕ Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: orbColor }]}>
                <Text style={styles.actionButtonTextPrimary}>📄 Invoice</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const firstDelayedIndex = filteredJobs.findIndex(job => job.status === 'delayed');

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TregoLogo size="md" />
          <Text style={styles.topBarTitle}>Jobs</Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.notificationButton}>
            <Text style={styles.notificationIcon}>🔔</Text>
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>1</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addIcon}>➕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, filter === 'week' && { backgroundColor: `${orbColor}33` }]}
          onPress={() => setFilter('week')}>
          <Text style={[styles.tabText, filter === 'week' && { color: orbColor, fontWeight: '600' }]}>Week</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'pending' && { backgroundColor: `${orbColor}33` }]}
          onPress={() => setFilter('pending')}>
          <Text style={[styles.tabText, filter === 'pending' && { color: orbColor, fontWeight: '600' }]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'completed' && { backgroundColor: `${orbColor}33` }]}
          onPress={() => setFilter('completed')}>
          <Text style={[styles.tabText, filter === 'completed' && { color: orbColor, fontWeight: '600' }]}>Completed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'review' && { backgroundColor: `${orbColor}33` }]}
          onPress={() => setFilter('review')}>
          <Text style={[styles.tabText, filter === 'review' && { color: orbColor, fontWeight: '600' }]}>Review</Text>
        </TouchableOpacity>
      </View>

      {filter === 'week' && (
        <View style={styles.weekNavigation}>
          {Array.from({ length: 7 }, (_, i) => {
            const dayInfo = formatWeekDay(i);
            const isSelected = selectedDayOffset === i;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.weekDayButton, isSelected && { backgroundColor: orbColor }]}
                onPress={() => setSelectedDayOffset(i)}>
                <Text style={[styles.weekDayLabel, isSelected && { color: '#ffffff', opacity: 0.7 }]}>
                  {dayInfo.letter}
                </Text>
                <Text style={[styles.weekDayNumber, isSelected && { color: '#ffffff', fontWeight: '600' }]}>
                  {dayInfo.number}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView style={styles.jobsList} contentContainerStyle={styles.jobsListContent} showsVerticalScrollIndicator={false}>
        {/* Paused jobs section removed as they are now merged in main list per user request */}

        {filter === 'week' && firstDelayedIndex !== -1 && (
          <View style={styles.delayedSeparator}>
            <View style={styles.delayedSeparatorLine} />
            <View style={styles.delayedSeparatorBadge}>
              <Text style={styles.delayedSeparatorIcon}>⚠️</Text>
              <Text style={styles.delayedSeparatorText}>JOBS NEEDING FOLLOW-UP</Text>
            </View>
            <View style={styles.delayedSeparatorLine} />
          </View>
        )}

        {filteredJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💼</Text>
            <Text style={styles.emptyStateText}>No jobs found</Text>
          </View>
        ) : (
          filteredJobs.map(job => renderJobCard(job))
        )}
      </ScrollView>

      {delayedJobsCount > 0 && (
        <View style={styles.bottomActionBar}>
          <TouchableOpacity style={styles.followUpButton}>
            <Text style={styles.followUpIcon}>⚠️</Text>
            <Text style={styles.followUpText}>JOBS NEEDING FOLLOW-UP</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={[styles.floatingAddButton, { backgroundColor: orbColor }]}>
        <Text style={styles.floatingAddIcon}>➕</Text>
        <Text style={styles.floatingAddText}>Add Job</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationIcon: {
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  addButton: {
    padding: 8,
  },
  addIcon: {
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b', // Darker background for tabs
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  weekNavigation: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  weekDayButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  weekDayLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  weekDayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  jobsList: {
    flex: 1,
  },
  jobsListContent: {
    paddingBottom: 100,
  },
  jobCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    position: 'relative',
  },
  infoButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 10,
  },
  infoIcon: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  jobHeader: {
    marginBottom: 12,
  },
  jobHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  jobNumberText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  jobHeaderMiddle: {
    gap: 6,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  jobClientRow: {
    marginTop: 6,
  },
  clientText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  jobDetails: {
    gap: 8,
    marginBottom: 12,
  },
  jobDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  jobDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobDetailIcon: {
    fontSize: 14,
  },
  jobDetailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  jobActions: {
    marginTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonOutline: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  actionButtonTextPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  delayedSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    gap: 12,
  },
  delayedSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.purple,
    opacity: 0.3,
  },
  delayedSeparatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2e1065',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.purple,
  },
  delayedSeparatorIcon: {
    fontSize: 14,
  },
  delayedSeparatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ddd6fe',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
  },
  followUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2e1065',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.purple,
  },
  followUpIcon: {
    fontSize: 16,
  },
  followUpText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ddd6fe',
    letterSpacing: 0.5,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingAddIcon: {
    fontSize: 18,
    color: '#ffffff',
  },
  floatingAddText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
