/**
 * Day Timer Component
 * Counts up from day start time (HH:MM:SS format)
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { dayTimerStorage, DayTimerState } from '../../utils/scheduleStorage';

interface DayTimerProps {
    isRunning: boolean;
    onTimerUpdate?: (timeString: string) => void;
}

export default function DayTimer({ isRunning, onTimerUpdate }: DayTimerProps) {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Load saved timer state on mount
    useEffect(() => {
        loadTimerState();
    }, []);

    // Start/stop timer based on isRunning prop
    useEffect(() => {
        if (isRunning) {
            startTimer();
        } else {
            stopTimer();
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning]);

    // Save timer state periodically
    useEffect(() => {
        if (isRunning) {
            saveTimerState();
        }
    }, [elapsedSeconds, isRunning]);

    // Notify parent of timer updates
    useEffect(() => {
        if (onTimerUpdate) {
            onTimerUpdate(formatTime(elapsedSeconds));
        }
    }, [elapsedSeconds, onTimerUpdate]);

    const loadTimerState = async () => {
        const state = await dayTimerStorage.load();
        if (state) {
            setElapsedSeconds(state.elapsedSeconds);
        }
    };

    const saveTimerState = async () => {
        const state: DayTimerState = {
            elapsedSeconds,
            isRunning,
            startTime: isRunning ? new Date().toISOString() : null,
        };
        await dayTimerStorage.save(state);
    };

    const startTimer = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        intervalRef.current = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const resetTimer = async () => {
        setElapsedSeconds(0);
        await dayTimerStorage.clear();
    };

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.timerDisplay}>
                <Icon
                    name={isRunning ? "clock-outline" : "clock-alert-outline"}
                    size={20}
                    color={isRunning ? "#10b981" : "#64748b"}
                    style={styles.icon}
                />
                <Text style={[styles.timerText, isRunning && styles.timerTextActive]}>
                    {formatTime(elapsedSeconds)}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timerDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    icon: {
        marginRight: 6,
    },
    timerText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#64748b',
        fontVariant: ['tabular-nums'],
    },
    timerTextActive: {
        color: '#10b981',
    },
});
