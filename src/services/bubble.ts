/**
 * Trego Floating Bubble
 * Controls the Android system overlay bubble that lets providers record jobs
 * from any app without opening Trego.
 *
 * Permission flow:
 *   1. Call hasOverlayPermission() — if false, call requestOverlayPermission()
 *   2. User grants permission in system settings
 *   3. App resumes → call showBubble()
 */
import { NativeModules, Platform } from 'react-native';

const { TregoBubble } = NativeModules;

export async function hasOverlayPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || !TregoBubble) return false;
  return TregoBubble.hasOverlayPermission();
}

export function requestOverlayPermission() {
  if (Platform.OS === 'android' && TregoBubble) {
    TregoBubble.requestOverlayPermission();
  }
}

export function showBubble() {
  if (Platform.OS === 'android' && TregoBubble) {
    TregoBubble.showBubble();
  }
}

export function hideBubble() {
  if (Platform.OS === 'android' && TregoBubble) {
    TregoBubble.hideBubble();
  }
}
