-- Migration 012: Unique index for contact sync upsert
-- Required for ON CONFLICT (provider_id, source_contact_id) in contacts sync
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_provider_source
  ON clients (provider_id, source_contact_id)
  WHERE source_contact_id IS NOT NULL;
