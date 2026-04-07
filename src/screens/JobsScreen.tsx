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
  DeviceEventEmitter,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { TregoLogo } from '../components/TregoLogo';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';
import AddJobModal from '../components/AddJobModal';
import VoiceBubble from '../components/VoiceBubble';
import { jobsAPI } from '../services/api';
import { mapBackendJob } from '../services/jobActions';
import { startOfflineSyncListener } from '../services/offlineQueue';
import { checkForPostCallPrompt, requestCallLogPermission } from '../services/callLog';
import { onForegroundMessage } from '../services/notifications';
import { Modal, Alert, Linking } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasEverHadJobs, setHasEverHadJobs] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<FilterType>('week');
  const [orbColor, setOrbColor] = useState(COLORS.accent);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [isAddJobModalVisible, setIsAddJobModalVisible] = useState(false);
  const [postCallClient, setPostCallClient] = useState<string | null>(null);
  const [scheduleToast, setScheduleToast] = useState<string | null>(null);
  const lastCallCheckRef = React.useRef(Date.now());
  const toastTimerRef = React.useRef<any>(null);

  // Load jobs + check post-call every time screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadJobs();
      checkPostCall();
      // Start offline sync listener — when internet returns, auto-sync queued audio
      const unsub = startOfflineSyncListener((count) => {
        console.log(`[OfflineSync] ${count} job(s) synced`);
        loadJobs(); // refresh list after sync
      });
      return () => unsub();
    }, [])
  );

  useEffect(() => {
    loadSettings();
    // Poll for AI processing updates every 8 seconds
    const poll = setInterval(() => loadJobs(), 8000);
    // Refresh on foreground push (job_created / job_updated)
    const unsubPush = onForegroundMessage((payload) => {
      if (payload.type === 'job_created' || payload.type === 'job_updated') {
        loadJobs();
        // Show schedule toast if auto-scheduled
        if (payload.auto_scheduled === 'true' && payload.schedule_message) {
          setScheduleToast(payload.schedule_message);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => setScheduleToast(null), 5000);
        }
      }
    });
    return () => {
      clearInterval(poll);
      unsubPush();
    };
  }, []);

  const checkPostCall = async () => {
    const permitted = await requestCallLogPermission();
    if (!permitted) return;
    const call = await checkForPostCallPrompt(30, lastCallCheckRef.current);
    if (call) {
      lastCallCheckRef.current = Date.now();
      setPostCallClient(call.name !== 'Unknown' ? call.name : call.phoneNumber);
    }
  };

  const loadJobs = async () => {
    try {
      const res = await jobsAPI.list();
      const mapped = res.data.jobs.map(mapBackendJob) as Job[];
      setJobs(mapped);
      setHasEverHadJobs(mapped.length > 0);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobCreated = (newJob: any) => {
    // Add the raw job immediately to the top of the list while AI processes
    setJobs(prev => [mapBackendJob(newJob) as Job, ...prev]);
  };

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
        if (job.status === 'paused') return true; // Always show paused jobs
        if (job.status === 'delayed') return true; // Always show delayed jobs
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

  const getBorderColor = (status: string, priority?: string): string => {
    if (priority === 'urgent') return COLORS.danger;
    if (status === 'paused') return COLORS.danger;
    if (status === 'delayed') return COLORS.purple;
    if (status === 'confirmed') return COLORS.info;
    if (status === 'pending') return COLORS.warning;
    return COLORS.border;
  };

  const renderPinnedJobCard = (job: Job) => {
    return (
      <View key={job.id} style={styles.pinnedCard}>
        <View style={styles.pinnedHeader}>
          <View style={styles.pinnedStatusBadge}>
            <Text style={styles.pinnedStatusText}>PAUSED</Text>
          </View>
          {job.timePosted && <Text style={styles.pinnedTimeText}>{job.timePosted}</Text>}
        </View>

        <Text style={styles.pinnedTitle}>{job.title}</Text>

        <View style={styles.pinnedTagContainer}>
          <View style={styles.pinnedTag}>
            <Text style={styles.pinnedTagText}>Plumbing</Text>
          </View>
        </View>

        <View style={styles.pinnedActions}>
          <TouchableOpacity style={[styles.pinnedActionButton, { backgroundColor: '#3b82f6' }]}>
            <Icon name="refresh" size={16} color="#fff" />
            <Text style={styles.pinnedActionTextWhite}>Resume</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pinnedActionButtonOutline}>
            <Icon name="calendar-clock" size={16} color="#64748b" />
            <Text style={styles.pinnedActionTextGray}>Reschedule</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pinnedActionButtonOutline}>
            <Icon name="calendar" size={16} color="#64748b" />
            <Text style={styles.pinnedActionTextGray}>View Calendar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFollowUpJobCard = (job: Job) => {
    return (
      <View key={job.id} style={styles.standardCard}>
        <View style={styles.standardHeader}>
          <View style={[styles.standardStatusBadge, { backgroundColor: '#3b0764', borderColor: '#7e22ce' }]}>
            <Text style={[styles.standardStatusText, { color: '#e9d5ff' }]}>
              DELAYED
            </Text>
          </View>
          <Text style={styles.standardTimeText}>#{job.jobNumber || job.id.slice(0, 5)}</Text>
        </View>

        <View style={styles.standardContent}>
          <Text style={styles.standardTitle}>{job.title}</Text>
          {job.client ? (
            <View style={styles.standardRatingRow}>
              <Icon name="account" size={14} color="#94a3b8" />
              <Text style={styles.standardClientText}>{job.client}</Text>
            </View>
          ) : null}

          <View style={styles.standardDetails}>
            <View style={styles.standardDetailRow}>
              <Icon name="text" size={14} color="#94a3b8" />
              <Text style={styles.standardDetailText} numberOfLines={2}>{job.description}</Text>
            </View>
            {job.scheduledDate && (
              <View style={styles.standardDetailRow}>
                <Icon name="clock-time-four-outline" size={14} color="#94a3b8" />
                <Text style={styles.standardDetailText}>
                  {formatJobDate(job.scheduledDate)} • {job.scheduledTime}
                </Text>
              </View>
            )}
            <View style={styles.standardDetailRow}>
              <Icon name="map-marker-outline" size={14} color="#94a3b8" />
              <Text style={styles.standardDetailText} numberOfLines={1}>
                {job.location} • {job.address}
              </Text>
            </View>
            {job.bidAmount && (
              <View style={styles.standardDetailRow}>
                <Icon name="currency-euro" size={14} color="#94a3b8" />
                <Text style={styles.standardDetailText}>{job.bidAmount}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.standardFooter}>
          <TouchableOpacity style={styles.standardFooterButton} onPress={() => {
              Alert.alert('Add Photo', 'Choose source', [
                {
                  text: 'Camera',
                  onPress: () => launchCamera({ mediaType: 'photo', quality: 0.8 }, async (res) => {
                    if (res.assets?.[0]?.uri) {
                      try {
                        await jobsAPI.uploadPhoto(job.id, res.assets[0].uri);
                        Alert.alert('Photo saved');
                      } catch { Alert.alert('Upload failed'); }
                    }
                  }),
                },
                {
                  text: 'Gallery',
                  onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async (res) => {
                    if (res.assets?.[0]?.uri) {
                      try {
                        await jobsAPI.uploadPhoto(job.id, res.assets[0].uri);
                        Alert.alert('Photo saved');
                      } catch { Alert.alert('Upload failed'); }
                    }
                  }),
                },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}>
            <Icon name="camera-outline" size={18} color="#f1f5f9" />
            <Text style={styles.standardFooterText}>Capture</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.standardFooterButton}>
            <Icon name="calendar-edit" size={18} color="#f1f5f9" />
            <Text style={styles.standardFooterText}>Reschedule</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.standardMainButton, { backgroundColor: '#3b82f6' }]}>
            <Icon name="plus" size={18} color="#fff" />
            <Text style={styles.standardMainButtonText}>Expense</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStandardJobCard = (job: Job) => {
    const isConfirmed = job.status === 'confirmed';
    const isPending = job.status === 'pending';
    const isUrgent = job.priority === 'urgent';
    const isEnRoute = job.status === 'en-route';
    const isOnSite = job.status === 'on-site';
    const isPaused = job.status === 'paused';
    const isCompleted = job.status === 'completed' || job.status === 'cancelled';

    const mainButtonLabel = isPending ? 'Accept Job'
      : isConfirmed ? 'Start Job'
      : isEnRoute ? 'On Site'
      : isOnSite ? 'Complete'
      : isPaused ? 'Resume'
      : null;

    const mainButtonIcon = isPending ? 'check'
      : isConfirmed ? 'play'
      : isEnRoute ? 'map-marker-check'
      : isOnSite ? 'check-circle'
      : isPaused ? 'play-circle'
      : 'check';

    const mainButtonStatus = isPending ? 'confirmed'
      : isConfirmed ? 'en-route'
      : isEnRoute ? 'on-site'
      : isOnSite ? 'completed'
      : isPaused ? 'en-route'
      : null;

    const mainButtonColor = isOnSite ? '#10b981' : isPaused ? '#f59e0b' : '#3b82f6';

    return (
      <TouchableOpacity
        key={job.id}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
        onLongPress={() => {}}
        style={[
          styles.standardCard,
          isUrgent && { borderColor: COLORS.danger, borderWidth: 1.5 },
        ]}>
        <View style={styles.standardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isUrgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentBadgeText}>URGENT</Text>
              </View>
            )}
            <View style={[styles.standardStatusBadge, isPending && styles.statusBadgePending]}>
              <Text style={[styles.standardStatusText, isPending && styles.statusTextPending]}>
                {job.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.standardTimeText}>{job.scheduledTime}</Text>
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() =>
                Alert.alert(
                  'Delete Job',
                  `Delete "${job.title}"? This cannot be undone.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await jobsAPI.update(job.id, { exec_status: 'cancelled' });
                          loadJobs();
                        } catch (e) {
                          Alert.alert('Error', 'Could not delete job');
                        }
                      },
                    },
                  ]
                )
              }>
              <View style={styles.deleteBtn}>
                <Icon name="close" size={14} color={COLORS.danger} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.standardContent}>
          <Text style={styles.standardTitle}>{job.title}</Text>
          {job.autoScheduled && (
            <View style={styles.autoScheduledChip}>
              <Icon name="clock-fast" size={11} color="#a78bfa" />
              <Text style={styles.autoScheduledText}>Auto-scheduled</Text>
            </View>
          )}
          {job.client ? (
            <View style={styles.standardRatingRow}>
              <Icon name="account" size={14} color="#94a3b8" />
              <Text style={styles.standardClientText}>{job.client}</Text>
            </View>
          ) : null}

          <View style={styles.standardDetails}>
            <View style={styles.standardDetailRow}>
              <Icon name="map-marker" size={14} color="#94a3b8" />
              <Text style={styles.standardDetailText} numberOfLines={1}>{job.address}</Text>
            </View>
            {job.estimatedPrice && (
              <View style={styles.standardDetailRow}>
                <Icon name="currency-usd" size={14} color="#94a3b8" />
                <Text style={styles.standardDetailText}>{job.estimatedPrice}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.standardFooter}>
          <TouchableOpacity
            style={styles.standardFooterButton}
            onPress={() => {
              Alert.alert('Add Photo', 'Choose source', [
                {
                  text: 'Camera',
                  onPress: () => launchCamera({ mediaType: 'photo', quality: 0.8 }, async (res) => {
                    if (res.assets?.[0]?.uri) {
                      try {
                        await jobsAPI.uploadPhoto(job.id, res.assets[0].uri);
                        Alert.alert('Photo saved');
                      } catch { Alert.alert('Upload failed'); }
                    }
                  }),
                },
                {
                  text: 'Gallery',
                  onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async (res) => {
                    if (res.assets?.[0]?.uri) {
                      try {
                        await jobsAPI.uploadPhoto(job.id, res.assets[0].uri);
                        Alert.alert('Photo saved');
                      } catch { Alert.alert('Upload failed'); }
                    }
                  }),
                },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}>
            <Icon name="camera-outline" size={18} color="#f1f5f9" />
            <Text style={styles.standardFooterText}>Capture</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.standardFooterButton}
            onPress={() => {
              const addr = encodeURIComponent(job.address || job.location || '');
              if (addr) Linking.openURL(`https://maps.google.com/?q=${addr}`);
            }}>
            <Icon name="navigation-variant-outline" size={18} color="#f1f5f9" />
            <Text style={styles.standardFooterText}>Navigate</Text>
          </TouchableOpacity>

          {!isCompleted && mainButtonLabel && (
          <TouchableOpacity
            style={[styles.standardMainButton, { backgroundColor: mainButtonColor }]}
            onPress={async () => {
              if (isPending) {
                // Navigate to job detail to review + confirm scheduling before accepting
                navigation.navigate('JobDetail', { jobId: job.id, pendingAccept: true });
                return;
              }
              try {
                await jobsAPI.update(job.id, { exec_status: mainButtonStatus });
                loadJobs();
              } catch (e) {
                Alert.alert('Error', 'Could not update job status');
              }
            }}>
            <Icon name={mainButtonIcon} size={18} color="#fff" />
            <Text style={styles.standardMainButtonText}>{mainButtonLabel}</Text>
          </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderJobCard = (job: Job) => {
    if (job.status === 'paused') {
      return renderPinnedJobCard(job);
    }
    return renderStandardJobCard(job);
  };

  const firstDelayedIndex = filteredJobs.findIndex(job => job.status === 'delayed');

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* ── Auto-schedule toast ── */}
      {scheduleToast && (
        <TouchableOpacity
          style={styles.scheduleToast}
          onPress={() => setScheduleToast(null)}
          activeOpacity={0.9}>
          <Icon name="clock-check-outline" size={18} color="#a78bfa" />
          <Text style={styles.scheduleToastText}>{scheduleToast}</Text>
          <Icon name="close" size={14} color="#64748b" />
        </TouchableOpacity>
      )}

      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TregoLogo size="md" />
          <Text style={styles.topBarTitle}>Jobs</Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.notificationButton}>
            <Icon name="bell-outline" size={24} color={COLORS.textPrimary} />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>1</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => setIsAddJobModalVisible(true)}>
            <Icon name="plus" size={24} color={COLORS.textPrimary} />
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



        {filteredJobs.length === 0 ? (
          hasEverHadJobs === false ? (
            // 4.4 — First-time empty screen
            <View style={styles.firstTimeCard}>
              <Icon name="camera-outline" size={48} color={orbColor} />
              <Text style={styles.firstTimeTitle}>Try it now</Text>
              <Text style={styles.firstTimeBody}>
                Tap and hold the button below, then say your next job.{'\n'}Speak naturally — Trego handles the rest.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="briefcase-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyStateText}>No jobs found</Text>
            </View>
          )
        ) : (
          <>
            {/* Pinned Jobs Section */}
            {filteredJobs.some(j => j.status === 'paused') && (
              <View>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>Pinned Jobs ({filteredJobs.filter(j => j.status === 'paused').length})</Text>
                </View>
                {filteredJobs.filter(j => j.status === 'paused').map(job => renderPinnedJobCard(job))}
              </View>
            )}

            {/* Follow-up Jobs Section */}
            {filteredJobs.some(j => j.status === 'delayed') && (
              <View>
                <View style={styles.delayedSeparator}>
                  <View style={styles.delayedSeparatorLine} />
                  <View style={styles.delayedSeparatorBadge}>
                    <Icon name="alert-circle-outline" size={16} color="#e9d5ff" />
                    <Text style={styles.delayedSeparatorText}>JOBS NEEDING FOLLOW-UP</Text>
                  </View>
                  <View style={styles.delayedSeparatorLine} />
                </View>
                {filteredJobs.filter(j => j.status === 'delayed').map(job => renderFollowUpJobCard(job))}
              </View>
            )}

            {/* Standard Jobs Section */}
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.standardSectionHeaderText}>
                  {filter === 'completed' ? 'Completed' : 'Upcoming'} ({filteredJobs.filter(j => j.status !== 'paused' && j.status !== 'delayed').length})
                </Text>
              </View>
              {filteredJobs.filter(j => j.status !== 'paused' && j.status !== 'delayed').map(job => renderStandardJobCard(job))}
            </View>
          </>
        )}
      </ScrollView>



      {/* Voice Bubble — hold to speak, release to submit */}
      <View style={styles.bubbleWrapper}>
        <VoiceBubble onJobCreated={handleJobCreated} />
      </View>

      <AddJobModal
        visible={isAddJobModalVisible}
        onClose={() => setIsAddJobModalVisible(false)}
        onJobCreated={handleJobCreated}
      />

      {/* Post-call capture prompt */}
      {postCallClient !== null && (
        <Modal transparent animationType="slide" onRequestClose={() => setPostCallClient(null)}>
          <View style={styles.postCallOverlay}>
            <View style={styles.postCallCard}>
              <Icon name="phone-check" size={32} color="#10b981" />
              <Text style={styles.postCallTitle}>Just finished a call?</Text>
              <Text style={styles.postCallSubtitle}>
                You had a call with {postCallClient}. Create a job from it?
              </Text>
              <View style={styles.postCallButtons}>
                <TouchableOpacity
                  style={styles.postCallDismiss}
                  onPress={() => setPostCallClient(null)}>
                  <Text style={{ color: '#94a3b8', fontSize: 15 }}>Dismiss</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.postCallCreate}
                  onPress={() => {
                    const client = postCallClient;
                    setPostCallClient(null);
                    // Open VoiceBubble pre-filled with client name
                    // For now show the AddJob modal with client pre-filled via context
                    setIsAddJobModalVisible(true);
                  }}>
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Create Job</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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

  // 4.4 — First-time empty screen
  firstTimeCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 16,
  },
  firstTimeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  firstTimeBody: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // 4.6 — Urgent badge
  deleteBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.danger + '22',
    borderWidth: 1,
    borderColor: COLORS.danger + '55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentBadge: {
    backgroundColor: '#7f1d1d',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  urgentBadgeText: {
    color: '#fca5a5',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  bubbleWrapper: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  postCallOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  postCallCard: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 28,
    paddingBottom: 48,
    alignItems: 'center',
    gap: 12,
  },
  postCallTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  postCallSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  postCallButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  postCallDismiss: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  postCallCreate: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#10b981',
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

  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  standardSectionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Pinned Card Styles (White/Light Theme)
  pinnedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pinnedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pinnedStatusBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  pinnedStatusText: {
    color: '#dc2626',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pinnedTimeText: {
    color: '#64748b',
    fontSize: 12,
  },
  pinnedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  pinnedTagContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  pinnedTag: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pinnedTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  pinnedActions: {
    flexDirection: 'row',
    gap: 1,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  pinnedActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  pinnedActionButtonOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    marginRight: 4,
  },
  pinnedActionTextWhite: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  pinnedActionTextGray: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },

  // Standard Card Styles (Dark/Slate Theme)
  standardCard: {
    backgroundColor: '#020617', // Very dark/black
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  standardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  standardStatusBadge: {
    backgroundColor: '#172554',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1e40af',
  },
  statusBadgePending: {
    backgroundColor: '#451a03',
    borderColor: '#92400e',
  },
  standardStatusText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusTextPending: {
    color: '#fbbf24',
  },
  standardTimeText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  standardContent: {
    padding: 16,
  },
  standardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  scheduleToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e1b4b',
    borderWidth: 1,
    borderColor: '#a78bfa40',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    zIndex: 999,
  },
  scheduleToastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
    lineHeight: 18,
  },
  autoScheduledChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#2e1f69',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a78bfa40',
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  autoScheduledText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a78bfa',
  },
  standardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  standardClientText: {
    color: '#94a3b8',
    fontSize: 13,
    marginLeft: 4,
  },
  standardRatingText: {
    color: '#cbd5e1',
    fontSize: 13,
    marginLeft: 2,
    fontWeight: '600',
  },
  standardDetails: {
    gap: 6,
  },
  standardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  standardDetailText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  standardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
    padding: 4,
  },
  standardFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    flex: 1,
  },
  standardFooterText: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '500',
  },
  standardMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
    gap: 6,
    flex: 2,
    margin: 4,
    marginLeft: 8,
  },
  standardMainButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
