/**
 * Schedule Calculation Utilities
 * Ported from web app for React Native
 */

export interface ScheduleItem {
    id: string;
    type: 'job' | 'travel' | 'break' | 'gap' | 'wake-up' | 'end-day';
    title: string;
    client?: string;
    time: string;
    endTime: string;
    duration: number;
    location?: string;
    shortLocation?: string;
    status?: string;
    category?: string;
    price?: string;
    description?: string;
    clientImage?: string;
    travel?: { duration: number; from: string; mode?: string };
    priority?: 'normal' | 'urgent' | 'vip';
    sla?: boolean;
    notes?: string[];
    gapType?: 'travel' | 'free' | 'combined';
    travelTime?: number;
    freeTime?: number;
    travelMode?: string;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
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
 * Calculate schedule with gaps between items
 * Inserts travel and free time blocks between jobs
 */
export const calculateScheduleWithGaps = (items: ScheduleItem[]): ScheduleItem[] => {
    const result: ScheduleItem[] = [];

    for (let i = 0; i < items.length; i++) {
        const currentItem = items[i];
        result.push(currentItem);

        // Check for gap to next item
        if (i < items.length - 1) {
            const nextItem = items[i + 1];
            const currentEndMinutes = timeToMinutes(currentItem.endTime);
            const nextStartMinutes = timeToMinutes(nextItem.time);
            const totalGap = nextStartMinutes - currentEndMinutes;

            if (totalGap > 0) {
                const travelTime = nextItem.travel?.duration || 0;
                const freeTime = Math.max(0, totalGap - travelTime);

                if (travelTime > 0 && freeTime > 0) {
                    // Travel first, then free time at destination
                    result.push({
                        id: `gap-travel-${i}`,
                        type: 'gap',
                        gapType: 'travel',
                        title: `Travel to ${nextItem.shortLocation || 'Next location'}`,
                        time: currentItem.endTime,
                        endTime: minutesToTime(timeToMinutes(currentItem.endTime) + travelTime),
                        duration: travelTime,
                        location: `${currentItem.shortLocation || 'Current'} → ${nextItem.shortLocation || 'Next'}`,
                        travelMode: nextItem.travel?.mode || 'walk'
                    });

                    result.push({
                        id: `gap-free-${i}`,
                        type: 'gap',
                        gapType: 'free',
                        title: 'Free Time',
                        time: minutesToTime(timeToMinutes(currentItem.endTime) + travelTime),
                        endTime: nextItem.time,
                        duration: freeTime,
                        location: `Near ${nextItem.shortLocation || 'next location'}`
                    });
                } else if (travelTime > 0 && freeTime === 0) {
                    // Travel only
                    result.push({
                        id: `gap-${i}`,
                        type: 'gap',
                        gapType: 'travel',
                        title: `Travel to ${nextItem.shortLocation || 'Next location'}`,
                        time: currentItem.endTime,
                        endTime: nextItem.time,
                        duration: travelTime,
                        location: `${currentItem.shortLocation || 'Current'} → ${nextItem.shortLocation || 'Next'}`,
                        travelTime,
                        travelMode: nextItem.travel?.mode || 'walk'
                    });
                } else if (freeTime > 0) {
                    // Free time only
                    result.push({
                        id: `gap-${i}`,
                        type: 'gap',
                        gapType: 'free',
                        title: 'Free Time',
                        time: currentItem.endTime,
                        endTime: nextItem.time,
                        duration: freeTime,
                        location: currentItem.shortLocation || currentItem.location || '',
                        freeTime
                    });
                }
            }
        }
    }

    return result;
};

/**
 * Format duration in minutes to readable string
 */
export const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

/**
 * Check if a time is between two other times
 */
export const isTimeBetween = (time: string, start: string, end: string): boolean => {
    const timeMin = timeToMinutes(time);
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    return timeMin >= startMin && timeMin <= endMin;
};
