/**
 * Schedule Storage Utilities
 * AsyncStorage wrapper for schedule data persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    DAY_TIMER: '@schedule_day_timer',
    DAY_STARTED: '@schedule_day_started',
    DAY_ENDED: '@schedule_day_ended',
    DAY_START_TIME: '@schedule_day_start_time',
    FREE_TIME_NOTES: '@schedule_free_time_notes',
    JOB_STATUSES: '@schedule_job_statuses',
};

export interface FreeTimeNote {
    title: string;
    content: string;
    timeSlot: string;
}

export interface DayTimerState {
    elapsedSeconds: number;
    isRunning: boolean;
    startTime: string | null;
}

export interface JobStatus {
    jobId: string;
    status: string;
    updatedAt: string;
}

/**
 * Day Timer Storage
 */
export const dayTimerStorage = {
    async save(state: DayTimerState): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.DAY_TIMER, JSON.stringify(state));
        } catch (error) {
            console.error('Error saving day timer:', error);
        }
    },

    async load(): Promise<DayTimerState | null> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.DAY_TIMER);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading day timer:', error);
            return null;
        }
    },

    async clear(): Promise<void> {
        try {
            await AsyncStorage.removeItem(STORAGE_KEYS.DAY_TIMER);
        } catch (error) {
            console.error('Error clearing day timer:', error);
        }
    },
};

/**
 * Day State Storage
 */
export const dayStateStorage = {
    async setDayStarted(started: boolean): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.DAY_STARTED, JSON.stringify(started));
        } catch (error) {
            console.error('Error saving day started state:', error);
        }
    },

    async getDayStarted(): Promise<boolean> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.DAY_STARTED);
            return data ? JSON.parse(data) : false;
        } catch (error) {
            console.error('Error loading day started state:', error);
            return false;
        }
    },

    async setDayEnded(ended: boolean): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.DAY_ENDED, JSON.stringify(ended));
        } catch (error) {
            console.error('Error saving day ended state:', error);
        }
    },

    async getDayEnded(): Promise<boolean> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.DAY_ENDED);
            return data ? JSON.parse(data) : false;
        } catch (error) {
            console.error('Error loading day ended state:', error);
            return false;
        }
    },

    async setDayStartTime(time: Date | null): Promise<void> {
        try {
            await AsyncStorage.setItem(
                STORAGE_KEYS.DAY_START_TIME,
                time ? time.toISOString() : ''
            );
        } catch (error) {
            console.error('Error saving day start time:', error);
        }
    },

    async getDayStartTime(): Promise<Date | null> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.DAY_START_TIME);
            return data ? new Date(data) : null;
        } catch (error) {
            console.error('Error loading day start time:', error);
            return null;
        }
    },
};

/**
 * Free Time Notes Storage
 */
export const freeTimeNotesStorage = {
    async save(notes: Record<string, FreeTimeNote>): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.FREE_TIME_NOTES, JSON.stringify(notes));
        } catch (error) {
            console.error('Error saving free time notes:', error);
        }
    },

    async load(): Promise<Record<string, FreeTimeNote>> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.FREE_TIME_NOTES);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error loading free time notes:', error);
            return {};
        }
    },

    async addNote(timeSlot: string, note: FreeTimeNote): Promise<void> {
        try {
            const notes = await this.load();
            notes[timeSlot] = note;
            await this.save(notes);
        } catch (error) {
            console.error('Error adding free time note:', error);
        }
    },

    async removeNote(timeSlot: string): Promise<void> {
        try {
            const notes = await this.load();
            delete notes[timeSlot];
            await this.save(notes);
        } catch (error) {
            console.error('Error removing free time note:', error);
        }
    },
};

/**
 * Job Status Storage
 */
export const jobStatusStorage = {
    async save(statuses: Record<string, string>): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.JOB_STATUSES, JSON.stringify(statuses));
        } catch (error) {
            console.error('Error saving job statuses:', error);
        }
    },

    async load(): Promise<Record<string, string>> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.JOB_STATUSES);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error loading job statuses:', error);
            return {};
        }
    },

    async updateStatus(jobId: string, status: string): Promise<void> {
        try {
            const statuses = await this.load();
            statuses[jobId] = status;
            await this.save(statuses);
        } catch (error) {
            console.error('Error updating job status:', error);
        }
    },
};
