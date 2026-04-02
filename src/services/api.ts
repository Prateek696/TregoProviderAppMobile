/**
 * Trego API Service
 * Central HTTP client — all backend calls go through here
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';

// ─── Config ──────────────────────────────────────────────────────────────────
// Change this to your Render URL when deployed
export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3001' // Android emulator → localhost
  : 'https://tregoproviderappmobile.onrender.com';

// ─── Axios instance ───────────────────────────────────────────────────────────
const client: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
client.interceptors.request.use(async (config) => {
  const token = await jsonStorage.getItem<string>(STORAGE_KEYS.AUTH_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  // After Firebase Phone Auth verifies the OTP on device, send the idToken here
  firebaseAuth: (idToken: string) =>
    client.post<{ token: string; provider: any; isNew: boolean }>('/auth/firebase', { idToken }),
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export const profileAPI = {
  get: () => client.get('/profile'),

  update: (data: {
    name?: string;
    trade?: string;
    nif?: string;
    fcm_token?: string;
  }) => client.put('/profile', data),
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export const jobsAPI = {
  list: () => client.get<{ jobs: any[] }>('/jobs'),

  get: (id: string) => client.get<{ job: any }>(`/jobs/${id}`),

  createText: (raw_text: string) =>
    client.post<{ job: any }>('/jobs', { raw_text }),

  uploadVoice: (audioPath: string, mimeType = 'audio/m4a') => {
    const form = new FormData();
    form.append('audio', {
      uri: audioPath,
      name: 'recording.m4a',
      type: mimeType,
    } as any);
    return client.post<{ job: any }>('/jobs/voice', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
  },

  syncOffline: (audioPaths: string[]) => {
    const form = new FormData();
    audioPaths.forEach((path, i) => {
      form.append('audio', {
        uri: path,
        name: `offline_${i}.m4a`,
        type: 'audio/m4a',
      } as any);
    });
    return client.post<{ synced: number; total: number; results: any[] }>('/jobs/sync', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },

  update: (id: string, data: Partial<{
    title: string;
    description: string;
    service: string;
    location: string;
    address: string;
    category: string;
    priority: string;
    notes: string;
    price: number;
    actual_price: number;
    scheduled_at: string;
    status: string;
    exec_status: string;
    cancellation_reason: string;
  }>) => client.put<{ job: any }>(`/jobs/${id}`, data),

  uploadPhoto: (id: string, imagePath: string) => {
    const form = new FormData();
    form.append('photo', {
      uri: imagePath,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as any);
    return client.post<{ job: any }>(`/jobs/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
  },

  bill: (id: string) =>
    client.post<{ job: any; invoice: any }>(`/jobs/${id}/bill`),

  digest: () =>
    client.get<{ today_count: number; tomorrow_count: number }>('/jobs/digest'),

  earnings: () =>
    client.get<{
      total_earned: number;
      this_month: number;
      last_month: number;
      monthly_breakdown: Array<{ month: string; total: number; jobs: number }>;
      recent_jobs: Array<{ id: string; title: string; amount: number; completed_at: string; client_name: string; category: string }>;
    }>('/jobs/earnings'),

  stats: () =>
    client.get<{
      active_jobs: number;
      completed_jobs: number;
      total_jobs: number;
      win_rate: number;
      rating: number | null;
      rating_count: number;
    }>('/jobs/stats'),
};

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const invoicesAPI = {
  list: () => client.get<{ invoices: any[] }>('/invoices'),
  get: (id: string) => client.get<{ invoice: any }>(`/invoices/${id}`),
};

// ─── Contacts ─────────────────────────────────────────────────────────────────
export const contactsAPI = {
  list: () => client.get<{ contacts: any[] }>('/contacts'),

  get: (id: string) => client.get<{ contact: any }>(`/contacts/${id}`),

  create: (data: { name: string; phone?: string; email?: string; nif?: string; notes?: string }) =>
    client.post<{ contact: any }>('/contacts', data),

  update: (id: string, data: any) =>
    client.put<{ contact: any }>(`/contacts/${id}`, data),

  sync: (contacts: Array<{
    name: string;
    phones?: Array<{ number: string; label?: string }>;
    emails?: Array<{ email: string; label?: string }>;
    source_contact_id?: string;
  }>) => client.post<{ imported: number; skipped: number; total: number }>('/contacts/sync', { contacts }),
};

// ─── Helper ───────────────────────────────────────────────────────────────────
export function getAPIError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<{ error?: string; errors?: any[] }>;
    return e.response?.data?.error
      || e.response?.data?.errors?.[0]?.msg
      || e.message
      || 'Something went wrong';
  }
  return 'Something went wrong';
}
