-- Migration 011: scheduling reason + ensure scheduling fields exist
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduling_reason VARCHAR(100);

-- Backfill: mark existing auto-scheduled jobs
UPDATE jobs SET scheduling_reason = 'earliest available slot'
WHERE auto_scheduled = TRUE AND scheduling_reason IS NULL;
