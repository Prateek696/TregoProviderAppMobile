import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';

type ProfileCompletionScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'ProfileCompletion'>;

// Match colors from SettingsScreen and Web Screenshot
const COLORS = {
    background: '#0f172a', // Slate 950
    card: '#1e293b',       // Slate 800
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#334155',
    accentBlue: '#3b82f6',
    accentGreen: '#16a34a', // Green 600 for checkmarks
    white: '#ffffff',
};

export default function ProfileCompletionScreen() {
    const navigation = useNavigation<ProfileCompletionScreenNavigationProp>();
    const [orbColor, setOrbColor] = useState('#3b82f6');
    const [firstName, setFirstName] = useState('Provider');
    const [lastName, setLastName] = useState('');
    const [businessName, setBusinessName] = useState("Provider's Business");
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('user@gmail.com');
    const [vatNumber, setVatNumber] = useState('');
    const [serviceLocation, setServiceLocation] = useState('Home Base');
    const [completionPercentage, setCompletionPercentage] = useState(50);
    const [daysOffCount, setDaysOffCount] = useState(2);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const color = await jsonStorage.getItem(STORAGE_KEYS.ORB_COLOR);
            if (color) setOrbColor(color as string);

            // Mock data loading based on web logic
            // In a real app, load from storage
            setPhone('+1 555-0123');
        } catch (e) {
            console.error(e);
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Complete Your Profile</Text>
            <View style={{ width: 40 }} />
        </View>
    );

    const renderSectionHeader = (icon: string, title: string) => (
        <View style={styles.sectionHeader}>
            <Icon name={icon} size={18} color={orbColor} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );

    const renderItem = (
        icon: string,
        label: string,
        value: string,
        isCompleted: boolean,
        onPress?: () => void
    ) => (
        <TouchableOpacity style={styles.itemRow} onPress={onPress}>
            <View style={[styles.iconBox, { backgroundColor: orbColor + '20' }]}>
                <Icon name={icon} size={20} color={orbColor} />
            </View>
            <View style={styles.itemContent}>
                <Text style={styles.itemLabel}>{label}</Text>
                <Text style={styles.itemValue}>{value}</Text>
            </View>
            {isCompleted ? (
                <Icon name="check-circle-outline" size={20} color={COLORS.accentGreen} />
            ) : (
                <Icon name="chevron-right" size={20} color={COLORS.textSecondary} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.screen}>
            {renderHeader()}
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Progress Header Card */}
                <View style={[styles.card, { borderColor: orbColor + '40', borderWidth: 1 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Icon name="account" size={20} color={orbColor} style={{ marginRight: 8 }} />
                        <Text style={styles.cardTitle}>Profile Completion</Text>
                    </View>
                    <Text style={styles.cardDescription}>
                        {completionPercentage}% complete • Keep going!
                    </Text>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${completionPercentage}%`, backgroundColor: COLORS.white }]} />
                    </View>
                </View>

                {/* Profile Photo */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Profile Photo</Text>
                    </View>
                    <TouchableOpacity style={styles.itemRow}>
                        <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
                            <Icon name="camera" size={20} color="#3b82f6" />
                        </View>
                        <View style={styles.itemContent}>
                            <Text style={styles.itemLabel}>Profile Photo</Text>
                            <Text style={styles.itemValue}>Add a professional photo</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Business Information */}
                <View style={styles.card}>
                    {renderSectionHeader('briefcase', 'Business Information')}
                    <TouchableOpacity style={styles.itemRow}>
                        <View style={[styles.avatarBox, { borderColor: orbColor }]}>
                            <Text style={[styles.avatarText, { color: orbColor }]}>{firstName.charAt(0)}{lastName.charAt(0)}</Text>
                        </View>
                        <View style={styles.itemContent}>
                            <Text style={[styles.itemLabel, { fontSize: 14, color: COLORS.textPrimary }]}>{firstName} {lastName}</Text>
                            <Text style={[styles.itemValue, { fontSize: 12 }]}>{businessName}</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Contact Details */}
                <View style={styles.card}>
                    {renderSectionHeader('email', 'Contact Details')}
                    {renderItem('phone', 'Phone', phone, true)}
                    {renderItem('email', 'Email', email, false)}
                    {renderItem('file-document', 'VAT Number', vatNumber || 'Add VAT number', !!vatNumber)}
                </View>

                {/* Service Details */}
                <View style={styles.card}>
                    {renderSectionHeader('map-marker', 'Service Details')}
                    {renderItem('map-marker', 'Service Area', serviceLocation, !!serviceLocation)}
                    {renderItem('clock-outline', 'Working Hours', 'Mon-Fri: 9:00 AM - 6:00 PM', false)}
                    {renderItem('calendar', 'Days Off', `${daysOffCount} upcoming`, true)}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.background,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    scrollContent: {
        padding: 16,
        gap: 16,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    cardDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
        marginBottom: 12,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#334155',
        borderRadius: 3,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        marginBottom: 8,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    itemContent: {
        flex: 1,
    },
    itemLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    itemValue: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    avatarBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        backgroundColor: '#1e293b',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '600',
    }

});
