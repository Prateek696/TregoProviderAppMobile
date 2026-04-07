-- Add estimated duration to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER DEFAULT 60;
