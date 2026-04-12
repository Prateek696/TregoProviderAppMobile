/**
 * Locale-aware formatting helpers using Intl API.
 * Gracefully falls back if Intl is unavailable (older Android).
 */
import { getCurrentLanguage } from './index';

const LOCALES: Record<string, string> = {
  en: 'en-GB', // European English (matches PT time format better)
  pt: 'pt-PT',
};

const CURRENCY_BY_LANG: Record<string, string> = {
  en: 'EUR', // MVP is Portugal
  pt: 'EUR',
};

function safeIntl<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

/** Format number as currency (EUR by default for Portugal MVP) */
export function formatCurrency(amount: number, currency?: string): string {
  const lang = getCurrentLanguage();
  const locale = LOCALES[lang] || 'en-GB';
  const cur = currency || CURRENCY_BY_LANG[lang] || 'EUR';
  return safeIntl(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency: cur }).format(amount),
    `€${amount.toFixed(2)}`
  );
}

/** Format date as locale-aware short date */
export function formatDate(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const lang = getCurrentLanguage();
  const locale = LOCALES[lang] || 'en-GB';
  return safeIntl(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(d),
    d.toDateString()
  );
}

/** Format time as HH:MM (UTC-safe) */
export function formatTime(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const lang = getCurrentLanguage();
  const locale = LOCALES[lang] || 'en-GB';
  return safeIntl(
    () => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(d),
    d.toISOString().slice(11, 16)
  );
}

/** Format relative time (e.g. "in 2 days", "3 hours ago") */
export function formatRelative(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const diff = d.getTime() - Date.now();
  const days = Math.round(diff / 86_400_000);
  const hours = Math.round(diff / 3_600_000);
  const mins = Math.round(diff / 60_000);
  const lang = getCurrentLanguage();
  const locale = LOCALES[lang] || 'en-GB';

  return safeIntl(() => {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (Math.abs(days) >= 1) return rtf.format(days, 'day');
    if (Math.abs(hours) >= 1) return rtf.format(hours, 'hour');
    return rtf.format(mins, 'minute');
  }, d.toDateString());
}
