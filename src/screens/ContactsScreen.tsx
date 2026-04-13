import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Animated, Linking, Platform,
  PermissionsAndroid, StatusBar, Modal, ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Contacts from 'react-native-contacts';
import { contactsAPI } from '../services/api';
import LanguageToggle from '../components/LanguageToggle';
import { useTranslation } from 'react-i18next';
import { storage } from '../shared/storage';

const D = {
  bg:        '#0f172a',
  surface:   '#1e293b',
  card:      '#162032',
  border:    '#334155',
  text:      '#f1f5f9',
  textSub:   '#94a3b8',
  textMuted: '#64748b',
  blue:      '#3b82f6',
  blueLight: '#1d3a5f',
  green:     '#10b981',
};

const PERM_KEY = 'trego-contacts-perm-granted';

type PermState = 'idle' | 'denied' | 'never_ask_again';

interface TregoContact {
  id: string; name: string; phone?: string; email?: string; nif?: string; notes?: string;
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow({ pulse }: { pulse: Animated.Value }) {
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return (
    <View style={sk.row}>
      <Animated.View style={[sk.avatar, { opacity }]} />
      <View style={{ flex: 1, gap: 8 }}>
        <Animated.View style={[sk.line, { width: '55%', opacity }]} />
        <Animated.View style={[sk.line, { width: '35%', opacity }]} />
      </View>
    </View>
  );
}

const sk = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: D.surface },
  line: { height: 12, borderRadius: 6, backgroundColor: D.surface },
});

