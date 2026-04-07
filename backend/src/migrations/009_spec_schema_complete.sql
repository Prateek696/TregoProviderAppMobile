-- Migration 009 — Final MVP Spec schema completion
-- Adds all fields from Section 6 of the Trego Final MVP Spec (April 2026)

-- ── jobs table ────────────────────────────────────────────────────────────────

ALTER TABLE jobs
  -- Capture channel tracking
  ADD COLUMN IF NOT EXISTS intake_source       VARCHAR(20),   -- bubble | whatsapp | post_call

  -- Normalized service code (store display text in service/title, code in English)
  ADD COLUMN IF NOT EXISTS service_type_code   VARCHAR(100),  -- plumbing | electrical | painting etc

  -- Referral tracking
  ADD COLUMN IF NOT EXISTS is_referral         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referral_client_id  UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Client-facing status (separate from AI pipeline status and exec status)
  ADD COLUMN IF NOT EXISTS client_status       VARCHAR(20),   -- quoted | approved | in_progress | completed | disputed | satisfied

  -- Future: job assignment to another provider (2-person teams etc)
  ADD COLUMN IF NOT EXISTS assigned_to         UUID REFERENCES providers(id) ON DELETE SET NULL,

  -- Future: company accounts
  ADD COLUMN IF NOT EXISTS organization_id     UUID,

  -- Future: multi-job projects (self-referential)
  ADD COLUMN IF NOT EXISTS parent_project_id   UUID REFERENCES jobs(id) ON DELETE SET NULL;

-- ── clients table ─────────────────────────────────────────────────────────────

ALTER TABLE clients
  -- Business contact selection (set during onboarding contact selection screen)
  ADD COLUMN IF NOT EXISTS is_business_contact BOOLEAN NOT NULL DEFAULT FALSE,

  -- "Not a client" dismiss (post-call prompt exclusion)
  ADD COLUMN IF NOT EXISTS is_excluded         BOOLEAN NOT NULL DEFAULT FALSE,

  -- Client type
  ADD COLUMN IF NOT EXISTS client_type         VARCHAR(20);   -- individual | business

-- ── job_photos table ──────────────────────────────────────────────────────────
-- Add before/during/after classification + source + GPS metadata

ALTER TABLE job_photos
  ADD COLUMN IF NOT EXISTS phase        VARCHAR(10),   -- before | during | after
  ADD COLUMN IF NOT EXISTS source       VARCHAR(10),   -- client | provider
  ADD COLUMN IF NOT EXISTS latitude     FLOAT,
  ADD COLUMN IF NOT EXISTS longitude    FLOAT,
  ADD COLUMN IF NOT EXISTS captured_at  TIMESTAMPTZ;

-- Default existing photos to phase=during, source=provider
UPDATE job_photos
SET phase = 'during', source = 'provider'
WHERE phase IS NULL;
