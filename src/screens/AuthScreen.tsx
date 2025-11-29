/**
 * Authentication Screen
 * Migrated from web app's ProviderAuthScreen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Colors } from '../shared/constants/colors';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';

type AuthScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;

type AuthStep = 'method' | 'email-password' | 'email-otp' | 'phone' | 'verify-otp' | 'verify-phone-otp';

export default function AuthScreen() {
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const [authStep, setAuthStep] = useState<AuthStep>('method');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement Google OAuth
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save auth data
      await jsonStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'mock-google-token');
      await jsonStorage.setItem(STORAGE_KEYS.PROVIDER_PROFILE, {
        email: 'user@gmail.com',
        authMethod: 'google',
      });

      navigation.replace('Onboarding');
    } catch (err) {
      setError('Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailPasswordSubmit = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (isSignUp && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement actual authentication
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (isSignUp) {
        // Sign up - go to OTP verification
        setAuthStep('verify-otp');
      } else {
        // Sign in - complete auth
        await jsonStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'mock-email-token');
        await jsonStorage.setItem(STORAGE_KEYS.PROVIDER_PROFILE, {
          email,
          authMethod: 'email',
        });
        navigation.replace('Onboarding');
      }
    } catch (err) {
      setError(isSignUp ? 'Failed to create account' : 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailOTPSubmit = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement OTP sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAuthStep('verify-otp');
    } catch (err) {
      setError('Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async () => {
    if (!phone) {
      setError('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement phone verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAuthStep('verify-phone-otp');
    } catch (err) {
      setError('Failed to send SMS verification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement OTP verification
      await new Promise(resolve => setTimeout(resolve, 1000));

      await jsonStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'mock-otp-token');
      await jsonStorage.setItem(STORAGE_KEYS.PROVIDER_PROFILE, {
        email: email || phone,
        authMethod: authStep === 'verify-phone-otp' ? 'phone' : 'email',
      });

      navigation.replace('Onboarding');
    } catch (err) {
      setError('Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>TREGO</Text>
      </View>
      <Text style={styles.title}>Welcome to Trego</Text>
      <Text style={styles.subtitle}>Sign in or create your provider account</Text>

      <View style={styles.buttonContainer}>
        <Button
          title="Continue with Google"
          variant="outline"
          onPress={handleGoogleSignIn}
          disabled={isLoading}
          style={styles.authButton}
        />

        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>or</Text>
          <View style={styles.separatorLine} />
        </View>

        <Button
          title="Continue with Email & Password"
          variant="outline"
          onPress={() => setAuthStep('email-password')}
          style={styles.authButton}
        />

        <Button
          title="Continue with Email (OTP)"
          variant="outline"
          onPress={() => setAuthStep('email-otp')}
          style={styles.authButton}
        />

        <Button
          title="Continue with Phone Number"
          variant="outline"
          onPress={() => setAuthStep('phone')}
          style={styles.authButton}
        />
      </View>
    </View>
  );

  const renderEmailPassword = () => (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setAuthStep('method')}>
        <Text style={styles.backButtonText}>‹ Back</Text>
      </TouchableOpacity>

      <Text style={styles.formTitle}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
      <Text style={styles.formSubtitle}>
        {isSignUp ? 'Enter your email and create a password' : 'Enter your credentials to continue'}
      </Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Label>Email</Label>
          <Input
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <View style={styles.inputGroup}>
          <Label>Password</Label>
          <Input
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={isSignUp ? 'password-new' : 'password'}
          />
          {isSignUp && (
            <Text style={styles.hint}>Minimum 8 characters</Text>
          )}
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button
          title={isSignUp ? 'Create Account' : 'Sign In'}
          onPress={handleEmailPasswordSubmit}
          disabled={isLoading}
          loading={isLoading}
          style={styles.submitButton}
        />

        <TouchableOpacity
          style={styles.switchAuth}
          onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.switchAuthText}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmailOTP = () => (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setAuthStep('method')}>
        <Text style={styles.backButtonText}>‹ Back</Text>
      </TouchableOpacity>

      <Text style={styles.formTitle}>Sign in with Email</Text>
      <Text style={styles.formSubtitle}>We'll send you a one-time code</Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Label>Email</Label>
          <Input
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button
          title="Send Verification Code"
          onPress={handleEmailOTPSubmit}
          disabled={isLoading}
          loading={isLoading}
          style={styles.submitButton}
        />
      </View>
    </View>
  );

  const renderPhone = () => (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setAuthStep('method')}>
        <Text style={styles.backButtonText}>‹ Back</Text>
      </TouchableOpacity>

      <Text style={styles.formTitle}>Sign in with Phone</Text>
      <Text style={styles.formSubtitle}>We'll send you a verification code</Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Label>Phone Number</Label>
          <Input
            placeholder="+351 912 345 678"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button
          title="Send Verification Code"
          onPress={handlePhoneSubmit}
          disabled={isLoading}
          loading={isLoading}
          style={styles.submitButton}
        />
      </View>
    </View>
  );

  const renderVerifyOTP = () => (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          setAuthStep(authStep === 'verify-phone-otp' ? 'phone' : 'email-otp');
          setOtp('');
        }}>
        <Text style={styles.backButtonText}>‹ Back</Text>
      </TouchableOpacity>

      <View style={styles.otpIconContainer}>
        <Text style={styles.otpIcon}>✉️</Text>
      </View>
      <Text style={styles.formTitle}>Verify Your {authStep === 'verify-phone-otp' ? 'Phone' : 'Email'}</Text>
      <Text style={styles.formSubtitle}>Enter the 6-digit code sent to</Text>
      <Text style={styles.verifyValue}>{email || phone}</Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Label>Verification Code</Label>
          <Input
            placeholder="000000"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.otpInput}
          />
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button
          title="Verify Code"
          onPress={handleVerifyOTP}
          disabled={isLoading || otp.length !== 6}
          loading={isLoading}
          style={styles.submitButton}
        />
      </View>
    </View>
  );

  const renderContent = () => {
    switch (authStep) {
      case 'email-password':
        return renderEmailPassword();
      case 'email-otp':
        return renderEmailOTP();
      case 'phone':
        return renderPhone();
      case 'verify-otp':
      case 'verify-phone-otp':
        return renderVerifyOTP();
      default:
        return renderMethodSelection();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {renderContent()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    letterSpacing: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonContainer: {
    gap: 12,
  },
  authButton: {
    marginBottom: 0,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  separatorText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  backButton: {
    marginBottom: 24,
  },
  backButtonText: {
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  hint: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  errorContainer: {
    backgroundColor: Colors.destructive + '20',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.destructive,
  },
  errorText: {
    fontSize: 14,
    color: Colors.destructive,
  },
  submitButton: {
    marginTop: 8,
  },
  switchAuth: {
    alignItems: 'center',
    marginTop: 16,
  },
  switchAuthText: {
    fontSize: 14,
    color: Colors.primary,
  },
  otpIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  otpIcon: {
    fontSize: 32,
  },
  verifyValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: 32,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: '600',
  },
});
