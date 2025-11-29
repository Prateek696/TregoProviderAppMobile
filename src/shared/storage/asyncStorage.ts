/**
 * AsyncStorage wrapper for React Native
 * Provides a localStorage-like API using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage utility that mimics localStorage API
 */
export const storage = {
  /**
   * Get item from storage
   */
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Error reading from storage (key: ${key}):`, error);
      return null;
    }
  },

  /**
   * Set item in storage
   */
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error writing to storage (key: ${key}):`, error);
      throw error;
    }
  },

  /**
   * Remove item from storage
   */
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from storage (key: ${key}):`, error);
      throw error;
    }
  },

  /**
   * Clear all items from storage
   */
  clear: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  },

  /**
   * Get all keys from storage
   */
  getAllKeys: async (): Promise<string[]> => {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  },

  /**
   * Get multiple items at once
   */
  multiGet: async (keys: string[]): Promise<Array<[string, string | null]>> => {
    try {
      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.error('Error getting multiple items:', error);
      return keys.map(key => [key, null]);
    }
  },

  /**
   * Set multiple items at once
   */
  multiSet: async (keyValuePairs: Array<[string, string]>): Promise<void> => {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (error) {
      console.error('Error setting multiple items:', error);
      throw error;
    }
  },

  /**
   * Remove multiple items at once
   */
  multiRemove: async (keys: string[]): Promise<void> => {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error removing multiple items:', error);
      throw error;
    }
  }
};

/**
 * JSON storage helpers - automatically stringify/parse
 */
export const jsonStorage = {
  /**
   * Get JSON object from storage
   */
  getItem: async <T>(key: string): Promise<T | null> => {
    try {
      const value = await storage.getItem(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Error parsing JSON from storage (key: ${key}):`, error);
      return null;
    }
  },

  /**
   * Set JSON object in storage
   */
  setItem: async <T>(key: string, value: T): Promise<void> => {
    try {
      const stringified = JSON.stringify(value);
      await storage.setItem(key, stringified);
    } catch (error) {
      console.error(`Error stringifying JSON for storage (key: ${key}):`, error);
      throw error;
    }
  },

  /**
   * Remove item from storage
   */
  removeItem: async (key: string): Promise<void> => {
    return storage.removeItem(key);
  }
};

/**
 * Storage keys used throughout the app
 */
export const STORAGE_KEYS = {
  PROVIDER_PROFILE: 'trego-provider-profile',
  SCHEDULE: 'trego-provider-schedule',
  JOBS: 'trego-provider-jobs',
  CONTACTS: 'trego-provider-contacts',
  INVOICES: 'trego-provider-invoices',
  EXPENSES: 'trego-provider-expenses',
  SETTINGS: 'trego-provider-settings',
  ORB_COLOR: 'trego-provider-orb-color',
  AUTH_TOKEN: 'trego-provider-auth-token',
  ONBOARDING_COMPLETE: 'trego-provider-onboarding-complete'
} as const;


