-- Migration 013 — Week 3: provider fields for WhatsApp loop, formality, counters
-- All nullable / with safe defaults so production rollout is non-breaking

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS typical_wake_time TIME,                -- learned morning unlock time
  ADD COLUMN IF NOT EXISTS formality VARCHAR(10) DEFAULT 'informal', -- 'informal' (tu) | 'formal' (você)
  ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'pt-PT',    -- pt-PT | pt-BR | en-US | es-ES
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/Lisbon',
  ADD COLUMN IF NOT EXISTS proactive_messages_today INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proactive_messages_reset_at DATE,
  ADD COLUMN IF NOT EXISTS max_daily_messages INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS trego_nickname VARCHAR(50) DEFAULT 'Trego',
  ADD COLUMN IF NOT EXISTS tos_version VARCHAR(20),
  ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_version VARCHAR(20),
  ADD COLUMN IF NOT EXISTS archetype VARCHAR(20) DEFAULT 'engaged', -- engaged | busy | quiet
  ADD COLUMN IF NOT EXISTS home_latitude FLOAT,
  ADD COLUMN IF NOT EXISTS home_longitude FLOAT,
  ADD COLUMN IF NOT EXISTS default_currency VARCHAR(5) DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_bom_dia_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_window_opened_at TIMESTAMPTZ; -- 24h cloud API window

CREATE INDEX IF NOT EXISTS providers_reset_at_idx ON providers(proactive_messages_reset_at);
CREATE INDEX IF NOT EXISTS providers_last_bom_dia_idx ON providers(last_bom_dia_at);
