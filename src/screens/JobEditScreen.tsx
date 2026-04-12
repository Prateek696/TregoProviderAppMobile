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
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { Colors } from '../shared/constants/colors';
import { jobsAPI, contactsAPI, getAPIError } from '../services/api';
import { mapBackendJob } from '../services/jobActions';
import CountryPicker, { Country, COUNTRIES } from '../components/ui/CountryPicker';
import { useTranslation } from 'react-i18next';

const DEFAULT_COUNTRY: Country = COUNTRIES.find(c => c.code === 'PT') ?? { name: 'Portugal', dialCode: '+351', code: 'PT', flag: '🇵🇹' };

type JobEditNavigationProp = NativeStackNavigationProp<MainStackParamList, 'JobEdit'>;

const CATEGORY_KEYS = ['General', 'Plumbing', 'Electrical', 'Cleaning', 'Painting', 'Carpentry', 'HVAC', 'Landscaping', 'Other'];
const CATEGORY_T_KEYS: Record<string, string> = {
  General: 'jobEdit.categoryGeneral',
  Plumbing: 'jobEdit.categoryPlumbing',
  Electrical: 'jobEdit.categoryElectrical',
  Cleaning: 'jobEdit.categoryCleaning',
  Painting: 'jobEdit.categoryPainting',
  Carpentry: 'jobEdit.categoryCarpentry',
  HVAC: 'jobEdit.categoryHvac',
  Landscaping: 'jobEdit.categoryLandscaping',
  Other: 'jobEdit.categoryOther',
};
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const PRIORITY_T_KEYS: Record<string, string> = {
  low: 'jobEdit.priorityLow',
  normal: 'jobEdit.priorityNormal',
  high: 'jobEdit.priorityHigh',
  urgent: 'jobEdit.priorityUrgent',
};

