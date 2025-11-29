/**
 * Schedule Types
 * Extracted from web app - React Native compatible
 */

export type ScheduleItemType = 'wake-up' | 'job' | 'break' | 'travel' | 'end-day';
export type ScheduleStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'en_route' 
  | 'on_site' 
  | 'paused' 
  | 'delayed' 
  | 'completed' 
  | 'cancelled' 
  | 'rescheduled';

export interface ScheduleItem {
  id: string;
  jobNumber?: string;
  type: ScheduleItemType;
  title: string;
  client?: string;
  time: string;
  endTime: string;
  duration: number;
  location?: string;
  shortLocation?: string;
  status?: ScheduleStatus;
  category?: string;
  price?: string;
  description: string;
  clientImage?: string;
  travel?: {
    duration: number;
    from: string;
    mode: 'walk' | 'car' | 'bike' | 'metro';
  };
  priority?: 'normal' | 'urgent';
  sla?: boolean;
  notes?: string[];
  recentlyRescheduled?: boolean;
  rescheduledAt?: string;
}

export interface ScheduleBlock {
  id: string;
  type: 'job' | 'break' | 'travel' | 'free-time';
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  description?: string;
  location?: string;
  shortLocation?: string;
  client?: string;
  clientImage?: string;
  status?: ScheduleStatus;
  category?: string;
  price?: string;
  priority?: 'normal' | 'urgent';
  jobType?: 'fixed' | 'bid';
  notes?: string[];
  source?: 'scheduler' | 'calendar' | 'chat' | 'system';
  createdAt?: string;
  updatedAt?: string;
  recentlyRescheduled?: boolean;
  rescheduledAt?: string;
}

export interface FreeTimeNote {
  id: string;
  note: string;
  timeSlot: string;
}

