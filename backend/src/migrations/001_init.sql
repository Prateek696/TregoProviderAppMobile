-- providers table
CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  trade VARCHAR(50), -- plumber, electrician, carpenter, other
  nif VARCHAR(9),
  fcm_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- otp_codes table (for SMS verification)
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id),
  name VARCHAR(255),
  email VARCHAR(255),
  nif VARCHAR(9),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id),
  client_id UUID REFERENCES clients(id),
  raw_text TEXT,
  service VARCHAR(255),
  location TEXT,
  scheduled_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'raw', -- raw, processing, structured, scheduled, billed
  ai_confidence FLOAT,
  moloni_invoice_id VARCHAR(255),
  invoice_status VARCHAR(20), -- pending, sent
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
