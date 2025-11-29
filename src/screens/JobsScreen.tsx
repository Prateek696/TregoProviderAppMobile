/**
 * Jobs List Screen
 * Migrated from web app's ProviderJobsScreenRedesigned
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Colors } from '../shared/constants/colors';
import { Job, JobStatus } from '../shared/types/job';
import { formatScheduleDate } from '../shared/utils/dateUtils';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';
import {
  startJob,
  markOnSite,
  pauseJob,
  resumeJob,
  completeJob,
  cancelJob,
} from '../shared/services/jobActions';
import { PauseJobModal, CancelJobModal, CompleteJobModal } from '../components/modals';

type JobsScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'JobsList'>;

type FilterType = 'all' | 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';

// Mock jobs data - in real app, load from AsyncStorage or API
const MOCK_JOBS: Job[] = [
  {
    id: '1',
    title: 'Kitchen Faucet Repair',
    description: 'Leaky faucet needs replacement',
    client: 'Ana Silva',
    clientRating: 4.8,
    location: '1.2 km away',
    address: 'Rua das Flores, 45, Lisboa',
    bidAmount: '€180',
    scheduledTime: '10:00 AM',
    scheduledDate: new Date().toISOString(),
    estimatedDuration: '2 hours',
    status: 'confirmed',
    priority: 'normal',
    category: 'Plumbing',
    jobType: 'fixed',
  },
  {
    id: '2',
    title: 'Bathroom Renovation',
    description: 'Complete bathroom renovation including tiling and fixtures',
    client: 'João Santos',
    clientRating: 4.9,
    location: '3.5 km away',
    address: 'Avenida da Liberdade, 100, Lisboa',
    bidAmount: '€2,500',
    scheduledTime: '9:00 AM',
    scheduledDate: new Date(Date.now() + 86400000).toISOString(),
    estimatedDuration: '2 days',
    status: 'pending',
    priority: 'high',
    category: 'Renovation',
    jobType: 'bid',
  },
  {
    id: '3',
    title: 'Electrical Panel Upgrade',
    description: 'Upgrade electrical panel to support new appliances',
    client: 'Maria Costa',
    clientRating: 5.0,
    location: '2.1 km away',
    address: 'Rua do Comércio, 78, Porto',
    bidAmount: '€450',
    scheduledTime: '2:00 PM',
    scheduledDate: new Date().toISOString(),
    estimatedDuration: '4 hours',
    status: 'on-site',
    priority: 'urgent',
    category: 'Electrical',
    jobType: 'fixed',
  },
  {
    id: '4',
    title: 'Drain Cleaning',
    description: 'Clogged kitchen drain needs professional cleaning',
    client: 'Carlos Mendes',
    clientRating: 4.7,
    location: '5.0 km away',
    address: 'Rua da Paz, 123, Lisboa',
    bidAmount: '€95',
    scheduledTime: '11:00 AM',
    scheduledDate: new Date(Date.now() - 86400000).toISOString(),
    estimatedDuration: '1 hour',
    status: 'completed',
    priority: 'normal',
    category: 'Plumbing',
    jobType: 'fixed',
  },
];

export default function JobsScreen() {
  const navigation = useNavigation<JobsScreenNavigationProp>();
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orbColor, setOrbColor] = useState('#1E6FF7');
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    loadSettings();
    loadJobs();
  }, []);

  const loadSettings = async () => {
    try {
      const color = await jsonStorage.getItem(STORAGE_KEYS.ORB_COLOR);
      if (color) setOrbColor(color);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadJobs = async () => {
    try {
      const storedJobs = await jsonStorage.getItem<Job[]>(STORAGE_KEYS.JOBS);
      if (storedJobs && storedJobs.length > 0) {
        setJobs(storedJobs);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Status filter
      if (filter !== 'all' && job.status !== filter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          job.title.toLowerCase().includes(query) ||
          job.client.toLowerCase().includes(query) ||
          job.category.toLowerCase().includes(query) ||
          job.address.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [jobs, filter, searchQuery]);

  const getStatusColor = (status: JobStatus): string => {
    switch (status) {
      case 'pending':
        return Colors.statusPendingText;
      case 'confirmed':
        return Colors.statusConfirmedText;
      case 'en-route':
        return Colors.statusEnRouteText;
      case 'on-site':
        return Colors.statusOnSiteText;
      case 'paused':
        return Colors.statusPausedText;
      case 'completed':
        return Colors.statusCompletedText;
      case 'cancelled':
        return Colors.statusCancelledText;
      default:
        return Colors.mutedForeground;
    }
  };

  const getStatusBgColor = (status: JobStatus): string => {
    switch (status) {
      case 'pending':
        return Colors.statusPendingBg;
      case 'confirmed':
        return Colors.statusConfirmedBg;
      case 'en-route':
        return Colors.statusEnRouteBg;
      case 'on-site':
        return Colors.statusOnSiteBg;
      case 'paused':
        return Colors.statusPausedBg;
      case 'completed':
        return Colors.statusCompletedBg;
      case 'cancelled':
        return Colors.statusCancelledBg;
      default:
        return Colors.muted;
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#fbbf24';
      case 'low':
        return '#10b981';
      default:
        return Colors.mutedForeground;
    }
  };

  const renderJobCard = (job: Job) => {
    const statusColor = getStatusColor(job.status);
    const statusBgColor = getStatusBgColor(job.status);
    const priorityColor = getPriorityColor(job.priority);

    return (
      <TouchableOpacity
        key={job.id}
        onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}>
        <Card style={styles.jobCard}>
          <CardContent style={styles.jobCardContent}>
            {/* Header */}
            <View style={styles.jobHeader}>
              <View style={styles.jobHeaderLeft}>
                <Badge variant="secondary" style={styles.categoryBadge}>
                  {job.category}
                </Badge>
                <Text style={styles.jobTitle} numberOfLines={2}>
                  {job.title}
                </Text>
              </View>
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: priorityColor },
                ]}
              />
            </View>

            {/* Status and Client */}
            <View style={styles.jobMeta}>
              <Badge
                variant="outline"
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusBgColor,
                    borderColor: statusColor,
                  },
                ]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {job.status.replace('-', ' ').toUpperCase()}
                </Text>
              </Badge>
              <Text style={styles.clientText}>
                {job.client} {job.clientRating ? `⭐ ${job.clientRating.toFixed(1)}` : ''}
              </Text>
            </View>

            {/* Details */}
            <View style={styles.jobDetails}>
              {job.scheduledDate && (
                <View style={styles.jobDetailRow}>
                  <Text style={styles.jobDetailIcon}>🕐</Text>
                  <Text style={styles.jobDetailText}>
                    {formatScheduleDate(new Date(job.scheduledDate))} • {job.scheduledTime}
                    {job.estimatedDuration && ` • ${job.estimatedDuration}`}
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
                    {job.status === 'pending' && job.jobType === 'bid' && 'Your Bid: '}
                    {job.status === 'confirmed' && 'Confirmed: '}
                    {job.bidAmount || job.actualPrice || job.estimatedPrice}
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.jobActions}>
              {job.status === 'pending' && (
                <>
                  <Button
                    title="Chat"
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      // TODO: Navigate to chat
                    }}
                    style={styles.actionButton}
                  />
                  <Button
                    title="Schedule"
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      // TODO: Navigate to schedule
                    }}
                    style={styles.actionButton}
                  />
                </>
              )}
              {job.status === 'confirmed' && (
                <Button
                  title="Start Job"
                  size="sm"
                  onPress={async () => {
                    const result = await startJob(job.id);
                    if (result.success) {
                      await loadJobs();
                    }
                  }}
                  style={[styles.actionButton, { backgroundColor: orbColor }]}
                />
              )}
              {job.status === 'en-route' && (
                <Button
                  title="Mark On Site"
                  size="sm"
                  onPress={async () => {
                    const result = await markOnSite(job.id);
                    if (result.success) {
                      await loadJobs();
                    }
                  }}
                  style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                />
              )}
              {job.status === 'on-site' && (
                <>
                  <Button
                    title="Pause"
                    size="sm"
                    variant="outline"
                    onPress={() => {
                      setSelectedJob(job);
                      setShowPauseModal(true);
                    }}
                    style={styles.actionButton}
                  />
                  <Button
                    title="Complete"
                    size="sm"
                    onPress={() => {
                      setSelectedJob(job);
                      setShowCompleteModal(true);
                    }}
                    style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                  />
                </>
              )}
              {job.status === 'paused' && (
                <Button
                  title="Resume"
                  size="sm"
                  onPress={async () => {
                    const result = await resumeJob(job.id);
                    if (result.success) {
                      await loadJobs();
                    }
                  }}
                  style={[styles.actionButton, { backgroundColor: '#fbbf24' }]}
                />
              )}
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  };

  const filters: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'In Progress', value: 'in-progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <View style={styles.screen}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.mutedForeground}
        />
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}>
        {filters.map(filterOption => (
          <TouchableOpacity
            key={filterOption.value}
            style={[
              styles.filterButton,
              filter === filterOption.value && {
                backgroundColor: orbColor,
                borderColor: orbColor,
              },
            ]}
            onPress={() => setFilter(filterOption.value)}>
            <Text
              style={[
                styles.filterText,
                filter === filterOption.value && { color: Colors.primaryForeground },
              ]}>
              {filterOption.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Jobs List */}
      <ScrollView
        style={styles.jobsList}
        contentContainerStyle={styles.jobsListContent}>
        {filteredJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💼</Text>
            <Text style={styles.emptyStateText}>No jobs found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery
                ? 'Try adjusting your search'
                : 'Jobs will appear here when available'}
            </Text>
          </View>
        ) : (
          filteredJobs.map(job => renderJobCard(job))
        )}
      </ScrollView>

      {/* Modals */}
      <PauseJobModal
        visible={showPauseModal}
        onClose={() => {
          setShowPauseModal(false);
          setSelectedJob(null);
        }}
        onConfirm={async (reason) => {
          if (selectedJob) {
            const result = await pauseJob(selectedJob.id, reason);
            if (result.success) {
              await loadJobs();
            }
          }
          setShowPauseModal(false);
          setSelectedJob(null);
        }}
        jobTitle={selectedJob?.title}
      />

      <CancelJobModal
        visible={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedJob(null);
        }}
        onConfirm={async (reason) => {
          if (selectedJob) {
            const result = await cancelJob(selectedJob.id, reason);
            if (result.success) {
              await loadJobs();
            }
          }
          setShowCancelModal(false);
          setSelectedJob(null);
        }}
        jobTitle={selectedJob?.title}
      />

      <CompleteJobModal
        visible={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false);
          setSelectedJob(null);
        }}
        onConfirm={async (finalPrice) => {
          if (selectedJob) {
            const result = await completeJob(selectedJob.id, finalPrice);
            if (result.success) {
              await loadJobs();
            }
          }
          setShowCompleteModal(false);
          setSelectedJob(null);
        }}
        jobTitle={selectedJob?.title}
        estimatedPrice={selectedJob?.bidAmount || selectedJob?.estimatedPrice}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    height: 40,
    backgroundColor: Colors.inputBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.foreground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filtersContainer: {
    maxHeight: 50,
    marginBottom: 8,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.foreground,
  },
  jobsList: {
    flex: 1,
  },
  jobsListContent: {
    padding: 16,
    gap: 12,
  },
  jobCard: {
    marginBottom: 0,
  },
  jobCardContent: {
    padding: 16,
    gap: 12,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jobHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    marginTop: 4,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  clientText: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  jobDetails: {
    gap: 8,
    marginTop: 4,
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
    flex: 1,
    fontSize: 12,
    color: Colors.foreground,
  },
  jobActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    marginBottom: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
});
