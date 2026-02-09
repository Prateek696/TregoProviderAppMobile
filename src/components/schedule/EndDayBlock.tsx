import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface EndDayBlockProps {
    item: any;
    assistantName?: string;
    orbColor?: string;
    personalityMode?: string;
    onDayEnd?: (ended: boolean) => void;
}

export const EndDayBlock: React.FC<EndDayBlockProps> = ({ item, onDayEnd }) => {
    const [ended, setEnded] = useState(false);

    const handleEndDay = () => {
        const newEnded = !ended;
        setEnded(newEnded);
        onDayEnd?.(newEnded);
    };

    return (
        <View style={[styles.container, { borderLeftColor: ended ? '#22c55e' : '#f97316' }]}>
            <View style={styles.headerRow}>
                <View style={styles.titleColumn}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.time}>{item.time} - {item.endTime}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.endButton, ended && styles.endedButton]}
                    onPress={handleEndDay}
                >
                    <Text style={[styles.endButtonText, ended && styles.endedButtonText]}>
                        {ended ? 'Ended' : 'End Day'}
                    </Text>
                    <Icon
                        name={ended ? "check-circle" : "stop-circle-outline"}
                        size={16}
                        color={ended ? "#16a34a" : "#dc2626"}
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
                <Icon name="home" size={14} color="#64748b" />
                <Text style={styles.infoText} numberOfLines={1}>
                    {ended ? 'Return to Home Base' : 'Available until ' + item.endTime}
                </Text>
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
    endButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    endedButton: {
        backgroundColor: '#dcfce7',
        borderColor: '#86efac',
    },
    endButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#dc2626',
    },
    endedButtonText: {
        color: '#16a34a',
    }
});