export default function JobEditScreen() {
  const { t } = useTranslation();
  const CATEGORIES = CATEGORY_KEYS;
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
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [notes, setNotes] = useState('');

  // Picker modals
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480];
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const MINUTES_OPTS = [0, 15, 30, 45];

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const MONTHS = [t('months.janShort'), t('months.febShort'), t('months.marShort'), t('months.aprShort'), t('months.mayShort'), t('months.junShort'),
    t('months.julShort'), t('months.augShort'), t('months.sepShort'), t('months.octShort'), t('months.novShort'), t('months.decShort')];
  const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  // Client
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [loadingClients, setLoadingClients] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editClient, setEditClient] = useState({
    nif: '', type: 'individual', firstName: '', lastName: '',
    businessName: '', phone: '', email: '',
  });
  const [editCountry, setEditCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [newClient, setNewClient] = useState({
    nif: '', type: 'individual', firstName: '', lastName: '',
    businessName: '', phone: '', email: '',
  });
  const [newCountry, setNewCountry] = useState<Country>(DEFAULT_COUNTRY);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      setLoading(true);
      const [jobRes, contactsRes] = await Promise.all([
        jobsAPI.get(jobId),
        contactsAPI.list().catch(() => ({ data: { contacts: [] } })),
      ]);
      const raw = jobRes.data.job;
      const job = mapBackendJob(raw);
      setTitle(job.title || '');
      setDescription(job.description || '');
      setCategory(job.category || 'General');
      setPriority(job.priority || 'normal');
      setAddress(job.address || '');
      setLocation(job.location || '');
      const rawPrice = (job.bidAmount || job.estimatedPrice || '').toString().replace(/[€,]/g, '');
      setPrice(rawPrice);
      if (job.scheduledDate) {
        const d = new Date(job.scheduledDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setScheduledDate(`${yyyy}-${mm}-${dd}`);
      }
      setScheduledTime(job.scheduledTime === 'TBD' ? '' : (job.scheduledTime || ''));
      setDurationMinutes(String(job.estimatedDurationMinutes || 60));
      setNotes(job.notes || '');

      // Load contacts list
      const mapped = contactsRes.data.contacts.map((c: any) => ({
        id: c.id,
        firstName: c.name?.split(' ')[0] || c.name,
        lastName: c.name?.split(' ').slice(1).join(' ') || '',
        businessName: c.business_name || '',
        phone: c.phone || c.phones?.[0]?.number || '',
        email: c.email || '',
        nif: c.nif || '',
        type: c.nif ? 'business' : 'individual',
      }));
      setClientsList(mapped);

      // Pre-select client if job has one
      if (raw.client_id) {
        const existing = mapped.find((c: any) => c.id === raw.client_id);
        if (existing) {
          setSelectedClient(existing);
        } else if (raw.client_name) {
          setSelectedClient({ id: raw.client_id, firstName: raw.client_name, lastName: '', phone: raw.client_phone || '', nif: raw.client_nif || '', type: 'individual' });
        }
      }
    } catch (err) {
      Alert.alert(t('common.error'), t('jobEdit.loadError'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clientsList.filter(c =>
    c.firstName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.lastName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.businessName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone?.includes(clientSearch)
  );

  const validateNif = (nif: string) => !nif || (/^\d{9}$/.test(nif));

  const handleCreateClient = async () => {
    const name = newClient.type === 'individual'
      ? `${newClient.firstName} ${newClient.lastName}`.trim()
      : newClient.businessName;
    if (!name) { Alert.alert(t('jobEdit.nameRequired')); return; }
    if (!validateNif(newClient.nif)) { Alert.alert(t('jobEdit.invalidNif'), t('jobEdit.nifMustBe9')); return; }
    const fullPhone = newClient.phone ? `${newCountry.dialCode}${newClient.phone.replace(/^0/, '')}` : '';
    try {
      const res = await contactsAPI.create({
        name,
        phone: fullPhone || undefined,
        email: newClient.email || undefined,
        nif: newClient.nif || undefined,
      });
      const c = res.data.contact;
      const mapped = {
        id: c.id,
        firstName: newClient.firstName,
        lastName: newClient.lastName,
        businessName: newClient.businessName,
        phone: fullPhone,
        nif: newClient.nif,
        type: newClient.type,
      };
      setClientsList(prev => [mapped, ...prev]);
      setSelectedClient(mapped);
      setIsCreatingClient(false);
      setNewClient({ nif: '', type: 'individual', firstName: '', lastName: '', businessName: '', phone: '', email: '' });
      setNewCountry(DEFAULT_COUNTRY);
    } catch (err) {
      Alert.alert(t('common.error'), getAPIError(err));
    }
  };

  const handleUpdateClient = async () => {
    if (!selectedClient) return;
    const name = editClient.type === 'individual'
      ? `${editClient.firstName} ${editClient.lastName}`.trim()
      : editClient.businessName;
    if (!name) { Alert.alert(t('jobEdit.nameRequired')); return; }
    if (!validateNif(editClient.nif)) { Alert.alert(t('jobEdit.invalidNif'), t('jobEdit.nifMustBe9')); return; }
    const fullPhone = editClient.phone ? `${editCountry.dialCode}${editClient.phone.replace(/^0/, '')}` : '';
    try {
      await contactsAPI.update(selectedClient.id, {
        name,
        phone: fullPhone || undefined,
        email: editClient.email || undefined,
        nif: editClient.nif || undefined,
      });
      const updated = {
        ...selectedClient,
        firstName: editClient.firstName,
        lastName: editClient.lastName,
        businessName: editClient.businessName,
        phone: fullPhone,
        email: editClient.email,
        nif: editClient.nif,
        type: editClient.type,
      };
      setSelectedClient(updated);
      setClientsList(prev => prev.map(c => c.id === selectedClient.id ? updated : c));
      setIsEditingClient(false);
    } catch (err) {
      Alert.alert(t('common.error'), getAPIError(err));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('jobEdit.validation'), t('jobEdit.titleRequired'));
      return;
    }

    setSaving(true);
    try {
      // Build scheduled_at from date + time
      let scheduled_at: string | undefined;
      if (scheduledDate) {
        const timeStr = scheduledTime || '09:00';
        scheduled_at = new Date(`${scheduledDate}T${timeStr}:00Z`).toISOString();
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
        estimated_duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : 60,
        notes: notes.trim(),
        client_id: selectedClient?.id ?? undefined,
      });

      navigation.goBack();
    } catch (err) {
      Alert.alert(t('jobEdit.saveFailed'), getAPIError(err));
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
            <Text style={styles.backButtonText}>{t('jobEdit.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('jobEdit.title')}</Text>
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
            <Text style={styles.saveButtonText}>{t('jobEdit.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('jobEdit.client')}</Text>

          {!isCreatingClient ? (
            <>
              {selectedClient && !isEditingClient ? (
                <TouchableOpacity
                  style={styles.selectedClientRow}
                  onPress={() => {
                    // Detect country from stored phone and strip dial code
                    const storedPhone = selectedClient.phone || '';
                    const matchedCountry = COUNTRIES.find(c => storedPhone.startsWith(c.dialCode)) || DEFAULT_COUNTRY;
                    const localPhone = storedPhone.startsWith(matchedCountry.dialCode)
                      ? storedPhone.slice(matchedCountry.dialCode.length)
                      : storedPhone;
                    setEditCountry(matchedCountry);
                    setEditClient({
                      type: selectedClient.type || 'individual',
                      firstName: selectedClient.firstName || '',
                      lastName: selectedClient.lastName || '',
                      businessName: selectedClient.businessName || '',
                      phone: localPhone,
                      nif: selectedClient.nif || '',
                      email: selectedClient.email || '',
                    });
                    setIsEditingClient(true);
                  }}>
                  <View style={styles.clientAvatar}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                      {(selectedClient.firstName?.[0] || selectedClient.businessName?.[0] || '?').toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientName}>
                      {selectedClient.firstName ? `${selectedClient.firstName} ${selectedClient.lastName}`.trim() : selectedClient.businessName}
                    </Text>
                    {selectedClient.phone ? <Text style={styles.clientPhone}>{selectedClient.phone}</Text> : null}
                    {selectedClient.nif ? <Text style={styles.clientPhone}>NIF: {selectedClient.nif}</Text> : null}
                  </View>
                  <Icon name="pencil-outline" size={18} color={E.textMuted} />
                  <TouchableOpacity onPress={() => setSelectedClient(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="close" size={20} color={E.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ) : selectedClient && isEditingClient ? (
                <>
                  <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>{t('jobEdit.editClient')}</Text>

                  <Text style={styles.fieldLabel}>{t('jobEdit.clientType')}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    {['individual', 'business'].map(ct => (
                      <TouchableOpacity key={ct} style={[styles.typeChip, editClient.type === ct && styles.typeChipActive]}
                        onPress={() => setEditClient({ ...editClient, type: ct })}>
                        <Text style={[styles.typeChipText, editClient.type === ct && { color: '#fff' }]}>{ct === 'individual' ? t('jobEdit.individual') : t('jobEdit.business')}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {editClient.type === 'individual' ? (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>{t('jobEdit.firstName')}</Text>
                        <TextInput style={styles.input} placeholder={t('jobEdit.firstNamePh')} placeholderTextColor={E.textMuted} value={editClient.firstName} onChangeText={v => setEditClient({ ...editClient, firstName: v })} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>{t('jobEdit.lastName')}</Text>
                        <TextInput style={styles.input} placeholder={t('jobEdit.lastNamePh')} placeholderTextColor={E.textMuted} value={editClient.lastName} onChangeText={v => setEditClient({ ...editClient, lastName: v })} />
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.fieldLabel}>{t('jobEdit.businessName')}</Text>
                      <TextInput style={styles.input} placeholder={t('jobEdit.businessNamePh')} placeholderTextColor={E.textMuted} value={editClient.businessName} onChangeText={v => setEditClient({ ...editClient, businessName: v })} />
                    </>
                  )}

                  <Text style={styles.fieldLabel}>{t('jobEdit.nif')}</Text>
                  <View style={styles.nifRow}>
                    <View style={styles.nifPrefix}><Text style={styles.nifPrefixText}>PT</Text></View>
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder={t('jobEdit.nifPh')} placeholderTextColor={E.textMuted} value={editClient.nif} onChangeText={v => setEditClient({ ...editClient, nif: v.replace(/\D/g, '').slice(0, 9) })} keyboardType="number-pad" maxLength={9} />
                  </View>

                  <Text style={styles.fieldLabel}>{t('jobEdit.phone')}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <CountryPicker selected={editCountry} onSelect={setEditCountry} />
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder={t('jobEdit.phonePh')} placeholderTextColor={E.textMuted} value={editClient.phone} onChangeText={v => setEditClient({ ...editClient, phone: v })} keyboardType="phone-pad" />
                  </View>

                  <Text style={styles.fieldLabel}>{t('jobEdit.email')}</Text>
                  <TextInput style={styles.input} placeholder={t('jobEdit.emailPh')} placeholderTextColor={E.textMuted} value={editClient.email} onChangeText={v => setEditClient({ ...editClient, email: v })} keyboardType="email-address" autoCapitalize="none" />

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <TouchableOpacity style={[styles.createClientBtn, { flex: 1 }]} onPress={() => setIsEditingClient(false)}>
                      <Text style={[styles.createClientBtnText, { color: E.textMuted }]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.saveBottomButton, { flex: 2, marginTop: 0, height: 42 }]} onPress={handleUpdateClient}>
                      <Text style={styles.saveBottomButtonText}>{t('jobEdit.saveClient')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.searchBox}>
                    <Icon name="magnify" size={18} color={E.textMuted} style={{ marginRight: 6 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder={t('jobEdit.searchClient')}
                      placeholderTextColor={E.textMuted}
                      value={clientSearch}
                      onChangeText={setClientSearch}
                    />
                  </View>
                  {clientSearch.length > 0 && (
                    <View style={styles.clientResultsList}>
                      {filteredClients.map(client => (
                        <TouchableOpacity key={client.id} style={styles.clientItem} onPress={() => { setSelectedClient(client); setClientSearch(''); }}>
                          <View style={styles.clientAvatar}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                              {(client.firstName?.[0] || client.businessName?.[0] || '?').toUpperCase()}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.clientName}>{client.firstName ? `${client.firstName} ${client.lastName}`.trim() : client.businessName}</Text>
                            <Text style={styles.clientPhone}>{client.phone}{client.nif ? `  NIF: ${client.nif}` : ''}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              {!selectedClient && (
                <TouchableOpacity style={styles.createClientBtn} onPress={() => setIsCreatingClient(true)}>
                  <Icon name="plus" size={18} color={E.blue} />
                  <Text style={styles.createClientBtnText}>{t('jobEdit.createNewClient')}</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>{t('jobEdit.clientType')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                {['individual', 'business'].map(ct => (
                  <TouchableOpacity key={ct} style={[styles.typeChip, newClient.type === ct && styles.typeChipActive]}
                    onPress={() => setNewClient({ ...newClient, type: ct })}>
                    <Text style={[styles.typeChipText, newClient.type === ct && { color: '#fff' }]}>{ct === 'individual' ? t('jobEdit.individual') : t('jobEdit.business')}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {newClient.type === 'individual' ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>First Name *</Text>
                    <TextInput style={styles.input} placeholder={t('jobEdit.firstNamePh')} placeholderTextColor={E.textMuted} value={newClient.firstName} onChangeText={v => setNewClient({ ...newClient, firstName: v })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Last Name</Text>
                    <TextInput style={styles.input} placeholder={t('jobEdit.lastNamePh')} placeholderTextColor={E.textMuted} value={newClient.lastName} onChangeText={v => setNewClient({ ...newClient, lastName: v })} />
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>Business Name *</Text>
                  <TextInput style={styles.input} placeholder={t('jobEdit.businessNamePh')} placeholderTextColor={E.textMuted} value={newClient.businessName} onChangeText={v => setNewClient({ ...newClient, businessName: v })} />
                </>
              )}

              <Text style={styles.fieldLabel}>{t('jobEdit.nif')}</Text>
              <View style={styles.nifRow}>
                <View style={styles.nifPrefix}><Text style={styles.nifPrefixText}>PT</Text></View>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder={t('jobEdit.nifPh')} placeholderTextColor={E.textMuted} value={newClient.nif} onChangeText={v => setNewClient({ ...newClient, nif: v.replace(/\D/g, '').slice(0, 9) })} keyboardType="number-pad" maxLength={9} />
              </View>

              <Text style={styles.fieldLabel}>{t('jobEdit.phone')}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <CountryPicker selected={newCountry} onSelect={setNewCountry} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder={t('jobEdit.phonePh')} placeholderTextColor={E.textMuted} value={newClient.phone} onChangeText={v => setNewClient({ ...newClient, phone: v })} keyboardType="phone-pad" />
              </View>

              <Text style={styles.fieldLabel}>{t('jobEdit.email')}</Text>
              <TextInput style={styles.input} placeholder={t('jobEdit.emailPh')} placeholderTextColor={E.textMuted} value={newClient.email} onChangeText={v => setNewClient({ ...newClient, email: v })} keyboardType="email-address" autoCapitalize="none" />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity style={[styles.createClientBtn, { flex: 1 }]} onPress={() => setIsCreatingClient(false)}>
                  <Text style={[styles.createClientBtnText, { color: E.textMuted }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBottomButton, { flex: 2, marginTop: 0, height: 42 }]} onPress={handleCreateClient}>
                  <Text style={styles.saveBottomButtonText}>{t('jobEdit.saveClient')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('jobEdit.basicInfo')}</Text>

          <Text style={styles.fieldLabel}>{t('jobEdit.titleLabel')}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t('jobEdit.titlePh')}
            placeholderTextColor='#94a3b8'
          />

          <Text style={styles.fieldLabel}>{t('jobEdit.description')}</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('jobEdit.descPh')}
            placeholderTextColor='#94a3b8'
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Category & Priority */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('jobEdit.classification')}</Text>

          <Text style={styles.fieldLabel}>{t('jobEdit.category')}</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowCategoryPicker(v => !v)}>
            <Text style={styles.pickerText}>{t(CATEGORY_T_KEYS[category] || 'jobEdit.categoryGeneral')}</Text>
            <Icon name={showCategoryPicker ? 'chevron-up' : 'chevron-down'} size={20} color='#94a3b8' />
          </TouchableOpacity>
          {showCategoryPicker && (
            <View style={styles.pickerDropdown}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pickerOption, c === category && styles.pickerOptionSelected]}
                  onPress={() => { setCategory(c); setShowCategoryPicker(false); }}>
                  <Text style={[styles.pickerOptionText, c === category && styles.pickerOptionTextSelected]}>{t(CATEGORY_T_KEYS[c] || 'jobEdit.categoryGeneral')}</Text>
                  {c === category && <Icon name="check" size={16} color={Colors.tregoBlue} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.fieldLabel}>{t('jobEdit.priority')}</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowPriorityPicker(v => !v)}>
            <View style={styles.priorityRow}>
              <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(priority) }]} />
              <Text style={styles.pickerText}>{t(PRIORITY_T_KEYS[priority] || 'jobEdit.priorityNormal')}</Text>
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
                      {t(PRIORITY_T_KEYS[p] || 'jobEdit.priorityNormal')}
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
          <Text style={styles.sectionTitle}>{t('jobEdit.location')}</Text>

          <Text style={styles.fieldLabel}>{t('jobEdit.address')}</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder={t('jobEdit.addressPh')}
            placeholderTextColor='#94a3b8'
          />

          <Text style={styles.fieldLabel}>{t('jobEdit.city')}</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder={t('jobEdit.cityPh')}
            placeholderTextColor='#94a3b8'
          />
        </View>

        {/* Schedule & Price */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('jobEdit.scheduleAndPrice')}</Text>

          <View style={styles.row}>
            <View style={styles.rowHalf}>
              <Text style={styles.fieldLabel}>{t('jobEdit.date')}</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => {
                if (scheduledDate) {
                  const [y, m] = scheduledDate.split('-');
                  setPickerYear(parseInt(y)); setPickerMonth(parseInt(m) - 1);
                }
                setShowDatePicker(true);
              }}>
                <Icon name="calendar" size={16} color="#94a3b8" />
                <Text style={styles.pickerBtnText}>{scheduledDate || t('jobEdit.selectDate')}</Text>
                <Icon name="chevron-down" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <View style={styles.rowHalf}>
              <Text style={styles.fieldLabel}>{t('jobEdit.time')}</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowTimePicker(true)}>
                <Icon name="clock-outline" size={16} color="#94a3b8" />
                <Text style={styles.pickerBtnText}>{scheduledTime || t('jobEdit.selectTime')}</Text>
                <Icon name="chevron-down" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.fieldLabel}>{t('jobEdit.duration')}</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDurationPicker(true)}>
            <Icon name="clock-outline" size={16} color="#94a3b8" />
            <Text style={styles.pickerBtnText}>{t('jobEdit.durationMin', { n: durationMinutes })}</Text>
            <Icon name="chevron-down" size={16} color="#94a3b8" />
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>{t('jobEdit.price')}</Text>
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
          <Text style={styles.sectionTitle}>{t('jobEdit.notes')}</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('jobEdit.notesPh')}
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
            <Text style={styles.saveBottomButtonText}>{t('jobEdit.saveChanges')}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerModalTitle}>{t('jobEdit.selectDateTitle')}</Text>
            <View style={styles.monthYearRow}>
              {MONTHS.map((m, i) => (
                <TouchableOpacity key={m} onPress={() => setPickerMonth(i)}
                  style={[styles.monthYearChip, pickerMonth === i && styles.monthYearChipActive]}>
                  <Text style={[styles.monthYearChipText, pickerMonth === i && { color: '#fff' }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.monthYearRow}>
              {YEARS.map(y => (
                <TouchableOpacity key={y} onPress={() => setPickerYear(y)}
                  style={[styles.monthYearChip, pickerYear === y && styles.monthYearChipActive]}>
                  <Text style={[styles.monthYearChipText, pickerYear === y && { color: '#fff' }]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <FlatList
              data={Array.from({ length: getDaysInMonth(pickerMonth, pickerYear) }, (_, i) => i + 1)}
              numColumns={7}
              keyExtractor={d => String(d)}
              renderItem={({ item: day }) => {
                const dateStr = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const selected = scheduledDate === dateStr;
                return (
                  <TouchableOpacity style={[styles.dayCell, selected && styles.dayCellActive]}
                    onPress={() => { setScheduledDate(dateStr); setShowDatePicker(false); }}>
                    <Text style={[styles.dayCellText, selected && { color: '#fff' }]}>{day}</Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={styles.pickerCancelBtn} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.pickerCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={showTimePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerModalTitle}>{t('jobEdit.selectTimeTitle')}</Text>
            <View style={styles.timePickerRow}>
              <FlatList
                data={HOURS}
                keyExtractor={h => String(h)}
                style={styles.timeColumn}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: h }) => {
                  const hh = String(h).padStart(2, '0');
                  const cur = scheduledTime?.split(':')[0];
                  const active = cur === hh;
                  return (
                    <TouchableOpacity style={[styles.timeCell, active && styles.timeCellActive]}
                      onPress={() => {
                        const mm = scheduledTime?.split(':')[1] || '00';
                        setScheduledTime(`${hh}:${mm}`);
                      }}>
                      <Text style={[styles.timeCellText, active && { color: '#fff' }]}>{hh}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
              <Text style={styles.timeSeparator}>:</Text>
              <FlatList
                data={MINUTES_OPTS}
                keyExtractor={m => String(m)}
                style={styles.timeColumn}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: m }) => {
                  const mm = String(m).padStart(2, '0');
                  const cur = scheduledTime?.split(':')[1];
                  const active = cur === mm;
                  return (
                    <TouchableOpacity style={[styles.timeCell, active && styles.timeCellActive]}
                      onPress={() => {
                        const hh = scheduledTime?.split(':')[0] || '09';
                        setScheduledTime(`${hh}:${mm}`);
                      }}>
                      <Text style={[styles.timeCellText, active && { color: '#fff' }]}>{mm}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
            <TouchableOpacity style={styles.pickerConfirmBtn} onPress={() => setShowTimePicker(false)}>
              <Text style={styles.pickerConfirmText}>{t('jobEdit.confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Duration Picker Modal */}
      <Modal visible={showDurationPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerModalTitle}>{t('jobEdit.selectDurationTitle')}</Text>
            <FlatList
              data={DURATION_OPTIONS}
              numColumns={3}
              keyExtractor={d => String(d)}
              renderItem={({ item: d }) => {
                const label = d >= 60 ? `${d / 60}h${d % 60 ? ` ${d % 60}m` : ''}` : `${d}m`;
                const active = durationMinutes === String(d);
                return (
                  <TouchableOpacity style={[styles.durationCell, active && styles.dayCellActive]}
                    onPress={() => { setDurationMinutes(String(d)); setShowDurationPicker(false); }}>
                    <Text style={[styles.durationCellText, active && { color: '#fff' }]}>{label}</Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={styles.pickerCancelBtn} onPress={() => setShowDurationPicker(false)}>
              <Text style={styles.pickerCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: E.input,
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: E.border,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: E.text,
  },
  clientResultsList: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: E.border,
    overflow: 'hidden',
    marginBottom: 8,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: E.border,
    backgroundColor: E.input,
  },
  selectedClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1e3a5f',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: E.blue,
  },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: E.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: E.text,
  },
  clientPhone: {
    fontSize: 12,
    color: E.textMuted,
    marginTop: 2,
  },
  createClientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  createClientBtnText: {
    fontSize: 14,
    color: E.blue,
    fontWeight: '500',
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: E.border,
    backgroundColor: E.input,
  },
  typeChipActive: {
    backgroundColor: E.blue,
    borderColor: E.blue,
  },
  typeChipText: {
    fontSize: 14,
    color: E.textMuted,
  },
  nifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nifPrefix: {
    backgroundColor: E.input,
    borderWidth: 1,
    borderColor: E.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },
  nifPrefixText: {
    fontSize: 15,
    fontWeight: '700',
    color: E.textMuted,
    letterSpacing: 1,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: E.surface,
    borderWidth: 1,
    borderColor: E.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 4,
  },
  pickerBtnText: {
    flex: 1,
    color: E.text,
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: E.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  pickerModalTitle: {
    color: E.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  monthYearRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  monthYearChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: E.bg,
    borderWidth: 1,
    borderColor: E.border,
  },
  monthYearChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  monthYearChipText: {
    color: E.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  dayCell: {
    width: 38,
    height: 38,
    margin: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: E.bg,
  },
  dayCellActive: {
    backgroundColor: '#3b82f6',
  },
  dayCellText: {
    color: E.text,
    fontSize: 13,
    fontWeight: '500',
  },
  pickerCancelBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: E.border,
  },
  pickerCancelText: {
    color: E.textMuted,
    fontSize: 15,
  },
  pickerConfirmBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  pickerConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 200,
  },
  timeColumn: {
    width: 80,
  },
  timeCell: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
    backgroundColor: E.bg,
  },
  timeCellActive: {
    backgroundColor: '#3b82f6',
  },
  timeCellText: {
    color: E.text,
    fontSize: 18,
    fontWeight: '600',
  },
  timeSeparator: {
    color: E.text,
    fontSize: 24,
    fontWeight: '700',
  },
  durationCell: {
    flex: 1,
    margin: 4,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: E.bg,
  },
  durationCellText: {
    color: E.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
