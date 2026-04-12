/**
 * Reusable Skeleton shimmer components for loading states.
 * Uses the same pulse animation pattern as ContactsScreen.
 */
import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

const BG = '#0f172a';
const SURFACE = '#1e293b';

// ── Pulse hook ──────────────────────────────────────────────────────────────

export function usePulse() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return pulse;
}

// ── Base box ────────────────────────────────────────────────────────────────

export function SkeletonBox({ w, h, r = 6, style, pulse }: {
  w: number | string; h: number; r?: number; style?: ViewStyle; pulse: Animated.Value;
}) {
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return (
    <Animated.View style={[{
      width: w as any, height: h, borderRadius: r, backgroundColor: SURFACE, opacity,
    }, style]} />
  );
}

// ── Jobs Screen skeleton ────────────────────────────────────────────────────

export function JobsScreenSkeleton() {
  const pulse = usePulse();
  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: 12 }}>
      {/* Tab bar */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 }}>
        <SkeletonBox w={60} h={32} r={16} pulse={pulse} />
        <SkeletonBox w={70} h={32} r={16} pulse={pulse} />
        <SkeletonBox w={80} h={32} r={16} pulse={pulse} />
        <SkeletonBox w={60} h={32} r={16} pulse={pulse} />
      </View>
      {/* Date strip */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 20 }}>
        {[1,2,3,4,5,6,7].map(i => (
          <View key={i} style={{ alignItems: 'center', gap: 6 }}>
            <SkeletonBox w={16} h={10} r={3} pulse={pulse} />
            <SkeletonBox w={32} h={32} r={16} pulse={pulse} />
          </View>
        ))}
      </View>
      {/* Section header */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <SkeletonBox w={120} h={14} pulse={pulse} />
      </View>
      {/* Job cards */}
      {[1,2,3].map(i => (
        <View key={i} style={sk.jobCard}>
          {/* Header: status badge + time */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <SkeletonBox w={72} h={22} r={4} pulse={pulse} />
            <SkeletonBox w={48} h={16} r={4} pulse={pulse} />
          </View>
          {/* Title */}
          <SkeletonBox w="70%" h={18} r={4} pulse={pulse} style={{ marginBottom: 8 }} />
          {/* Auto-scheduled badge */}
          <SkeletonBox w={100} h={20} r={10} pulse={pulse} style={{ marginBottom: 8 }} />
          {/* Location */}
          <SkeletonBox w="40%" h={12} r={4} pulse={pulse} style={{ marginBottom: 16 }} />
          {/* Footer buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <SkeletonBox w={60} h={16} r={4} pulse={pulse} />
              <SkeletonBox w={64} h={16} r={4} pulse={pulse} />
            </View>
            <SkeletonBox w={110} h={36} r={8} pulse={pulse} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Dashboard Screen skeleton ───────────────────────────────────────────────

export function DashboardScreenSkeleton() {
  const pulse = usePulse();
  return (
    <View style={{ flex: 1, backgroundColor: BG, padding: 16 }}>
      {/* Control bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
        <SkeletonBox w={140} h={32} r={8} pulse={pulse} />
        <SkeletonBox w={120} h={32} r={8} pulse={pulse} />
      </View>
      {/* Stat cards (2x4 grid) */}
      {[0,1,2,3].map(row => (
        <View key={row} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          {[0,1].map(col => (
            <View key={col} style={[sk.statCard, { flex: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <SkeletonBox w={36} h={36} r={10} pulse={pulse} />
                <View style={{ gap: 6 }}>
                  <SkeletonBox w={60} h={10} r={3} pulse={pulse} />
                  <SkeletonBox w={40} h={20} r={4} pulse={pulse} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Schedule Screen skeleton ────────────────────────────────────────────────

export function ScheduleScreenSkeleton() {
  const pulse = usePulse();
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Date header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
        <SkeletonBox w={24} h={24} r={12} pulse={pulse} />
        <SkeletonBox w={160} h={20} r={4} pulse={pulse} />
        <SkeletonBox w={24} h={24} r={12} pulse={pulse} />
      </View>
      {/* Time slots */}
      {[8,9,10,11,12,13,14,15].map(hour => (
        <View key={hour} style={{ flexDirection: 'row', paddingLeft: 12, height: 60 }}>
          <SkeletonBox w={36} h={12} r={3} pulse={pulse} style={{ marginTop: 4 }} />
          <View style={{ flex: 1, marginLeft: 8, borderTopWidth: 0.5, borderColor: '#1e293b' }}>
            {(hour === 9 || hour === 11 || hour === 14) && (
              <SkeletonBox w="90%" h={48} r={8} pulse={pulse} style={{ marginTop: 4, marginLeft: 4 }} />
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Job Detail Screen skeleton ──────────────────────────────────────────────

export function JobDetailScreenSkeleton() {
  const pulse = usePulse();
  return (
    <View style={{ flex: 1, backgroundColor: BG, padding: 16 }}>
      {/* Back button + title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <SkeletonBox w={32} h={32} r={16} pulse={pulse} />
        <SkeletonBox w={180} h={22} r={4} pulse={pulse} />
      </View>
      {/* Status badge */}
      <SkeletonBox w={90} h={28} r={6} pulse={pulse} style={{ marginBottom: 16 }} />
      {/* Info grid */}
      {[1,2,3,4,5].map(i => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <SkeletonBox w={16} h={16} r={4} pulse={pulse} />
          <View style={{ gap: 4, flex: 1 }}>
            <SkeletonBox w={60} h={10} r={3} pulse={pulse} />
            <SkeletonBox w="70%" h={14} r={4} pulse={pulse} />
          </View>
        </View>
      ))}
      {/* Action buttons */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
        <SkeletonBox w="48%" h={44} r={10} pulse={pulse} />
        <SkeletonBox w="48%" h={44} r={10} pulse={pulse} />
      </View>
      {/* Photos section */}
      <SkeletonBox w={80} h={14} r={4} pulse={pulse} style={{ marginTop: 24, marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <SkeletonBox w={80} h={80} r={8} pulse={pulse} />
        <SkeletonBox w={80} h={80} r={8} pulse={pulse} />
        <SkeletonBox w={80} h={80} r={8} pulse={pulse} />
      </View>
    </View>
  );
}

// ── Earnings Screen skeleton ────────────────────────────────────────────────

export function EarningsScreenSkeleton() {
  const pulse = usePulse();
  return (
    <View style={{ flex: 1, backgroundColor: BG, padding: 16 }}>
      {/* Header */}
      <SkeletonBox w={100} h={20} r={4} pulse={pulse} style={{ marginBottom: 20 }} />
      {/* Big earnings cards */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <View style={[sk.earningsCard, { flex: 1 }]}>
          <SkeletonBox w={80} h={10} r={3} pulse={pulse} style={{ marginBottom: 8 }} />
          <SkeletonBox w={60} h={28} r={4} pulse={pulse} />
        </View>
        <View style={[sk.earningsCard, { flex: 1 }]}>
          <SkeletonBox w={80} h={10} r={3} pulse={pulse} style={{ marginBottom: 8 }} />
          <SkeletonBox w={60} h={28} r={4} pulse={pulse} />
        </View>
      </View>
      {/* Chart area */}
      <View style={[sk.earningsCard, { height: 180, marginBottom: 16 }]}>
        <SkeletonBox w={120} h={12} r={4} pulse={pulse} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, flex: 1 }}>
          {[40,65,55,80,70,90,50,60,75,45,85,70].map((h, i) => (
            <SkeletonBox key={i} w={16} h={h} r={3} pulse={pulse} />
          ))}
        </View>
      </View>
      {/* Recent jobs */}
      <SkeletonBox w={100} h={14} r={4} pulse={pulse} style={{ marginBottom: 12 }} />
      {[1,2,3].map(i => (
        <View key={i} style={[sk.recentJob]}>
          <SkeletonBox w="55%" h={14} r={4} pulse={pulse} style={{ marginBottom: 6 }} />
          <SkeletonBox w="35%" h={10} r={3} pulse={pulse} />
        </View>
      ))}
    </View>
  );
}

// ── Calendar Screen skeleton ────────────────────────────────────────────────

export function CalendarScreenSkeleton() {
  const pulse = usePulse();
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Month header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
        <SkeletonBox w={24} h={24} r={12} pulse={pulse} />
        <SkeletonBox w={130} h={20} r={4} pulse={pulse} />
        <SkeletonBox w={24} h={24} r={12} pulse={pulse} />
      </View>
      {/* Day names row */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8 }}>
        {[1,2,3,4,5,6,7].map(i => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <SkeletonBox w={20} h={10} r={3} pulse={pulse} />
          </View>
        ))}
      </View>
      {/* Calendar grid (5 rows) */}
      {[1,2,3,4,5].map(row => (
        <View key={row} style={{ flexDirection: 'row', paddingHorizontal: 12, marginBottom: 6 }}>
          {[1,2,3,4,5,6,7].map(col => (
            <View key={col} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
              <SkeletonBox w={28} h={28} r={14} pulse={pulse} />
            </View>
          ))}
        </View>
      ))}
      {/* Jobs list for selected day */}
      <View style={{ padding: 16, gap: 10 }}>
        <SkeletonBox w={140} h={14} r={4} pulse={pulse} style={{ marginBottom: 4 }} />
        {[1,2].map(i => (
          <View key={i} style={sk.calJob}>
            <SkeletonBox w={50} h={12} r={3} pulse={pulse} />
            <SkeletonBox w="60%" h={14} r={4} pulse={pulse} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Profile Completion Screen skeleton ───────────────────────────────────────

export function ProfileScreenSkeleton() {
  const pulse = usePulse();
  return (
    <View style={{ flex: 1, backgroundColor: BG, padding: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, marginTop: 20 }}>
        <SkeletonBox w={32} h={32} r={16} pulse={pulse} />
        <SkeletonBox w={160} h={20} r={4} pulse={pulse} />
      </View>
      {/* Progress card */}
      <View style={[sk.profileCard, { marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <SkeletonBox w={20} h={20} r={10} pulse={pulse} />
          <SkeletonBox w={130} h={16} r={4} pulse={pulse} />
        </View>
        <SkeletonBox w={180} h={12} r={4} pulse={pulse} style={{ marginBottom: 12 }} />
        <SkeletonBox w="100%" h={6} r={3} pulse={pulse} />
      </View>
      {/* Business Info card */}
      <View style={[sk.profileCard, { marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <SkeletonBox w={18} h={18} r={4} pulse={pulse} />
          <SkeletonBox w={160} h={16} r={4} pulse={pulse} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SkeletonBox w={40} h={40} r={20} pulse={pulse} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBox w="60%" h={14} r={4} pulse={pulse} />
            <SkeletonBox w="40%" h={12} r={4} pulse={pulse} />
          </View>
          <SkeletonBox w={20} h={20} r={10} pulse={pulse} />
        </View>
      </View>
      {/* Contact Details card */}
      <View style={[sk.profileCard, { marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <SkeletonBox w={18} h={18} r={4} pulse={pulse} />
          <SkeletonBox w={120} h={16} r={4} pulse={pulse} />
        </View>
        {[1, 2].map(i => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <SkeletonBox w={40} h={40} r={8} pulse={pulse} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBox w={50} h={10} r={3} pulse={pulse} />
              <SkeletonBox w="55%" h={14} r={4} pulse={pulse} />
            </View>
            <SkeletonBox w={18} h={18} r={9} pulse={pulse} />
          </View>
        ))}
      </View>
      {/* Service Details card */}
      <View style={sk.profileCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <SkeletonBox w={18} h={18} r={4} pulse={pulse} />
          <SkeletonBox w={120} h={16} r={4} pulse={pulse} />
        </View>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <SkeletonBox w={40} h={40} r={8} pulse={pulse} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBox w={60} h={10} r={3} pulse={pulse} />
              <SkeletonBox w="65%" h={14} r={4} pulse={pulse} />
            </View>
            <SkeletonBox w={18} h={18} r={9} pulse={pulse} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Shared skeleton styles ──────────────────────────────────────────────────

const sk = StyleSheet.create({
  jobCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
  },
  statCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
  },
  earningsCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
  },
  recentJob: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  calJob: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
});
