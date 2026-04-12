/**
 * Offline Queue
 * Saves audio recordings AND text jobs to local storage when offline.
 * Auto-syncs when connectivity returns.
 */

import { jsonStorage } from '../shared/storage';
import NetInfo from '@react-native-community/netinfo';
import { jobsAPI } from './api';

const AUDIO_KEY = 'trego-offline-audio-queue';
const TEXT_KEY  = 'trego-offline-text-queue';

interface QueuedAudio {
  id: string;
  audioPath: string;
  recordedAt: string;
}

interface QueuedText {
  id: string;
  rawText: string;
  createdAt: string;
}

export const offlineQueue = {
  // ── Audio queue ────────────────────────────────────────────────────────────
  enqueue: async (audioPath: string): Promise<QueuedAudio> => {
    const existing = await jsonStorage.getItem<QueuedAudio[]>(AUDIO_KEY) || [];
    const item: QueuedAudio = {
      id: Date.now().toString(),
      audioPath,
      recordedAt: new Date().toISOString(),
    };
    await jsonStorage.setItem(AUDIO_KEY, [...existing, item]);
    return item;
  },

  // ── Text queue ─────────────────────────────────────────────────────────────
  enqueueText: async (rawText: string): Promise<QueuedText> => {
    const existing = await jsonStorage.getItem<QueuedText[]>(TEXT_KEY) || [];
    const item: QueuedText = {
      id: Date.now().toString(),
      rawText,
      createdAt: new Date().toISOString(),
    };
    await jsonStorage.setItem(TEXT_KEY, [...existing, item]);
    return item;
  },

  // Count all pending items
  count: async (): Promise<number> => {
    const audio = await jsonStorage.getItem<QueuedAudio[]>(AUDIO_KEY) || [];
    const text = await jsonStorage.getItem<QueuedText[]>(TEXT_KEY) || [];
    return audio.length + text.length;
  },

  // Upload all queued items
  flush: async (): Promise<{ synced: number; failed: number }> => {
    let synced = 0;
    let failed = 0;

    // Flush audio queue
    const audioQueue = await jsonStorage.getItem<QueuedAudio[]>(AUDIO_KEY) || [];
    if (audioQueue.length > 0) {
      const paths = audioQueue.map(q => q.audioPath);
      try {
        const res = await jobsAPI.syncOffline(paths);
        synced += res.data.synced;
        failed += res.data.total - res.data.synced;

        if (res.data.synced === audioQueue.length) {
          await jsonStorage.setItem(AUDIO_KEY, []);
        } else {
          const successSet = new Set(
            res.data.results
              .map((r: any, i: number) => (r.success ? i : -1))
              .filter((i: number) => i >= 0)
          );
          await jsonStorage.setItem(AUDIO_KEY, audioQueue.filter((_, i) => !successSet.has(i)));
        }
      } catch {
        failed += audioQueue.length;
      }
    }

    // Flush text queue
    const textQueue = await jsonStorage.getItem<QueuedText[]>(TEXT_KEY) || [];
    if (textQueue.length > 0) {
      const remaining: QueuedText[] = [];
      for (const item of textQueue) {
        try {
          await jobsAPI.createText(item.rawText);
          synced++;
        } catch {
          remaining.push(item);
          failed++;
        }
      }
      await jsonStorage.setItem(TEXT_KEY, remaining);
    }

    return { synced, failed };
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
