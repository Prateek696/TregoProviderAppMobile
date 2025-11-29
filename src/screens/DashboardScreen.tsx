/**
 * Dashboard Screen
 * Migrated from web app's ProviderDashboard
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Colors } from '../shared/constants/colors';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';
import { formatDateRange } from '../shared/utils/dateUtils';

type DashboardScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'Dashboard'>;

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

interface Stat {
  label: string;
  value: string;
  change: number;
  icon: string;
  color: string;
}

const STATS: Stat[] = [
  {
    label: 'Billing',
    value: '€4,280',
    change: 18,
    icon: '💰',
    color: '#10b981',
  },
  {
    label: 'Rating',
    value: '4.9',
    change: 2,
    icon: '⭐',
    color: '#f59e0b',
  },
  {
    label: 'Response Time',
    value: '12m',
    change: -20,
    icon: '⏱️',
    color: '#8b5cf6',
  },
  {
    label: 'Active Jobs',
    value: '12',
    change: 33,
    icon: '💼',
    color: '#3b82f6',
  },
  {
    label: 'Completed',
    value: '247',
    change: 10,
    icon: '✅',
    color: '#06b6d4',
  },
  {
    label: 'Avg per Job',
    value: '€156',
    change: 8,
    icon: '📈',
    color: '#14b8a6',
  },
  {
    label: 'Bids Placed',
    value: '34',
    change: 31,
    icon: '🎯',
    color: '#f97316',
  },
  {
    label: 'Win Rate',
    value: '82%',
    change: 5,
    icon: '🏆',
    color: '#6366f1',
  },
];

type DateRangeMode = 'today' | 'week' | 'month' | 'quarter' | 'year';
type CompareMode = 'previous-month' | 'last-year';

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const [dateRangeMode, setDateRangeMode] = useState<DateRangeMode>('month');
  const [compareMode, setCompareMode] = useState<CompareMode>('previous-month');
  const [orbColor, setOrbColor] = useState('#1E6FF7');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const color = await jsonStorage.getItem(STORAGE_KEYS.ORB_COLOR);
      if (color) setOrbColor(color);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const getDateRange = (): { from: Date; to: Date } => {
    const today = new Date();
    switch (dateRangeMode) {
      case 'today':
        return { from: today, to: today };
      case 'week': {
        const dayOfWeek = today.getDay();
        const from = new Date(today);
        from.setDate(today.getDate() - dayOfWeek);
        return { from, to: today };
      }
      case 'month':
        return {
          from: new Date(today.getFullYear(), today.getMonth(), 1),
          to: today,
        };
      case 'quarter': {
        const quarter = Math.floor(today.getMonth() / 3);
        return {
          from: new Date(today.getFullYear(), quarter * 3, 1),
          to: today,
        };
      }
      case 'year':
        return {
          from: new Date(today.getFullYear(), 0, 1),
          to: today,
        };
      default:
        return {
          from: new Date(today.getFullYear(), today.getMonth(), 1),
          to: today,
        };
    }
  };

  const dateRange = getDateRange();
  const dateRangeText = formatDateRange(dateRange.from, dateRange.to);

  const getCompareLabel = (): string => {
    return compareMode === 'previous-month' ? 'vs Previous Period' : 'vs Last Year';
  };

  const renderStatCard = (stat: Stat, index: number) => (
    <Card key={stat.label} style={[styles.statCard, { width: CARD_WIDTH }]}>
      <CardContent style={styles.statCardContent}>
        <View style={styles.statHeader}>
          <View
            style={[
              styles.statIconContainer,
              { backgroundColor: stat.color + '20' },
            ]}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            {stat.change !== 0 && (
              <View style={styles.statChange}>
                <Text
                  style={[
                    styles.statChangeText,
                    { color: stat.change > 0 ? '#10b981' : '#ef4444' },
                  ]}>
                  {stat.change > 0 ? '↑' : '↓'} {Math.abs(stat.change)}%
                </Text>
              </View>
            )}
          </View>
        </View>
      </CardContent>
    </Card>
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        {/* Control Bar */}
        <View style={styles.controlBar}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              // TODO: Show date range picker
            }}>
            <Text style={styles.controlButtonIcon}>📅</Text>
            <Text style={styles.controlButtonText} numberOfLines={1}>
              {dateRangeText}
            </Text>
            <Text style={styles.controlButtonChevron}>▼</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              // TODO: Show compare mode picker
            }}>
            <Text style={styles.controlButtonIcon}>📊</Text>
            <Text style={styles.controlButtonText} numberOfLines={1}>
              {getCompareLabel()}
            </Text>
            <Text style={styles.controlButtonChevron}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Date Range Selector */}
        <View style={styles.quickSelectContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['today', 'week', 'month', 'quarter', 'year'] as DateRangeMode[]).map(
              mode => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.quickSelectButton,
                    dateRangeMode === mode && {
                      backgroundColor: orbColor,
                      borderColor: orbColor,
                    },
                  ]}
                  onPress={() => setDateRangeMode(mode)}>
                  <Text
                    style={[
                      styles.quickSelectText,
                      dateRangeMode === mode && { color: Colors.primaryForeground },
                    ]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {STATS.map((stat, index) => renderStatCard(stat, index))}
        </View>

        {/* Reviews Section */}
        <Card style={styles.reviewsCard}>
          <CardContent>
            <View style={styles.reviewsHeader}>
              <View style={styles.reviewsIconContainer}>
                <Text style={styles.reviewsIcon}>👍</Text>
              </View>
              <View style={styles.reviewsInfo}>
                <Text style={styles.reviewsTitle}>Reviews</Text>
                <Text style={styles.reviewsSubtitle}>Manage client feedback</Text>
              </View>
            </View>

            {/* Overall Rating */}
            <View style={styles.ratingContainer}>
              <Text style={styles.stars}>★★★★★</Text>
              <Text style={styles.ratingValue}>4.9</Text>
              <Text style={styles.ratingCount}>(127 reviews)</Text>
            </View>

            {/* Review Actions */}
            <View style={styles.reviewActions}>
              <Button
                title="Client Reviews"
                variant="outline"
                onPress={() => {
                  // TODO: Navigate to client reviews
                }}
                style={[styles.reviewButton, { flex: 1 }]}
              />
              <View style={styles.reviewButtonBadge}>
                <Badge variant="default">3</Badge>
              </View>
              <Button
                title="Your Reviews"
                onPress={() => {
                  // TODO: Navigate to your reviews
                }}
                style={[
                  styles.reviewButton,
                  { flex: 1, backgroundColor: orbColor },
                ]}
              />
            </View>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('JobsList' as any)}>
              <Text style={styles.quickActionIcon}>💼</Text>
              <Text style={styles.quickActionLabel}>View Jobs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Schedule' as any)}>
              <Text style={styles.quickActionIcon}>📅</Text>
              <Text style={styles.quickActionLabel}>Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Earnings' as any)}>
              <Text style={styles.quickActionIcon}>💰</Text>
              <Text style={styles.quickActionLabel}>Earnings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('ChatList' as any)}>
              <Text style={styles.quickActionIcon}>💬</Text>
              <Text style={styles.quickActionLabel}>Messages</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  controlBar: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    gap: 8,
  },
  controlButtonIcon: {
    fontSize: 16,
  },
  controlButtonText: {
    flex: 1,
    fontSize: 12,
    color: Colors.foreground,
  },
  controlButtonChevron: {
    fontSize: 10,
    color: Colors.mutedForeground,
  },
  quickSelectContainer: {
    marginTop: -8,
  },
  quickSelectButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    marginRight: 8,
  },
  quickSelectText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.foreground,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    marginBottom: 0,
  },
  statCardContent: {
    padding: 12,
  },
  statHeader: {
    flexDirection: 'row',
    gap: 8,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 18,
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.mutedForeground,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 4,
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statChangeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reviewsCard: {
    marginTop: 8,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  reviewsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f59e0b20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewsIcon: {
    fontSize: 18,
  },
  reviewsInfo: {
    flex: 1,
  },
  reviewsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 2,
  },
  reviewsSubtitle: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stars: {
    fontSize: 16,
    color: '#fbbf24',
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  ratingCount: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  reviewButton: {
    marginBottom: 0,
  },
  reviewButtonBadge: {
    position: 'absolute',
    top: -8,
    right: 60,
    zIndex: 1,
  },
  quickActions: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: (width - 48 - 12) / 2,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    fontSize: 32,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.foreground,
  },
});
