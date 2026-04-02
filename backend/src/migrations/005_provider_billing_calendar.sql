-- Migration 005: Billing info, calendar, personal info fields

-- Personal info additions
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS assistant_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS orb_color VARCHAR(20);

-- Billing info (separate from providers for clean separation)
CREATE TABLE IF NOT EXISTS provider_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE UNIQUE,
  billing_name VARCHAR(255),
  vat VARCHAR(50),
  address VARCHAR(255),
  city VARCHAR(100),
  postal_code VARCHAR(20),
  use_personal_info BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar integration
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS calendar_connected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS calendar_provider VARCHAR(20); -- 'google' | 'outlook' | 'apple' | 'other'
