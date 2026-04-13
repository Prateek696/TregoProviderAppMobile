/**
 * Main Navigator - Handles bottom tabs and main app screens
 * Icons match web version using MaterialCommunityIcons
 */

import React, { useEffect, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { showPersistentNotification, hidePersistentNotification, onRecordVoiceTap, onRecordTextTap } from '../services/notificationBar';
import { DeviceEventEmitter, View, AppState, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VoiceBubble from '../components/VoiceBubble';
import { useTranslation } from 'react-i18next';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';
import { showBubble, hideBubble, hasOverlayPermission } from '../services/bubble';
import { MainTabParamList, MainStackParamList } from './types';

// Screens
// DashboardScreen removed — not in MVP scope
import JobsScreen from '../screens/JobsScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import ChatScreen from '../screens/ChatScreen';
import BillingScreen from '../screens/BillingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileCompletionScreen from '../screens/ProfileCompletionScreen';

// Placeholder screens for navigation
import JobDetailScreen from '../screens/JobDetailScreen';
import JobEditScreen from '../screens/JobEditScreen';
import ContactsScreen from '../screens/ContactsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import EarningsScreen from '../screens/EarningsScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ClientDetailScreen from '../screens/ClientDetailScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

/**
 * Jobs Stack - Nested navigation for Jobs tab
 */
function JobsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="JobsList"
        component={JobsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="JobEdit"
        component={JobEditScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

/**
 * Bottom Tab Navigator - Icons matching web version style
 * Web uses: MessageSquare, ClipboardList, CalendarDays, Wallet, UserCircle (lucide-react)
 * Mobile uses MaterialCommunityIcons equivalents:
 * - Chat: message-text (matches MessageSquare)
 * - Jobs: clipboard-text (matches ClipboardList)  
 * - Schedule: calendar (matches CalendarDays)
 * - Billing: wallet (matches Wallet)
 * - Profile: account-circle (matches UserCircle)
 */
function TabNavigator() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Dynamic inset: gesture nav (~0-15dp), 3-button nav (~24-48dp), iOS home-indicator (~34dp).
  // Floor of 12 guarantees label descenders (g, p, y) never clip on devices with 0 insets.
  const bottomInset = Math.max(insets.bottom, 12);
  // Tab content area = 64dp (icon 24 + gap 4 + label ~16 + top 8 + buffer 12)
  const CONTENT_H = 64;
  return (
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      initialRouteName="Jobs"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6', // Web version blue #3b82f6
        tabBarInactiveTintColor: '#94a3b8', // Slate 400 for Dark Mode
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: 2,
        },
        tabBarIconStyle: { marginTop: 2 },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#334155', // Slate 700
          backgroundColor: '#1e293b', // Slate 800
          // Total height = content budget + system nav inset
          height: CONTENT_H + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 6,
        },
      }}>
      <Tab.Screen
        name="Jobs"
        component={JobsStack}
        options={{
          tabBarLabel: t('tabs.jobs'),
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name="clipboard-text"
              size={size || 24}
              color={color}
              style={{ marginTop: 0 }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          tabBarLabel: t('tabs.clients'),
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name="account-group"
              size={size || 24}
              color={color}
              style={{ marginTop: 0 }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          tabBarLabel: t('tabs.schedule'),
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name="calendar"
              size={size || 24}
              color={color}
              style={{ marginTop: 0 }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Billing"
        component={BillingScreen}
        options={{
          tabBarLabel: t('tabs.billing'),
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="wallet"
              size={size || 24}
              color={color}
              style={{ marginTop: 0 }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name="account-circle"
              size={size || 24}
              color={color}
              style={{ marginTop: 0 }}
            />
          ),
        }}
      />
    </Tab.Navigator>
    </View>
  );
}

/**
 * Main Navigator - Combines tabs and stack navigation
 */
export default function MainNavigator() {
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    // Show persistent notification bar button — pass token so inline actions work without opening app
    jsonStorage.getItem<string>(STORAGE_KEYS.AUTH_TOKEN).then(token => {
      showPersistentNotification(token ?? undefined);
    });

    // Request overlay permission once (for floating bubble outside app)
    hasOverlayPermission().then(granted => {
      if (!granted) {
        // Ask once — user can grant from system settings
        jsonStorage.getItem('overlay_perm_asked').then(asked => {
          if (!asked) {
            const { requestOverlayPermission } = require('../services/bubble');
            requestOverlayPermission();
            jsonStorage.setItem('overlay_perm_asked', true);
          }
        });
      }
    });

    // Show system overlay bubble when app goes to background, hide when foreground
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        hasOverlayPermission().then(granted => { if (granted) showBubble(); });
      } else if (nextState === 'active') {
        hideBubble();
      }
    });

    // 🎤 Voice tap → navigate to Jobs tab (VoiceBubble is there) + open it
    const unsubVoice = onRecordVoiceTap(() => {
      navigationRef.current?.navigate('MainTabs', { screen: 'Jobs' });
      // Small delay so the screen is mounted before we trigger the bubble
      setTimeout(() => DeviceEventEmitter.emit('TregoOpenVoice'), 400);
    });

    // ✏️ Text tap → navigate to Jobs tab + open text input modal
    const unsubText = onRecordTextTap(() => {
      navigationRef.current?.navigate('MainTabs', { screen: 'Jobs' });
      setTimeout(() => DeviceEventEmitter.emit('TregoOpenText'), 400);
    });

    // Offline sync — auto-upload queued recordings when internet returns (app-wide)
    const { startOfflineSyncListener } = require('../services/offlineQueue');
    const unsubSync = startOfflineSyncListener((count: number) => {
      console.log(`[OfflineSync] ${count} job(s) synced from queue`);
    });

    return () => {
      hidePersistentNotification();
      hideBubble();
      appStateSub.remove();
      unsubVoice();
      unsubText();
      unsubSync();
    };
  }, []);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="Contacts" component={ContactsScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="Earnings" component={EarningsScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatDetail" component={ChatScreen} />
      <Stack.Screen name="ProfileCompletion" component={ProfileCompletionScreen} />
      <Stack.Screen name="ClientDetail" component={ClientDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
