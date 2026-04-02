/**
 * Job Edit Screen — PUT /api/jobs/:id
 * Same design language as JobDetailScreen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { Colors } from '../shared/constants/colors';
import { jobsAPI, getAPIError } from '../services/api';
import { mapBackendJob } from '../services/jobActions';

type JobEditNavigationProp = NativeStackNavigationProp<MainStackParamList, 'JobEdit'>;

const CATEGORIES = ['General', 'Plumbing', 'Electrical', 'Cleaning', 'Painting', 'Carpentry', 'HVAC', 'Landscaping', 'Other'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export default function JobEditScreen() {
  const route = useRoute();
  const navigation = useNavigation<JobEditNavigationProp>();
  const { jobId } = (route.params as { jobId: string }) || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('normal');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      setLoading(true);
      const res = await jobsAPI.get(jobId);
      const job = mapBackendJob(res.data.job);
      setTitle(job.title || '');
      setDescription(job.description || '');
      setCategory(job.category || 'General');
      setPriority(job.priority || 'normal');
      setAddress(job.address || '');
      setLocation(job.location || '');
      // Strip € prefix for editing
      const rawPrice = (job.bidAmount || job.estimatedPrice || '').toString().replace(/[€,]/g, '');
      setPrice(rawPrice);
      // Format scheduled date/time for editing
      if (job.scheduledDate) {
        const d = new Date(job.scheduledDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setScheduledDate(`${yyyy}-${mm}-${dd}`);
      }
      setScheduledTime(job.scheduledTime === 'TBD' ? '' : (job.scheduledTime || ''));
      setNotes(job.notes || '');
    } catch (err) {
      Alert.alert('Error', 'Could not load job details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }

    setSaving(true);
    try {
      // Build scheduled_at from date + time
      let scheduled_at: string | undefined;
      if (scheduledDate) {
        const timeStr = scheduledTime || '09:00';
        scheduled_at = new Date(`${scheduledDate}T${timeStr}:00`).toISOString();
      }

      await jobsAPI.update(jobId, {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        address: address.trim(),
        location: location.trim(),
        price: price ? parseFloat(price) : undefined,
        scheduled_at,
        notes: notes.trim(),
      });

      navigation.goBack();
    } catch (err) {
      Alert.alert('Save Failed', getAPIError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="chevron-left" size={24} color={Colors.foreground} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Job</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.tregoBlue} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={24} color={Colors.foreground} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Job</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>

          <Text style={styles.fieldLabel}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Fix leaking pipe"
            placeholderTextColor='#94a3b8'
          />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the work to be done..."
            placeholderTextColor='#94a3b8'
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Category & Priority */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Classification</Text>

          <Text style={styles.fieldLabel}>Category</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowCategoryPicker(v => !v)}>
            <Text style={styles.pickerText}>{category}</Text>
            <Icon name={showCategoryPicker ? 'chevron-up' : 'chevron-down'} size={20} color='#94a3b8' />
          </TouchableOpacity>
          {showCategoryPicker && (
            <View style={styles.pickerDropdown}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pickerOption, c === category && styles.pickerOptionSelected]}
                  onPress={() => { setCategory(c); setShowCategoryPicker(false); }}>
                  <Text style={[styles.pickerOptionText, c === category && styles.pickerOptionTextSelected]}>{c}</Text>
                  {c === category && <Icon name="check" size={16} color={Colors.tregoBlue} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.fieldLabel}>Priority</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowPriorityPicker(v => !v)}>
            <View style={styles.priorityRow}>
              <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(priority) }]} />
              <Text style={styles.pickerText}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</Text>
            </View>
            <Icon name={showPriorityPicker ? 'chevron-up' : 'chevron-down'} size={20} color='#94a3b8' />
          </TouchableOpacity>
          {showPriorityPicker && (
            <View style={styles.pickerDropdown}>
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.pickerOption, p === priority && styles.pickerOptionSelected]}
                  onPress={() => { setPriority(p); setShowPriorityPicker(false); }}>
                  <View style={styles.priorityRow}>
                    <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(p) }]} />
                    <Text style={[styles.pickerOptionText, p === priority && styles.pickerOptionTextSelected]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </View>
                  {p === priority && <Icon name="check" size={16} color={Colors.tregoBlue} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>

          <Text style={styles.fieldLabel}>Address</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Street address"
            placeholderTextColor='#94a3b8'
          />

          <Text style={styles.fieldLabel}>City / Area</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Lisboa"
            placeholderTextColor='#94a3b8'
          />
        </View>

        {/* Schedule & Price */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule & Price</Text>

          <View style={styles.row}>
            <View style={styles.rowHalf}>
              <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={scheduledDate}
                onChangeText={setScheduledDate}
                placeholder="2026-04-15"
                placeholderTextColor='#94a3b8'
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.rowHalf}>
              <Text style={styles.fieldLabel}>Time (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={scheduledTime}
                onChangeText={setScheduledTime}
                placeholder="09:00"
                placeholderTextColor='#94a3b8'
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Price (€)</Text>
          <View style={styles.priceInput}>
            <Text style={styles.priceSymbol}>€</Text>
            <TextInput
              style={[styles.input, styles.priceField]}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor='#94a3b8'
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Internal notes, special instructions..."
            placeholderTextColor='#94a3b8'
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Save button at bottom */}
        <TouchableOpacity
          style={[styles.saveBottomButton, saving && styles.saveBottomButtonDisabled]}
          onPress={handleSave}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBottomButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return '#ef4444';
    case 'high': return '#f59e0b';
    case 'normal': return '#3b82f6';
    case 'low': return '#9ca3af';
    default: return '#3b82f6';
  }
}

const E = {
  bg: '#0f172a',
  surface: '#1e293b',
  border: '#334155',
  input: '#253347',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  blue: '#3b82f6',
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: E.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: E.border,
    backgroundColor: E.surface,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  backButtonText: {
    fontSize: 16,
    color: E.text,
    marginLeft: -4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: E.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  saveButton: {
    width: 60,
    height: 34,
    backgroundColor: E.blue,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: E.bg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 8,
  },
  section: {
    backgroundColor: E.surface,
    borderWidth: 1,
    borderColor: E.border,
    borderRadius: 12,
    padding: 16,
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: E.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: E.textMuted,
    marginTop: 8,
    marginBottom: 2,
  },
  input: {
    backgroundColor: E.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: E.text,
    borderWidth: 1,
    borderColor: E.border,
  },
  multiline: {
    minHeight: 80,
    paddingTop: 10,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: E.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: E.border,
  },
  pickerText: {
    fontSize: 15,
    color: E.text,
  },
  pickerDropdown: {
    backgroundColor: E.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: E.border,
    overflow: 'hidden',
    marginTop: 4,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: E.border,
  },
  pickerOptionSelected: {
    backgroundColor: '#1e3a5f',
  },
  pickerOptionText: {
    fontSize: 15,
    color: E.text,
  },
  pickerOptionTextSelected: {
    color: E.blue,
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowHalf: {
    flex: 1,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceSymbol: {
    fontSize: 17,
    fontWeight: '600',
    color: E.text,
    marginRight: 6,
  },
  priceField: {
    flex: 1,
  },
  saveBottomButton: {
    backgroundColor: E.blue,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBottomButtonDisabled: {
    opacity: 0.6,
  },
  saveBottomButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
