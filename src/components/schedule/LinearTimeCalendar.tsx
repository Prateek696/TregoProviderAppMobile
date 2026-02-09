import React, { useMemo, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fullWeekDemoJobs } from '../../shared/data/fullWeekJobsData';
import { WakeUpBlock } from './WakeUpBlock';
import { EndDayBlock } from './EndDayBlock';
import { TravelBlock } from './TravelBlock';
import { BreakBlock } from './BreakBlock';
import { GapBlock } from './GapBlock';
import JobCard from './JobCard';
import { calculateScheduleWithGaps } from '../../utils/scheduleCalculations';
import { ScheduleBlock } from '../../shared/types/schedule';

const { width } = Dimensions.get('window');
const HOUR_HEIGHT = 120; // Pixels per hour (matches web's 2px per minute)
const START_HOUR = 6;    // Start at 6 AM
const END_HOUR = 23;     // End at 11 PM
const PADDING_TOP = 20;

// Status color configuration (from web)
// ... (STATUS_COLORS used in styles or logic if needed, but JobCard handles its own colors now)
// Keeping simple map for logic if needed
const STATUS_COLORS: Record<string, any> = {
    confirmed: {
        bg: '#EBF5FF',       // Blue card background
        text: '#0066FF',     // Blue text
        border: '#0066FF'    // Blue border
    },
    en_route: {
        bg: '#F5EDFF',       // Purple card background
        text: '#6A0DAD',     // Purple text
        border: '#6A0DAD'    // Purple border
    },
    on_site: {
        bg: '#FFFEF0',       // Yellow card background
        text: '#E6B800',     // Yellow text
        border: '#E6B800'    // Yellow border
    },
    paused: {
        bg: '#FFF1F1',       // Red card background
        text: '#CC0000',     // Red text
        border: '#CC0000'    // Red border
    },
    completed: {
        bg: '#FFFEF0',       // Yellow card background
        text: '#D4AF37',     // Gold text
        border: '#D4AF37'    // Gold border
    },
    pending: {
        bg: '#FFF8E7',       // Light orange card background
        text: '#FF9500',     // Orange text
        border: '#FF9500'    // Orange border
    },
    urgent: {
        bg: '#FEF2F2',       // Red
        border: '#EF4444',
        text: '#991B1B'
    }
};

interface LinearTimeCalendarProps {
    selectedDate: Date;
    onJobPress: (job: any) => void;
    isDayStarted: boolean;
    isDayEnded: boolean;
    onStartDay: (started: boolean, startTime: Date | null) => void;
    onEndDay: (ended: boolean) => void;
    jobStatuses: Record<string, string>;
    onJobStatusChange: (jobId: string, newStatus: string) => void;
    freeTimeNotes: Record<string, any>;
    onFreeTimeNoteAdd: (timeSlot: string, note: any) => void;
}

// --- Helper Functions ---

const timeToMinutes = (timeString: string | undefined): number => {
    if (!timeString) return 0;
    // Format: "8:00 AM" or "8:00 AM - 10:00 AM" or "08:00"
    const startPart = timeString.split('-')[0].trim();

    // Try 12-hour format first
    const match12 = startPart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match12) {
        let [, hoursStr, minutesStr, period] = match12;
        let hours = parseInt(hoursStr, 10);
        const minutes = parseInt(minutesStr, 10);
        if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
        if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    }

    // Try 24-hour format
    const match24 = startPart.match(/(\d{1,2}):(\d{2})/);
    if (match24) {
        let [, hoursStr, minutesStr] = match24;
        return parseInt(hoursStr, 10) * 60 + parseInt(minutesStr, 10);
    }

    return 0;
};

const getDurationInMinutes = (timeString: string | undefined): number => {
    if (!timeString || !timeString.includes('-')) return 60;

    const parts = timeString.split('-');
    const start = timeToMinutes(parts[0].trim());
    const end = timeToMinutes(parts[1].trim());

    let diff = end - start;
    if (diff < 0) diff += 24 * 60; // Handle wrapping
    return diff;
};

const minutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const p = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${p}`;
};

// --- Sub-components ---

const TimeMarker = ({ hour }: { hour: number }) => {
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 || hour === 24 ? 12 : hour);
    const period = hour >= 12 && hour < 24 ? 'PM' : 'AM';
    const isNow = new Date().getHours() === hour;

    return (
        <View style={[styles.timeMarker, { top: (hour - START_HOUR) * HOUR_HEIGHT + PADDING_TOP }]}>
            <Text style={[styles.timeLabel, isNow && styles.timeLabelNow]}>
                {displayHour} {period}
            </Text>
            <View style={styles.timeLine} />
        </View>
    );
};

const CurrentTimeIndicator = () => {
    const [minutes, setMinutes] = useState(() => {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    });

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setMinutes(now.getHours() * 60 + now.getMinutes());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const top = (minutes / 60 - START_HOUR) * HOUR_HEIGHT + PADDING_TOP;

    if (top < 0 || top > (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT + PADDING_TOP) return null;

    return (
        <View style={[styles.currentTimeIndicator, { top }]}>
            <View style={styles.currentTimeDot} />
            <View style={styles.currentTimeLine} />
        </View>
    );
};

export default function LinearTimeCalendar({
    selectedDate,
    onJobPress,
    isDayStarted,
    isDayEnded,
    onStartDay,
    onEndDay,
    jobStatuses,
    onJobStatusChange,
    freeTimeNotes,
    onFreeTimeNoteAdd
}: LinearTimeCalendarProps) {
    // Convert jobs + meta blocks for the selected date
    const scheduleBlocks = useMemo(() => {
        const rawJobs = fullWeekDemoJobs.filter(job => {
            if (!job.scheduledDate) return false;
            const jobDate = new Date(job.scheduledDate);
            return jobDate.getDate() === selectedDate.getDate() &&
                jobDate.getMonth() === selectedDate.getMonth();
        });

        const blocks: ScheduleBlock[] = [];

        // Add Wake-up if it's a weekday (mock)
        if (selectedDate.getDay() !== 0 && selectedDate.getDay() !== 6) {
            blocks.push({
                id: 'wake_up',
                type: 'wake-up',
                title: 'Wake Up & Prep',
                time: '7:30 AM',
                endTime: '8:30 AM', // Added
                date: selectedDate.toISOString(), // Added
                duration: 60,
            });
        }

        // Insert a mock lunch break at 12:00 PM if it fits
        const hasNoonConflict = blocks.some(b => {
            const start = timeToMinutes(b.time);
            const end = timeToMinutes(b.endTime);
            return (start < (12 * 60 + 60) && end > (12 * 60));
        });

        if (!hasNoonConflict && blocks.length > 0) {
            blocks.push({
                id: 'lunch_break',
                type: 'break',
                title: 'Lunch Break',
                time: '12:00 PM',
                endTime: '1:00 PM',
                date: selectedDate.toISOString(), // Added
                duration: 60,
                description: 'Café Central',
                location: 'Campo de Ourique'
            });
        }

        // Sort jobs by time
        const sortedJobs = [...rawJobs].sort((a, b) => timeToMinutes(a.scheduledTime) - timeToMinutes(b.scheduledTime));

        sortedJobs.forEach((job, index) => {
            // Add Travel if there's a gap (mocked)
            if (index > 0) {
                const prevJob = sortedJobs[index - 1];
                const prevEnd = timeToMinutes(prevJob.scheduledTime.split('-')[1]);
                const nextStart = timeToMinutes(job.scheduledTime.split('-')[0]);
                const gap = nextStart - prevEnd;

                if (gap > 10) {
                    blocks.push({
                        id: `travel_${job.id}`,
                        type: 'travel',
                        title: `${Math.min(20, gap)}m travel`,
                        time: minutesToTime(prevEnd),
                        endTime: minutesToTime(prevEnd + Math.min(20, gap)), // Added
                        date: selectedDate.toISOString(), // Added
                        duration: Math.min(20, gap),
                    });
                }
            } else if (blocks.length > 0) {
                // Check travel from wake-up
                const wakeEnd = 8 * 60 + 30; // 8:30 AM
                const nextStart = timeToMinutes(job.scheduledTime.split('-')[0]);
                if (nextStart > wakeEnd) {
                    blocks.push({
                        id: `travel_start`,
                        type: 'travel',
                        title: '15m travel',
                        time: '8:30 AM',
                        endTime: '8:45 AM', // Added
                        date: selectedDate.toISOString(), // Added
                        duration: 15,
                    });
                }
            }

            blocks.push({
                id: job.id,
                type: 'job',
                title: job.title,
                client: job.client,
                location: job.address || job.location,
                time: job.scheduledTime.split('-')[0],
                endTime: job.scheduledTime.split('-')[1], // Added
                date: selectedDate.toISOString(), // Added
                duration: getDurationInMinutes(job.scheduledTime),
                status: job.status,
                category: job.category,
                priority: job.priority,
            } as ScheduleBlock); // Cast to match interface if needed
        });

        // Add End-day block if it's a weekday
        if (selectedDate.getDay() !== 0 && selectedDate.getDay() !== 6) {
            blocks.push({
                id: 'end_day',
                type: 'end-day',
                title: 'End of Schedule Day',
                time: '7:00 PM',
                endTime: '10:00 PM', // Added
                date: selectedDate.toISOString(), // Added
                duration: 180, // 3 hours of extended availability
            });
        }

        return blocks;
    }, [selectedDate]);

    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

    // Render individual block based on type
    const renderBlock = (block: ScheduleBlock, index: number) => {
        // Wake-up block
        if (block.type === 'wake-up') {
            return (
                <View style={{ zIndex: 10 }} key={block.id}>
                    <WakeUpBlock
                        item={block}
                        onDayStart={(data) => onStartDay(data.started, data.startTime)}
                    />
                </View>
            );
        }

        // End-day block
        if (block.type === 'end-day') {
            return (
                <View key={block.id} style={{ zIndex: 10 }}>
                    <EndDayBlock
                        item={block}
                        onDayEnd={onEndDay}
                    />
                </View>
            );
        }

        // Travel block
        if (block.type === 'travel') {
            const nextBlock = scheduleBlocks[index + 1];
            return (
                <View style={{ zIndex: 10 }} key={block.id}>
                    <TravelBlock
                        duration={block.duration}
                        mode="car"
                        from={block.location?.split('→')[0]?.trim() || 'Current'}
                    />
                </View>
            );
        }

        // Break block
        if (block.type === 'break') {
            return (
                <View style={{ zIndex: 10 }} key={block.id}>
                    <BreakBlock item={block} />
                </View>
            );
        }

        // Gap block
        if (block.type === 'free-time') {
            return (
                <View key={block.id} style={{ zIndex: 5 }}>
                    <GapBlock
                        item={block}
                        onNotesUpdate={(note) => onFreeTimeNoteAdd(block.time, note)}
                    />
                </View>
            );
        }

        // Job block
        if (block.type === 'job') {
            const jobStatus = jobStatuses[block.id] || block.status || 'confirmed';
            return (
                <View style={{ zIndex: 10 }} key={block.id}>
                    <JobCard
                        id={block.id}
                        title={block.title}
                        client={block.client || 'Unknown Client'}
                        clientImage={block.clientImage}
                        location={block.location}
                        shortLocation={block.location}
                        time={block.time}
                        endTime={block.endTime || minutesToTime(timeToMinutes(block.time) + block.duration)}
                        duration={block.duration}
                        price={block.price}
                        status={jobStatus}
                        priority={block.priority as any}
                        category={block.category}
                        description={block.description || `${block.category} service`}
                        onStatusChange={onJobStatusChange}
                    />
                </View>
            );
        }

        return null;
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {hours.map(hour => (
                <TimeMarker key={hour} hour={hour} />
            ))}
            <CurrentTimeIndicator />
            {scheduleBlocks.map((block, index) => renderBlock(block, index))}
            {/* Padding at bottom */}
            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

function isSameDay(d1: Date, d2: Date) {
    return d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a', // Slate 900
    },
    contentContainer: {
        minHeight: (END_HOUR - START_HOUR + 2) * HOUR_HEIGHT,
        paddingBottom: 120, // Increased to clear FABs
    },
    timeMarker: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        height: 20,
        // zIndex removed to prevent overlap
    },
    timeLabel: {
        width: 65,
        textAlign: 'right',
        paddingRight: 10,
        color: '#64748b',
        fontSize: 12,
        fontWeight: '600',
    },
    timeLabelNow: {
        color: '#ef4444',
    },
    timeLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(51, 65, 85, 0.5)',
    },
    currentTimeIndicator: {
        position: 'absolute',
        left: 65,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10,
    },
    currentTimeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
        marginLeft: -4,
    },
    currentTimeLine: {
        flex: 1,
        height: 2,
        backgroundColor: 'rgba(51, 65, 85, 0.5)',
    },
    travelBlock: {
        position: 'absolute',
        left: 65,
        right: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        zIndex: 0,
    },
    travelDashedLine: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '50%',
        width: 1,
        borderWidth: 1,
        borderColor: '#94a3b8',
        borderStyle: 'dashed',
    },
    travelLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 1,
    },
    travelText: {
        fontSize: 11,
        color: '#cbd5e1',
        marginLeft: 4,
    },
});
