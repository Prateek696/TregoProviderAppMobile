import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface WakeUpBlockProps {
    item: any;
    onDayStart: (data: { started: boolean; startTime: Date | null }) => void;
}

export const WakeUpBlock: React.FC<WakeUpBlockProps> = ({ item, onDayStart }) => {
    const [started, setStarted] = useState(false);

    const handleStart = () => {
        const newStarted = !started;
        setStarted(newStarted);
        onDayStart({
            started: newStarted,
            startTime: newStarted ? new Date() : null
        });
    };

    return (
        <View style={[styles.container, { borderLeftColor: '#22c55e' }]}>
            <View style={styles.headerRow}>
                <View style={styles.titleColumn}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.time}>{item.time} - {item.endTime}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.startButton, started && styles.startedButton]}
                    onPress={handleStart}
                >
                    <Text style={[styles.startButtonText, started && styles.startedButtonText]}>
                        {started ? 'Started' : 'Start'}
                    </Text>
                    <Icon
                        name={started ? "check-circle" : "play-circle"}
                        size={16}
                        color={started ? "#16a34a" : "#2563eb"}
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
                <Icon name="home" size={14} color="#64748b" />
                <Text style={styles.infoText} numberOfLines={1}>{item.shortLocation || 'Home Base'}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderLeftWidth: 4,
        marginHorizontal: 16,
        marginVertical: 4,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        gap: 4,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 2,
    },
    titleColumn: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 2,
    },
    time: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoText: {
        fontSize: 13,
        color: '#64748b',
        flex: 1,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    startedButton: {
        backgroundColor: '#dcfce7',
        borderColor: '#86efac',
    },
    startButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2563eb',
    },
    startedButtonText: {
        color: '#16a34a',
    }
});
