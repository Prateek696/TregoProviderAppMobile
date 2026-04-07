import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Animated, Linking, Platform,
  PermissionsAndroid, StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Contacts from 'react-native-contacts';
import { contactsAPI } from '../services/api';
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

      <Text style={styles.promptTitle}>Access Your Contacts</Text>
      <Text style={styles.promptDesc}>
        {isPermanentDeny
          ? 'Contact access was denied. Please enable it in Settings to import your clients.'
          : 'Allow access to your contacts to quickly add and manage clients.'}
      </Text>

      {isPermanentDeny ? (
        <TouchableOpacity style={styles.promptBtnPrimary} onPress={() => Linking.openSettings()}>
          <Icon name="cog-outline" size={18} color="#fff" />
          <Text style={styles.promptBtnPrimaryText}>Open Settings</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.promptBtnPrimary, importing && { opacity: 0.6 }]}
          onPress={onAllow}
          disabled={importing}>
          {importing
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Icon name="shield-check-outline" size={18} color="#fff" /><Text style={styles.promptBtnPrimaryText}>Allow Access</Text></>}
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.promptBtnSecondary} onPress={onNotNow}>
        <Text style={styles.promptBtnSecondaryText}>Not Now</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ContactsScreen() {
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
          title: 'Access Your Contacts',
          message: 'Allow Trego to access your contacts to quickly add and manage clients.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
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

  const importContacts = async () => {
    try {
      setImporting(true);
      const phoneContacts = await Contacts.getAll();
      const payload = phoneContacts
        .filter(c => c.displayName || (c.givenName && c.familyName))
        .map(c => ({
          name: c.displayName || `${c.givenName || ''} ${c.familyName || ''}`.trim(),
          phones: c.phoneNumbers.map(p => ({ number: p.number, label: p.label })),
          emails: c.emailAddresses.map(e => ({ email: e.email, label: e.label })),
          source_contact_id: c.recordID,
        }));
      await contactsAPI.sync(payload);
      await loadContacts();
    } catch (err) {
      console.error('Import contacts error:', err);
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
      <StatusBar barStyle="light-content" backgroundColor={D.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clients</Text>
        {importing && (
          <View style={styles.importingBadge}>
            <ActivityIndicator size="small" color={D.blue} />
            <Text style={styles.importingText}>Importing…</Text>
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

      {/* ── Search ── */}
      <View style={styles.searchBar}>
        <Icon name="magnify" size={20} color={D.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
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

      {/* ── Content ── */}
      {showSkeleton ? (
        <View>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} pulse={pulse} />)}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Icon name="account-group-outline" size={52} color={D.textMuted} />
          <Text style={styles.emptyTitle}>{search ? 'No clients found' : 'No clients yet'}</Text>
          <Text style={styles.emptyDesc}>
            {search
              ? 'Try a different name, phone, or email.'
              : 'Allow contact access to import your clients automatically.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
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

  // Empty state
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: D.text },
  emptyDesc: { fontSize: 14, color: D.textMuted, textAlign: 'center', lineHeight: 22 },
});
