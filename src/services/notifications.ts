/**
 * Push Notification Service — Firebase Cloud Messaging
 *
 * Setup required:
 *   npm install @react-native-firebase/app @react-native-firebase/messaging
 *   Place google-services.json in android/app/
 *   Follow https://rnfirebase.io/ native setup steps
 *
 * Until Firebase is configured, this module is a no-op scaffold.
 */

import { profileAPI } from './api';

// Lazily import Firebase to avoid crashing if not yet installed
let messaging: any = null;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch {
  // Firebase not installed yet — all functions below become no-ops
}

export type NotificationPayload = {
  jobId?: string;
  type?: 'job_created' | 'job_updated' | 'digest' | 'post_call';
  title?: string;
  body?: string;
};

/**
 * Request permission + register FCM token with backend.
 * Call once after login.
 */
export async function registerPushToken(): Promise<void> {
  if (!messaging) return;

  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus?.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus?.PROVISIONAL;

    if (!enabled) return;

    const token = await messaging().getToken();
    if (token) {
      await profileAPI.update({ fcm_token: token });
    }

    // Refresh token if it changes
    messaging().onTokenRefresh(async (newToken: string) => {
      await profileAPI.update({ fcm_token: newToken });
    });
  } catch (err) {
    console.error('[Push] Failed to register token:', err);
  }
}

/**
 * Handle foreground messages.
 * Returns unsubscribe function — call in useEffect cleanup.
 */
export function onForegroundMessage(
  handler: (payload: NotificationPayload) => void
): () => void {
  if (!messaging) return () => {};

  return messaging().onMessage(async (remoteMessage: any) => {
    const data = remoteMessage.data as NotificationPayload;
    handler(data);
  });
}

/**
 * Get the notification that opened the app from quit/background state.
 * Call once on app start to handle deep-link to job.
 */
export async function getInitialNotification(): Promise<NotificationPayload | null> {
  if (!messaging) return null;

  try {
    const remoteMessage = await messaging().getInitialNotification();
    return remoteMessage?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Background message handler — must be registered outside React tree (e.g. index.js).
 *
 * Usage in index.js:
 *   import { setBackgroundMessageHandler } from './src/services/notifications';
 *   setBackgroundMessageHandler();
 */
export function setBackgroundMessageHandler(): void {
  if (!messaging) return;

  messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
    // Background/quit state: just log — system handles notification display
    console.log('[Push] Background message:', remoteMessage.data);
  });
}
