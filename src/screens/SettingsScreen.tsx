/**
 * Settings Screen
 * Migrated from web app's EnhancedSettingsScreen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Colors } from '../shared/constants/colors';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';

type SettingsScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'Settings'>;

export type SettingSection = 'main' | 'account' | 'assistant' | 'app' | 'billing' | 'privacy' | 'legal' | 'help';

interface SettingsSection {
  id: SettingSection;
  label: string;
  description: string;
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'app', label: 'App Settings', description: 'Notifications and preferences' },
  { id: 'billing', label: 'Billing Settings', description: 'App billing, leads, and payments' },
  { id: 'privacy', label: 'Privacy & Security', description: 'Password, 2FA, and data privacy' },
  { id: 'assistant', label: 'Assistant Settings', description: 'Customize assistant and chat' },
  { id: 'legal', label: 'Legal', description: 'Privacy policy and terms' },
  { id: 'help', label: 'Help', description: 'Support, guides, and help center' },
];

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [currentSection, setCurrentSection] = useState<SettingSection>('main');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [orbColor, setOrbColor] = useState('#1E6FF7');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const profile = await jsonStorage.getItem(STORAGE_KEYS.PROVIDER_PROFILE);
      const color = await jsonStorage.getItem(STORAGE_KEYS.ORB_COLOR);
      const notifications = await jsonStorage.getItem('notifications-enabled');
      
      if (profile) setProfileData(profile);
      if (color) setOrbColor(color);
      if (notifications !== null) setNotificationsEnabled(notifications);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await jsonStorage.setItem('notifications-enabled', value);
  };

  const calculateProfileCompletion = (): number => {
    let completed = 0;
    let total = 8;

    if (profileData?.photo) completed++;
    if (profileData?.firstName && profileData?.lastName) completed++;
    if (profileData?.phone) completed++;
    if (profileData?.emailVerified) completed++;
    if (profileData?.vatNumber) completed++;
    if (profileData?.serviceLocation) completed++;
    if (profileData?.workingHours) completed++;
    if (profileData?.daysOff?.length > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  const profileCompletion = calculateProfileCompletion();
  const firstName = profileData?.firstName || 'Provider';
  const lastName = profileData?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const businessName = profileData?.businessName || `${firstName}'s Business`;

  const renderMainSettings = () => (
    <View style={styles.container}>
      {/* Profile Header */}
      <Card style={styles.profileCard}>
        <CardContent>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: orbColor }]}>
              <Text style={styles.avatarText}>
                {firstName.charAt(0)}{lastName.charAt(0) || firstName.charAt(1) || 'P'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{fullName}</Text>
              <Text style={styles.profileBusiness}>{businessName}</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Complete Your Profile */}
      <Card style={[styles.card, { borderColor: orbColor + '66' }]}>
        <TouchableOpacity
          onPress={() => {
            // Navigate to profile completion
            Alert.alert('Profile Completion', 'Feature coming soon');
          }}>
          <CardContent>
            <View style={styles.profileCompletionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: orbColor }]}>
                <Text style={styles.iconText}>👤</Text>
              </View>
              <View style={styles.profileCompletionInfo}>
                <View style={styles.profileCompletionTitleRow}>
                  <Text style={[styles.profileCompletionTitle, { color: orbColor }]}>
                    Complete Your Profile
                  </Text>
                  {profileCompletion === 100 ? (
                    <Badge variant="default">Complete</Badge>
                  ) : (
                    <Text style={[styles.profileCompletionPercent, { color: orbColor }]}>
                      {profileCompletion}%
                    </Text>
                  )}
                </View>
                <Text style={styles.profileCompletionDesc}>
                  {profileCompletion === 100
                    ? 'Your profile is complete!'
                    : `${8 - Math.round(profileCompletion / 12.5)} items remaining`}
                </Text>
                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${profileCompletion}%`, backgroundColor: orbColor },
                    ]}
                  />
                </View>
              </View>
            </View>
          </CardContent>
        </TouchableOpacity>
      </Card>

      {/* Settings Sections */}
      <View style={styles.sectionsContainer}>
        <Text style={styles.sectionsTitle}>Settings</Text>
        <Card>
          <CardContent style={styles.sectionsContent}>
            {SETTINGS_SECTIONS.map((section, index) => (
              <React.Fragment key={section.id}>
                <TouchableOpacity
                  style={styles.sectionItem}
                  onPress={() => setCurrentSection(section.id)}>
                  <View style={styles.sectionContent}>
                    <Text style={styles.sectionLabel}>{section.label}</Text>
                    <Text style={styles.sectionDescription}>{section.description}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
                {index < SETTINGS_SECTIONS.length - 1 && <View style={styles.separator} />}
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      </View>

      {/* Account Actions */}
      <View style={styles.actionsContainer}>
        <Button
          title="Sign Out"
          variant="outline"
          onPress={() => {
            Alert.alert('Sign Out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Sign Out',
                style: 'destructive',
                onPress: () => {
                  // TODO: Handle sign out
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Auth' as any }],
                  });
                },
              },
            ]);
          }}
        />
      </View>
    </View>
  );

  const renderAppSettings = () => (
    <View style={styles.container}>
      <Card>
        <CardHeader>
          <CardTitle>App Settings</CardTitle>
          <CardDescription>Manage notifications and app preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive notifications about new jobs and messages
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={saveNotifications}
              trackColor={{ false: Colors.muted, true: orbColor }}
            />
          </View>
        </CardContent>
      </Card>
    </View>
  );

  const renderBillingSettings = () => (
    <View style={styles.container}>
      <Card>
        <CardHeader>
          <CardTitle>Billing Settings</CardTitle>
          <CardDescription>Manage billing, leads, and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Earnings' as any)}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Invoicing</Text>
              <Text style={styles.settingDescription}>
                Manage invoices and expenses
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </CardContent>
      </Card>
    </View>
  );

  const renderPrivacySecurity = () => (
    <View style={styles.container}>
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Security</CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent>
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Change Password</Text>
              <Text style={styles.settingDescription}>Update your account password</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
              <Text style={styles.settingDescription}>Add an extra layer of security</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </CardContent>
      </Card>
    </View>
  );

  const renderAssistantSettings = () => (
    <View style={styles.container}>
      <Card>
        <CardHeader>
          <CardTitle>Assistant Settings</CardTitle>
          <CardDescription>Customize your AI assistant</CardDescription>
        </CardHeader>
        <CardContent>
          <Text style={styles.comingSoon}>Coming soon</Text>
        </CardContent>
      </Card>
    </View>
  );

  const renderLegal = () => (
    <View style={styles.container}>
      <Card>
        <CardHeader>
          <CardTitle>Legal</CardTitle>
          <CardDescription>Terms and privacy policy</CardDescription>
        </CardHeader>
        <CardContent>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>Privacy Policy</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>Terms of Service</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </CardContent>
      </Card>
    </View>
  );

  const renderHelp = () => (
    <View style={styles.container}>
      <Card>
        <CardHeader>
          <CardTitle>Help & Support</CardTitle>
          <CardDescription>Get help and contact support</CardDescription>
        </CardHeader>
        <CardContent>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>Help Center</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>Contact Support</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </CardContent>
      </Card>
    </View>
  );

  const renderContent = () => {
    switch (currentSection) {
      case 'app':
        return renderAppSettings();
      case 'billing':
        return renderBillingSettings();
      case 'privacy':
        return renderPrivacySecurity();
      case 'assistant':
        return renderAssistantSettings();
      case 'legal':
        return renderLegal();
      case 'help':
        return renderHelp();
      default:
        return renderMainSettings();
    }
  };

  const getSectionTitle = () => {
    const section = SETTINGS_SECTIONS.find(s => s.id === currentSection);
    return section?.label || 'Settings';
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      {currentSection !== 'main' && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentSection('main')}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getSectionTitle()}</Text>
          <View style={styles.headerSpacer} />
        </View>
      )}

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.foreground,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  container: {
    gap: 16,
  },
  profileCard: {
    marginBottom: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.primaryForeground,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 4,
  },
  profileBusiness: {
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  card: {
    borderWidth: 2,
  },
  profileCompletionHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  profileCompletionInfo: {
    flex: 1,
  },
  profileCompletionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  profileCompletionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  profileCompletionPercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  profileCompletionDesc: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: Colors.muted,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  sectionsContainer: {
    marginTop: 8,
  },
  sectionsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.foreground,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionsContent: {
    padding: 0,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  sectionContent: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.foreground,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 16,
  },
  chevron: {
    fontSize: 24,
    color: Colors.mutedForeground,
  },
  actionsContainer: {
    marginTop: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.foreground,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  comingSoon: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
