import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';
import { profileAPI, getAPIError } from '../services/api';

type SettingsScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'Settings'>;
type SettingSection = 'main' | 'account' | 'assistant' | 'app' | 'billing' | 'privacy' | 'legal' | 'help';

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
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [orbColor, setOrbColor] = useState('#3b82f6');
  const [completionPercent, setCompletionPercent] = useState(50);
  const [currentSection, setCurrentSection] = useState<SettingSection>('main');

  // App Settings State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [msgNotifications, setMsgNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true); // Default to dark for this theme

  // Privacy State
  const [twoFactor, setTwoFactor] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  // Assistant State
  const [showTutorial, setShowTutorial] = useState(true);
  const [voiceMessages, setVoiceMessages] = useState(true);
  const [typingAnimation, setTypingAnimation] = useState(true);
  // AI settings from backend
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [postCallThreshold, setPostCallThreshold] = useState(30); // seconds
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Billing State
  const [autoRecharge, setAutoRecharge] = useState(false);
  const [billingLevel, setBillingLevel] = useState(2); // Example value

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const color = await jsonStorage.getItem(STORAGE_KEYS.ORB_COLOR);
      if (color) setOrbColor(color as string);

      // Load backend settings
      const res = await profileAPI.get();
      const settings = res.data?.provider?.settings || {};
      if (typeof settings.digest_enabled === 'boolean') setDigestEnabled(settings.digest_enabled);
      if (typeof settings.post_call_threshold === 'number') setPostCallThreshold(settings.post_call_threshold);
      if (typeof settings.quiet_hours_enabled === 'boolean') setQuietHoursEnabled(settings.quiet_hours_enabled);
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
      <Text style={styles.subSectionHeader}>Notifications</Text>
      <View style={styles.cardDark}>
        {renderToggleItem('Push Notifications', 'Receive job alerts and messages', notificationsEnabled, setNotificationsEnabled)}
        <View style={styles.separator} />
        {renderToggleItem('Job Alert Sound', 'Play sound for new jobs', soundEnabled, setSoundEnabled)}
        <View style={styles.separator} />
        {renderToggleItem('Message Notifications', 'Client chat notifications', msgNotifications, setMsgNotifications)}
      </View>

      <Text style={styles.subSectionHeader}>Appearance</Text>
      <View style={styles.cardDark}>
        {renderToggleItem('Dark Mode', 'Switch to dark theme', darkMode, setDarkMode)}
      </View>

      <Text style={styles.subSectionHeader}>Language & Region</Text>
      <View style={styles.cardDark}>
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="web" size={20} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <Text style={styles.actionRowText}>Language</Text>
          <Text style={styles.actionRowValue}>English</Text>
          <Icon name="chevron-right" size={20} color={S_COLORS.textSecondary} />
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="map-marker" size={20} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <Text style={styles.actionRowText}>Region</Text>
          <Text style={styles.actionRowValue}>Portugal</Text>
          <Icon name="chevron-right" size={20} color={S_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBillingSettings = () => (
    <View style={styles.subScreenContainer}>
      <Text style={styles.subSectionHeader}>App Billing</Text>
      <View style={styles.cardDark}>
        {renderInfoRow('Current Plan', 'Professional')}
        <View style={styles.separator} />
        {renderInfoRow('Billing Cycle', 'Monthly - €29.99/month')}
        <View style={styles.separator} />
        {renderInfoRow('Next Billing Date', 'February 1, 2025')}
        <View style={styles.separator} />
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="credit-card" size={18} color={orbColor} style={{ marginRight: 8 }} />
          <Text style={{ color: orbColor, fontWeight: '600' }}>View Billing History</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subSectionHeader}>Lead Credits</Text>
      <View style={styles.cardDark}>
        <View style={styles.creditBalanceRow}>
          <View>
            <Text style={styles.toggleLabel}>Available Credits</Text>
            <Text style={styles.toggleSubtitle}>Use for premium leads</Text>
          </View>
          <Text style={[styles.bigNumber, { color: orbColor }]}>50</Text>
        </View>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="currency-usd" size={18} color={orbColor} style={{ marginRight: 8 }} />
          <Text style={{ color: orbColor, fontWeight: '600' }}>Buy More Credits</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subSectionHeader}>Auto-Recharge</Text>
      <View style={styles.cardDark}>
        {renderToggleItem('Enable Auto-Recharge', 'Buy 50 credits when below 10', autoRecharge, setAutoRecharge)}
      </View>
    </View>
  );

  const renderPrivacySecurity = () => (
    <View style={styles.subScreenContainer}>
      <Text style={styles.subSectionHeader}>Login & Security</Text>
      <View style={styles.cardDark}>
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="shield-outline" size={20} color={orbColor} style={{ marginRight: 10 }} />
          <Text style={[styles.actionRowText, { color: orbColor }]}>Change Password</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        {renderToggleItem('Two-Factor Authentication', 'Add extra security', twoFactor, setTwoFactor)}
        <View style={styles.separator} />
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="bell-outline" size={20} color={orbColor} style={{ marginRight: 10 }} />
          <Text style={[styles.actionRowText, { color: orbColor }]}>Login Activity</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subSectionHeader}>Data & Privacy</Text>
      <View style={styles.cardDark}>
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="file-document-outline" size={20} color={orbColor} style={{ marginRight: 10 }} />
          <Text style={[styles.actionRowText, { color: orbColor }]}>Download My Data</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        {renderToggleItem('Analytics & Tracking', 'Help us improve', analytics, setAnalytics)}
        <View style={styles.separator} />
        {renderToggleItem('Marketing Communications', 'Tips and updates', marketing, setMarketing)}
      </View>

      <Text style={styles.subSectionHeader}>Permissions</Text>
      <View style={styles.cardDark}>
        <View style={styles.actionRow}>
          <Icon name="map-marker" size={18} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Location</Text>
            <Text style={styles.toggleSubtitle}>For service area</Text>
          </View>
          <View style={styles.badgeSuccess}><Text style={styles.badgeText}>Enabled</Text></View>
        </View>
        <View style={styles.separator} />
        <View style={styles.actionRow}>
          <Icon name="camera" size={18} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Camera</Text>
            <Text style={styles.toggleSubtitle}>For receipts and photos</Text>
          </View>
          <View style={styles.badgeSuccess}><Text style={styles.badgeText}>Enabled</Text></View>
        </View>
      </View>
    </View>
  );

  const renderAssistantSettings = () => (
    <View style={styles.subScreenContainer}>
      <View style={styles.cardDark}>
        <Text style={[styles.cardTitle, { marginBottom: 4 }]}>Customize AI Chat</Text>
        <Text style={[styles.cardSubtitle, { marginBottom: 16 }]}>Personalize your assistant</Text>

        <TouchableOpacity style={[styles.outlineButton, { borderColor: orbColor }]}>
          <Icon name="sparkles" size={18} color={orbColor} style={{ marginRight: 8 }} />
          <Text style={{ color: orbColor, fontWeight: '600' }}>Customize Assistant</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subSectionHeader}>Chat Preferences</Text>
      <View style={styles.cardDark}>
        {renderToggleItem('Show Tutorial', 'Display chat interface guide', showTutorial, setShowTutorial)}
        <View style={styles.separator} />
        {renderToggleItem('Voice Messages', 'Enable voice recording', voiceMessages, setVoiceMessages)}
        <View style={styles.separator} />
        {renderToggleItem('Typing Animations', 'Character reveal effect', typingAnimation, setTypingAnimation)}
      </View>

      <Text style={styles.subSectionHeader}>Job Automation</Text>
      <View style={styles.cardDark}>
        {renderToggleItem(
          'Daily Digest',
          'Receive end-of-day job summary (19:00 PT)',
          digestEnabled,
          (val) => {
            setDigestEnabled(val);
            saveBackendSettings({ digest_enabled: val });
          }
        )}
        <View style={styles.separator} />
        {renderToggleItem(
          'Quiet Hours (21:00 – 07:00)',
          'No non-critical notifications during these hours',
          quietHoursEnabled,
          (val) => {
            setQuietHoursEnabled(val);
            saveBackendSettings({ quiet_hours_enabled: val });
          }
        )}
        <View style={styles.separator} />
        <View style={styles.toggleItem}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.toggleLabel}>Post-Call Prompt</Text>
            <Text style={styles.toggleSubtitle}>Trigger after calls longer than {postCallThreshold}s</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => {
                const v = Math.max(10, postCallThreshold - 10);
                setPostCallThreshold(v);
                saveBackendSettings({ post_call_threshold: v });
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
              }}>
              <Icon name="plus" size={16} color={orbColor} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Text style={styles.subSectionHeader}>Current Configuration</Text>
      <View style={styles.cardDark}>
        {renderInfoRow('Name', 'Alex')}
        <View style={styles.separator} />
        {renderInfoRow('Personality', 'Encouragement')}
        <View style={styles.separator} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Orb Color</Text>
          <View style={[styles.colorDot, { backgroundColor: orbColor }]} />
        </View>
      </View>
    </View>
  );

  const renderLegal = () => (
    <View style={styles.subScreenContainer}>
      <Text style={styles.subSectionHeader}>Legal Documents</Text>
      <View style={styles.cardDark}>
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="file-document-outline" size={20} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <Text style={styles.actionRowText}>Privacy Policy</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="file-document-outline" size={20} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <Text style={styles.actionRowText}>Terms of Service</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="shield-check-outline" size={20} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <Text style={styles.actionRowText}>Data Protection</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subSectionHeader}>Compliance</Text>
      <View style={styles.cardDark}>
        <View style={styles.actionRow}>
          <Text style={[styles.toggleLabel, { flex: 1 }]}>GDPR Compliant</Text>
          <View style={styles.badgeSuccess}>
            <Icon name="check" size={12} color="#166534" style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>Yes</Text>
          </View>
        </View>
        <View style={styles.separator} />
        <View style={styles.actionRow}>
          <Text style={[styles.toggleLabel, { flex: 1 }]}>Portuguese Tax Authority</Text>
          <View style={styles.badgeSuccess}>
            <Icon name="check" size={12} color="#166534" style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>Certified</Text>
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
            <Text style={styles.cardTitle}>Message Trego Support</Text>
            <Text style={styles.cardSubtitle}>Get help from our support team</Text>
          </View>
          <Icon name="chevron-right" size={20} color={S_COLORS.textSecondary} />
        </View>
      </TouchableOpacity>

      <Text style={styles.subSectionHeader}>Help Resources</Text>
      <View style={styles.cardDark}>
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="help-circle-outline" size={20} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <Text style={styles.actionRowText}>Help Center</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="file-document-outline" size={20} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <Text style={styles.actionRowText}>User Guide</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.actionRow}>
          <Icon name="information-outline" size={20} color={S_COLORS.textSecondary} style={{ marginRight: 10 }} />
          <Text style={styles.actionRowText}>What's New</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subSectionHeader}>About</Text>
      <View style={styles.cardDark}>
        {renderInfoRow('Version', '1.0.0')}
        <View style={styles.separator} />
        {renderInfoRow('Build', '2025.01.14')}
      </View>
    </View>
  );

  const renderContent = () => {
    switch (currentSection) {
      case 'app': return renderAppSettings();
      case 'billing': return renderBillingSettings();
      case 'privacy': return renderPrivacySecurity();
      case 'assistant': return renderAssistantSettings();
      case 'legal': return renderLegal();
      case 'help': return renderHelp();
      case 'main':
      default:
        return (
          <>
            {/* Complete Your Profile Card */}
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
                      <Text style={styles.cardTitle}>Complete Your Profile</Text>
                      <Text style={styles.percentText}>{completionPercent}%</Text>
                      <Icon name="chevron-right" size={16} color={S_COLORS.textSecondary} />
                    </View>
                    <Text style={styles.cardSubtitle}>{completionPercent}/100 completed</Text>
                  </View>
                </View>
                {/* Progress Bars */}
                <View style={styles.progressContainer}>
                  {[1, 2, 3, 4, 5, 6].map((step, idx) => (
                    <View key={idx} style={[
                      styles.progressSegment,
                      { backgroundColor: idx < 3 ? orbColor : '#334155' } // Demo progress
                    ]} />
                  ))}
                </View>
              </View>
            </TouchableOpacity>

            {/* Get Certified Card */}
            <TouchableOpacity style={styles.cardGreen} onPress={() => { /* Navigate to Certification */ }}>
              <View style={styles.cardRow}>
                <View style={styles.certificateIcon}>
                  <Icon name="medal-outline" size={18} color={S_COLORS.accentGreenText} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.cardTitle, { color: S_COLORS.accentGreenText }]}>Get Certified</Text>
                    <Icon name="chevron-right" size={16} color={S_COLORS.accentGreenText} />
                  </View>
                  <Text style={[styles.cardSubtitle, { color: S_COLORS.accentGreenText }]}>Verify your identity & build trust with clients</Text>
                  <View style={styles.boostRow}>
                    <View style={styles.boostBars}>
                      <View style={[styles.boostBar, { height: 4 }]} />
                      <View style={[styles.boostBar, { height: 6 }]} />
                      <View style={[styles.boostBar, { height: 8 }]} />
                      <View style={[styles.boostBar, { height: 5 }]} />
                    </View>
                    <Text style={[styles.boostText, { color: S_COLORS.accentGreenText }]}>Boost your profile</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* Dashboard Card */}
            <TouchableOpacity style={styles.cardDark}>
              <View style={styles.cardRow}>
                <View style={[styles.orbIcon, { backgroundColor: '#3b82f6', opacity: 0.2 }]}>
                  <Icon name="view-dashboard-outline" size={16} color="#3b82f6" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>Dashboard</Text>
                    <Icon name="chevron-right" size={16} color={S_COLORS.textSecondary} />
                  </View>
                  <Text style={styles.cardSubtitle}>Performance summary and reviews</Text>
                  <View style={styles.ratingRow}>
                    <Icon name="star" size={12} color="#facc15" />
                    <Icon name="star" size={12} color="#facc15" />
                    <Icon name="star" size={12} color="#facc15" />
                    <Icon name="star" size={12} color="#facc15" />
                    <Icon name="star" size={12} color="#facc15" />
                    <Text style={styles.ratingText}>(147 reviews)</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* Invoicing Card */}
            <TouchableOpacity style={styles.cardLight} onPress={() => { /* Navigate to Invoicing */ }}>
              <View style={styles.cardRow}>
                <View style={[styles.orbIcon, { backgroundColor: '#e0f2fe' }]}>
                  <Icon name="file-document-outline" size={16} color="#0284c7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: '#0f172a' }]}>Invoicing</Text>
                  <Text style={[styles.cardSubtitle, { color: '#64748b' }]}>Manage invoices, expenses, and certified invoicing</Text>
                </View>
              </View>

              <View style={styles.invoicingSetupCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.invoicingTitle}>Invoicing Setup</Text>
                  <Icon name="chevron-right" size={16} color="#fff" style={{ opacity: 0.5 }} />
                </View>
                <Text style={styles.invoicingSubtitle}>2/6 steps completed</Text>
                <View style={styles.progressContainer}>
                  {[1, 2, 3, 4, 5, 6].map((step, idx) => (
                    <View key={idx} style={[
                      styles.progressSegment,
                      { backgroundColor: idx < 2 ? '#fff' : '#334155' }
                    ]} />
                  ))}
                </View>
              </View>

              <Text style={styles.helperText}>Set up certified invoicing to issue compliant invoices.</Text>
            </TouchableOpacity>

            {/* Settings List */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsHeader}>Settings</Text>

              {renderSectionItem('cog', 'App Settings', 'Notifications and preferences', () => setCurrentSection('app'))}
              {renderSectionItem('credit-card', 'Billing Settings', 'App billing, leads, and payments', () => setCurrentSection('billing'))}
              {renderSectionItem('shield-check', 'Privacy & Security', 'Password, 2FA, and data privacy', () => setCurrentSection('privacy'))}
              {renderSectionItem('robot', 'Assistant Settings', 'Customize Nova and chat', () => setCurrentSection('assistant'))}
              {renderSectionItem('scale-balance', 'Legal', 'Privacy policy and terms', () => setCurrentSection('legal'))}
              {renderSectionItem('help-circle-outline', 'Help', 'Support, guides, and help center', () => setCurrentSection('help'))}
            </View>

            {/* Logout */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() =>
                Alert.alert(
                  'Log Out',
                  'Are you sure you want to log out?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Log Out',
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
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>Trego Provider App v1.3.0</Text>
            <Text style={styles.copyrightText}>© 2026 Trego. All rights reserved.</Text>
            <View style={{ height: 40 }} />
          </>
        );
    }
  };

  const getTitle = () => {
    switch (currentSection) {
      case 'app': return 'App Settings';
      case 'billing': return 'Billing Settings';
      case 'privacy': return 'Privacy & Security';
      case 'assistant': return 'Assistant Settings';
      case 'legal': return 'Legal';
      case 'help': return 'Help';
      default: return 'Profile';
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
