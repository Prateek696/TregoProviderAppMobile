/**
 * Root Navigator - Handles Auth, Onboarding, and Main app flow
 */

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { RootStackParamList } from './types';
import IntroScreen from '../screens/IntroScreen';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import MainNavigator from './MainNavigator';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Intro');

  // Check authentication status on app startup
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const authToken = await jsonStorage.getItem<string>(STORAGE_KEYS.AUTH_TOKEN);
        const onboardingComplete = await jsonStorage.getItem<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETE);

        if (authToken) {
          // User is authenticated
          if (onboardingComplete) {
            // User has completed onboarding, go to Main app
            setInitialRoute('Main');
          } else {
            // User is authenticated but hasn't completed onboarding
            setInitialRoute('Onboarding');
          }
        } else {
          // User is not authenticated, start with Intro
          setInitialRoute('Intro');
        }
      } catch (error) {
        console.error('[RootNavigator] Error checking auth status:', error);
        // On error, default to Intro screen
        setInitialRoute('Intro');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Verify all screens are properly imported
  React.useEffect(() => {
    console.log('[RootNavigator] Initializing navigation with screens:', {
      Intro: !!IntroScreen,
      Auth: !!AuthScreen,
      Onboarding: !!OnboardingScreen,
      Main: !!MainNavigator,
      initialRoute,
    });
  }, [initialRoute]);

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <NavigationContainer
      onReady={() => {
        console.log('[RootNavigator] Navigation container ready');
      }}
      onStateChange={(state) => {
        console.log('[RootNavigator] Navigation state changed:', state?.routes?.[state?.index]?.name);
      }}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen 
          name="Intro" 
          component={IntroScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen 
          name="Auth" 
          component={AuthScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen 
          name="Main" 
          component={MainNavigator}
          options={{ animationEnabled: true }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
});


