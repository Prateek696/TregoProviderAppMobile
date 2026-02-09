import React, { useState, useMemo } from 'react';
import {
    View,
    Image,
    StyleSheet,
    Dimensions,
    Text,
    TouchableOpacity,
    ScrollView,
    DimensionValue
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fullWeekDemoJobs } from '../../shared/data/fullWeekJobsData';

const { width, height } = Dimensions.get('window');
const mapImage = require('../../assets/map_mockup.png');

interface StaticMapViewProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
}

// Mock positions for demo jobs on the map
interface JobPosition {
    top: DimensionValue;
    left: DimensionValue;
}

const JOB_POSITIONS: JobPosition[] = [
    { top: '28%', left: '52%' }, // Braga
    { top: '35%', left: '50%' }, // Porto
    { top: '42%', left: '48%' }, // Coimbra
    { top: '30%', left: '55%' }, // East
    { top: '38%', left: '53%' }  // Center
];

export default function StaticMapView({ selectedDate, onDateChange }: StaticMapViewProps) {
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });

    // Generate next 30 days for the strip
    const days = useMemo(() => {
        const arr = [];
        const start = new Date(); // Start from today
        for (let i = 0; i < 30; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            arr.push(d);
        }
        return arr;
    }, []);

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    // Filter jobs for selected date
    const todaysJobs = useMemo(() => {
        return fullWeekDemoJobs.filter(job => {
            if (!job.scheduledDate) return false;
            const d = new Date(job.scheduledDate);
            return isSameDay(d, selectedDate);
        });
    }, [selectedDate]);

    return (
        <View style={styles.container}>
            {/* 1. Horizontal Date Strip */}
            <View style={styles.dateStripContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dateScrollContent}
                >
                    {days.map((date, index) => {
                        const isActive = isSameDay(date, selectedDate);
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'narrow' }); // M, T, W
                        const dayNum = date.getDate();

                        return (
                            <TouchableOpacity
                                key={index}
                                style={[styles.dateItem, isActive && styles.dateItemActive]}
                                onPress={() => onDateChange(date)}
                            >
                                <Text style={[styles.dayName, isActive && styles.textActive]}>{dayName}</Text>
                                <Text style={[styles.dayNum, isActive && styles.textActive]}>{dayNum}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* 2. Map Area */}
            <View style={styles.mapContainer}>
                <Image
                    source={mapImage}
                    style={[styles.mapImage, { transform: [{ scale }, { translateX: translate.x }, { translateY: translate.y }] }]}
                    resizeMode="cover"
                />

                {/* 3. Job Markers */}
                {todaysJobs.length > 0 ? (
                    todaysJobs.map((job, i) => {
                        const pos = JOB_POSITIONS[i % JOB_POSITIONS.length];
                        return (
                            <TouchableOpacity
                                key={job.id}
                                style={[styles.marker, { top: pos.top, left: pos.left, transform: [{ scale: Math.max(0.6, 1 / scale) }] }]}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.markerCreate, { backgroundColor: job.status === 'confirmed' ? '#3b82f6' : '#f97316' }]}>
                                    <Text style={styles.markerText}>{i + 1}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                ) : (
                    /* 4. No Jobs Empty State */
                    <View style={styles.emptyStateCard}>
                        <Icon name="calendar-blank" size={24} color="#94a3b8" style={{ marginBottom: 4 }} />
                        <Text style={styles.emptyTitle}>No jobs scheduled</Text>
                        <Text style={styles.emptySubtitle}>
                            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </Text>
                    </View>
                )}

                {/* 5. Zoom Controls */}
                <View style={styles.zoomControls}>
                    <TouchableOpacity style={styles.zoomBtn} onPress={() => setScale(s => Math.min(s + 0.2, 3))}>
                        <Icon name="plus" size={20} color="#334155" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.zoomBtn} onPress={() => setScale(s => Math.max(s - 0.2, 1))}>
                        <Icon name="minus" size={20} color="#334155" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.zoomBtn} onPress={() => { setScale(1); setTranslate({ x: 0, y: 0 }); }}>
                        <Icon name="crosshairs-gps" size={20} color="#334155" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    dateStripContainer: {
        height: 70, // Matches screenshot strip height
        backgroundColor: '#0f172a', // Dark background for strip
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
        zIndex: 10,
    },
    dateScrollContent: {
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    dateItem: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 54,
        borderRadius: 8,
        marginRight: 8,
        backgroundColor: 'transparent',
    },
    dateItemActive: {
        backgroundColor: '#f97316', // Orange active
    },
    dayName: {
        fontSize: 10,
        color: '#94a3b8',
        marginBottom: 4,
        fontWeight: '500',
    },
    dayNum: {
        fontSize: 16,
        color: '#e2e8f0',
        fontWeight: 'bold',
    },
    textActive: {
        color: '#ffffff',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
    },
    mapImage: {
        width: '100%',
        height: '100%',
    },
    marker: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerCreate: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    markerText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    emptyStateCard: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 150,
        marginLeft: -75, // Center horizontally
        marginTop: -40, // Center vertically
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#334155',
    },
    emptyTitle: {
        color: '#f8fafc',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    emptySubtitle: {
        color: '#64748b',
        fontSize: 10,
    },
    zoomControls: {
        position: 'absolute',
        bottom: 24,
        right: 80, // Left of the FABs
        flexDirection: 'column',
        gap: 8,
    },
    zoomBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
});
