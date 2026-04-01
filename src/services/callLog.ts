/**
 * Post-Call Capture Service — READ_CALL_LOG
 *
 * Monitors call log for completed calls. When a call exceeds the threshold
 * (default 30 seconds, configurable in Settings), shows a prompt to create a job.
 *
 * Android only — iOS doesn't allow READ_CALL_LOG.
 *
 * Setup:
 *   npm install react-native-call-log
 *   Add to AndroidManifest.xml:
 *     <uses-permission android:name="android.permission.READ_CALL_LOG" />
 */

import { Platform, PermissionsAndroid } from 'react-native';

export interface RecentCall {
  name: string;
  phoneNumber: string;
  duration: number; // seconds
  timestamp: number; // ms
  type: 'incoming' | 'outgoing' | 'missed';
}

let CallLog: any = null;
try {
  CallLog = require('react-native-call-log');
} catch {
  // Package not installed — all functions become no-ops
}

/**
 * Request READ_CALL_LOG permission on Android.
 * Returns true if granted.
 */
export async function requestCallLogPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || !CallLog) return false;

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
    {
      title: 'Call Log Permission',
      message: 'Trego can prompt you to log a job after a phone call with a client.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    }
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Get the most recent completed call.
 * Returns null if permission not granted or no recent calls.
 */
export async function getMostRecentCall(): Promise<RecentCall | null> {
  if (Platform.OS !== 'android' || !CallLog) return null;

  try {
    const logs = await CallLog.loadAll(1);
    if (!logs || logs.length === 0) return null;

    const call = logs[0];
    return {
      name: call.name || call.phoneNumber || 'Unknown',
      phoneNumber: call.phoneNumber || '',
      duration: parseInt(call.duration || '0', 10),
      timestamp: parseInt(call.timestamp || '0', 10),
      type: call.type === '1' ? 'incoming' : call.type === '2' ? 'outgoing' : 'missed',
    };
  } catch (err) {
    console.error('[CallLog] Error reading call log:', err);
    return null;
  }
}

/**
 * Check if we should show a post-call prompt.
 * Returns the call if threshold is exceeded, null otherwise.
 *
 * @param thresholdSeconds - minimum call duration to trigger prompt (from Settings)
 * @param lastCheckedTimestamp - don't re-prompt for calls already seen
 */
export async function checkForPostCallPrompt(
  thresholdSeconds: number,
  lastCheckedTimestamp: number
): Promise<RecentCall | null> {
  const call = await getMostRecentCall();
  if (!call) return null;

  // Only prompt for calls after the last check and above threshold
  if (
    call.timestamp > lastCheckedTimestamp &&
    call.duration >= thresholdSeconds &&
    call.type !== 'missed'
  ) {
    return call;
  }

  return null;
}
