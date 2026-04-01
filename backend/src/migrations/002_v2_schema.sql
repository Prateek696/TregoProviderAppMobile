-- Migration 002 — v2 schema updates
-- Adds fields required by the mobile app UI

-- ── jobs table additions ──────────────────────────────────────────────────────

ALTER TABLE jobs
  -- display fields the mobile Job type expects
  ADD COLUMN IF NOT EXISTS title          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description    TEXT,
  ADD COLUMN IF NOT EXISTS address        TEXT,          -- full street address
  ADD COLUMN IF NOT EXISTS category       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS priority       VARCHAR(20)  DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS job_type       VARCHAR(20)  DEFAULT 'fixed',  -- fixed | bid
  ADD COLUMN IF NOT EXISTS notes          TEXT,

  -- pricing
  ADD COLUMN IF NOT EXISTS price          NUMERIC(10,2),      -- optional price field (plan v2)
  ADD COLUMN IF NOT EXISTS bid_amount     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS actual_price   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS estimated_price NUMERIC(10,2),

  -- photo attachment (plan v2 — Cloudinary)
  ADD COLUMN IF NOT EXISTS photo_url      TEXT,

  -- execution lifecycle statuses (separate from AI pipeline status)
  -- ai_status: raw | processing | structured   (existing 'status' column repurposed)
  -- exec_status: pending | confirmed | en-route | on-site | paused | delayed | completed | cancelled
  ADD COLUMN IF NOT EXISTS exec_status    VARCHAR(20)  DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS previous_exec_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS delay_reason   TEXT,
  ADD COLUMN IF NOT EXISTS delayed_since  TIMESTAMPTZ,

  -- lifecycle timestamps
  ADD COLUMN IF NOT EXISTS started_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS on_site_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recently_rescheduled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,

  -- recurring job detection (plan v2 — set by AI parser)
  ADD COLUMN IF NOT EXISTS recurring_flag BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurring_note TEXT;  -- e.g. "Follow-up? Previous: 12 Mar, Plumbing, €80"

-- ── clients table additions ───────────────────────────────────────────────────

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS phone          VARCHAR(30),
  ADD COLUMN IF NOT EXISTS business_name  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address        TEXT,
  ADD COLUMN IF NOT EXISTS city           VARCHAR(100),
  ADD COLUMN IF NOT EXISTS postal_code    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS country        VARCHAR(100) DEFAULT 'PT',
  ADD COLUMN IF NOT EXISTS notes          TEXT,
  ADD COLUMN IF NOT EXISTS tags           TEXT[],        -- array of tag strings
  ADD COLUMN IF NOT EXISTS sync_status    VARCHAR(20)  DEFAULT 'trego-only',  -- not-synced | trego-only | synced
  ADD COLUMN IF NOT EXISTS source_contact_id TEXT,       -- device contact ID if synced from phone
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

-- ── contacts_phones table (for multi-phone contacts) ─────────────────────────

CREATE TABLE IF NOT EXISTS contact_phones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  label       VARCHAR(50) DEFAULT 'mobile',
  number      VARCHAR(30) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── contacts_emails table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contact_emails (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  label       VARCHAR(50) DEFAULT 'work',
  email       VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── invoices table (for Moloni billing) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         UUID REFERENCES providers(id),
  job_id              UUID REFERENCES jobs(id),
  client_id           UUID REFERENCES clients(id),
  moloni_invoice_id   VARCHAR(255),
  invoice_number      VARCHAR(100),
  series              VARCHAR(50),
  issue_date          DATE,
  due_date            DATE,
  status              VARCHAR(20) DEFAULT 'DRAFT',  -- DRAFT | ISSUED | PAID | OVERDUE | VOID
  net_total           NUMERIC(10,2),
  vat_total           NUMERIC(10,2),
  total               NUMERIC(10,2),
  pdf_url             TEXT,
  atcud               VARCHAR(100),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── invoice_lines table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoice_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  quantity        NUMERIC(10,3) DEFAULT 1,
  unit            VARCHAR(50)  DEFAULT 'un',
  unit_price      NUMERIC(10,2) NOT NULL,
  vat_rate        NUMERIC(5,2)  DEFAULT 23,
  net_amount      NUMERIC(10,2),
  vat_amount      NUMERIC(10,2),
  total_amount    NUMERIC(10,2),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── provider_settings table (for post-call threshold, etc.) ──────────────────

CREATE TABLE IF NOT EXISTS provider_settings (
  provider_id             UUID PRIMARY KEY REFERENCES providers(id),
  post_call_threshold_min INTEGER DEFAULT 2,      -- 1 | 2 | 5 | 0 (off)
  post_call_dismiss_count INTEGER DEFAULT 0,
  digest_enabled          BOOLEAN DEFAULT TRUE,
  digest_time             VARCHAR(5) DEFAULT '19:00',
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
