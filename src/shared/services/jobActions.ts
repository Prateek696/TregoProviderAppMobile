/**
 * Job Actions Service
 * Handles all job-related actions (start, complete, pause, cancel, etc.)
 */

import { Job, JobStatus } from '../types/job';
import { jsonStorage, STORAGE_KEYS } from '../storage';

export interface JobActionResult {
  success: boolean;
  message: string;
  updatedJob?: Job;
}

/**
 * Update job status in storage
 */
const updateJobInStorage = async (jobId: string, updates: Partial<Job>): Promise<Job | null> => {
  try {
    const jobs = await jsonStorage.getItem<Job[]>(STORAGE_KEYS.JOBS) || [];
    const jobIndex = jobs.findIndex(j => j.id === jobId);
    
    if (jobIndex === -1) {
      return null;
    }

    const updatedJob = {
      ...jobs[jobIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    jobs[jobIndex] = updatedJob;
    await jsonStorage.setItem(STORAGE_KEYS.JOBS, jobs);
    
    return updatedJob;
  } catch (error) {
    console.error('Error updating job in storage:', error);
    return null;
  }
};

/**
 * Start a job (confirmed -> en-route or on-site)
 */
export const startJob = async (jobId: string): Promise<JobActionResult> => {
  try {
    const updatedJob = await updateJobInStorage(jobId, {
      status: 'en-route',
      startedAt: new Date().toISOString(),
    });

    if (!updatedJob) {
      return {
        success: false,
        message: 'Job not found',
      };
    }

    return {
      success: true,
      message: 'Job started successfully',
      updatedJob,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to start job',
    };
  }
};

/**
 * Mark job as on-site (en-route -> on-site)
 */
export const markOnSite = async (jobId: string): Promise<JobActionResult> => {
  try {
    const updatedJob = await updateJobInStorage(jobId, {
      status: 'on-site',
      onSiteAt: new Date().toISOString(),
    });

    if (!updatedJob) {
      return {
        success: false,
        message: 'Job not found',
      };
    }

    return {
      success: true,
      message: 'Job marked as on-site',
      updatedJob,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to update job status',
    };
  }
};

/**
 * Pause a job (on-site -> paused)
 */
export const pauseJob = async (jobId: string, reason?: string): Promise<JobActionResult> => {
  try {
    const jobs = await jsonStorage.getItem<Job[]>(STORAGE_KEYS.JOBS) || [];
    const job = jobs.find(j => j.id === jobId);

    if (!job) {
      return {
        success: false,
        message: 'Job not found',
      };
    }

    const updatedJob = await updateJobInStorage(jobId, {
      status: 'paused',
      previousStatus: job.status,
      pausedAt: new Date().toISOString(),
      pauseReason: reason,
    });

    return {
      success: true,
      message: 'Job paused',
      updatedJob,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to pause job',
    };
  }
};

/**
 * Resume a paused job (paused -> on-site)
 */
export const resumeJob = async (jobId: string): Promise<JobActionResult> => {
  try {
    const jobs = await jsonStorage.getItem<Job[]>(STORAGE_KEYS.JOBS) || [];
    const job = jobs.find(j => j.id === jobId);

    if (!job) {
      return {
        success: false,
        message: 'Job not found',
      };
    }

    const previousStatus = job.previousStatus || 'on-site';
    const updatedJob = await updateJobInStorage(jobId, {
      status: previousStatus as JobStatus,
      previousStatus: undefined,
      pausedAt: undefined,
      pauseReason: undefined,
      resumedAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Job resumed',
      updatedJob,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to resume job',
    };
  }
};

/**
 * Complete a job (on-site/en-route -> completed)
 */
export const completeJob = async (jobId: string, finalPrice?: string): Promise<JobActionResult> => {
  try {
    const updates: Partial<Job> = {
      status: 'completed',
      completedAt: new Date().toISOString(),
    };

    if (finalPrice) {
      updates.actualPrice = finalPrice;
    }

    const updatedJob = await updateJobInStorage(jobId, updates);

    if (!updatedJob) {
      return {
        success: false,
        message: 'Job not found',
      };
    }

    return {
      success: true,
      message: 'Job completed successfully',
      updatedJob,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to complete job',
    };
  }
};

/**
 * Cancel a job (any status -> cancelled)
 */
export const cancelJob = async (jobId: string, reason: string): Promise<JobActionResult> => {
  try {
    const updatedJob = await updateJobInStorage(jobId, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancellationReason: reason,
    });

    if (!updatedJob) {
      return {
        success: false,
        message: 'Job not found',
      };
    }

    return {
      success: true,
      message: 'Job cancelled',
      updatedJob,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to cancel job',
    };
  }
};

/**
 * Reschedule a job
 */
export const rescheduleJob = async (
  jobId: string,
  newDate: string,
  newTime: string
): Promise<JobActionResult> => {
  try {
    const updatedJob = await updateJobInStorage(jobId, {
      scheduledDate: newDate,
      scheduledTime: newTime,
      recentlyRescheduled: true,
      rescheduledAt: new Date().toISOString(),
    });

    if (!updatedJob) {
      return {
        success: false,
        message: 'Job not found',
      };
    }

    return {
      success: true,
      message: 'Job rescheduled successfully',
      updatedJob,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to reschedule job',
    };
  }
};

/**
 * Get job by ID
 */
export const getJobById = async (jobId: string): Promise<Job | null> => {
  try {
    const jobs = await jsonStorage.getItem<Job[]>(STORAGE_KEYS.JOBS) || [];
    return jobs.find(j => j.id === jobId) || null;
  } catch (error) {
    console.error('Error getting job:', error);
    return null;
  }
};

/**
 * Get all jobs
 */
export const getAllJobs = async (): Promise<Job[]> => {
  try {
    return await jsonStorage.getItem<Job[]>(STORAGE_KEYS.JOBS) || [];
  } catch (error) {
    console.error('Error getting jobs:', error);
    return [];
  }
};

