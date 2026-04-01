/**
 * Offline Queue
 * Saves audio recordings to local storage when there's no internet.
 * Auto-syncs when connectivity returns.
 */

import { jsonStorage } from '../shared/storage';
import NetInfo from '@react-native-community/netinfo';
import { jobsAPI } from './api';

const QUEUE_KEY = 'trego-offline-audio-queue';

interface QueuedJob {
  id: string;          // local UUID
  audioPath: string;   // path on device
  recordedAt: string;  // ISO timestamp
}

export const offlineQueue = {
  // Add a recorded audio file to the queue
  enqueue: async (audioPath: string): Promise<QueuedJob> => {
    const existing = await jsonStorage.getItem<QueuedJob[]>(QUEUE_KEY) || [];
    const item: QueuedJob = {
      id: Date.now().toString(),
      audioPath,
      recordedAt: new Date().toISOString(),
    };
    await jsonStorage.setItem(QUEUE_KEY, [...existing, item]);
    return item;
  },

  // Get all queued items
  getAll: async (): Promise<QueuedJob[]> => {
    return (await jsonStorage.getItem<QueuedJob[]>(QUEUE_KEY)) || [];
  },

  // Count pending items
  count: async (): Promise<number> => {
    const queue = await jsonStorage.getItem<QueuedJob[]>(QUEUE_KEY) || [];
    return queue.length;
  },

  // Upload all queued items and clear on success
  flush: async (): Promise<{ synced: number; failed: number }> => {
    const queue = await jsonStorage.getItem<QueuedJob[]>(QUEUE_KEY) || [];
    if (queue.length === 0) return { synced: 0, failed: 0 };

    const paths = queue.map((q) => q.audioPath);

    try {
      const res = await jobsAPI.syncOffline(paths);
      const synced = res.data.synced;
      const failed = res.data.total - synced;

      // Remove successfully synced items from queue
      if (synced === queue.length) {
        await jsonStorage.setItem(QUEUE_KEY, []);
      } else {
        // Keep failed ones
        const successIndices = new Set(
          res.data.results
            .map((r: any, i: number) => (r.success ? i : -1))
            .filter((i: number) => i >= 0)
        );
        const remaining = queue.filter((_, i) => !successIndices.has(i));
        await jsonStorage.setItem(QUEUE_KEY, remaining);
      }

      return { synced, failed };
    } catch {
      return { synced: 0, failed: queue.length };
    }
  },
};

// Start listening for connectivity and auto-flush when online
export function startOfflineSyncListener(onSynced?: (count: number) => void) {
  return NetInfo.addEventListener(async (state) => {
    if (state.isConnected && state.isInternetReachable) {
      const count = await offlineQueue.count();
      if (count > 0) {
        const result = await offlineQueue.flush();
        if (result.synced > 0 && onSynced) {
          onSynced(result.synced);
        }
      }
    }
  });
}
