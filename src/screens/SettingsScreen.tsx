import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  PermissionsAndroid,
  NativeModules,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';
import { profileAPI, getAPIError } from '../services/api';
import LanguageToggle from '../components/LanguageToggle';
import { useTranslation } from 'react-i18next';

type SettingsScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'Settings'>;
type SettingSection = 'main' | 'account' | 'assistant' | 'app' | 'privacy' | 'legal' | 'help';

// Define specific colors for this screen to match the screenshot exactly
const S_COLORS = {
  background: '#0f172a', // Slate 950
  cardDark: '#1e293b',   // Slate 800
  cardLight: '#ffffff',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  border: '#334155',
  accentBlue: '#3b82f6',
  accentGreen: '#4ade80',
  accentGreenBg: '#dcfce7',
  accentGreenText: '#166534',
  danger: '#ef4444',
  warning: '#f59e0b',
};

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [orbColor, setOrbColor] = useState('#3b82f6');
  const [currentSection, setCurrentSection] = useState<SettingSection>('main');

  // Real data from API
  const [profile, setProfile] = useState<any>(null);
  const [completionPercent, setCompletionPercent] = useState(0);

  // App Settings State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [msgNotifications, setMsgNotifications] = useState(true);

  // Real permission states
  const [locationPerm, setLocationPerm] = useState(false);
  const [cameraPerm, setCameraPerm] = useState(false);

  // Job Automation from backend
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [postCallThreshold, setPostCallThreshold] = useState(30);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useFocusEffect(useCallback(() => { loadSettings(); }, []));

  const loadSettings = async () => {
    try {
      const color = await jsonStorage.getItem(STORAGE_KEYS.ORB_COLOR);
      if (color) setOrbColor(color as string);

      // Load real profile + stats (independently — one failure shouldn't block the other)
      try {
        const profileRes = await profileAPI.get();
        const p = profileRes.data?.provider;
        setProfile(p);

        const checks = [!!p?.name, !!p?.phone, !!p?.nif, !!p?.trade,
          p?.services?.length > 0, p?.locations?.length > 0,
          p?.working_hours?.some((h: any) => h.is_active),
          !!(p?.coverage_cities?.length || p?.coverage_radius)];
        setCompletionPercent(Math.round(checks.filter(Boolean).length / checks.length * 100));
      } catch (e) { console.warn('Profile load failed:', e); }

      // Stats/rating removed — Dashboard not in MVP

      // Check real permissions
      if (Platform.OS === 'android') {
        const loc = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        const cam = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
        setLocationPerm(loc);
        setCameraPerm(cam);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveBackendSettings = async (patch: { digest_enabled?: boolean; post_call_threshold?: number; quiet_hours_enabled?: boolean }) => {
    setSavingSettings(true);
    try {
      await profileAPI.update(patch as any);
    } catch (err) {
      console.error('Failed to save settings:', getAPIError(err));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleBack = () => {
    if (currentSection !== 'main') {
      setCurrentSection('main');
    } else {
      // We are on main tab, so we don't go back further
    }
  };

  // --- Render Helpers ---

  const renderHeader = (title: string) => (
    <View style={styles.header}>
      {currentSection !== 'main' && (
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={S_COLORS.textPrimary} />
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      <LanguageToggle />
      <TouchableOpacity style={styles.notificationButton}>
        <Icon name="bell-outline" size={24} color={S_COLORS.textPrimary} />
        <View style={styles.notificationBadge}>
          <Text style={styles.notificationBadgeText}>1</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderSectionItem = (icon: string, label: string, subtitle: string, onPress?: () => void) => (
    <TouchableOpacity style={styles.sectionItem} onPress={onPress}>
      <View style={styles.sectionIconContainer}>
        <Icon name={icon} size={20} color={orbColor} />
      </View>
      <View style={styles.sectionContent}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={styles.sectionDescription}>{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={S_COLORS.textSecondary} />
    </TouchableOpacity>
  );

  const renderToggleItem = (label: string, subtitle: string, value: boolean, onValueChange: (val: boolean) => void) => (
    <View style={styles.toggleItem}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#334155', true: orbColor }}
        thumbColor={'#fff'}
      />
    </View>
  );

  const renderInfoRow = (label: string, value: string) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  // --- Sub-Screen Renderers ---

  const renderAppSettings = () => (
    <View style={styles.subScreenContainer}>
      <Text style={styles.subSectionHeader}>{t('settings.notifications')}</Text>
      <View style={styles.cardDark}>
        {renderToggleItem(t('settings.pushNotifications'), t('settings.pushNotificationsDesc'), notificationsEnabled, setNotificationsEnabled)}
        <View style={styles.separator} />
        {renderToggleItem(t('settings.jobAlertSound'), t('settings.jobAlertSoundDesc'), soundEnabled, setSoundEnabled)}
        <View style={styles.separator} />
        {renderToggleItem(t('settings.messageNotifications'), t('settings.messageNotificationsDesc'), msgNotifications, setMsgNotifications)}
      </View>

      <Text style={styles.subSectionHeader}>{t('settings.languageRegion')}</Text>
      <View style={styles.cardDark}>
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="web" size={20} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <Text style={styles.actionRowText}>{t('settings.language')}</Text>
          <Text style={styles.actionRowValue}>{i18n.language === 'pt' ? t('settings.portuguese') : t('settings.english')}</Text>
          <Icon name="chevron-right" size={20} color={S_COLORS.textSecondary} />
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="map-marker" size={20} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <Text style={styles.actionRowText}>{t('settings.region')}</Text>
          <Text style={styles.actionRowValue}>{t('settings.portugal')}</Text>
          <Icon name="chevron-right" size={20} color={S_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Billing removed — no billing system in MVP

  const renderPrivacySecurity = () => (
    <View style={styles.subScreenContainer}>
      <Text style={styles.subSectionHeader}>{t('settings.permissions')}</Text>
      <View style={styles.cardDark}>
        <View style={styles.actionRow}>
          <Icon name="map-marker" size={18} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>{t('settings.location')}</Text>
            <Text style={styles.toggleSubtitle}>{t('settings.locationDesc')}</Text>
          </View>
          <View style={locationPerm ? styles.badgeSuccess : styles.badgeDanger}>
            <Text style={locationPerm ? styles.badgeText : styles.badgeTextDanger}>
              {locationPerm ? t('settings.enabled') : t('settings.disabled')}
            </Text>
          </View>
        </View>
        <View style={styles.separator} />
        <View style={styles.actionRow}>
          <Icon name="camera" size={18} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>{t('settings.cameraPermission')}</Text>
            <Text style={styles.toggleSubtitle}>{t('settings.cameraPermissionDesc')}</Text>
          </View>
          <View style={cameraPerm ? styles.badgeSuccess : styles.badgeDanger}>
            <Text style={cameraPerm ? styles.badgeText : styles.badgeTextDanger}>
              {cameraPerm ? t('settings.enabled') : t('settings.disabled')}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.subSectionHeader}>{t('settings.account')}</Text>
      <View style={styles.cardDark}>
        {renderInfoRow(t('profile.phone'), profile?.phone || '—')}
        <View style={styles.separator} />
        {renderInfoRow(t('settings.authMethod'), t('settings.authMethodValue'))}
      </View>
    </View>
  );

  const renderAssistantSettings = () => (
    <View style={styles.subScreenContainer}>
      <Text style={styles.subSectionHeader}>{t('settings.jobAutomation')}</Text>
      <View style={styles.cardDark}>
        {renderToggleItem(
          t('settings.dailyDigest'),
          t('settings.dailyDigestDesc'),
          digestEnabled,
          (val) => {
            setDigestEnabled(val);
            saveBackendSettings({ digest_enabled: val });
          }
        )}
        <View style={styles.separator} />
        {renderToggleItem(
          t('settings.quietHours'),
          t('settings.quietHoursDesc'),
          quietHoursEnabled,
          (val) => {
            setQuietHoursEnabled(val);
            saveBackendSettings({ quiet_hours_enabled: val });
          }
        )}
        <View style={styles.separator} />
        <View style={styles.toggleItem}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.toggleLabel}>{t('settings.postCallPrompt')}</Text>
            <Text style={styles.toggleSubtitle}>{t('settings.postCallDesc', { seconds: postCallThreshold })}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => {
                const v = Math.max(10, postCallThreshold - 10);
                setPostCallThreshold(v);
                saveBackendSettings({ post_call_threshold: v });
                // Save to native SharedPrefs so TregoPersistentService reads it
                NativeModules.TregoNotification?.setPostCallThreshold?.(v);
              }}>
              <Icon name="minus" size={16} color={orbColor} />
            </TouchableOpacity>
            <Text style={[styles.toggleLabel, { minWidth: 32, textAlign: 'center' }]}>{postCallThreshold}s</Text>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => {
                const v = Math.min(120, postCallThreshold + 10);
                setPostCallThreshold(v);
                saveBackendSettings({ post_call_threshold: v });
                NativeModules.TregoNotification?.setPostCallThreshold?.(v);
              }}>
              <Icon name="plus" size={16} color={orbColor} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Text style={styles.subSectionHeader}>{t('settings.appearance')}</Text>
      <View style={styles.cardDark}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('settings.orbColor')}</Text>
          <View style={[styles.colorDot, { backgroundColor: orbColor }]} />
        </View>
      </View>
    </View>
  );

  const renderLegal = () => (
    <View style={styles.subScreenContainer}>
      <Text style={styles.subSectionHeader}>{t('settings.legalDocuments')}</Text>
      <View style={styles.cardDark}>
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="file-document-outline" size={20} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <Text style={styles.actionRowText}>{t('settings.privacyPolicy')}</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="file-document-outline" size={20} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <Text style={styles.actionRowText}>{t('settings.termsOfService')}</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="shield-check-outline" size={20} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <Text style={styles.actionRowText}>{t('settings.dataProtection')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subSectionHeader}>{t('settings.compliance')}</Text>
      <View style={styles.cardDark}>
        <View style={styles.actionRow}>
          <Text style={[styles.toggleLabel, { flex: 1 }]}>{t('settings.gdprCompliant')}</Text>
          <View style={styles.badgeSuccess}>
            <Icon name="check" size={12} color="#166534" style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>{t('common.yes')}</Text>
          </View>
        </View>
        <View style={styles.separator} />
        <View style={styles.actionRow}>
          <Text style={[styles.toggleLabel, { flex: 1 }]}>{t('settings.taxAuthority')}</Text>
          <View style={styles.badgeSuccess}>
            <Icon name="check" size={12} color="#166534" style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>{t('settings.certified')}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderHelp = () => (
    <View style={styles.subScreenContainer}>
      <TouchableOpacity style={[styles.cardDark, { borderWidth: 1, borderColor: orbColor + '40' }]}>
        <View style={styles.cardRow}>
          <View style={[styles.iconBox, { backgroundColor: orbColor + '15' }]}>
            <Icon name="message-text-outline" size={24} color={orbColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{t('settings.messageSupport')}</Text>
            <Text style={styles.cardSubtitle}>{t('settings.messageSupportDesc')}</Text>
          </View>
          <Icon name="chevron-right" size={20} color={S_COLORS.textSecondary} />
        </View>
      </TouchableOpacity>

      <Text style={styles.subSectionHeader}>{t('settings.helpResources')}</Text>
      <View style={styles.cardDark}>
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="help-circle-outline" size={20} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <Text style={styles.actionRowText}>{t('settings.helpCenter')}</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="file-document-outline" size={20} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <Text style={styles.actionRowText}>{t('settings.userGuide')}</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="information-outline" size={20} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <Text style={styles.actionRowText}>{t('settings.whatsNew')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subSectionHeader}>{t('settings.about')}</Text>
      <View style={styles.cardDark}>
        {renderInfoRow(t('settings.version'), '1.0.0-mvp')}
        <View style={styles.separator} />
        {renderInfoRow(t('settings.build'), '2026.04.09')}
      </View>
    </View>
  );

  const renderContent = () => {
    switch (currentSection) {
      case 'app': return renderAppSettings();
      case 'privacy': return renderPrivacySecurity();
      case 'assistant': return renderAssistantSettings();
      case 'legal': return renderLegal();
      case 'help': return renderHelp();
      case 'main':
      default:
        return (
          <>
            {/* Complete Your Profile Card — real data */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate('ProfileCompletion' as any)}
            >
              <View style={styles.cardDark}>
                <View style={styles.cardRow}>
                  <View style={[styles.orbIcon, { backgroundColor: orbColor }]}>
                    <Icon name="account" size={16} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>
                        {[profile?.name, profile?.last_name].filter(Boolean).join(' ') || t('settings.completeProfile')}
                      </Text>
                      <Text style={styles.percentText}>{completionPercent}%</Text>
                      <Icon name="chevron-right" size={16} color={S_COLORS.textSecondary} />
                    </View>
                    <Text style={styles.cardSubtitle}>
                      {profile?.trade || t('settings.tapToComplete')}
                    </Text>
                  </View>
                </View>
                <View style={styles.progressContainer}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((_, idx) => (
                    <View key={idx} style={[
                      styles.progressSegment,
                      { backgroundColor: idx < Math.round(completionPercent / 12.5) ? orbColor : '#334155' }
                    ]} />
                  ))}
                </View>
              </View>
            </TouchableOpacity>

            {/* Dashboard removed — not in MVP */}

            {/* Settings List */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsHeader}>{t('settings.settings')}</Text>

              {renderSectionItem('cog', t('settings.appSettings'), t('settings.appSettingsDesc'), () => setCurrentSection('app'))}
              {renderSectionItem('shield-check', t('settings.privacy'), t('settings.privacyDesc'), () => setCurrentSection('privacy'))}
              {renderSectionItem('robot', t('settings.jobAutomation'), t('settings.jobAutomationDesc'), () => setCurrentSection('assistant'))}
              {renderSectionItem('scale-balance', t('settings.legal'), t('settings.legalDesc'), () => setCurrentSection('legal'))}
              {renderSectionItem('help-circle-outline', t('settings.help'), t('settings.helpDesc'), () => setCurrentSection('help'))}
            </View>

            {/* Logout */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() =>
                Alert.alert(
                  t('settings.logOut'),
                  t('settings.logOutConfirm'),
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('settings.logOut'),
                      style: 'destructive',
                      onPress: async () => {
                        await jsonStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
                        // Walk up to root navigator and reset to Auth
                        let nav: any = navigation;
                        while (nav.getParent?.()) nav = nav.getParent();
                        nav.reset({ index: 0, routes: [{ name: 'Auth' }] });
                      },
                    },
                  ]
                )
              }>
              <Icon name="logout-variant" size={20} color={S_COLORS.danger} />
              <Text style={styles.logoutText}>{t('settings.logOut')}</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>{t('settings.appName')}</Text>
            <Text style={styles.copyrightText}>{t('settings.copyright')}</Text>
            <View style={{ height: 40 }} />
          </>
        );
    }
  };

  const getTitle = () => {
    switch (currentSection) {
      case 'app': return t('settings.appSettings');
      // billing removed
      case 'privacy': return t('settings.privacy');
      case 'assistant': return t('settings.jobAutomation');
      case 'legal': return t('settings.legal');
      case 'help': return t('settings.help');
      default: return t('settings.title');
    }
  }

  return (
    <View style={styles.screen}>
      {renderHeader(getTitle())}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: S_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: S_COLORS.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: S_COLORS.textPrimary,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  notificationButton: {
    position: 'relative',
    padding: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: S_COLORS.danger,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: S_COLORS.background,
  },
  notificationBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  cardDark: {
    backgroundColor: S_COLORS.cardDark,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: S_COLORS.border,
  },
  cardGreen: {
    backgroundColor: S_COLORS.accentGreenBg,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  cardLight: {
    backgroundColor: S_COLORS.cardLight,
    borderRadius: 8,
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  orbIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certificateIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: S_COLORS.textPrimary,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '600',
    color: S_COLORS.accentBlue,
    marginRight: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: S_COLORS.textSecondary,
    marginBottom: 6,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  boostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  boostBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  boostBar: {
    width: 3,
    backgroundColor: '#16a34a',
    borderRadius: 1,
  },
  boostText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 11,
    color: S_COLORS.textSecondary,
    marginLeft: 4,
  },
  invoicingSetupCard: {
    backgroundColor: '#0f172a',
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
  },
  invoicingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  invoicingSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  settingsSection: {
    marginTop: 8,
  },
  settingsHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: S_COLORS.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: S_COLORS.cardDark,
    padding: 16,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionContent: {
    flex: 1,
    gap: 2,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: S_COLORS.textPrimary,
  },
  sectionDescription: {
    fontSize: 11,
    color: '#64748b',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: '#2d0a0a',
    borderWidth: 1,
    borderColor: '#ef444440',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: S_COLORS.danger,
  },
  versionText: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 12,
    marginTop: 24,
  },
  copyrightText: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 11,
    marginTop: 4,
  },
  // Sub-screen specific styles
  subScreenContainer: {
    gap: 16,
  },
  subSectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: S_COLORS.textSecondary,
    marginLeft: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: S_COLORS.textPrimary,
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: S_COLORS.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionRowText: {
    fontSize: 14,
    fontWeight: '500',
    color: S_COLORS.textPrimary,
    flex: 1,
  },
  actionRowValue: {
    fontSize: 14,
    color: S_COLORS.textSecondary,
    marginRight: 4,
  },
  infoRow: {
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: S_COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: S_COLORS.textPrimary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  creditBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    marginBottom: 12,
  },
  bigNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  badgeDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fecaca',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeTextDanger: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991b1b',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 6,
    marginTop: 8,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fff',
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  }
});
