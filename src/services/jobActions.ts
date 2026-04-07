/**
 * Job Actions — real API calls replacing AsyncStorage-only version
 */

import { jobsAPI, getAPIError } from './api';
import { Job } from '../shared/types/job';

export interface JobActionResult {
  success: boolean;
  message: string;
  updatedJob?: Job;
}

// Map backend job fields to mobile Job type
export function mapBackendJob(j: any): Job {
  return {
    id: j.id,
    title: j.title || j.service || 'Job',
    description: j.description || j.raw_text || '',
    client: j.client_name || '',
    clientNif: j.client_nif || undefined,
    clientEmail: j.client_email || undefined,
    phoneNumber: j.client_phone || undefined,
    location: j.location || '',
    address: j.address || '',
    bidAmount: j.bid_amount ? `€${j.bid_amount}` : undefined,
    actualPrice: j.actual_price ? `€${j.actual_price}` : undefined,
    estimatedPrice: j.price ? `€${j.price}` : null,
    scheduledTime: j.scheduled_at
      ? new Date(j.scheduled_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
      : 'TBD',
    scheduledDate: j.scheduled_at || null,
    status: (j.exec_status as Job['status']) || 'pending',
    priority: (j.priority as Job['priority']) || 'normal',
    category: j.category || j.service || 'General',
    notes: j.notes || undefined,
    completedAt: j.completed_at || undefined,
    cancelledAt: j.cancelled_at || undefined,
    cancellationReason: j.cancellation_reason || undefined,
    pausedAt: j.paused_at || undefined,
    // Extra backend fields
    aiStatus: j.status,
    aiConfidence: j.ai_confidence,
    recurringFlag: j.recurring_flag,
    recurringNote: j.recurring_note,
    photoUrl: j.photo_url,
    rawText: j.raw_text,
    estimatedDurationMinutes: j.estimated_duration_minutes ?? 60,
    autoScheduled: j.auto_scheduled ?? false,
    scheduleMessage: j.schedule_message || undefined,
  };
}

export const startJob = async (jobId: string): Promise<JobActionResult> => {
  try {
    const res = await jobsAPI.update(jobId, { exec_status: 'en-route' });
    return { success: true, message: 'Job started', updatedJob: mapBackendJob(res.data.job) };
  } catch (err) {
    return { success: false, message: getAPIError(err) };
  }
};

export const markOnSite = async (jobId: string): Promise<JobActionResult> => {
  try {
    const res = await jobsAPI.update(jobId, { exec_status: 'on-site' });
    return { success: true, message: 'Marked on-site', updatedJob: mapBackendJob(res.data.job) };
  } catch (err) {
    return { success: false, message: getAPIError(err) };
  }
};

export const pauseJob = async (jobId: string, reason?: string): Promise<JobActionResult> => {
  try {
    const res = await jobsAPI.update(jobId, { exec_status: 'paused', notes: reason });
    return { success: true, message: 'Job paused', updatedJob: mapBackendJob(res.data.job) };
  } catch (err) {
    return { success: false, message: getAPIError(err) };
  }
};

export const resumeJob = async (jobId: string): Promise<JobActionResult> => {
  try {
    const res = await jobsAPI.update(jobId, { exec_status: 'on-site' });
    return { success: true, message: 'Job resumed', updatedJob: mapBackendJob(res.data.job) };
  } catch (err) {
    return { success: false, message: getAPIError(err) };
  }
};

export const completeJob = async (
  jobId: string,
  finalPrice?: string,
  paymentReceived?: boolean,
  cashAmount?: string,
): Promise<JobActionResult> => {
  try {
    const updates: any = { exec_status: 'completed' };
    if (finalPrice) {
      const num = parseFloat(finalPrice.replace(/[€,]/g, ''));
      if (!isNaN(num)) updates.actual_price = num;
    }
    if (paymentReceived) {
      updates.payment_received = true;
      if (cashAmount) {
        const num = parseFloat(cashAmount.replace(/[€,]/g, ''));
        if (!isNaN(num)) {
          updates.cash_amount = num;
          // If no explicit final price was given, use cash amount as actual price
          if (!updates.actual_price) updates.actual_price = num;
        }
      }
    }
    const res = await jobsAPI.update(jobId, updates);
    return { success: true, message: 'Job completed', updatedJob: mapBackendJob(res.data.job) };
  } catch (err) {
    return { success: false, message: getAPIError(err) };
  }
};

export const cancelJob = async (jobId: string, reason: string): Promise<JobActionResult> => {
  try {
    const res = await jobsAPI.update(jobId, { exec_status: 'cancelled', cancellation_reason: reason });
    return { success: true, message: 'Job cancelled', updatedJob: mapBackendJob(res.data.job) };
  } catch (err) {
    return { success: false, message: getAPIError(err) };
  }
};
