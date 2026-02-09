/**
 * Day Stats Dropdown Component
 * Displays daily statistics, progress, and AI coaching tips
 * Matches functionality of web version's DayStatsDropdown.tsx
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import Animated, { FadeInUp, FadeOutUp, Layout } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Haptics from '../../utils/haptics';

interface DayStatsDropdownProps {
    totalJobs: number;
    completedJobs: number;
    dailyEarnings: number;
    totalDuration: string;
    travelTime: string;
    assistantName?: string;
    orbColor?: string; // Hex color code
}

// 30+ Coaching tips from web version
const COACHING_TIPS = [
    "Invoicing with Trego could save you 30 minutes a day on paperwork",
    "Taking before/after photos increases customer satisfaction by 40%",
    "Syncing your calendar with Trego prevents double-bookings and maximizes income",
    "Arriving 5 minutes early builds trust and often leads to referrals",
    "Quick follow-up messages within 2 hours boost your rating significantly",
    "Setting boundaries on working hours protects your mental health and family time",
    "Bundling similar jobs in the same area maximizes your daily earnings",
    "Providers who stay active on Trego earn 30% more through our badge system",
    "Multi-modal payment options through Trego increase customer convenience by 60%",
    "Setting clear expectations upfront prevents 90% of service disputes",
    "Your professional communication style sets you apart from competitors",
    "Documenting extra work discovered helps justify fair pricing adjustments",
    "Regular financial tracking helps you spot income patterns and growth opportunities",
    "Off-platform transactions put your insurance coverage and payments at risk",
    "Taking 15-minute breaks between jobs improves focus and reduces burnout",
    "Regular equipment maintenance prevents costly job delays and cancellations",
    "Building rapport in the first 2 minutes often leads to additional work",
    "Automated bank syncing with Trego eliminates 90% of bookkeeping errors",
    "Trego's automated invoicing protects you from payment disputes and delays",
    "Offering maintenance tips shows expertise and builds long-term relationships",
    "Celebrating small wins daily boosts motivation and long-term success",
    "Higher platform activity unlocks premium job opportunities and bonuses",
    "Staying organized with your schedule reduces stress and increases efficiency",
    "Learning one new skill monthly keeps you competitive and increases rates",
    "Platform messaging creates a legal paper trail that protects your business",
    "Consistent Trego usage builds your reputation and attracts repeat customers",
    "Deep breathing exercises before difficult jobs improve performance and confidence",
    "Providers using Trego's route optimization save 2+ hours daily on travel",
    "Building a financial emergency fund reduces work-related stress significantly",
    "Real-time job alerts through Trego help you capture high-paying last-minute work",
    "Proper hydration and nutrition maintain energy levels throughout long workdays",
    "Trego's rating protection system shields good providers from unfair reviews",
    "Weekly reflection on goals keeps you aligned with your long-term vision",
    "Platform job history creates valuable data for tax deductions and business planning",
    "Investing in quality tools pays for itself through increased efficiency and reputation",
    "Trego's smart scheduling suggests optimal job sequences for maximum daily profit",
    "Practicing gratitude daily improves customer interactions and job satisfaction",
    "Unified payment processing through Trego eliminates cash flow gaps and delays"
];

export default function DayStatsDropdown({
    totalJobs,
    completedJobs,
    dailyEarnings,
    totalDuration,
    travelTime,
    assistantName = 'Trego AI',
    orbColor = '#f97316',
}: DayStatsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentTip, setCurrentTip] = useState(COACHING_TIPS[0]);

    useEffect(() => {
        if (isOpen) {
            // Pick a random tip when opening
            const randomIndex = Math.floor(Math.random() * COACHING_TIPS.length);
            setCurrentTip(COACHING_TIPS[randomIndex]);
        }
    }, [isOpen]);

    const toggleDropdown = () => {
        Haptics.light();
        setIsOpen(!isOpen);
    };

    const progressPercent = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    return (
        <View style={styles.container}>
            {/* Toggle Button - Centered Chevron */}
            <TouchableOpacity
                style={styles.toggleButton}
                onPress={toggleDropdown}
                activeOpacity={0.7}
            >
                <View style={[styles.orbContainer, { borderColor: orbColor }]}>
                    <Icon
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={24}
                        color="#4b5563"
                    />
                </View>
            </TouchableOpacity>

            {/* Dropdown Panel */}
            {isOpen && (
                <Animated.View
                    style={styles.panel}
                    entering={FadeInUp.springify().damping(15)}
                    exiting={FadeOutUp.duration(200)}
                    layout={Layout.springify()}
                >
                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{totalJobs}</Text>
                            <Text style={styles.statLabel}>Jobs</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>€{dailyEarnings}</Text>
                            <Text style={styles.statLabel}>Earnings</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{totalDuration}</Text>
                            <Text style={styles.statLabel}>Duration</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{travelTime}</Text>
                            <Text style={styles.statLabel}>Travel</Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressSection}>
                        <Text style={styles.progressText}>
                            Complete {completedJobs} of {totalJobs}
                        </Text>
                        <View style={styles.progressBarBg}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: `${progressPercent}%`,
                                        backgroundColor: orbColor
                                    }
                                ]}
                            />
                        </View>
                    </View>

                    {/* AI Tip Box */}
                    <View style={[styles.tipBox, { borderColor: orbColor }]}>
                        <View style={styles.tipHeader}>
                            <Icon name="robot" size={16} color={orbColor} />
                            <Text style={[styles.tipAssistantName, { color: orbColor }]}>
                                {assistantName} says:
                            </Text>
                        </View>
                        <Text style={styles.tipText}>
                            {currentTip}
                        </Text>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        zIndex: 10,
    },
    toggleButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    orbContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        // Simple shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    panel: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    progressSection: {
        marginBottom: 20,
    },
    progressText: {
        fontSize: 13,
        color: '#374151',
        marginBottom: 8,
        textAlign: 'center',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    tipBox: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
    },
    tipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 6,
    },
    tipAssistantName: {
        fontSize: 12,
        fontWeight: '600',
    },
    tipText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
});
