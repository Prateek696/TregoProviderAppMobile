/**
 * Main Navigator - Handles bottom tabs and main app screens
 * Icons match web version using MaterialCommunityIcons
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MainTabParamList, MainStackParamList } from './types';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import JobsScreen from '../screens/JobsScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import ChatScreen from '../screens/ChatScreen';
import BillingScreen from '../screens/BillingScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Placeholder screens for navigation
import JobDetailScreen from '../screens/JobDetailScreen';
import ContactsScreen from '../screens/ContactsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import EarningsScreen from '../screens/EarningsScreen';
import ChatListScreen from '../screens/ChatListScreen';

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
        options={{ title: 'Job Details' }}
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
      initialRouteName="Chat"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6', // Web version blue #3b82f6
        tabBarInactiveTintColor: '#6b7280', // Web version gray
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          backgroundColor: '#ffffff',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}>
      <Tab.Screen
        name="Chat"
        component={ChatListScreen}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon 
              name="message-text" 
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
          tabBarIcon: ({ color, size, focused }) => (
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
    </Stack.Navigator>
  );
}
