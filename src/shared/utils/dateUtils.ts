/**
 * Date formatting utilities for React Native
 * Extracted from web app and adapted for mobile
 */

/**
 * Format date to YYYY-MM-DD string
 */
export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse YYYY-MM-DD string to Date
 */
export const parseStringToDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

/**
 * Normalize date to compare only year, month, day (ignore time)
 */
export const normalizeDate = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

/**
 * Get ordinal suffix for day numbers (1st, 2nd, 3rd, 4th, etc.)
 */
export const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

/**
 * Format date with ordinal (e.g., "October 7th")
 */
export const formatDateWithOrdinal = (date: Date): string => {
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  return `${month} ${day}${getOrdinalSuffix(day)}`;
};

/**
 * Enhanced date display formatter showing relative day names AND actual dates
 */
export interface DateDisplayInfo {
  displayText: string;
  weekdayName: string;
  monthDay: string;
  fullDate: string;
  isToday: boolean;
  diffDays: number;
}

export const formatDateDisplay = (date: Date): DateDisplayInfo => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  
  let displayText = '';
  let diffDays = 0;

  if (isToday) {
    displayText = `Today, ${formatDateWithOrdinal(date)}`;
  } else if (isTomorrow) {
    displayText = `Tomorrow, ${formatDateWithOrdinal(date)}`;
    diffDays = 1;
  } else {
    const diffTime = date.getTime() - today.getTime();
    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === -1) {
      displayText = `Yesterday, ${formatDateWithOrdinal(date)}`;
    } else if (diffDays < -1) {
      displayText = `${Math.abs(diffDays)} days ago, ${formatDateWithOrdinal(date)}`;
    } else if (diffDays > 1) {
      displayText = `In ${diffDays} days, ${formatDateWithOrdinal(date)}`;
    } else {
      displayText = `${date.toLocaleDateString('en-US', { weekday: 'long' })}, ${formatDateWithOrdinal(date)}`;
    }
  }

  return {
    displayText,
    weekdayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
    monthDay: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    isToday,
    diffDays
  };
};

/**
 * Format date for schedule display (Today, Yesterday, Tomorrow, or full date)
 */
export const formatScheduleDate = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const normalizedDate = normalizeDate(date);
  const normalizedToday = normalizeDate(today);
  const normalizedYesterday = normalizeDate(yesterday);
  const normalizedTomorrow = normalizeDate(tomorrow);
  
  const dateString = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  });
  
  if (normalizedDate.getTime() === normalizedToday.getTime()) {
    return `Today, ${dateString}`;
  } else if (normalizedDate.getTime() === normalizedYesterday.getTime()) {
    return `Yesterday, ${dateString}`;
  } else if (normalizedDate.getTime() === normalizedTomorrow.getTime()) {
    return `Tomorrow, ${dateString}`;
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
};

/**
 * Check if a date is in the past
 */
export const isPastDate = (date: Date): boolean => {
  const today = new Date();
  const normalizedDate = normalizeDate(date);
  const normalizedToday = normalizeDate(today);
  return normalizedDate.getTime() < normalizedToday.getTime();
};

/**
 * Format date range (e.g., "Jan 1 - Jan 7, 2024")
 */
export const formatDateRange = (startDate: Date, endDate: Date): string => {
  const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${start} - ${end}`;
};

/**
 * Calculate due date from issue date and days
 */
export const calculateDueDate = (issueDate: Date, dueDays: number): Date => {
  const due = new Date(issueDate);
  due.setDate(due.getDate() + dueDays);
  return due;
};

/**
 * Format due date for display
 */
export const formatDueDate = (date: Date): string => {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

