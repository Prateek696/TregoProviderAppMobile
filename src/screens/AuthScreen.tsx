/**
 * Authentication Screen
 * EXACT MIGRATION from web app's ProviderAuthScreen.tsx
 * Matches design, colors, spacing, and styling exactly
 */

import React, { useState, useEffect } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated as RNAnimated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent } from '../components/ui/Card';
import { Colors } from '../shared/constants/colors';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';
import { TregoLogo } from '../components/TregoLogo';
import { authAPI, getAPIError } from '../services/api';
import CountryPicker, { Country, COUNTRIES } from '../components/ui/CountryPicker';
import { registerPushToken } from '../services/notifications';
import auth from '@react-native-firebase/auth';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutUp,
} from 'react-native-reanimated';

type AuthScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;
type AuthStep = 'method' | 'email-password' | 'email-otp' | 'phone' | 'verify-otp' | 'verify-phone-otp';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const [authStep, setAuthStep] = useState<AuthStep>('method');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Portugal default
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const firebaseConfirmRef = React.useRef<any>(null);

  // Animated values for gradient layers
  const gradientAnim1 = React.useRef(new RNAnimated.Value(0)).current;
  const gradientAnim2 = React.useRef(new RNAnimated.Value(0)).current;
  const gradientAnim3 = React.useRef(new RNAnimated.Value(0)).current;
  const gradientAnim4 = React.useRef(new RNAnimated.Value(0)).current;

  // Entry animations for content
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  React.useEffect(() => {
    // Animate gradient layers
    const createAnimation = (animValue: RNAnimated.Value, duration: number) => {
      return RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(animValue, {
            toValue: 1,
            duration,
            useNativeDriver: false,
          }),
          RNAnimated.timing(animValue, {
            toValue: 0,
            duration,
            useNativeDriver: false,
          }),
        ])
      );
    };

    const anim1 = createAnimation(gradientAnim1, 16000);
    const anim2 = createAnimation(gradientAnim2, 16000);
    const anim3 = createAnimation(gradientAnim3, 16000);
    const anim4 = createAnimation(gradientAnim4, 16000);

    anim1.start();
    anim2.start();
    anim3.start();
    anim4.start();

    // Entry animations
    logoOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    logoScale.value = withSpring(1, { damping: 15, stiffness: 150 });

    setTimeout(() => {
      contentOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
      contentTranslateY.value = withSpring(0, { damping: 20, stiffness: 100 });
    }, 200);

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      anim4.stop();
    };
  }, []);

  // Animated styles for entry animations
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
      await jsonStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'mock-google-token');
      await jsonStorage.setItem(STORAGE_KEYS.PROVIDER_PROFILE, {
        email: 'user@gmail.com',
        authMethod: 'google',
      });
      // Check if onboarding is complete, otherwise go to Onboarding
      const onboardingComplete = await jsonStorage.getItem<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETE);
      navigation.replace(onboardingComplete ? 'Main' : 'Onboarding');
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
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
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
      if (isSignUp) {
        setAuthStep('verify-otp');
      } else {
        await jsonStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'mock-email-token');
        await jsonStorage.setItem(STORAGE_KEYS.PROVIDER_PROFILE, { email, authMethod: 'email' });
        // Check if onboarding is complete, otherwise go to Onboarding
        const onboardingComplete = await jsonStorage.getItem<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETE);
        navigation.replace(onboardingComplete ? 'Main' : 'Onboarding');
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
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
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
      // Combine selected country dial code with the local number (strip any leading 0)
      const localNumber = phone.replace(/^\+?\d*\s*/, '').replace(/^0/, '');
      const fullPhone = `${selectedCountry.dialCode}${localNumber}`;
      // Firebase sends the SMS OTP — no backend call needed here
      const confirmation = await auth().signInWithPhoneNumber(fullPhone);
      firebaseConfirmRef.current = confirmation;
      setAuthStep('verify-phone-otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
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
      if (authStep === 'verify-phone-otp') {
        // Confirm OTP with Firebase on device
        const userCredential = await firebaseConfirmRef.current?.confirm(otp);
        // Get Firebase ID token and exchange for our own JWT
        const idToken = await userCredential.user.getIdToken();
        const res = await authAPI.firebaseAuth(idToken);
        const { token, provider, isNew } = res.data;
        await jsonStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        await jsonStorage.setItem(STORAGE_KEYS.PROVIDER_PROFILE, provider);
        registerPushToken();
        navigation.replace(isNew ? 'Onboarding' : 'Main');
      } else {
        // Email OTP — mock (not in MVP)
        await jsonStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'mock-otp-token');
        await jsonStorage.setItem(STORAGE_KEYS.PROVIDER_PROFILE, { email, authMethod: 'email' });
        const onboardingComplete = await jsonStorage.getItem<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETE);
        navigation.replace(onboardingComplete ? 'Main' : 'Onboarding');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipPhone = async () => {
    await jsonStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'mock-token');
    await jsonStorage.setItem(STORAGE_KEYS.PROVIDER_PROFILE, { email, authMethod: 'email' });
    // Check if onboarding is complete, otherwise go to Onboarding
    const onboardingComplete = await jsonStorage.getItem<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETE);
    navigation.replace(onboardingComplete ? 'Main' : 'Onboarding');
  };

  const renderMethodSelection = () => (
    <View style={styles.methodContainer}>
      <Animated.View style={[styles.logoWrapper, logoAnimatedStyle]}>
        <TregoLogo size="large" animated breathing />
      </Animated.View>
      <Animated.View style={contentAnimatedStyle}>
        <Text style={styles.welcomeTitle}>Welcome to trego</Text>
        <Text style={styles.welcomeSubtitle}>Sign in or create your provider account</Text>
      </Animated.View>

      <Animated.View style={[styles.buttonGroup, contentAnimatedStyle]}>
        <AnimatedButton
          style={[styles.authButton, styles.googleButton]}
          onPress={handleGoogleSignIn}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#f3f4f6" style={styles.spinner} />
          ) : (
            <GoogleIcon />
          )}
          <Text style={styles.buttonText}>Continue with Google</Text>
        </AnimatedButton>

        <View style={styles.separatorContainer}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>or</Text>
          <View style={styles.separatorLine} />
        </View>

        <AnimatedButton
          style={[styles.authButton, styles.outlineButton]}
          onPress={() => setAuthStep('email-password')}>
          <Icon name="email-outline" size={20} color="#f3f4f6" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Continue with Email & Password</Text>
        </AnimatedButton>

        <AnimatedButton
          style={[styles.authButton, styles.outlineButton]}
          onPress={() => setAuthStep('email-otp')}>
          <Icon name="email-outline" size={20} color="#f3f4f6" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Continue with Email (OTP)</Text>
        </AnimatedButton>

        <AnimatedButton
          style={[styles.authButton, styles.outlineButton]}
          onPress={() => setAuthStep('phone')}>
          <Icon name="cellphone" size={20} color="#f3f4f6" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Continue with Phone Number</Text>
        </AnimatedButton>
      </Animated.View>
    </View>
  );

  const renderEmailPassword = () => (
    <View style={styles.formContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setAuthStep('method')}>
        <Icon name="chevron-left" size={24} color="#9ca3af" />
        <Text style={styles.backButtonText}>Back</Text>
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
          />
          {isSignUp && <Text style={styles.hintText}>Minimum 8 characters</Text>}
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle-outline" size={20} color={Colors.destructive} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <AnimatedButton
          style={[styles.submitButton, styles.emeraldButton]}
          onPress={handleEmailPasswordSubmit}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" style={styles.spinner} />
          ) : null}
          <Text style={styles.submitButtonText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
        </AnimatedButton>

        <TouchableOpacity style={styles.switchAuth} onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.switchAuthText}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmailOTP = () => (
    <View style={styles.formContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setAuthStep('method')}>
        <Icon name="chevron-left" size={24} color="#9ca3af" />
        <Text style={styles.backButtonText}>Back</Text>
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
            <Icon name="alert-circle-outline" size={20} color={Colors.destructive} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <AnimatedButton
          style={[styles.submitButton, styles.emeraldButton]}
          onPress={handleEmailOTPSubmit}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" style={styles.spinner} />
          ) : null}
          <Text style={styles.submitButtonText}>Send Verification Code</Text>
        </AnimatedButton>
      </View>
    </View>
  );

  const renderPhone = () => (
    <View style={styles.formContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setAuthStep('method')}>
        <Icon name="chevron-left" size={24} color="#9ca3af" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.iconCircle}>
        <Icon name="cellphone" size={32} color="#ffffff" />
      </View>
      <Text style={styles.formTitle}>Add Phone Number</Text>
      <Text style={styles.formSubtitle}>
        We'll send you a verification code
      </Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Label>Phone Number</Label>
          <View style={styles.phoneRow}>
            <CountryPicker
              selected={selectedCountry}
              onSelect={c => { setSelectedCountry(c); setPhone(''); }}
            />
            <Input
              placeholder="912 345 678"
              value={phone}
              onChangeText={text => setPhone(text.replace(/[^\d\s\-]/g, ''))}
              keyboardType="phone-pad"
              autoComplete="tel"
              style={styles.phoneInput}
            />
          </View>
          <Text style={styles.hintText}>
            {selectedCountry.flag}  {selectedCountry.name} ({selectedCountry.dialCode})
          </Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle-outline" size={20} color={Colors.destructive} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <AnimatedButton
          style={[styles.submitButton, styles.emeraldButton]}
          onPress={handlePhoneSubmit}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" style={styles.spinner} />
          ) : null}
          <Text style={styles.submitButtonText}>Send Verification Code</Text>
        </AnimatedButton>
      </View>
    </View>
  );

  const renderVerifyOTP = () => (
    <View style={styles.formContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          setAuthStep(authStep === 'verify-phone-otp' ? 'phone' : 'email-otp');
          setOtp('');
        }}>
        <Icon name="chevron-left" size={24} color="#9ca3af" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.iconCircle}>
        <Icon name={authStep === 'verify-phone-otp' ? "cellphone" : "email-outline"} size={32} color="#ffffff" />
      </View>
      <Text style={styles.formTitle}>Verify Your {authStep === 'verify-phone-otp' ? 'Phone' : 'Email'}</Text>
      <Text style={styles.formSubtitle}>Enter the 6-digit code sent to</Text>
      <Text style={styles.verifyValue}>{email || phone}</Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Label style={styles.otpLabel}>Verification Code</Label>
          <View style={styles.otpContainer}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <View key={index} style={styles.otpBox}>
                <Text style={styles.otpText}>{otp[index] || ''}</Text>
              </View>
            ))}
          </View>
          <Input
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.hiddenInput}
            autoFocus
          />
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle-outline" size={20} color={Colors.destructive} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <AnimatedButton
          style={[styles.submitButton, styles.emeraldButton, otp.length !== 6 && styles.disabledButton]}
          onPress={handleVerifyOTP}
          disabled={isLoading || otp.length !== 6}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" style={styles.spinner} />
          ) : (
            <Icon name="check" size={20} color="#ffffff" style={styles.buttonIcon} />
          )}
          <Text style={styles.submitButtonText}>Verify Code</Text>
        </AnimatedButton>

        <TouchableOpacity
          style={styles.resendButton}
          onPress={authStep === 'verify-phone-otp' ? handlePhoneSubmit : handleEmailOTPSubmit}
          disabled={isLoading}>
          <Text style={styles.resendText}>Didn't receive a code? Resend</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    const content = (() => {
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
    })();

    return (
      <Animated.View
        entering={FadeIn.duration(300).springify()}
        exiting={FadeOut.duration(200)}>
        {content}
      </Animated.View>
    );
  };

  const opacity1 = gradientAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });
  const opacity2 = gradientAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });
  const opacity3 = gradientAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.4],
  });
  const opacity4 = gradientAnim4.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.3],
  });

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.backgroundContainer}>
        {/* Light pinkish-white background - matching 2nd picture */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fef2f2' }]} />
        {/* Subtle animated gradient layers */}
        <RNAnimated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#fce7f3', opacity: opacity1 }]} />
        <RNAnimated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#fef3c7', opacity: opacity2 }]} />
        <RNAnimated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#f3e8ff', opacity: opacity3 }]} />
        <RNAnimated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#fce7f3', opacity: opacity4 }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.cardWrapper}>
          <Card style={styles.card}>
            <CardContent style={styles.cardContent}>{renderContent()}</CardContent>
          </Card>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to trego's{' '}
          <Text style={styles.footerLink}>Terms of Service</Text> and{' '}
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

// Animated Button Component with press animation
const AnimatedButton = React.memo(({ children, style, onPress, disabled, ...props }: any) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = React.useCallback(() => {
    if (!disabled) {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    }
  }, [disabled]);

  const handlePressOut = React.useCallback(() => {
    if (!disabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  }, [disabled]);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={style}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
        {...props}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
});

// Google Icon Component - SVG matching web version
const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" style={styles.googleIcon}>
    <Path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <Path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </Svg>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
    zIndex: 10,
  },
  card: {
    backgroundColor: '#1f2937', // Dark gray card - matching 2nd picture
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardContent: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  methodContainer: {
    gap: 16,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  googleIcon: {
    marginRight: 8,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e5e7eb', // Light gray text for dark theme
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#9ca3af', // Light muted text for dark theme
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonGroup: {
    gap: 12,
  },
  authButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151', // Dark border for dark theme
    backgroundColor: '#374151', // Dark gray button background
  },
  googleButton: {
    backgroundColor: '#374151',
  },
  outlineButton: {
    backgroundColor: '#374151',
  },
  buttonIcon: {
    marginRight: 8,
  },
  spinner: {
    marginRight: 8,
  },
  backArrow: {
    marginRight: 4,
  },
  errorIcon: {
    fontSize: 16,
    color: Colors.destructive,
    marginRight: 8,
  },
  loadingSpinner: {
    fontSize: 20,
    color: '#f3f4f6', // Light color for dark theme
    marginRight: 8,
  },
  loadingSpinnerWhite: {
    fontSize: 20,
    color: '#ffffff',
    marginRight: 8,
  },
  checkIcon: {
    fontSize: 20,
    color: '#ffffff',
    marginRight: 8,
  },
  iconCircleText: {
    fontSize: 32,
  },
  buttonText: {
    fontSize: 16,
    color: '#f3f4f6', // Light text for dark buttons
    fontWeight: '500',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#4b5563', // Dark separator for dark theme
  },
  separatorText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: '#9ca3af', // Light muted text
    backgroundColor: '#1f2937', // Match card background
  },
  formContainer: {
    gap: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: '#9ca3af', // Light muted text for dark theme
    marginLeft: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e5e7eb', // Light text for dark theme
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#9ca3af', // Light muted text
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  hintText: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  phoneInput: {
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.destructive + '20',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.destructive,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.destructive,
    flex: 1,
  },
  submitButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginTop: 8,
  },
  emeraldButton: {
    backgroundColor: Colors.emerald600,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  switchAuth: {
    alignItems: 'center',
    marginTop: 16,
  },
  switchAuthText: {
    fontSize: 14,
    color: '#10b981', // Emerald green for links
  },
  skipButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#9ca3af', // Light muted text for dark theme
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10b981', // Light green/teal background for phone icon (matching image)
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  verifyValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb', // Light text for dark theme
    textAlign: 'center',
    marginBottom: 24,
  },
  otpLabel: {
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563', // Dark border for dark theme
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#374151', // Dark background for OTP boxes
  },
  otpText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#f3f4f6', // Light text for dark theme
    letterSpacing: 4,
  },
  hiddenInput: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#10b981', // Emerald green for links
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af', // Light muted text for dark theme
    textAlign: 'center',
  },
  footerLink: {
    color: '#10b981', // Emerald green for links
    textDecorationLine: 'underline',
  },
});
