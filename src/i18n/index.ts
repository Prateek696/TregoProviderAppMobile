/**
 * Trego i18n — production setup
 * - Device language auto-detection (react-native-localize)
 * - Persistent preference via AsyncStorage
 * - RTL support via I18nManager
 * - Missing-key logger
 * - Lazy-loadable resource bundles
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import enCommon from './locales/en/common.json';
import ptCommon from './locales/pt/common.json';

export type Lang = 'en' | 'pt';
const LANG_KEY = 'trego_language';
const RTL_LANGUAGES: Lang[] = []; // extend later: ['ar', 'he']

// ── Device language detection ──────────────────────────────────────────────
function detectDeviceLanguage(): Lang {
  const locales = RNLocalize.getLocales();
  if (locales && locales.length > 0) {
    const tag = locales[0].languageCode.toLowerCase();
    if (tag === 'pt') return 'pt';
  }
  return 'en';
}

// ── Sync init (English default — correct one loaded on mount) ──────────────
i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
    pt: { common: ptCommon },
  },
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common'],
  interpolation: { escapeValue: false },
  returnNull: false,
  returnEmptyString: false,
  saveMissing: __DEV__,
  missingKeyHandler: (_lngs, ns, key) => {
    if (__DEV__) console.warn(`[i18n] Missing translation: ${ns}:${key}`);
  },
  react: { useSuspense: false },
});

// ── Async: load persisted preference (or device language) ──────────────────
export async function bootstrapLanguage(): Promise<Lang> {
  try {
    const stored = (await AsyncStorage.getItem(LANG_KEY)) as Lang | null;
    const lang: Lang = stored || detectDeviceLanguage();
    await applyLanguage(lang, /*persist*/ false);
    return lang;
  } catch {
    return 'en';
  }
}

// ── Change language (+ handle RTL flip if needed) ──────────────────────────
export async function applyLanguage(lang: Lang, persist = true): Promise<void> {
  await i18n.changeLanguage(lang);
  if (persist) await AsyncStorage.setItem(LANG_KEY, lang);

  const shouldBeRTL = RTL_LANGUAGES.includes(lang);
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
    // App needs restart for RTL flip; warn but don't crash
    if (__DEV__) console.warn(`[i18n] RTL changed — app restart required to take effect`);
  }
}

export const setLanguage = (lang: Lang) => applyLanguage(lang, true);
export const getCurrentLanguage = () => i18n.language as Lang;

// Kick off async bootstrap on import
bootstrapLanguage();

export default i18n;
