import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { JobDetailModal } from './JobDetailModal';

interface JobCardProps {
    id: string;
    title: string;
    client?: string;
    clientImage?: string;
    location?: string;
    shortLocation?: string;
    time: string;
    endTime: string;
    duration: number;
    price?: string;
    status?: string;
    priority?: 'normal' | 'urgent' | 'vip';
    sla?: boolean;
    category?: string;
    description?: string;
    notes?: string[];
    travel?: { duration: number; from: string; mode?: string };
    onStatusChange: (jobId: string, newStatus: string) => void;
}

// Status color configuration
const STATUS_COLORS: Record<string, any> = {
    confirmed: { border: '#2563eb' }, // Blue
    en_route: { border: '#7c3aed' },  // Purple
    on_site: { border: '#eab308' },   // Yellow
    paused: { border: '#dc2626' },    // Red
    completed: { border: '#16a34a' }, // Green
    cancelled: { border: '#6b7280' }, // Gray
    pending: { border: '#f97316' },   // Orange
    urgent: { border: '#dc2626' },    // Red
};

export default function JobCard(props: JobCardProps) {
    const [isModalVisible, setModalVisible] = useState(false);

    // Status color logic
    const statusKey = (props.status && STATUS_COLORS[props.status]) ? props.status : 'confirmed';
    const statusColor = STATUS_COLORS[statusKey].border;

    const handleCall = () => {
        console.log('Call client:', props.client);
    };

    const handleMessage = () => {
        console.log('Message client:', props.client);
    };

    const handleNavigate = () => {
        if (props.location) {
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                props.location
            )}`;
            Linking.openURL(url);
        }
    };

    return (
        <>
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setModalVisible(true)}
                style={[styles.container, { borderLeftColor: statusColor }]}
            >
                <View style={styles.content}>
                    {/* Header: Title & Time */}
                    <View style={styles.headerRow}>
                        <Text style={styles.title} numberOfLines={1}>{props.title}</Text>
                        <Text style={styles.time}>{props.time} - {props.endTime}</Text>
                    </View>

                    {/* Client Name */}
                    {props.client && (
                        <View style={styles.infoRow}>
                            <Icon name="account" size={14} color="#64748b" />
                            <Text style={styles.infoText} numberOfLines={1}>{props.client}</Text>
                        </View>
                    )}

                    {/* Location */}
                    {(props.shortLocation || props.location) && (
                        <View style={styles.infoRow}>
                            <Icon name="map-marker" size={14} color="#64748b" />
                            <Text style={styles.infoText} numberOfLines={1}>
                                {props.shortLocation || props.location}
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            <JobDetailModal
                visible={isModalVisible}
                onClose={() => setModalVisible(false)}
                job={props}
                onCall={handleCall}
                onMessage={handleMessage}
                onNavigate={handleNavigate}
                onStatusChange={props.onStatusChange}
            />
        </>
    );
}

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
    },
    content: {
        gap: 4,
    },
    headerRow: {
        marginBottom: 2,
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
});
