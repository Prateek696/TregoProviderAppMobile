import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { contactsAPI, getAPIError } from '../services/api';

const D = {
  bg: '#0f172a', surface: '#1e293b', border: '#334155',
  text: '#f1f5f9', textMuted: '#94a3b8', blue: '#3b82f6', red: '#ef4444',
};

interface TregoContact {
  id: string; name: string; phone?: string; email?: string; nif?: string; notes?: string;
}

export default function ClientDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const contact: TregoContact = route.params?.contact;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(contact?.name || '');
  const [phone, setPhone] = useState(contact?.phone || '');
  const [email, setEmail] = useState(contact?.email || '');
  const [nif, setNif] = useState(contact?.nif || '');
  const [notes, setNotes] = useState(contact?.notes || '');

  const getInitials = (n: string) => {
    const parts = n.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  const AVATAR_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4'];
  const avatarColor = AVATAR_COLORS[(contact?.name || '').charCodeAt(0) % AVATAR_COLORS.length];

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Name is required'); return; }
    try {
      setSaving(true);
      await contactsAPI.update(contact.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        nif: nif.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setEditing(false);
    } catch (err) {
      Alert.alert('Save Failed', getAPIError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(contact?.name || '');
    setPhone(contact?.phone || '');
    setEmail(contact?.email || '');
    setNif(contact?.nif || '');
    setNotes(contact?.notes || '');
    setEditing(false);
  };

  const Field = ({
    label, value, onChange, icon, placeholder, multiline = false, keyboardType = 'default',
  }: {
    label: string; value: string; onChange: (v: string) => void;
    icon: string; placeholder: string; multiline?: boolean; keyboardType?: any;
  }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldRow, multiline && styles.fieldRowMultiline]}>
        <Icon name={icon} size={18} color={D.textMuted} style={styles.fieldIcon} />
        {editing ? (
          <TextInput
            style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={D.textMuted}
            multiline={multiline}
            numberOfLines={multiline ? 4 : 1}
            keyboardType={keyboardType}
            autoCapitalize="none"
          />
        ) : (
          <Text style={[styles.fieldValue, !value && styles.fieldValueEmpty]}>
            {value || placeholder}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: D.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={D.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Client</Text>
        {editing ? (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveText}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Icon name="pencil" size={18} color={D.blue} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{getInitials(name || 'NN')}</Text>
          </View>
          {editing ? (
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={D.textMuted}
              autoCapitalize="words"
            />
          ) : (
            <Text style={styles.nameDisplay}>{name}</Text>
          )}
        </View>

        {/* Fields */}
        <View style={styles.card}>
          <Field label="Phone" value={phone} onChange={setPhone} icon="phone" placeholder="No phone" keyboardType="phone-pad" />
          <View style={styles.divider} />
          <Field label="Email" value={email} onChange={setEmail} icon="email" placeholder="No email" keyboardType="email-address" />
          <View style={styles.divider} />
          <Field label="NIF" value={nif} onChange={setNif} icon="card-account-details" placeholder="No NIF" keyboardType="number-pad" />
        </View>

        <View style={styles.card}>
          <Field label="Notes" value={notes} onChange={setNotes} icon="note-text" placeholder="No notes" multiline />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: D.border,
    backgroundColor: D.bg,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: D.text },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: D.border },
  cancelText: { color: D.textMuted, fontSize: 14, fontWeight: '600' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, backgroundColor: D.blue, borderRadius: 8, minWidth: 60, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: D.blue },
  editText: { color: D.blue, fontSize: 14, fontWeight: '600' },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  nameDisplay: { fontSize: 22, fontWeight: '700', color: D.text },
  nameInput: {
    fontSize: 22, fontWeight: '700', color: D.text,
    borderBottomWidth: 1, borderBottomColor: D.blue,
    paddingVertical: 4, paddingHorizontal: 8, textAlign: 'center', minWidth: 200,
  },
  card: {
    backgroundColor: D.surface, borderRadius: 12,
    borderWidth: 1, borderColor: D.border, overflow: 'hidden',
  },
  fieldGroup: { paddingHorizontal: 16, paddingVertical: 14 },
  fieldLabel: { fontSize: 11, color: D.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center' },
  fieldRowMultiline: { alignItems: 'flex-start' },
  fieldIcon: { marginRight: 10, marginTop: 1 },
  fieldValue: { fontSize: 15, color: D.text, flex: 1 },
  fieldValueEmpty: { color: D.textMuted, fontStyle: 'italic' },
  fieldInput: { flex: 1, fontSize: 15, color: D.text, paddingVertical: 0 },
  fieldInputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  divider: { height: 1, backgroundColor: D.border, marginLeft: 16 },
});
