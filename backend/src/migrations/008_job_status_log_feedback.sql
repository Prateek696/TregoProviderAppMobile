-- Job Status Log — every status transition
CREATE TABLE IF NOT EXISTS job_status_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS job_status_log_job_id_idx ON job_status_log(job_id);

-- Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('voice_note', 'thumbs_down', 'whatsapp_message')),
  audio_url       TEXT,
  transcription   TEXT,
  related_job_id  UUID REFERENCES jobs(id) ON DELETE SET NULL,
  read            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_provider_id_idx ON feedback(provider_id);
CREATE INDEX IF NOT EXISTS feedback_read_idx ON feedback(read);
