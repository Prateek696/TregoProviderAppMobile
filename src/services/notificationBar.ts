/**
 * Trego Notification Bar Fallback
 * Persistent Android notification with "🎤 Voice" and "✏️ Text" actions.
 */
import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';

const { TregoNotification } = NativeModules;

export async function showPersistentNotification(token?: string) {
  if (Platform.OS !== 'android' || !TregoNotification) return;

  // Android 13+ requires runtime POST_NOTIFICATIONS permission
  if (Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
  }

  // Request RECORD_AUDIO so the Voice button works without opening the app.
  // The native notification rebuilds its Voice intent based on whether this is granted.
  await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: 'Microphone permission',
    message: 'Trego needs microphone access so you can log jobs by voice from the notification.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });

  // Request battery optimization exemption (critical for Vivo/Xiaomi/Samsung)
  // Without this, the OS kills the foreground service when app is closed
  try {
    const { Linking, NativeModules: NM } = require('react-native');
    if (NM.TregoNotification?.requestBatteryOptimizationExemption) {
      NM.TregoNotification.requestBatteryOptimizationExemption();
    }
  } catch (_) {}

  // Store auth token so voice/text actions can post directly without opening the app
  if (token) {
    const { API_BASE_URL } = require('./api');
    TregoNotification.setAuthCredentials(token, API_BASE_URL);
  }

  TregoNotification.showPersistentNotification();
}

export function hidePersistentNotification() {
  if (Platform.OS === 'android' && TregoNotification) {
    TregoNotification.hidePersistentNotification();
  }
}

// Listen for Voice tap from notification bar
export function onRecordVoiceTap(callback: () => void): () => void {
  if (Platform.OS !== 'android' || !TregoNotification) return () => {};
  const emitter = new NativeEventEmitter(TregoNotification);
  const sub = emitter.addListener('TregoRecordVoice', callback);
  return () => sub.remove();
}

// Listen for Text tap from notification bar
export function onRecordTextTap(callback: () => void): () => void {
  if (Platform.OS !== 'android' || !TregoNotification) return () => {};
  const emitter = new NativeEventEmitter(TregoNotification);
  const sub = emitter.addListener('TregoRecordText', callback);
  return () => sub.remove();
}

// Backward-compat alias
export const onRecordJobTap = onRecordVoiceTap;
