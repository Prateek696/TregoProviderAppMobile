import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
    ActivityIndicator, TextInput, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { profileAPI } from '../services/api';
import LanguageToggle from '../components/LanguageToggle';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';
import { ProfileScreenSkeleton } from '../components/ui/Skeleton';
import { useTranslation } from 'react-i18next';

type Nav = NativeStackNavigationProp<MainStackParamList, 'ProfileCompletion'>;

const C = {
    bg: '#0f172a', card: '#1e293b', text: '#f8fafc', muted: '#94a3b8',
    border: '#334155', green: '#16a34a', blue: '#3b82f6', input: '#0f172a',
};
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProfileCompletionScreen() {
    const { t } = useTranslation();
    const navigation = useNavigation<Nav>();
    const [orbColor, setOrbColor] = useState(C.blue);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);

    // Editable fields
    const [editSection, setEditSection] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editTrade, setEditTrade] = useState('');
    const [editNif, setEditNif] = useState('');
    const [editCoverageRadius, setEditCoverageRadius] = useState('');

    useFocusEffect(useCallback(() => { loadProfile(); }, []));

    const loadProfile = async () => {
        try {
            setLoading(true);
            const color = await jsonStorage.getItem(STORAGE_KEYS.ORB_COLOR);
            if (color) setOrbColor(color as string);
            const res = await profileAPI.get();
            const p = res.data.provider;
            setProfile(p);
            setEditName(p.name || '');
            setEditLastName(p.last_name || '');
            setEditTrade(p.trade || '');
            setEditNif(p.nif || '');
            setEditCoverageRadius(p.coverage_radius?.toString() || '50');
        } catch (e) {
            console.error('ProfileCompletion load error:', e);
        } finally {
            setLoading(false);
        }
    };

    const saveField = async (data: Record<string, any>) => {
        setSaving(true);
        try {
            await profileAPI.update(data);
            await loadProfile();
            setEditSection(null);
            Alert.alert(t('common.saved'), t('profile.savedMessage'));
        } catch (e) {
            Alert.alert(t('common.error'), t('profile.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    // Completion calc
    const calcCompletion = () => {
        if (!profile) return { pct: 0, filled: 0, total: 8 };
        const checks = [
            !!profile.name, !!profile.phone, !!profile.nif, !!profile.trade,
            profile.services?.length > 0, profile.locations?.length > 0,
            profile.working_hours?.some((h: any) => h.is_active),
            !!(profile.coverage_cities?.length || profile.coverage_radius),
        ];
        const filled = checks.filter(Boolean).length;
        return { pct: Math.round((filled / checks.length) * 100), filled, total: checks.length };
    };
    const { pct, filled, total } = calcCompletion();

    const formatWorkingHours = () => {
        if (!profile?.working_hours?.length) return t('profile.notSet');
        const active = profile.working_hours.filter((h: any) => h.is_active);
        if (!active.length) return t('profile.notSet');
        const days = active.map((h: any) => DAY_NAMES[h.day_of_week]);
        const firstBlock = active[0]?.blocks?.[0];
        if (!firstBlock) return days.join(', ');
        return `${days.join(', ')}: ${firstBlock.start}–${firstBlock.end}`;
    };

    const formatLocation = () => {
        if (!profile?.locations?.length) return t('profile.notSet');
        const primary = profile.locations.find((l: any) => l.is_primary) || profile.locations[0];
        return [primary.city, primary.street].filter(Boolean).join(', ') || primary.nickname || t('profile.set');
    };

    const formatServices = () => {
        if (!profile?.services?.length) return t('profile.notSet');
        return profile.services.map((s: any) => s.service_name).join(', ');
    };

    // Render an editable item row
    const renderItem = (icon: string, label: string, value: string, done: boolean, sectionKey?: string) => (
        <TouchableOpacity style={s.itemRow} onPress={() => sectionKey && setEditSection(editSection === sectionKey ? null : sectionKey)}>
            <View style={[s.iconBox, { backgroundColor: orbColor + '20' }]}>
                <Icon name={icon} size={20} color={orbColor} />
            </View>
            <View style={s.itemContent}>
                <Text style={s.itemLabel}>{label}</Text>
                <Text style={s.itemValue}>{value}</Text>
            </View>
            {sectionKey ? (
                <Icon name="pencil-outline" size={18} color={orbColor} />
            ) : (
                <Icon name={done ? 'check-circle-outline' : 'alert-circle-outline'}
                      size={20} color={done ? C.green : C.muted} />
            )}
        </TouchableOpacity>
    );

    // Inline edit form
    const renderEditForm = (fields: Array<{ label: string; value: string; onChange: (v: string) => void; placeholder: string; keyboardType?: any }>,
                            onSave: () => void) => (
        <View style={s.editForm}>
            {fields.map((f, i) => (
                <View key={i} style={s.editFieldRow}>
                    <Text style={s.editFieldLabel}>{f.label}</Text>
                    <TextInput
                        style={s.editInput}
                        value={f.value}
                        onChangeText={f.onChange}
                        placeholder={f.placeholder}
                        placeholderTextColor="#475569"
                        keyboardType={f.keyboardType || 'default'}
                    />
                </View>
            ))}
            <View style={s.editBtnRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setEditSection(null)}>
                    <Text style={s.cancelBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.saveBtn, { backgroundColor: orbColor }]} onPress={onSave} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color="#fff" /> :
                        <Text style={s.saveBtnText}>{t('common.save')}</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) return <ProfileScreenSkeleton />;

    const p = profile || {};

    return (
        <View style={s.screen}>
            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color={C.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>{t('profile.title')}</Text>
                <LanguageToggle />
            </View>

            <ScrollView contentContainerStyle={s.scrollContent}>
                {/* Progress */}
                <View style={[s.card, { borderColor: orbColor + '40', borderWidth: 1 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Icon name="account" size={20} color={orbColor} style={{ marginRight: 8 }} />
                        <Text style={s.cardTitle}>{t('profile.completionTitle')}</Text>
                    </View>
                    <Text style={s.cardDesc}>{t('profile.completionProgress', { pct, filled, total })}</Text>
                    <View style={s.progressBg}>
                        <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: orbColor }]} />
                    </View>
                </View>

                {/* Business Info — editable */}
                <View style={s.card}>
                    <View style={s.sectionHeader}>
                        <Icon name="briefcase" size={18} color={orbColor} style={{ marginRight: 8 }} />
                        <Text style={s.sectionTitle}>{t('profile.businessInformation')}</Text>
                        <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={() => setEditSection(editSection === 'business' ? null : 'business')}>
                            <Icon name="pencil-outline" size={18} color={orbColor} />
                        </TouchableOpacity>
                    </View>
                    <View style={s.itemRow}>
                        <View style={[s.avatarBox, { borderColor: orbColor }]}>
                            <Text style={[s.avatarText, { color: orbColor }]}>
                                {(p.name || 'P').charAt(0)}{(p.last_name || '').charAt(0)}
                            </Text>
                        </View>
                        <View style={s.itemContent}>
                            <Text style={[s.itemLabel, { fontSize: 14, color: C.text }]}>
                                {[p.name, p.last_name].filter(Boolean).join(' ') || t('profile.notSet')}
                            </Text>
                            <Text style={s.itemValue}>{p.trade || t('profile.noTradeSet')}</Text>
                        </View>
                        <Icon name={p.name ? 'check-circle-outline' : 'alert-circle-outline'}
                              size={20} color={p.name ? C.green : C.muted} />
                    </View>
                    {editSection === 'business' && renderEditForm([
                        { label: t('profile.firstName'), value: editName, onChange: setEditName, placeholder: t('profile.phFirstName') },
                        { label: t('profile.lastName'), value: editLastName, onChange: setEditLastName, placeholder: t('profile.phLastName') },
                        { label: t('profile.trade'), value: editTrade, onChange: setEditTrade, placeholder: t('profile.phTrade') },
                    ], () => saveField({ name: editName, last_name: editLastName, trade: editTrade }))}
                </View>

                {/* Contact Details — editable NIF */}
                <View style={s.card}>
                    <View style={s.sectionHeader}>
                        <Icon name="email" size={18} color={orbColor} style={{ marginRight: 8 }} />
                        <Text style={s.sectionTitle}>{t('profile.contactDetails')}</Text>
                    </View>
                    {renderItem('phone', t('profile.phone'), p.phone || t('profile.notSet'), !!p.phone)}
                    <TouchableOpacity style={s.itemRow} onPress={() => setEditSection(editSection === 'nif' ? null : 'nif')}>
                        <View style={[s.iconBox, { backgroundColor: orbColor + '20' }]}>
                            <Icon name="file-document" size={20} color={orbColor} />
                        </View>
                        <View style={s.itemContent}>
                            <Text style={s.itemLabel}>{t('profile.nif')}</Text>
                            <Text style={s.itemValue}>{p.nif || t('profile.notSet')}</Text>
                        </View>
                        <Icon name="pencil-outline" size={18} color={orbColor} />
                    </TouchableOpacity>
                    {editSection === 'nif' && renderEditForm([
                        { label: t('profile.nifNumber'), value: editNif, onChange: setEditNif, placeholder: t('profile.phNif'), keyboardType: 'numeric' },
                    ], () => saveField({ nif: editNif }))}
                </View>

                {/* Service Details — editable coverage */}
                <View style={s.card}>
                    <View style={s.sectionHeader}>
                        <Icon name="map-marker" size={18} color={orbColor} style={{ marginRight: 8 }} />
                        <Text style={s.sectionTitle}>{t('profile.serviceDetails')}</Text>
                    </View>
                    {renderItem('wrench', t('profile.services'), formatServices(), (p.services?.length || 0) > 0)}
                    {renderItem('map-marker', t('profile.baseLocation'), formatLocation(), (p.locations?.length || 0) > 0)}
                    {renderItem('clock-outline', t('profile.workingHours'), formatWorkingHours(),
                        p.working_hours?.some((h: any) => h.is_active))}
                    <TouchableOpacity style={s.itemRow} onPress={() => setEditSection(editSection === 'coverage' ? null : 'coverage')}>
                        <View style={[s.iconBox, { backgroundColor: orbColor + '20' }]}>
                            <Icon name="earth" size={20} color={orbColor} />
                        </View>
                        <View style={s.itemContent}>
                            <Text style={s.itemLabel}>{t('profile.coverageRadius')}</Text>
                            <Text style={s.itemValue}>
                                {p.coverage_cities?.length ? p.coverage_cities.join(', ') :
                                 p.coverage_radius ? t('profile.kmRadius', { km: p.coverage_radius }) : t('profile.notSet')}
                            </Text>
                        </View>
                        <Icon name="pencil-outline" size={18} color={orbColor} />
                    </TouchableOpacity>
                    {editSection === 'coverage' && renderEditForm([
                        { label: t('profile.coverageRadiusKm'), value: editCoverageRadius, onChange: setEditCoverageRadius, placeholder: t('profile.phCoverage'), keyboardType: 'numeric' },
                    ], () => saveField({ coverage_radius: parseInt(editCoverageRadius) || 50 }))}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingHorizontal: 16, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: C.text },
    scrollContent: { padding: 16, gap: 16 },
    card: { backgroundColor: C.card, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: C.border },
    cardTitle: { fontSize: 16, fontWeight: '600', color: C.text },
    cardDesc: { fontSize: 14, color: C.muted, marginTop: 4, marginBottom: 12 },
    progressBg: { height: 6, backgroundColor: '#334155', borderRadius: 3 },
    progressFill: { height: '100%', borderRadius: 3 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: C.text },
    itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, marginBottom: 8 },
    iconBox: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    itemContent: { flex: 1 },
    itemLabel: { fontSize: 12, color: C.muted, marginBottom: 2 },
    itemValue: { fontSize: 14, fontWeight: '500', color: C.text },
    avatarBox: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: C.card },
    avatarText: { fontSize: 14, fontWeight: '600' },
    // Edit form styles
    editForm: { backgroundColor: C.input, borderRadius: 8, padding: 12, marginTop: 4, marginBottom: 8 },
    editFieldRow: { marginBottom: 12 },
    editFieldLabel: { fontSize: 12, color: C.muted, marginBottom: 4 },
    editInput: {
        backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border,
        color: C.text, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10,
    },
    editBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: C.border },
    cancelBtnText: { color: C.muted, fontSize: 13, fontWeight: '500' },
    saveBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6, minWidth: 70, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
