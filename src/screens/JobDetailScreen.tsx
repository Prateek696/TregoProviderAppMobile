/**
 * Job Detail Screen
 * Migrated from web app's JobDetailModal
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
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

type JobDetailScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'JobDetail'>;

export default function JobDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation<JobDetailScreenNavigationProp>();
  const { jobId } = (route.params as { jobId: string }) || {};
  const [job, setJob] = useState<Job | null>(null);
  const [orbColor, setOrbColor] = useState('#1E6FF7');
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  useEffect(() => {
    loadSettings();
    loadJob();
  }, [jobId]);

  const loadSettings = async () => {
    try {
      const color = await jsonStorage.getItem(STORAGE_KEYS.ORB_COLOR);
      if (color) setOrbColor(color);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadJob = async () => {
    try {
      // In real app, load from AsyncStorage or API
      // For now, use mock data
      const storedJobs = await jsonStorage.getItem<Job[]>(STORAGE_KEYS.JOBS);
      if (storedJobs) {
        const foundJob = storedJobs.find(j => j.id === jobId);
        if (foundJob) {
          setJob(foundJob);
          return;
        }
      }
      // Fallback to mock
      const mockJob: Job = {
        id: jobId,
        title: 'Kitchen Faucet Repair',
        description: 'Leaky faucet needs replacement. Client reports water leaking from base.',
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
        phoneNumber: '+351 912 345 678',
      };
      setJob(mockJob);
    } catch (error) {
      console.error('Error loading job:', error);
    }
  };

  if (!job) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      </View>
    );
  }

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

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: orbColor + '10' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        {/* Job Header Card */}
        <Card style={styles.headerCard}>
          <CardContent>
            <View style={styles.jobHeader}>
              <View style={styles.jobHeaderLeft}>
                <Badge variant="secondary" style={styles.categoryBadge}>
                  {job.category}
                </Badge>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Badge
                  variant="outline"
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: getStatusBgColor(job.status),
                      borderColor: getStatusColor(job.status),
                    },
                  ]}>
                  <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                    {job.status.replace('-', ' ').toUpperCase()}
                  </Text>
                </Badge>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <Text style={styles.description}>{job.description || 'No description provided'}</Text>
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Client:</Text>
              <Text style={styles.infoValue}>
                {job.client} {job.clientRating ? `⭐ ${job.clientRating.toFixed(1)}` : ''}
              </Text>
            </View>
            {job.phoneNumber && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <TouchableOpacity>
                  <Text style={[styles.infoValue, { color: orbColor }]}>
                    {job.phoneNumber}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent>
            {job.scheduledDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Scheduled:</Text>
                <Text style={styles.infoValue}>
                  {formatScheduleDate(new Date(job.scheduledDate))} at {job.scheduledTime}
                </Text>
              </View>
            )}
            {job.estimatedDuration && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Duration:</Text>
                <Text style={styles.infoValue}>{job.estimatedDuration}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{job.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address:</Text>
              <Text style={styles.infoValue}>{job.address}</Text>
            </View>
            {(job.bidAmount || job.actualPrice || job.estimatedPrice) && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Price:</Text>
                <Text style={styles.infoValue}>
                  {job.bidAmount || job.actualPrice || job.estimatedPrice}
                </Text>
              </View>
            )}
          </CardContent>
        </Card>

        {/* Cancellation Reason */}
        {job.status === 'cancelled' && job.cancellationReason && (
          <Card style={styles.cancellationCard}>
            <CardContent>
              <Text style={styles.cancellationTitle}>Cancellation Reason</Text>
              <Text style={styles.cancellationText}>{job.cancellationReason}</Text>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {job.status === 'pending' && (
            <>
              <Button
                title="Chat with Client"
                variant="outline"
                onPress={() => {
                  // TODO: Navigate to chat
                }}
                style={styles.actionButton}
              />
              <Button
                title="Schedule"
                variant="outline"
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
              onPress={async () => {
                const result = await startJob(job.id);
                if (result.success) {
                  await loadJob();
                }
              }}
              style={[styles.actionButton, { backgroundColor: orbColor }]}
            />
          )}
          {job.status === 'en-route' && (
            <Button
              title="Mark On Site"
              onPress={async () => {
                const result = await markOnSite(job.id);
                if (result.success) {
                  await loadJob();
                }
              }}
              style={[styles.actionButton, { backgroundColor: '#10b981' }]}
            />
          )}
          {job.status === 'on-site' && (
            <>
              <Button
                title="Pause Job"
                variant="outline"
                onPress={() => setShowPauseModal(true)}
                style={styles.actionButton}
              />
              <Button
                title="Add Expense"
                variant="outline"
                onPress={() => {
                  // TODO: Navigate to add expense
                }}
                style={styles.actionButton}
              />
              <Button
                title="Complete Job"
                onPress={() => setShowCompleteModal(true)}
                style={[styles.actionButton, { backgroundColor: '#10b981' }]}
              />
            </>
          )}
          {job.status === 'paused' && (
            <Button
              title="Resume Job"
              onPress={async () => {
                const result = await resumeJob(job.id);
                if (result.success) {
                  await loadJob();
                }
              }}
              style={[styles.actionButton, { backgroundColor: '#fbbf24' }]}
            />
          )}
          {job.status === 'completed' && (
            <>
              <Button
                title="Add Expense"
                variant="outline"
                onPress={() => {
                  // TODO: Navigate to add expense
                }}
                style={styles.actionButton}
              />
              <Button
                title="Create Invoice"
                onPress={() => {
                  // TODO: Navigate to create invoice
                }}
                style={[styles.actionButton, { backgroundColor: orbColor }]}
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <PauseJobModal
        visible={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        onConfirm={async (reason) => {
          if (job) {
            const result = await pauseJob(job.id, reason);
            if (result.success) {
              await loadJob();
            }
          }
          setShowPauseModal(false);
        }}
        jobTitle={job?.title}
      />

      <CancelJobModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={async (reason) => {
          if (job) {
            const result = await cancelJob(job.id, reason);
            if (result.success) {
              await loadJob();
            }
          }
          setShowCancelModal(false);
        }}
        jobTitle={job?.title}
      />

      <CompleteJobModal
        visible={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        onConfirm={async (finalPrice) => {
          if (job) {
            const result = await completeJob(job.id, finalPrice);
            if (result.success) {
              await loadJob();
            }
          }
          setShowCompleteModal(false);
        }}
        jobTitle={job?.title}
        estimatedPrice={job?.bidAmount || job?.estimatedPrice}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    fontSize: 16,
    color: Colors.foreground,
    width: 60,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  headerCard: {
    marginBottom: 0,
  },
  jobHeader: {
    gap: 12,
  },
  jobHeaderLeft: {
    gap: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.mutedForeground,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.foreground,
    flex: 2,
    textAlign: 'right',
  },
  cancellationCard: {
    backgroundColor: Colors.statusCancelledBg,
    borderColor: Colors.statusCancelledText,
  },
  cancellationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.statusCancelledText,
    marginBottom: 8,
  },
  cancellationText: {
    fontSize: 14,
    color: Colors.statusCancelledText,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  actionButton: {
    marginBottom: 0,
  },
});