// ── Permission Prompt (slide-down banner) ────────────────────────────────────
function PermissionPrompt({
  permState,
  importing,
  onAllow,
  onNotNow,
}: {
  permState: PermState;
  importing: boolean;
  onAllow: () => void;
  onNotNow: () => void;
}) {
  const { t } = useTranslation();
  const slideY = useRef(new Animated.Value(-260)).current;

  useEffect(() => {
    Animated.spring(slideY, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, []);

  const isPermanentDeny = permState === 'never_ask_again';

  return (
    <Animated.View style={[styles.promptCard, { transform: [{ translateY: slideY }] }]}>
      <View style={styles.promptIconRow}>
        <View style={styles.promptIconBg}>
          <Icon name="contacts" size={28} color={D.blue} />
        </View>
      </View>

      <Text style={styles.promptTitle}>{t('clients.accessTitle')}</Text>
      <Text style={styles.promptDesc}>
        {isPermanentDeny
          ? t('clients.accessDenied')
          : t('clients.accessMessage')}
      </Text>

      {isPermanentDeny ? (
        <TouchableOpacity style={styles.promptBtnPrimary} onPress={() => Linking.openSettings()}>
          <Icon name="cog-outline" size={18} color="#fff" />
          <Text style={styles.promptBtnPrimaryText}>{t('common.openSettings')}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.promptBtnPrimary, importing && { opacity: 0.6 }]}
          onPress={onAllow}
          disabled={importing}>
          {importing
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Icon name="shield-check-outline" size={18} color="#fff" /><Text style={styles.promptBtnPrimaryText}>{t('clients.allowAccess')}</Text></>}
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.promptBtnSecondary} onPress={onNotNow}>
        <Text style={styles.promptBtnSecondaryText}>{t('common.notNow')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ContactsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const [contacts, setContacts]     = useState<TregoContact[]>([]);
  const [filtered, setFiltered]     = useState<TregoContact[]>([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [importing, setImporting]   = useState(false);

  // Permission prompt state — shown on every focus until granted
  const [showPrompt, setShowPrompt] = useState(false);
  const [permState, setPermState]   = useState<PermState>('idle');

  // Skeleton pulse animation
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    if (loading || importing) loop.start();
    else loop.stop();
    return () => loop.stop();
  }, [loading, importing]);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
      checkPermissionOnFocus();
    }, [])
  );

  const checkPermissionOnFocus = async () => {
    // If already stored as granted, skip prompt
    const stored = await storage.getItem(PERM_KEY);
    if (stored === 'true') return;

    if (Platform.OS === 'android') {
      const already = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS
      );
      if (already) {
        await storage.setItem(PERM_KEY, 'true');
        return; // permission was granted outside app, don't show prompt
      }
    }

    // Show prompt every time until granted
    setShowPrompt(true);
  };

  const handleAllow = async () => {
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        {
          title: t('clients.accessTitle'),
          message: t('clients.androidPermMessage'),
          buttonPositive: t('common.allow'),
          buttonNegative: t('common.deny'),
        }
      );

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        await storage.setItem(PERM_KEY, 'true');
        setShowPrompt(false);
        await importContacts();
      } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        setPermState('never_ask_again');
        // Keep prompt open with Settings button
      } else {
        // Denied — close prompt, will re-appear next focus
        setPermState('denied');
        setShowPrompt(false);
      }
    } else {
      // iOS — react-native-contacts handles the permission
      try {
        const status = await Contacts.requestPermission();
        if (status === 'authorized') {
          await storage.setItem(PERM_KEY, 'true');
          setShowPrompt(false);
          await importContacts();
        } else if (status === 'denied') {
          setPermState('never_ask_again');
        } else {
          setShowPrompt(false);
        }
      } catch {
        setShowPrompt(false);
      }
    }
  };

  const handleNotNow = () => {
    setShowPrompt(false);
    // Prompt will reappear next time tab is opened
  };

  // Contact picker state
  const [showPicker, setShowPicker] = useState(false);
  const [phoneContacts, setPhoneContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, 'individual' | 'business'>>({});
  const [pickerSearch, setPickerSearch] = useState('');

  const importContacts = async () => {
    try {
      setImporting(true);
      const all = await Contacts.getAll();
      const mapped = all
        .filter(c => c.displayName || (c.givenName && c.familyName))
        .map(c => ({
          id: c.recordID,
          name: c.displayName || `${c.givenName || ''} ${c.familyName || ''}`.trim(),
          phone: c.phoneNumbers?.[0]?.number || '',
          phones: c.phoneNumbers.map(p => ({ number: p.number, label: p.label })),
          emails: c.emailAddresses.map(e => ({ email: e.email, label: e.label })),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setPhoneContacts(mapped);
      setSelected({});
      setPickerSearch('');
      setShowPicker(true);
    } catch (err) {
      console.error('Import contacts error:', err);
    } finally {
      setImporting(false);
    }
  };

  const toggleContact = (id: string, type: 'individual' | 'business') => {
    setSelected(prev => {
      const copy = { ...prev };
      if (copy[id] === type) { delete copy[id]; } // deselect
      else { copy[id] = type; }
      return copy;
    });
  };

  const confirmImport = async () => {
    const selectedIds = Object.keys(selected);
    if (selectedIds.length === 0) { setShowPicker(false); return; }

    setImporting(true);
    setShowPicker(false);

    const payload = phoneContacts
      .filter(c => selectedIds.includes(c.id))
      .map(c => ({
        name: c.name,
        phones: c.phones,
        emails: c.emails,
        source_contact_id: c.id,
        client_type: selected[c.id], // 'individual' or 'business'
      }));

    try {
      await contactsAPI.sync(payload);
      await loadContacts();
    } catch (err) {
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      const res = await contactsAPI.list();
      const list: TregoContact[] = res.data.contacts.map((c: any) => ({
        id: c.id, name: c.name,
        phone: c.phone || c.phones?.[0]?.number,
        email: c.email || c.emails?.[0]?.email,
        nif: c.nif, notes: c.notes,
      }));
      setContacts(list);
      setFiltered(list);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text.trim()) { setFiltered(contacts); return; }
    const q = text.toLowerCase();
    setFiltered(contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    ));
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const AVATAR_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4'];
  const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

  const renderItem = ({ item }: { item: TregoContact }) => (
    <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ClientDetail', { contact: item })}>
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.detailRow}>
          {item.phone && (
            <View style={styles.chip}>
              <Icon name="phone" size={11} color={D.textMuted} />
              <Text style={styles.chipText}>{item.phone}</Text>
            </View>
          )}
          {item.email && (
            <View style={styles.chip}>
              <Icon name="email" size={11} color={D.textMuted} />
              <Text style={styles.chipText} numberOfLines={1}>{item.email}</Text>
            </View>
          )}
        </View>
        {item.nif && <Text style={styles.nif}>NIF: {item.nif}</Text>}
      </View>
      <Icon name="chevron-right" size={20} color={D.border} />
    </TouchableOpacity>
  );

  const showSkeleton = loading || importing;

  return (
    <View style={styles.screen}>
      <StatusBar hidden={true} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('clients.title')}</Text>
        <View style={{ marginLeft: 'auto', marginRight: 8 }}><LanguageToggle /></View>
        {importing && (
          <View style={styles.importingBadge}>
            <ActivityIndicator size="small" color={D.blue} />
            <Text style={styles.importingText}>{t('common.loading')}</Text>
          </View>
        )}
      </View>

      {/* ── Permission Prompt (slide-down) ── */}
      {showPrompt && (
        <PermissionPrompt
          permState={permState}
          importing={importing}
          onAllow={handleAllow}
          onNotNow={handleNotNow}
        />
      )}

      {/* ── Search + Import row ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 8 }}>
        <View style={[styles.searchBar, { flex: 1, marginHorizontal: 0 }]}>
          <Icon name="magnify" size={20} color={D.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('clients.searchPlaceholder')}
            placeholderTextColor={D.textMuted}
            value={search}
            onChangeText={handleSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Icon name="close" size={18} color={D.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={handleAllow}
          disabled={importing}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: D.blue, paddingHorizontal: 12, paddingVertical: 10,
            borderRadius: 10, opacity: importing ? 0.6 : 1,
          }}>
          <Icon name="account-plus" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{t('clients.import')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      {showSkeleton ? (
        <View>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} pulse={pulse} />)}
        </View>
      ) : filtered.length === 0 ? (
        // When the permission prompt is already on-screen, don't also render the
        // empty state — it would overlap the tab/system nav bar on short devices.
        showPrompt ? null : (
          <View style={styles.center}>
            <Icon name="account-group-outline" size={52} color={D.textMuted} />
            <Text style={styles.emptyTitle}>{search ? t('common.noData') : t('clients.noClients')}</Text>
            <Text style={styles.emptyDesc}>
              {search
                ? t('clients.tryDifferentSearch')
                : t('clients.allowImportPrompt')}
            </Text>
          </View>
        )
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}

      {/* ── Contact Picker Modal ── */}
      <Modal visible={showPicker} animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={{ flex: 1, backgroundColor: D.bg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: D.border }}>
            <TouchableOpacity onPress={() => setShowPicker(false)} style={{ padding: 8 }}>
              <Icon name="arrow-left" size={24} color={D.text} />
            </TouchableOpacity>
            <Text style={{ flex: 1, color: D.text, fontSize: 18, fontWeight: '600', marginLeft: 8 }}>{t('clients.selectClients')}</Text>
            <TouchableOpacity
              onPress={confirmImport}
              style={{ backgroundColor: D.green, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>
                {t('clients.importCount', { count: Object.keys(selected).length })}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
            <TextInput
              style={{ backgroundColor: D.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: D.text, fontSize: 14 }}
              placeholder={t('clients.searchContacts')}
              placeholderTextColor={D.textMuted}
              value={pickerSearch}
              onChangeText={setPickerSearch}
            />
          </View>

          <Text style={{ color: D.textMuted, fontSize: 12, paddingHorizontal: 16, paddingBottom: 8 }}>
            {t('clients.tapToMark')}
          </Text>

          <FlatList
            data={phoneContacts.filter(c =>
              !pickerSearch || c.name.toLowerCase().includes(pickerSearch.toLowerCase()) || c.phone?.includes(pickerSearch)
            )}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const sel = selected[item.id];
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: D.border }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: sel ? (sel === 'business' ? '#7c3aed' : D.blue) : D.surface, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: D.text, fontSize: 14, fontWeight: '500' }}>{item.name}</Text>
                    {item.phone ? <Text style={{ color: D.textSub, fontSize: 12 }}>{item.phone}</Text> : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleContact(item.id, 'individual')}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 6,
                      backgroundColor: sel === 'individual' ? D.blue : D.surface,
                      borderWidth: 1, borderColor: sel === 'individual' ? D.blue : D.border,
                    }}>
                    <Text style={{ color: sel === 'individual' ? '#fff' : D.textSub, fontSize: 11, fontWeight: '600' }}>{t('clients.client')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => toggleContact(item.id, 'business')}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
                      backgroundColor: sel === 'business' ? '#7c3aed' : D.surface,
                      borderWidth: 1, borderColor: sel === 'business' ? '#7c3aed' : D.border,
                    }}>
                    <Text style={{ color: sel === 'business' ? '#fff' : D.textSub, fontSize: 11, fontWeight: '600' }}>{t('clients.business')}</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: D.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: D.text },
  importingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: D.blueLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  importingText: { fontSize: 13, fontWeight: '600', color: D.blue },

  // Permission prompt card
  promptCard: {
    backgroundColor: D.card,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: D.border,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 100,
  },
  promptIconRow: { marginBottom: 4 },
  promptIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: D.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: D.text,
    textAlign: 'center',
  },
  promptDesc: {
    fontSize: 14,
    color: D.textSub,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  promptBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 50,
    borderRadius: 14,
    backgroundColor: D.blue,
    marginTop: 4,
  },
  promptBtnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  promptBtnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  promptBtnSecondaryText: { fontSize: 14, color: D.textMuted, fontWeight: '500' },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.surface,
    margin: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: D.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: D.text },

  // List
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: D.bg,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 15, fontWeight: '600', color: D.text },
  detailRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: D.surface, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: D.border,
  },
  chipText: { fontSize: 11, color: D.textMuted },
  nif: { fontSize: 11, color: D.textMuted },
  separator: { height: 1, backgroundColor: D.border, marginLeft: 74 },

  // Empty state — top-anchored + tab-bar-safe padding so it never clips the footer
  center: { alignItems: 'center', gap: 12, paddingHorizontal: 32, paddingTop: 48, paddingBottom: 100 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: D.text },
  emptyDesc: { fontSize: 14, color: D.textMuted, textAlign: 'center', lineHeight: 22 },
});
