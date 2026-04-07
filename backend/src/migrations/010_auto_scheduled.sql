-- Migration 010: auto_scheduled flag on jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS auto_scheduled BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS schedule_message TEXT;
