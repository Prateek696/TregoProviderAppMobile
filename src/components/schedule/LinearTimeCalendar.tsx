import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ScheduleBlock } from '../../shared/types/schedule';

const { width } = Dimensions.get('window');

// ── Layout constants ─────────────────────────────────────────────────────────
const HOUR_HEIGHT  = 120;  // px per hour
const START_HOUR   = 6;    // 6 AM
const END_HOUR     = 23;   // 11 PM
const PADDING_TOP  = 16;
const LABEL_WIDTH  = 56;   // left time-label column
const EVENT_LEFT   = LABEL_WIDTH + 8;
const EVENT_RIGHT  = 12;
const TOTAL_HEIGHT = (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT + PADDING_TOP + 80;

// ── Time helpers ─────────────────────────────────────────────────────────────
function timeToMinutes(t: string | undefined): number {
    if (!t || t === 'TBD') return 0;
    const s = t.split('-')[0].trim();
    const m12 = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (m12) {
        let h = parseInt(m12[1], 10);
        const min = parseInt(m12[2], 10);
        const p = m12[3].toUpperCase();
        if (p === 'PM' && h !== 12) h += 12;
        if (p === 'AM' && h === 12) h = 0;
        return h * 60 + min;
    }
    const m24 = s.match(/(\d{1,2}):(\d{2})/);
    if (m24) return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
    return 0;
}

function minutesToTime(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const p = h >= 12 ? 'PM' : 'AM';
    const d = h % 12 || 12;
    return `${d}:${m.toString().padStart(2, '0')} ${p}`;
}

/** Convert total minutes → absolute top offset in the grid */
function minutesToTop(totalMin: number): number {
    return PADDING_TOP + (totalMin / 60 - START_HOUR) * HOUR_HEIGHT;
}

/** Duration (minutes) → pixel height, minimum 36px */
function durationToHeight(dur: number): number {
    return Math.max(44, Math.min((dur / 60) * HOUR_HEIGHT, HOUR_HEIGHT * 0.7));
}

// ── Status colors ─────────────────────────────────────────────────────────────
const STATUS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    pending:   { bg: '#1c1400', border: '#f59e0b', text: '#fcd34d', dot: '#f59e0b' },
    confirmed: { bg: '#0d1f3c', border: '#3b82f6', text: '#93c5fd', dot: '#3b82f6' },
    'en-route':{ bg: '#1e0a3c', border: '#8b5cf6', text: '#c4b5fd', dot: '#8b5cf6' },
    'on-site': { bg: '#052e16', border: '#10b981', text: '#6ee7b7', dot: '#10b981' },
    paused:    { bg: '#2d0a0a', border: '#ef4444', text: '#fca5a5', dot: '#ef4444' },
    completed: { bg: '#052e16', border: '#10b981', text: '#6ee7b7', dot: '#10b981' },
    cancelled: { bg: '#1a1f2e', border: '#475569', text: '#94a3b8', dot: '#475569' },
};
const DEFAULT_STATUS = STATUS.pending;

// ── Props ─────────────────────────────────────────────────────────────────────
interface LinearTimeCalendarProps {
    selectedDate: Date;
    jobs?: any[];
    onJobPress: (job: any) => void;
    isDayStarted: boolean;
    isDayEnded: boolean;
    onStartDay: (started: boolean, startTime: Date | null) => void;
    onEndDay: (ended: boolean) => void;
    jobStatuses: Record<string, string>;
    onJobStatusChange: (jobId: string, newStatus: string) => void;
    freeTimeNotes: Record<string, any>;
    onFreeTimeNoteAdd: (timeSlot: string, note: any) => void;
    onJobReschedule?: (jobId: string, newTime: string) => void;
}

// ── Current time indicator ────────────────────────────────────────────────────
function NowLine() {
    const [mins, setMins] = useState(() => {
        const n = new Date(); return n.getHours() * 60 + n.getMinutes();
    });
    useEffect(() => {
        const id = setInterval(() => {
            const n = new Date(); setMins(n.getHours() * 60 + n.getMinutes());
        }, 60_000);
        return () => clearInterval(id);
    }, []);
    const top = minutesToTop(mins);
    if (top < 0 || top > TOTAL_HEIGHT) return null;
    return (
        <View style={[s.nowLine, { top }]} pointerEvents="none">
            <View style={s.nowDot} />
            <View style={s.nowLineFill} />
            <Text style={s.nowLabel}>{minutesToTime(mins)}</Text>
        </View>
    );
}

