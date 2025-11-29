/**
 * Job Types
 * Extracted from web app - React Native compatible
 */

export type JobStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'en-route' 
  | 'on-site' 
  | 'paused' 
  | 'delayed' 
  | 'completed' 
  | 'cancelled';

export type JobPriority = 'low' | 'medium' | 'high' | 'urgent' | 'normal';

export type JobType = 'fixed' | 'bid';

export interface Job {
  id: string;
  title: string;
  description: string;
  client: string;
  clientRating?: number;
  clientNif?: string;
  avatar?: string; // Client avatar image URL
  phoneNumber?: string;
  location: string; // Distance display (e.g., "1.2 miles away")
  address: string; // Full street address
  bidAmount?: string; // Fixed bid amount (e.g., "€425", "€95")
  actualPrice?: string; // Final price if different from bid
  estimatedPrice?: string | null;
  scheduledTime: string; // Display format (e.g., "10:00 AM Today", "2:00 PM Tomorrow", "TBD")
  scheduledDate: string | null; // ISO date string or null
  estimatedDuration?: string; // Duration display (e.g., "2-3 hours", "45 minutes")
  status: JobStatus;
  priority: JobPriority;
  previousStatus?: string; // Stored when pausing a job, used for resume
  delayReason?: string; // Why job is delayed
  delayedSince?: string; // ISO date when delay started
  category: string;
  timePosted?: string;
  jobType?: JobType;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  pausedAt?: string;
  notes?: string | string[];
  recentlyRescheduled?: boolean;
  rescheduledAt?: string;
  [key: string]: any; // Allow additional fields
}

