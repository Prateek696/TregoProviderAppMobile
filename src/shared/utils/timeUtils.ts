/**
 * Time formatting and conversion utilities for React Native
 */

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Format minutes to 12-hour time label (e.g., "12 AM", "1 PM")
 */
export const formatTimeLabel = (minutes: number): string => {
  let hours = Math.floor(minutes / 60);
  
  // Normalize hours to 0-23 range
  if (hours < 0) hours = 24 + hours; // -1 becomes 23
  if (hours >= 24) hours = hours - 24; // 24 becomes 0, 25 becomes 1
  
  if (hours === 0) return '12 AM';
  if (hours === 12) return '12 PM';
  if (hours < 12) return `${hours} AM`;
  return `${hours - 12} PM`;
};

/**
 * Get current time in minutes since midnight
 */
export const getCurrentTimeInMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

/**
 * Format 24-hour time to 12-hour format (e.g., "08:00" -> "8:00 AM")
 */
export const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

/**
 * Format 12-hour time to 24-hour format (e.g., "8:00 AM" -> "08:00")
 */
export const formatTime24Hour = (time12: string): string => {
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return time12;
  
  const [_, hour, min, period] = match;
  let hour24 = parseInt(hour);
  
  if (period.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
  if (period.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
  
  return `${hour24.toString().padStart(2, '0')}:${min}`;
};

/**
 * Parse job time string like "7:30 AM - 9:30 AM" or "08:00 - 10:00" to start and end times
 */
export const parseJobTime = (timeStr: string): { startTime: string; endTime: string } | null => {
  if (!timeStr || timeStr === 'TBD') return null;
  
  // First try 24-hour format: "08:00 - 10:00" or "08:00 → 10:00" or "8:00 - 10:00"
  const match24hr = timeStr.match(/^(\d{1,2}):(\d{2})\s*[-→]\s*(\d{1,2}):(\d{2})$/);
  if (match24hr) {
    const [_, startHour, startMin, endHour, endMin] = match24hr;
    const startTime = `${startHour.padStart(2, '0')}:${startMin}`;
    const endTime = `${endHour.padStart(2, '0')}:${endMin}`;
    return { startTime, endTime };
  }
  
  // Match patterns like "7:30 AM - 9:30 AM" or "7:30 AM → 9:30 AM"
  let match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-→]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  
  if (match) {
    const [_, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = match;
    
    // Convert to 24-hour format
    let start24Hour = parseInt(startHour);
    let end24Hour = parseInt(endHour);
    
    if (startPeriod.toUpperCase() === 'PM' && start24Hour !== 12) start24Hour += 12;
    if (startPeriod.toUpperCase() === 'AM' && start24Hour === 12) start24Hour = 0;
    if (endPeriod.toUpperCase() === 'PM' && end24Hour !== 12) end24Hour += 12;
    if (endPeriod.toUpperCase() === 'AM' && end24Hour === 12) end24Hour = 0;
    
    const startTime = `${start24Hour.toString().padStart(2, '0')}:${startMin}`;
    const endTime = `${end24Hour.toString().padStart(2, '0')}:${endMin}`;
    
    return { startTime, endTime };
  }
  
  // Try matching single time like "2:00 PM" and add 2 hours as default duration
  const singleMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (singleMatch) {
    const [_, hour, min, period] = singleMatch;
    
    // Convert to 24-hour format
    let start24Hour = parseInt(hour);
    if (period.toUpperCase() === 'PM' && start24Hour !== 12) start24Hour += 12;
    if (period.toUpperCase() === 'AM' && start24Hour === 12) start24Hour = 0;
    
    const startTime = `${start24Hour.toString().padStart(2, '0')}:${min}`;
    
    // Add 2 hours for default duration
    let end24Hour = start24Hour + 2;
    if (end24Hour >= 24) end24Hour -= 24;
    
    const endTime = `${end24Hour.toString().padStart(2, '0')}:${min}`;
    
    return { startTime, endTime };
  }
  
  return null;
};

/**
 * Parse duration string like "2 hours" or "1.5 hours" to minutes
 */
export const parseDuration = (durationStr?: string): number => {
  if (!durationStr) return 60; // Default 1 hour
  
  const match = durationStr.match(/([\d.]+)\s*(hour|hr|minute|min)/i);
  if (!match) return 60;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  
  if (unit.startsWith('hour') || unit === 'hr') {
    return Math.round(value * 60);
  }
  return Math.round(value);
};

/**
 * Format duration in minutes to human-readable string (e.g., "2 hours", "30 minutes")
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `${hours}h ${mins}m`;
};

/**
 * Format relative time (e.g., "2m", "3h", "2d")
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit' 
  });
};

/**
 * Format timer from milliseconds (e.g., "02:30:45")
 */
export const formatTimer = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

