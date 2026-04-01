-- Migration 003 — cash logging, intake source, quiet hours

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS payment_received BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cash_amount       NUMERIC(10,2),
  -- which capture channel created this job: bubble | whatsapp | post_call | manual
  ADD COLUMN IF NOT EXISTS intake_source     VARCHAR(20) DEFAULT 'bubble';

ALTER TABLE provider_settings
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled  BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS quiet_hours_start    INTEGER DEFAULT 21,  -- 24h hour
  ADD COLUMN IF NOT EXISTS quiet_hours_end      INTEGER DEFAULT 7;   -- 24h hour
