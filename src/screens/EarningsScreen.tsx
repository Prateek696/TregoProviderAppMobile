/**
 * Earnings Screen — real data from /api/jobs/earnings
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { Colors } from '../shared/constants/colors';
import { jobsAPI } from '../services/api';

type EarningsNav = NativeStackNavigationProp<MainStackParamList>;

export default function EarningsScreen() {
  const navigation = useNavigation<EarningsNav>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    total_earned: number;
    this_month: number;
    last_month: number;
    monthly_breakdown: Array<{ month: string; total: number; jobs: number }>;
    recent_jobs: Array<{ id: string; title: string; amount: number; completed_at: string; client_name: string; category: string }>;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadEarnings();
    }, [])
  );

  const loadEarnings = async () => {
    try {
      setLoading(true);
      const res = await jobsAPI.earnings();
      setData(res.data);
    } catch (err) {
      console.error('Earnings load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => `€${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  const monthChange = data
    ? data.last_month > 0
      ? (((data.this_month - data.last_month) / data.last_month) * 100).toFixed(0)
      : null
    : null;

  const maxMonthly = data?.monthly_breakdown.length
    ? Math.max(...data.monthly_breakdown.map(m => m.total), 1)
    : 1;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
        {loading && <ActivityIndicator size="small" color={Colors.tregoBlue} />}
      </View>

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.tregoBlue} />
        </View>
      ) : !data ? (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={48} color={Colors.mutedForeground} />
          <Text style={styles.emptyText}>Could not load earnings</Text>
          <TouchableOpacity onPress={loadEarnings} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>

          {/* Summary cards */}
          <View style={styles.row}>
            <View style={[styles.summaryCard, { flex: 1 }]}>
              <Text style={styles.summaryLabel}>Total Earned</Text>
              <Text style={styles.summaryValue}>{fmt(data.total_earned)}</Text>
              <Text style={styles.summarySubLabel}>all time</Text>
            </View>
            <View style={[styles.summaryCard, { flex: 1 }]}>
              <Text style={styles.summaryLabel}>This Month</Text>
              <Text style={[styles.summaryValue, { color: Colors.tregoBlue }]}>{fmt(data.this_month)}</Text>
              {monthChange !== null && (
                <Text style={[styles.summarySubLabel, { color: parseFloat(monthChange) >= 0 ? '#10b981' : '#ef4444' }]}>
                  {parseFloat(monthChange) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(monthChange))}% vs last month
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.summaryCard, { marginBottom: 16 }]}>
            <Text style={styles.summaryLabel}>Last Month</Text>
            <Text style={styles.summaryValue}>{fmt(data.last_month)}</Text>
          </View>

          {/* Monthly bar chart */}
          {data.monthly_breakdown.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Last 6 Months</Text>
              <View style={styles.barChart}>
                {data.monthly_breakdown.map((m, i) => (
                  <View key={i} style={styles.barCol}>
                    <Text style={styles.barAmount}>€{Math.round(m.total)}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.bar, { height: `${Math.max((m.total / maxMonthly) * 100, 4)}%` as any }]} />
                    </View>
                    <Text style={styles.barLabel}>{m.month}</Text>
                    <Text style={styles.barJobs}>{m.jobs}j</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Recent completed jobs */}
          {data.recent_jobs.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Payments</Text>
              {data.recent_jobs.map(job => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobRow}
                  onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}>
                  <View style={styles.jobLeft}>
                    <View style={styles.jobIcon}>
                      <Icon name="briefcase-check-outline" size={18} color={Colors.tregoBlue} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                      <Text style={styles.jobClient}>{job.client_name || 'No client'}</Text>
                      {job.completed_at && (
                        <Text style={styles.jobDate}>
                          {new Date(job.completed_at).toLocaleDateString('pt-PT')}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.jobAmount}>{fmt(job.amount)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Icon name="cash-remove" size={48} color={Colors.mutedForeground} />
              <Text style={styles.emptyText}>No completed jobs yet</Text>
              <Text style={styles.emptySubText}>Complete jobs to see your earnings here</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.foreground },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  content: { padding: 16 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryLabel: { fontSize: 12, color: Colors.mutedForeground, fontWeight: '500', marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: Colors.foreground },
  summarySubLabel: { fontSize: 11, color: Colors.mutedForeground, marginTop: 4 },
  section: {
    marginBottom: 16,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: 16,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barAmount: { fontSize: 9, color: Colors.mutedForeground, marginBottom: 2 },
  barTrack: {
    width: '80%',
    height: 80,
    justifyContent: 'flex-end',
    backgroundColor: Colors.muted,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: Colors.tregoBlue,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: { fontSize: 10, color: Colors.mutedForeground, marginTop: 4 },
  barJobs: { fontSize: 9, color: Colors.mutedForeground },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  jobLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  jobIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobTitle: { fontSize: 14, fontWeight: '600', color: Colors.foreground },
  jobClient: { fontSize: 12, color: Colors.mutedForeground },
  jobDate: { fontSize: 11, color: Colors.mutedForeground },
  jobAmount: { fontSize: 15, fontWeight: '700', color: '#10b981' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.foreground },
  emptySubText: { fontSize: 13, color: Colors.mutedForeground, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.tregoBlue,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '600' },
});