// ── Draggable job card ────────────────────────────────────────────────────────
function DraggableJob({
    block, jobStatus, onJobStatusChange, onJobReschedule, onScrollEnable, onPress, top, height,
}: {
    block: ScheduleBlock; jobStatus: string; top: number; height: number;
    onJobStatusChange: (id: string, s: string) => void;
    onJobReschedule?: (id: string, t: string) => void;
    onScrollEnable: (e: boolean) => void;
    onPress: () => void;
}) {
    const dragY    = useSharedValue(0);
    const isActive = useSharedValue(false);
    const [liveTime, setLiveTime] = useState<string | null>(null);

    const updateLiveTime = (dy: number) => {
        const delta = Math.round((dy / HOUR_HEIGHT) * 60 / 15) * 15;
        const orig  = timeToMinutes(block.time);
        const next  = Math.max(START_HOUR * 60, Math.min((END_HOUR - 1) * 60, orig + delta));
        setLiveTime(minutesToTime(next));
    };

    const handleDrop = (dy: number) => {
        const delta = Math.round((dy / HOUR_HEIGHT) * 60 / 15) * 15;
        if (delta !== 0 && onJobReschedule) {
            const orig = timeToMinutes(block.time);
            const next = Math.max(START_HOUR * 60, Math.min((END_HOUR - 1) * 60, orig + delta));
            onJobReschedule(block.id, minutesToTime(next));
        }
        setLiveTime(null);
        onScrollEnable(true);
    };

    const pan = Gesture.Pan()
        .activateAfterLongPress(400)
        .onStart(() => { isActive.value = true; runOnJS(onScrollEnable)(false); })
        .onUpdate(e => { dragY.value = e.translationY; runOnJS(updateLiveTime)(e.translationY); })
        .onEnd(e => { runOnJS(handleDrop)(e.translationY); dragY.value = withSpring(0, { damping: 20 }); isActive.value = false; })
        .onFinalize(() => { dragY.value = withSpring(0, { damping: 20 }); isActive.value = false; runOnJS(onScrollEnable)(true); });

    const anim = useAnimatedStyle(() => ({
        transform: [{ translateY: dragY.value }],
        zIndex: isActive.value ? 999 : 10,
        elevation: isActive.value ? 14 : 2,
        shadowOpacity: isActive.value ? 0.45 : 0.15,
    }));

    const st = STATUS[jobStatus] || DEFAULT_STATUS;

    return (
        <GestureDetector gesture={pan}>
            <Animated.View style={[s.blockAbsolute, { top, height }, anim]}>
                <TouchableOpacity
                    style={[s.jobCard, { backgroundColor: st.bg, borderColor: st.border }]}
                    onPress={onPress}
                    activeOpacity={0.85}>
                    {/* Left accent bar */}
                    <View style={[s.jobAccent, { backgroundColor: st.border }]} />
                    <View style={s.jobContent}>
                        {/* Status dot + time */}
                        <View style={s.jobTopRow}>
                            <View style={[s.jobDot, { backgroundColor: st.dot }]} />
                            <Text style={[s.jobTime, { color: st.dot }]}>
                                {liveTime || block.time}
                            </Text>
                            {block.price ? (
                                <Text style={[s.jobPrice, { color: st.text }]}>{block.price}</Text>
                            ) : null}
                        </View>
                        {/* Title */}
                        <Text style={s.jobTitle} numberOfLines={height > 56 ? 2 : 1}>
                            {block.title}
                        </Text>
                        {/* Client + location row (only if tall enough) */}
                        {height > 56 && (
                            <View style={s.jobMeta}>
                                {block.client ? (
                                    <View style={s.jobMetaItem}>
                                        <Icon name="account-outline" size={11} color={st.text} />
                                        <Text style={[s.jobMetaText, { color: st.text }]} numberOfLines={1}>
                                            {block.client}
                                        </Text>
                                    </View>
                                ) : null}
                                {block.location ? (
                                    <View style={s.jobMetaItem}>
                                        <Icon name="map-marker-outline" size={11} color={st.text} />
                                        <Text style={[s.jobMetaText, { color: st.text }]} numberOfLines={1}>
                                            {block.location}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        )}
                    </View>
                    {/* Drag handle */}
                    <Icon name="drag-vertical" size={16} color={st.border} style={s.dragHandle} />
                </TouchableOpacity>
            </Animated.View>
        </GestureDetector>
    );
}

// ── Special blocks ────────────────────────────────────────────────────────────
function WakeBlock({ block, isDayStarted, onStartDay }: { block: ScheduleBlock; isDayStarted: boolean; onStartDay: () => void }) {
    const top    = minutesToTop(timeToMinutes(block.time));
    const height = durationToHeight(block.duration);
    return (
        <View style={[s.blockAbsolute, { top, height }]}>
            <View style={[s.specialCard, { borderColor: '#334155', backgroundColor: '#0f1b2d' }]}>
                <Icon name="home-outline" size={14} color="#64748b" />
                <View style={s.specialText}>
                    <Text style={s.specialTitle}>{block.title}</Text>
                    <Text style={s.specialTime}>{block.time} – {block.endTime}</Text>
                </View>
                {!isDayStarted && (
                    <TouchableOpacity style={s.startBtn} onPress={onStartDay}>
                        <Text style={s.startBtnText}>Start</Text>
                        <Icon name="play-circle" size={14} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

function BreakBlockItem({ block }: { block: ScheduleBlock }) {
    const top    = minutesToTop(timeToMinutes(block.time));
    const height = durationToHeight(block.duration);
    return (
        <View style={[s.blockAbsolute, { top, height }]}>
            <View style={[s.specialCard, { borderColor: '#1e3a5f', backgroundColor: '#0a1628' }]}>
                <Icon name="coffee-outline" size={14} color="#3b82f6" />
                <View style={s.specialText}>
                    <Text style={[s.specialTitle, { color: '#93c5fd' }]}>{block.title}</Text>
                    <Text style={s.specialTime}>{block.time} – {block.endTime}</Text>
                    {block.location ? <Text style={s.specialLocation}>{block.location}</Text> : null}
                </View>
            </View>
        </View>
    );
}

function TravelBlockItem({ block }: { block: ScheduleBlock }) {
    const top    = minutesToTop(timeToMinutes(block.time));
    const height = Math.max(24, durationToHeight(block.duration));
    return (
        <View style={[s.blockAbsolute, { top, height }]} pointerEvents="none">
            <View style={s.travelRow}>
                <View style={s.travelDash} />
                <View style={s.travelPill}>
                    <Icon name="car-outline" size={11} color="#94a3b8" />
                    <Text style={s.travelText}>{block.duration}m</Text>
                </View>
                <View style={s.travelDash} />
            </View>
        </View>
    );
}

function EndDayBlockItem({ block, isDayEnded, onEndDay }: { block: ScheduleBlock; isDayEnded: boolean; onEndDay: (e: boolean) => void }) {
    const top    = minutesToTop(timeToMinutes(block.time));
    const height = durationToHeight(block.duration);
    return (
        <View style={[s.blockAbsolute, { top, height }]}>
            <View style={[s.specialCard, { borderColor: '#7c3aed', backgroundColor: '#1a0533' }]}>
                <Icon name="weather-night" size={14} color="#a78bfa" />
                <View style={s.specialText}>
                    <Text style={[s.specialTitle, { color: '#c4b5fd' }]}>{block.title}</Text>
                    <Text style={s.specialTime}>Available until {block.endTime}</Text>
                </View>
                {!isDayEnded && (
                    <TouchableOpacity style={[s.startBtn, { backgroundColor: '#7c3aed' }]} onPress={() => onEndDay(true)}>
                        <Text style={s.startBtnText}>End Day</Text>
                        <Icon name="stop-circle" size={14} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LinearTimeCalendar({
    selectedDate, jobs = [], onJobPress,
    isDayStarted, isDayEnded, onStartDay, onEndDay,
    jobStatuses, onJobStatusChange, freeTimeNotes, onFreeTimeNoteAdd, onJobReschedule,
}: LinearTimeCalendarProps) {
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

    // ── Build schedule blocks ─────────────────────────────────────────────────
    const scheduleBlocks = useMemo<ScheduleBlock[]>(() => {
        const blocks: ScheduleBlock[] = [];

        // Wake-up (weekdays)
        if (selectedDate.getDay() !== 0 && selectedDate.getDay() !== 6) {
            blocks.push({
                id: 'wake_up', type: 'wake-up', title: 'Wake Up & Prep',
                time: '7:30 AM', endTime: '8:30 AM',
                date: selectedDate.toISOString(), duration: 60,
            });
        }

        // Lunch at noon (if no conflict)
        const hasNoonConflict = blocks.some(b => {
            const bStart = timeToMinutes(b.time);
            const bEnd   = bStart + b.duration;
            return bStart < 13 * 60 && bEnd > 12 * 60;
        });
        if (!hasNoonConflict && selectedDate.getDay() !== 0 && selectedDate.getDay() !== 6) {
            blocks.push({
                id: 'lunch_break', type: 'break', title: 'Lunch Break',
                time: '12:00 PM', endTime: '1:00 PM',
                date: selectedDate.toISOString(), duration: 60, location: 'Campo de Ourique',
            });
        }

        // Filter jobs for selected date
        const dayJobs = jobs
            .filter(j => {
                if (!j.scheduledDate) return false;
                const d = new Date(j.scheduledDate);
                return d.getDate() === selectedDate.getDate() &&
                       d.getMonth() === selectedDate.getMonth() &&
                       d.getFullYear() === selectedDate.getFullYear();
            })
            .sort((a, b) => timeToMinutes(a.scheduledTime) - timeToMinutes(b.scheduledTime));

        dayJobs.forEach((job, idx) => {
            const durMin = job.estimatedDurationMinutes || 60;
            const startMin = timeToMinutes(job.scheduledTime);

            // Travel gap before job
            if (idx > 0) {
                const prevEnd = timeToMinutes(dayJobs[idx - 1].scheduledTime) +
                                (dayJobs[idx - 1].estimatedDurationMinutes || 60);
                const gap = startMin - prevEnd;
                if (gap >= 10) {
                    const travelMin = Math.min(20, gap);
                    blocks.push({
                        id: `travel_${job.id}`, type: 'travel', title: `${travelMin}m travel`,
                        time: minutesToTime(prevEnd), endTime: minutesToTime(prevEnd + travelMin),
                        date: selectedDate.toISOString(), duration: travelMin,
                    });
                }
            }

            blocks.push({
                id: job.id, type: 'job',
                title: job.title,
                client: job.client || 'Unknown Client',
                location: job.address || job.location || '',
                description: job.description || job.rawText || '',
                price: job.estimatedPrice || job.bidAmount || job.actualPrice || '',
                time: job.scheduledTime,
                endTime: minutesToTime(startMin + durMin),
                date: selectedDate.toISOString(),
                duration: durMin,
                status: job.status,
                category: job.category,
                priority: job.priority,
            } as ScheduleBlock);
        });

        // End-day (weekdays)
        if (selectedDate.getDay() !== 0 && selectedDate.getDay() !== 6) {
            blocks.push({
                id: 'end_day', type: 'end-day', title: 'End of Schedule Day',
                time: '7:00 PM', endTime: '10:00 PM',
                date: selectedDate.toISOString(), duration: 180,
            });
        }

        return blocks;
    }, [selectedDate, jobs]);

    return (
        <ScrollView
            style={s.scroll}
            contentContainerStyle={{ height: TOTAL_HEIGHT }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={scrollEnabled}>

            {/* ── Hour grid ── */}
            {hours.map(hour => {
                const top = minutesToTop(hour * 60);
                const label = hour === 0 || hour === 12 ? '12' : `${hour > 12 ? hour - 12 : hour}`;
                const period = hour < 12 ? 'AM' : 'PM';
                const isNow  = new Date().getHours() === hour;
                return (
                    <View key={hour} style={[s.hourRow, { top }]} pointerEvents="none">
                        <Text style={[s.hourLabel, isNow && s.hourLabelNow]}>
                            {label} {period}
                        </Text>
                        <View style={[s.hourLine, isNow && s.hourLineNow]} />
                    </View>
                );
            })}

            {/* ── Current time indicator ── */}
            <NowLine />

            {/* ── Schedule blocks (absolutely positioned) ── */}
            {scheduleBlocks.map(block => {
                const startMin = timeToMinutes(block.time);
                const top      = minutesToTop(startMin);
                const height   = durationToHeight(block.duration);

                if (block.type === 'wake-up') {
                    return <WakeBlock key={block.id} block={block} isDayStarted={isDayStarted} onStartDay={() => onStartDay(true, new Date())} />;
                }
                if (block.type === 'break') {
                    return <BreakBlockItem key={block.id} block={block} />;
                }
                if (block.type === 'travel') {
                    return <TravelBlockItem key={block.id} block={block} />;
                }
                if (block.type === 'end-day') {
                    return <EndDayBlockItem key={block.id} block={block} isDayEnded={isDayEnded} onEndDay={onEndDay} />;
                }
                if (block.type === 'job') {
                    const jobStatus = jobStatuses[block.id] || block.status || 'pending';
                    return (
                        <DraggableJob
                            key={block.id}
                            block={block}
                            jobStatus={jobStatus}
                            top={top}
                            height={height}
                            onJobStatusChange={onJobStatusChange}
                            onJobReschedule={onJobReschedule}
                            onScrollEnable={setScrollEnabled}
                            onPress={() => onJobPress({ id: block.id })}
                        />
                    );
                }
                return null;
            })}
        </ScrollView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    scroll: {
        flex: 1,
        backgroundColor: '#070e1a',
    },

    // Hour grid
    hourRow: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        height: 20,
    },
    hourLabel: {
        width: LABEL_WIDTH,
        textAlign: 'right',
        paddingRight: 10,
        fontSize: 11,
        fontWeight: '600',
        color: '#3d5166',
        letterSpacing: 0.3,
    },
    hourLabelNow: { color: '#ef4444' },
    hourLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(30,45,61,0.8)',
    },
    hourLineNow: { backgroundColor: 'rgba(239,68,68,0.3)', height: 1 },

    // Now line
    nowLine: {
        position: 'absolute',
        left: LABEL_WIDTH - 4,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 50,
    },
    nowDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
        marginLeft: -4,
    },
    nowLineFill: {
        flex: 1,
        height: 2,
        backgroundColor: '#ef4444',
        opacity: 0.8,
    },
    nowLabel: {
        fontSize: 10,
        color: '#ef4444',
        fontWeight: '700',
        marginLeft: 4,
        marginRight: 8,
    },

    // Absolute block wrapper
    blockAbsolute: {
        position: 'absolute',
        left: EVENT_LEFT,
        right: EVENT_RIGHT,
    },

    // Job card
    jobCard: {
        flex: 1,
        flexDirection: 'row',
        borderRadius: 10,
        borderWidth: 1,
        overflow: 'hidden',
    },
    jobAccent: {
        width: 3,
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
    },
    jobContent: {
        flex: 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 1,
    },
    jobTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    jobDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    jobTime: {
        fontSize: 11,
        fontWeight: '700',
        flex: 1,
    },
    jobPrice: {
        fontSize: 11,
        fontWeight: '700',
    },
    jobTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#f1f5f9',
        lineHeight: 17,
    },
    jobMeta: {
        gap: 2,
        marginTop: 2,
    },
    jobMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    jobMetaText: {
        fontSize: 11,
        flex: 1,
    },
    dragHandle: {
        alignSelf: 'center',
        paddingRight: 6,
        opacity: 0.5,
    },

    // Special blocks (wake, break, end-day)
    specialCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    specialText: {
        flex: 1,
        gap: 2,
    },
    specialTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#cbd5e1',
    },
    specialTime: {
        fontSize: 11,
        color: '#475569',
        fontWeight: '500',
    },
    specialLocation: {
        fontSize: 10,
        color: '#334155',
    },
    startBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#3b82f6',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    startBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },

    // Travel
    travelRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    travelDash: {
        flex: 1,
        height: 1,
        borderWidth: 1,
        borderColor: '#1e3a5f',
        borderStyle: 'dashed',
    },
    travelPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#0d1f3c',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: '#1e3a5f',
    },
    travelText: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '600',
    },
});
