import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import LinearTimeCalendar from '../components/schedule/LinearTimeCalendar';
import StaticMapView from '../components/schedule/StaticMapView';
import CalendarViewOptionsModal, { CalendarViewType } from '../components/schedule/CalendarViewOptionsModal';
import DayTimer from '../components/schedule/DayTimer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { dayStateStorage, jobStatusStorage, freeTimeNotesStorage, FreeTimeNote } from '../utils/scheduleStorage';
import { useFocusEffect } from '@react-navigation/native';
import { jobsAPI } from '../services/api';
import { mapBackendJob } from '../services/jobActions';

import DayStatsDropdown from '../components/schedule/DayStatsDropdown';
import AddJobModal from '../components/schedule/AddJobModal';
import { JobDetailModal } from '../components/schedule/JobDetailModal';
import { formatDuration } from '../utils/scheduleCalculations';

import Haptics from '../utils/haptics';

export default function ScheduleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewType>('day');
  const [modalVisible, setModalVisible] = useState(false);
  const [addJobModalVisible, setAddJobModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [allJobs, setAllJobs] = useState<any[]>([]);

  // Day state management
  const [isDayStarted, setIsDayStarted] = useState(false);
  const [isDayEnded, setIsDayEnded] = useState(false);

  // Job status management
  const [jobStatuses, setJobStatuses] = useState<Record<string, string>>({});

  // Free time notes management
  const [freeTimeNotes, setFreeTimeNotes] = useState<Record<string, FreeTimeNote>>({});

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [])
  );

  const loadJobs = async () => {
    try {
      const res = await jobsAPI.list();
      setAllJobs(res.data.jobs.map(mapBackendJob));
    } catch (err) {
      console.error('ScheduleScreen: failed to load jobs', err);
    }
  };

  const handleAddJob = (newJob: any) => {
    setAllJobs(prev => [...prev, mapBackendJob(newJob)]);
  };

  // Calculate Daily Stats — filter for selected date
  const jobs = allJobs.filter(job => {
    if (!job.scheduledDate) return false;
    const jobDate = new Date(job.scheduledDate);
    // Simple date comparison
    return jobDate.getDate() === selectedDate.getDate() &&
      jobDate.getMonth() === selectedDate.getMonth() &&
      jobDate.getFullYear() === selectedDate.getFullYear();
  });

  const totalJobs = jobs.length;

  // Count completed jobs (either from storage or default status)
  const completedJobs = jobs.filter((job: any) => {
    const currentStatus = jobStatuses[job.id] || job.status;
    return currentStatus === 'completed';
  }).length;

  // Calculate earnings (sum of price strings like "€85")
  const dailyEarnings = jobs.reduce((sum: number, job: any) => {
    if (!job.bidAmount) return sum; // Data uses bidAmount, not price
    // Extract number from "€85", "€120", etc.
    const priceValue = parseInt(job.bidAmount.replace(/[^0-9]/g, ''), 10);
    return sum + (isNaN(priceValue) ? 0 : priceValue);
  }, 0);

  // Calculate total duration (in minutes)
  // Demo data uses estimatedDuration string "2 hours", need to parse or fallback
  // For simplicity, let's assume 2 hours avg if parsing fails or use a random number for demo
  const totalMinutes = jobs.reduce((sum: number, job: any) => {
    // Simple parsing of "X hours"
    const hoursMatch = job.estimatedDuration?.match(/(\d+(\.\d+)?)/);
    const hours = hoursMatch ? parseFloat(hoursMatch[0]) : 1.5;
    return sum + (hours * 60);
  }, 0);
  const totalDuration = formatDuration(totalMinutes);

  // Calculate travel time - placeholder as demo data doesn't have travel info yet
  // We'll estimate 15 mins per job
  const travelMinutes = jobs.length * 15;
  const travelTime = formatDuration(travelMinutes);

  // Load persisted state on mount
  useEffect(() => {
    loadPersistedState();
  }, []);

  const loadPersistedState = async () => {
    const dayStarted = await dayStateStorage.getDayStarted();
    const dayEnded = await dayStateStorage.getDayEnded();
    const statuses = await jobStatusStorage.load();
    const notes = await freeTimeNotesStorage.load();

    setIsDayStarted(dayStarted);
    setIsDayEnded(dayEnded);
    setJobStatuses(statuses);
    setFreeTimeNotes(notes);
  };

  const handleStartDay = () => {
    Haptics.success();
    setIsDayStarted(true);
    dayStateStorage.setDayStarted(true);
    dayStateStorage.setDayStartTime(new Date());
  };

  const handleEndDay = (ended: boolean) => {
    Haptics.heavy();
    setIsDayEnded(ended);
    dayStateStorage.setDayEnded(ended);
  };

  const handleJobStatusChange = async (jobId: string, newStatus: string) => {
    Haptics.medium();
    const updatedStatuses = { ...jobStatuses, [jobId]: newStatus };
    setJobStatuses(updatedStatuses);
    jobStatusStorage.updateStatus(jobId, newStatus);
    try {
      await jobsAPI.update(jobId, { exec_status: newStatus });
    } catch (err) {
      console.error('ScheduleScreen: failed to update job status', err);
    }
  };

  const handleJobReschedule = async (jobId: string, newTime: string) => {
    try {
      const job = allJobs.find(j => j.id === jobId);
      if (!job || !job.scheduledDate) return;
      const date = new Date(job.scheduledDate);
      const [timePart, period] = newTime.split(' ');
      const [hoursStr, minutesStr] = timePart.split(':');
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      date.setHours(hours, minutes, 0, 0);
      await jobsAPI.update(jobId, { scheduled_at: date.toISOString() } as any);
      loadJobs();
    } catch (err) {
      console.error('ScheduleScreen: failed to reschedule job', err);
    }
  };

  const handleFreeTimeNoteAdd = (timeSlot: string, note: FreeTimeNote) => {
    Haptics.light();
    const updatedNotes = { ...freeTimeNotes, [timeSlot]: note };
    setFreeTimeNotes(updatedNotes);
    freeTimeNotesStorage.addNote(timeSlot, note);
  };

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const formatDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const handleJobPress = (job: any) => {
    const fullJob = allJobs.find(j => j.id === job.id) || job;
    setSelectedJob(fullJob);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar hidden={true} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.screenTitle}>Schedule</Text>
          <View style={styles.headerActions}>
            {/* Day Timer */}
            <DayTimer isRunning={isDayStarted && !isDayEnded} />

            {/* Add Job Button */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setAddJobModalVisible(true)}
            >
              <Icon name="plus" size={24} color="#e2e8f0" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton}>
              <Icon name="magnify" size={24} color="#e2e8f0" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setModalVisible(true)}
            >
              <Icon name="tune-variant" size={24} color="#e2e8f0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Navigator - Only show if not in map view (Map has its own strip) */}
        {viewMode !== 'map' && (
          <View style={styles.dateNav}>
            <TouchableOpacity onPress={handlePrevDay} style={styles.navButton}>
              <Icon name="chevron-left" size={28} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.dateDisplay}>
              <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
              {!isToday(selectedDate) && (
                <TouchableOpacity onPress={() => setSelectedDate(new Date())}>
                  <Text style={styles.todayLink}>Go to Today</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={handleNextDay} style={styles.navButton}>
              <Icon name="chevron-right" size={28} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Day Stats Dropdown removed per user request */}
      {/* (Day view content starts here) */}

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {viewMode === 'map' ? (
          <StaticMapView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        ) : (
          <LinearTimeCalendar
            selectedDate={selectedDate}
            jobs={allJobs}
            onJobPress={handleJobPress}
            isDayStarted={isDayStarted}
            isDayEnded={isDayEnded}
            onStartDay={handleStartDay}
            onEndDay={handleEndDay}
            jobStatuses={jobStatuses}
            onJobStatusChange={handleJobStatusChange}
            freeTimeNotes={freeTimeNotes}
            onFreeTimeNoteAdd={handleFreeTimeNoteAdd}
            onJobReschedule={handleJobReschedule}
          />
        )}
      </View>

      {/* Floating Toggle Buttons */}
      <View style={styles.floatingContainer}>
        <TouchableOpacity
          style={[styles.fab, viewMode !== 'map' && styles.fabActive]}
          onPress={() => setViewMode('day')}
        >
          <Icon name="calendar-month" size={24} color={viewMode !== 'map' ? '#fff' : '#94a3b8'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, viewMode === 'map' && styles.fabActive]}
          onPress={() => setViewMode('map')}
        >
          <Icon name="map-marker-outline" size={24} color={viewMode === 'map' ? '#fff' : '#94a3b8'} />
        </TouchableOpacity>
      </View>

      {/* View Options Modal */}
      <CalendarViewOptionsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        currentView={viewMode}
        onViewChange={setViewMode}
      />

      <AddJobModal
        visible={addJobModalVisible}
        onClose={() => setAddJobModalVisible(false)}
        onAddJob={handleAddJob}
        selectedDate={selectedDate}
      />

      {selectedJob && (
        <JobDetailModal
          visible={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          job={selectedJob}
          onStatusChange={(id, status) => {
            handleJobStatusChange(id, status);
            setSelectedJob(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Slate 900
  },
  header: {
    backgroundColor: '#1e293b', // Slate 800
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 0, // Reduced margin since dateNav is conditional
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafb', // Light text
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
  dateNav: {
    marginTop: 16, // Add margin only when visible
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  navButton: {
    padding: 8,
  },
  dateDisplay: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  todayLink: {
    fontSize: 12,
    color: '#3b82f6', // Blue
    marginTop: 4,
    fontWeight: '500',
  },
  floatingContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#1e293b',
    borderRadius: 30, // Pill shape
    flexDirection: 'column',
    padding: 4,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabActive: {
    backgroundColor: '#f97316', // Orange active
  },
});
