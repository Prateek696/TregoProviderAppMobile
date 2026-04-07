/**
 * Main Navigator - Handles bottom tabs and main app screens
 * Icons match web version using MaterialCommunityIcons
 */

import React, { useEffect, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { showPersistentNotification, hidePersistentNotification, onRecordVoiceTap, onRecordTextTap } from '../services/notificationBar';
import { DeviceEventEmitter } from 'react-native';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';
import { showBubble, hideBubble, hasOverlayPermission } from '../services/bubble';
import { MainTabParamList, MainStackParamList } from './types';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
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
  return (
    <Tab.Navigator
      initialRouteName="Contacts"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6', // Web version blue #3b82f6
        tabBarInactiveTintColor: '#94a3b8', // Slate 400 for Dark Mode
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#334155', // Slate 700
          backgroundColor: '#1e293b', // Slate 800
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}>
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          tabBarLabel: 'Clients',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name="account-group"
              size={size || 24}
              color={color}
              style={{ marginTop: 4 }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Jobs"
        component={JobsStack}
        options={{
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name="clipboard-text"
              size={size || 24}
              color={color}
              style={{ marginTop: 4 }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          tabBarLabel: 'Schedule',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name="calendar"
              size={size || 24}
              color={color}
              style={{ marginTop: 4 }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Billing"
        component={BillingScreen}
        options={{
          tabBarLabel: 'Billing',
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="wallet"
              size={size || 24}
              color={color}
              style={{ marginTop: 4 }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name="account-circle"
              size={size || 24}
              color={color}
              style={{ marginTop: 4 }}
            />
          ),
        }}
      />
    </Tab.Navigator>
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

    // Start floating bubble if overlay permission is already granted
    hasOverlayPermission().then(granted => {
      if (granted) showBubble();
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

    return () => {
      hidePersistentNotification();
      hideBubble();
      unsubVoice();
      unsubText();
    };
  }, []);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
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
