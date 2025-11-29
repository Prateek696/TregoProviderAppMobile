/**
 * Design Tokens - Colors
 * Extracted from the web app's CSS variables
 * These are React Native safe color values
 */

export const Colors = {
  // Primary Colors
  background: '#ffffff',
  foreground: '#252525', // oklch(0.145 0 0) converted to hex approximation
  primary: '#030213',
  primaryForeground: '#ffffff',
  
  // Secondary Colors
  secondary: '#f5f5f5', // oklch(0.95 0.0058 264.53) approximation
  secondaryForeground: '#030213',
  
  // Muted Colors
  muted: '#ececf0',
  mutedForeground: '#717182',
  
  // Accent Colors
  accent: '#e9ebef',
  accentForeground: '#030213',
  
  // Destructive
  destructive: '#d4183d',
  destructiveForeground: '#ffffff',
  
  // Border & Input
  border: 'rgba(0, 0, 0, 0.1)',
  input: 'transparent',
  inputBackground: '#f3f3f5',
  
  // Trego Blue
  tregoBlue: '#3b82f6',
  
  // Status Colors - Pending
  statusPendingBg: '#FFF7ED',
  statusPendingText: '#EA580C',
  
  // Status Colors - Confirmed
  statusConfirmedBg: '#E6F0FF',
  statusConfirmedText: '#0066FF',
  
  // Status Colors - En Route
  statusEnRouteBg: '#F3E8FF',
  statusEnRouteText: '#6A0DAD',
  
  // Status Colors - On Site
  statusOnSiteBg: '#FFFBE6',
  statusOnSiteText: '#E6B800',
  
  // Status Colors - Paused
  statusPausedBg: '#FFE6E6',
  statusPausedText: '#CC0000',
  
  // Status Colors - Completed
  statusCompletedBg: '#E8FDE6',
  statusCompletedText: '#1A7F37',
  
  // Status Colors - Cancelled
  statusCancelledBg: '#F2F2F2',
  statusCancelledText: '#555555',
  
  // Schedule Block Colors - Free Time
  freeTimeBg: '#FEF3C7',
  freeTimeBorder: '#F59E0B',
  freeTimeText: '#92400E',
  freeTimeAccent: '#FBBF24',
  
  // Schedule Block Colors - Travel
  travelBg: '#F2F2F2',
  travelBorder: '#6B7280',
  travelText: '#374151',
  travelAccent: '#9CA3AF',
  
  // Schedule Block Colors - Break
  breakBg: '#D1FAE5',
  breakBorder: '#10B981',
  breakText: '#047857',
  breakAccent: '#34D399',
  
  // Job Alert Colors
  jobUrgent: '#FF3B30',
  jobSameDay: '#FF9500',
  jobSameWeek: '#FFD60A',
  jobLongTerm: '#007AFF',
  jobRecurring: '#32D3C8',
  jobCancelled: '#8E8E93',
} as const;


