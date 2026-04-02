import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export interface Country {
  name: string;
  dialCode: string;
  code: string;
  flag: string;
}

// Full country list with emoji flags
export const COUNTRIES: Country[] = [
  { name: 'Portugal', dialCode: '+351', code: 'PT', flag: '🇵🇹' },
  { name: 'Spain', dialCode: '+34', code: 'ES', flag: '🇪🇸' },
  { name: 'United Kingdom', dialCode: '+44', code: 'GB', flag: '🇬🇧' },
  { name: 'France', dialCode: '+33', code: 'FR', flag: '🇫🇷' },
  { name: 'Germany', dialCode: '+49', code: 'DE', flag: '🇩🇪' },
  { name: 'Italy', dialCode: '+39', code: 'IT', flag: '🇮🇹' },
  { name: 'Netherlands', dialCode: '+31', code: 'NL', flag: '🇳🇱' },
  { name: 'Belgium', dialCode: '+32', code: 'BE', flag: '🇧🇪' },
  { name: 'Switzerland', dialCode: '+41', code: 'CH', flag: '🇨🇭' },
  { name: 'Austria', dialCode: '+43', code: 'AT', flag: '🇦🇹' },
  { name: 'Sweden', dialCode: '+46', code: 'SE', flag: '🇸🇪' },
  { name: 'Norway', dialCode: '+47', code: 'NO', flag: '🇳🇴' },
  { name: 'Denmark', dialCode: '+45', code: 'DK', flag: '🇩🇰' },
  { name: 'Finland', dialCode: '+358', code: 'FI', flag: '🇫🇮' },
  { name: 'Poland', dialCode: '+48', code: 'PL', flag: '🇵🇱' },
  { name: 'Czech Republic', dialCode: '+420', code: 'CZ', flag: '🇨🇿' },
  { name: 'Hungary', dialCode: '+36', code: 'HU', flag: '🇭🇺' },
  { name: 'Romania', dialCode: '+40', code: 'RO', flag: '🇷🇴' },
  { name: 'Greece', dialCode: '+30', code: 'GR', flag: '🇬🇷' },
  { name: 'Ireland', dialCode: '+353', code: 'IE', flag: '🇮🇪' },
  { name: 'Luxembourg', dialCode: '+352', code: 'LU', flag: '🇱🇺' },
  { name: 'United States', dialCode: '+1', code: 'US', flag: '🇺🇸' },
  { name: 'Canada', dialCode: '+1', code: 'CA', flag: '🇨🇦' },
  { name: 'Brazil', dialCode: '+55', code: 'BR', flag: '🇧🇷' },
  { name: 'Angola', dialCode: '+244', code: 'AO', flag: '🇦🇴' },
  { name: 'Mozambique', dialCode: '+258', code: 'MZ', flag: '🇲🇿' },
  { name: 'Cape Verde', dialCode: '+238', code: 'CV', flag: '🇨🇻' },
  { name: 'Guinea-Bissau', dialCode: '+245', code: 'GW', flag: '🇬🇼' },
  { name: 'São Tomé & Príncipe', dialCode: '+239', code: 'ST', flag: '🇸🇹' },
  { name: 'Timor-Leste', dialCode: '+670', code: 'TL', flag: '🇹🇱' },
  { name: 'India', dialCode: '+91', code: 'IN', flag: '🇮🇳' },
  { name: 'China', dialCode: '+86', code: 'CN', flag: '🇨🇳' },
  { name: 'Japan', dialCode: '+81', code: 'JP', flag: '🇯🇵' },
  { name: 'South Korea', dialCode: '+82', code: 'KR', flag: '🇰🇷' },
  { name: 'Australia', dialCode: '+61', code: 'AU', flag: '🇦🇺' },
  { name: 'New Zealand', dialCode: '+64', code: 'NZ', flag: '🇳🇿' },
  { name: 'South Africa', dialCode: '+27', code: 'ZA', flag: '🇿🇦' },
  { name: 'Nigeria', dialCode: '+234', code: 'NG', flag: '🇳🇬' },
  { name: 'Kenya', dialCode: '+254', code: 'KE', flag: '🇰🇪' },
  { name: 'Morocco', dialCode: '+212', code: 'MA', flag: '🇲🇦' },
  { name: 'Egypt', dialCode: '+20', code: 'EG', flag: '🇪🇬' },
  { name: 'Mexico', dialCode: '+52', code: 'MX', flag: '🇲🇽' },
  { name: 'Argentina', dialCode: '+54', code: 'AR', flag: '🇦🇷' },
  { name: 'Colombia', dialCode: '+57', code: 'CO', flag: '🇨🇴' },
  { name: 'Chile', dialCode: '+56', code: 'CL', flag: '🇨🇱' },
  { name: 'Turkey', dialCode: '+90', code: 'TR', flag: '🇹🇷' },
  { name: 'Israel', dialCode: '+972', code: 'IL', flag: '🇮🇱' },
  { name: 'Saudi Arabia', dialCode: '+966', code: 'SA', flag: '🇸🇦' },
  { name: 'UAE', dialCode: '+971', code: 'AE', flag: '🇦🇪' },
  { name: 'Pakistan', dialCode: '+92', code: 'PK', flag: '🇵🇰' },
  { name: 'Bangladesh', dialCode: '+880', code: 'BD', flag: '🇧🇩' },
  { name: 'Ukraine', dialCode: '+380', code: 'UA', flag: '🇺🇦' },
  { name: 'Russia', dialCode: '+7', code: 'RU', flag: '🇷🇺' },
];

interface CountryPickerProps {
  selected: Country;
  onSelect: (country: Country) => void;
}

export default function CountryPicker({ selected, onSelect }: CountryPickerProps) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)} activeOpacity={0.7}>
        <Text style={styles.flag}>{selected.flag}</Text>
        <Text style={styles.dialCode}>{selected.dialCode}</Text>
        <Icon name="chevron-down" size={16} color="#9ca3af" />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <SafeAreaView style={styles.sheet}>
            <StatusBar barStyle="light-content" />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => { setVisible(false); setSearch(''); }}>
                <Icon name="close" size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Icon name="magnify" size={18} color="#9ca3af" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country or code…"
                placeholderTextColor="#6b7280"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={item => item.code + item.dialCode}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.row, item.code === selected.code && styles.rowSelected]}
                  onPress={() => {
                    onSelect(item);
                    setVisible(false);
                    setSearch('');
                  }}
                  activeOpacity={0.7}>
                  <Text style={styles.rowFlag}>{item.flag}</Text>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowDial}>{item.dialCode}</Text>
                  {item.code === selected.code && (
                    <Icon name="check" size={16} color="#10b981" style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
    alignSelf: 'flex-start',
  },
  flag: {
    fontSize: 20,
  },
  dialCode: {
    fontSize: 15,
    color: '#e5e7eb',
    fontWeight: '500',
    minWidth: 38,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    margin: 12,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 15,
    color: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  rowSelected: {
    backgroundColor: '#10b98115',
  },
  rowFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  rowName: {
    flex: 1,
    fontSize: 15,
    color: '#e5e7eb',
  },
  rowDial: {
    fontSize: 14,
    color: '#9ca3af',
    marginRight: 8,
  },
  checkIcon: {},
  separator: {
    height: 1,
    backgroundColor: '#374151',
    marginLeft: 56,
  },
});
