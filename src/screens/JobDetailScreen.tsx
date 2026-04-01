/**
 * Job Detail Screen
 * Migrated from web app's JobDetailModal
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { Alert } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
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
  mapBackendJob,
} from '../services/jobActions';
import { jobsAPI } from '../services/api';
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  // Reload job whenever screen is focused (e.g. returning from JobEdit)
  useFocusEffect(
    useCallback(() => {
      loadJob();
    }, [jobId])
  );

  const loadSettings = async () => {
    try {
      const color = await jsonStorage.getItem(STORAGE_KEYS.ORB_COLOR);
      if (color) setOrbColor(color as string);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleAddPhoto = () => {
    Alert.alert('Add Photo', 'Choose source', [
      {
        text: 'Camera',
        onPress: () => launchCamera({ mediaType: 'photo', quality: 0.8 }, async (res) => {
          if (res.assets?.[0]?.uri) {
            await uploadPhoto(res.assets[0].uri);
          }
        }),
      },
      {
        text: 'Gallery',
        onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async (res) => {
          if (res.assets?.[0]?.uri) {
            await uploadPhoto(res.assets[0].uri);
          }
        }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadPhoto = async (uri: string) => {
    if (!job) return;
    setUploadingPhoto(true);
    try {
      await jobsAPI.uploadPhoto(job.id, uri);
      await loadJob();
    } catch (err) {
      Alert.alert('Upload Failed', 'Could not upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const loadJob = async () => {
    try {
      const res = await jobsAPI.get(jobId);
      setJob(mapBackendJob(res.data.job) as Job);
    } catch (error) {
      console.error('Error loading job:', error);
    }
  };

  if (!job) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="chevron-left" size={24} color={Colors.foreground} />
            <Text style={styles.backButtonText}>Back</Text>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={24} color={Colors.foreground} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        {job.status !== 'completed' && job.status !== 'cancelled' ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('JobEdit', { jobId: job.id })}
            style={styles.editButton}>
            <Icon name="pencil-outline" size={18} color={orbColor} />
            <Text style={[styles.editButtonText, { color: orbColor }]}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
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
                  ] as any}>
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
                {job.client} {job.clientRating ? <><Icon name="star" size={14} color="#fbbf24" /> {job.clientRating.toFixed(1)}</> : ''}
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
                title={uploadingPhoto ? 'Uploading...' : 'Add Photo'}
                variant="outline"
                onPress={handleAddPhoto}
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
                onPress={async () => {
                  try {
                    await jobsAPI.bill(job.id);
                    Alert.alert('Invoice Created', 'Moloni invoice issued successfully.');
                    await loadJob();
                  } catch (err: any) {
                    Alert.alert('Invoice Failed', err?.message || 'Could not create invoice.');
                  }
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
        onConfirm={async ({ finalPrice, paymentReceived, cashAmount }) => {
          if (job) {
            const result = await completeJob(job.id, finalPrice, paymentReceived, cashAmount);
            if (result.success) {
              await loadJob();
            }
          }
          setShowCompleteModal(false);
        }}
        jobTitle={job?.title}
        estimatedPrice={(job?.bidAmount || job?.estimatedPrice) as string}
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
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.foreground,
    marginLeft: -4,
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 60,
    justifyContent: 'flex-end',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
