import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StartupOrb } from '../components/StartupOrb';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

interface CalendarEvent {
  id: string;
  summary: string;
  start: string; // formatted display string
}

interface CalendarSyncScreenProps {
  orbColor?: string;
  onBack: () => void;
  onContinue: (data: {
    calendarConnected: boolean;
    calendarProvider?: 'google' | 'outlook' | 'apple' | 'other';
    events?: CalendarEvent[];
  }) => void;
}

type CalendarOption = 'google' | 'outlook' | 'apple' | 'other' | 'skip' | null;

export default function CalendarSyncScreen({
  orbColor = '#3b82f6',
  onBack,
  onContinue,
}: CalendarSyncScreenProps) {
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = useState<CalendarOption>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '217369564821-ictca9vsbg5fsivbkhq16hr6g7cr4j1u.apps.googleusercontent.com',
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      offlineAccess: false,
    });
  }, []);

  const formatEventDate = (dateObj: any): string => {
    const raw = dateObj?.dateTime || dateObj?.date;
    if (!raw) return '';
    const d = new Date(raw);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    if (d.toDateString() === now.toDateString()) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const fetchGoogleEvents = async (accessToken: string) => {
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${future}&singleEvents=true&orderBy=startTime&maxResults=5`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) throw new Error(`Calendar API error: ${res.status}`);
    const json = await res.json();

    return (json.items || []).map((item: any) => ({
      id: item.id,
      summary: item.summary || '(No title)',
      start: formatEventDate(item.start),
    }));
  };

  const handleGoogleConnect = async () => {
    setIsLoading(true);
    setError('');
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      const fetched = await fetchGoogleEvents(tokens.accessToken);
      setEvents(fetched);
      setConnected(true);
      setSelectedOption('google');
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled — do nothing
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Sign-in already in progress');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available');
      } else {
        setError(err.message || 'Failed to connect Google Calendar');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (option: CalendarOption) => {
    setError('');
    if (option === 'google') {
      handleGoogleConnect();
    } else {
      setSelectedOption(option);
      setConnected(option !== 'skip');
    }
  };

  const handleContinue = () => {
    if (!selectedOption) return;
    onContinue({
      calendarConnected: selectedOption !== 'skip',
      calendarProvider: selectedOption === 'skip' ? undefined : selectedOption,
      events: selectedOption === 'google' ? events : undefined,
    });
  };

  const CALENDAR_OPTIONS = [
    {
      key: 'google' as CalendarOption,
      label: t('calendarSync.googleConnect'),
      subtitle: t('calendarSync.googleSubtitle'),
      icon: <Text style={styles.googleIconText}>G</Text>,
      iconStyle: styles.googleIcon,
    },
    {
      key: 'outlook' as CalendarOption,
      label: t('calendarSync.outlookConnect'),
      subtitle: t('calendarSync.outlookSubtitle'),
      icon: <Text style={styles.outlookIconText}>M</Text>,
      iconStyle: styles.outlookIcon,
      disabled: true,
    },
    {
      key: 'apple' as CalendarOption,
      label: t('calendarSync.appleConnect'),
      subtitle: t('calendarSync.appleSubtitle'),
      icon: <Text style={styles.appleIconText}>🍎</Text>,
      iconStyle: styles.appleIcon,
      disabled: true,
    },
    {
      key: 'other' as CalendarOption,
      label: t('calendarSync.otherCalendar'),
      subtitle: t('calendarSync.otherSubtitle'),
      icon: <Text style={styles.otherIconText}>📅</Text>,
      iconStyle: styles.otherIcon,
      disabled: true,
    },
    {
      key: 'skip' as CalendarOption,
      label: t('calendarSync.skipLabel'),
      subtitle: t('calendarSync.skipSubtitle'),
      icon: <View style={styles.skipIconDot} />,
      iconStyle: styles.skipIcon,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View style={styles.orbContainer}>
          <StartupOrb size="lg" intensity="normal" color={orbColor} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>{t('calendarSync.title')}</Text>
          <Text style={styles.subtitle}>
            {t('calendarSync.subtitle')}
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {CALENDAR_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => !opt.disabled && handleOptionSelect(opt.key)}
              disabled={opt.disabled || isLoading}
              style={[
                styles.optionButton,
                opt.key === 'skip' && styles.skipButton,
                selectedOption === opt.key && styles.optionButtonSelected,
                opt.disabled && styles.optionButtonDisabled,
              ]}
              activeOpacity={opt.disabled ? 1 : 0.7}>
              <View style={styles.optionContent}>
                <View style={[styles.optionIcon, opt.iconStyle]}>{opt.icon}</View>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, selectedOption === opt.key && styles.optionTitleSelected, opt.disabled && styles.optionTitleDisabled]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.optionSubtitle, selectedOption === opt.key && styles.optionSubtitleSelected]}>
                    {opt.subtitle}
                  </Text>
                </View>
                {isLoading && opt.key === 'google' && selectedOption !== 'google' ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : selectedOption === opt.key ? (
                  <View style={styles.checkIcon}>
                    <Text style={styles.checkIconText}>✓</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        ) : null}

        {/* Real events from Google Calendar */}
        {connected && selectedOption === 'google' && events.length > 0 && (
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <View style={styles.previewCheck}>
                <Text style={styles.previewCheckText}>✓</Text>
              </View>
              <Text style={styles.previewTitle}>{t('calendarSync.googleConnected')}</Text>
            </View>
            <Text style={styles.previewDescription}>
              {t('calendarSync.nextEvents', { count: events.length })}
            </Text>
            <View style={styles.eventsList}>
              {events.map(ev => (
                <View key={ev.id} style={styles.eventItem}>
                  <Text style={styles.eventName} numberOfLines={1}>{ev.summary}</Text>
                  <Text style={styles.eventTime}>{ev.start}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {connected && selectedOption === 'google' && events.length === 0 && !isLoading && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>{t('calendarSync.googleConnectedShort')}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={onBack} style={styles.backButtonTouchable}>
          <Text style={styles.backButtonText}>{t('calendarSync.back')}</Text>
        </TouchableOpacity>
        <Button
          title={selectedOption === 'skip' ? t('calendarSync.completeSetup') : selectedOption ? t('calendarSync.importComplete') : t('calendarSync.continue')}
          onPress={handleContinue}
          disabled={!selectedOption || isLoading}
          style={[styles.continueButton, { backgroundColor: orbColor }]}
          textStyle={styles.continueButtonText}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0a0a' },
  scrollContent: { padding: 24, paddingBottom: 140 },
  orbContainer: { marginBottom: 32, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#f3f4f6', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
  optionsContainer: { gap: 12, marginBottom: 24 },
  optionButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#1f2937',
  },
  optionButtonSelected: { borderWidth: 2, borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  optionButtonDisabled: { opacity: 0.4 },
  skipButton: { borderStyle: 'dashed' },
  optionContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  googleIcon: { backgroundColor: '#ffffff' },
  googleIconText: { fontSize: 14, fontWeight: 'bold', color: '#4285f4' },
  outlookIcon: { backgroundColor: '#0078d4' },
  outlookIconText: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  appleIcon: { backgroundColor: '#000000' },
  appleIconText: { fontSize: 18 },
  otherIcon: { backgroundColor: 'transparent' },
  otherIconText: { fontSize: 20 },
  skipIcon: { backgroundColor: '#374151' },
  skipIconDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#9ca3af' },
  optionTextContainer: { flex: 1, gap: 2 },
  optionTitle: { fontSize: 14, fontWeight: '700', color: '#f3f4f6' },
  optionTitleSelected: { color: '#000000' },
  optionTitleDisabled: { color: '#6b7280' },
  optionSubtitle: { fontSize: 12, color: '#9ca3af' },
  optionSubtitleSelected: { color: '#6b7280' },
  checkIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  checkIconText: { fontSize: 12, color: '#ffffff', fontWeight: 'bold' },
  errorBox: { backgroundColor: '#7f1d1d', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#fca5a5', fontSize: 14 },
  previewContainer: { padding: 16, backgroundColor: '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: '#86efac' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  previewCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  previewCheckText: { fontSize: 12, color: '#ffffff', fontWeight: 'bold' },
  previewTitle: { fontSize: 15, fontWeight: '700', color: '#000000' },
  previewDescription: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  eventsList: { gap: 8 },
  eventItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, backgroundColor: '#ffffff', borderRadius: 6 },
  eventName: { fontSize: 14, fontWeight: '500', color: '#000000', flex: 1, marginRight: 8 },
  eventTime: { fontSize: 12, color: '#6b7280' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 32,
    alignItems: 'center', justifyContent: 'space-between', gap: 12,
    backgroundColor: '#0a0a0a', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', zIndex: 50,
  },
  backButtonTouchable: { paddingVertical: 12, paddingHorizontal: 16, minWidth: 80, alignItems: 'center' },
  backButtonText: { fontSize: 14, color: '#9ca3af' },
  continueButton: { flex: 1, maxWidth: 384, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  continueButtonText: { color: '#f3f4f6', fontSize: 16, fontWeight: '500' },
});
