-- Migration 004: Extended provider profile
-- Adds services, locations, coverage, working hours, last_name

-- Add columns to providers
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS coverage_radius INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS coverage_unlimited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS coverage_mode VARCHAR(10) DEFAULT 'radius'; -- 'radius' | 'city'

-- Services (up to 3 per provider)
CREATE TABLE IF NOT EXISTS provider_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  service_name VARCHAR(255) NOT NULL,
  category VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Base locations
CREATE TABLE IF NOT EXISTS provider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  nickname VARCHAR(255),
  street VARCHAR(255),
  city VARCHAR(255),
  zip_code VARCHAR(20),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coverage cities (when mode = 'city')
CREATE TABLE IF NOT EXISTS provider_coverage_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  city_name VARCHAR(255) NOT NULL
);

-- Working hours (one row per day per provider)
CREATE TABLE IF NOT EXISTS provider_working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Sun, 1=Mon ... 6=Sat
  is_active BOOLEAN DEFAULT TRUE,
  blocks JSONB DEFAULT '[]', -- [{start: "09:00", end: "17:00"}]
  UNIQUE(provider_id, day_of_week)
);
