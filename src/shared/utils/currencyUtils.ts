/**
 * Currency and money formatting utilities for React Native
 */

/**
 * Format number as currency (e.g., "123.45€" or "€123.45")
 */
export const formatCurrency = (amount: number, currency: string = '€', position: 'before' | 'after' = 'after'): string => {
  const formatted = amount.toFixed(2);
  return position === 'before' ? `${currency}${formatted}` : `${formatted}${currency}`;
};

/**
 * Format currency with thousands separator (e.g., "1,234.56€")
 */
export const formatCurrencyWithSeparator = (amount: number, currency: string = '€', position: 'before' | 'after' = 'after'): string => {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return position === 'before' ? `${currency}${formatted}` : `${formatted}${currency}`;
};

/**
 * Parse currency string to number (removes currency symbols and commas)
 */
export const parseCurrency = (currencyStr: string): number => {
  // Remove currency symbols, commas, and whitespace
  const cleaned = currencyStr.replace(/[€$£,\s]/g, '');
  return parseFloat(cleaned) || 0;
};

/**
 * Format price string (handles strings like "€123.45" or "123.45€")
 */
export const formatPrice = (price: string | number | null | undefined): string => {
  if (!price) return '';
  if (typeof price === 'number') return formatCurrency(price);
  return price; // Already formatted string
};


