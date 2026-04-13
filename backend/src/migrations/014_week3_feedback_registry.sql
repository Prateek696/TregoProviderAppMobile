-- Migration 014 — Week 3: feedback table extensions, feature_registry, unknown_intents log,
-- conversations, provider_feature_status, notification_log

-- ── Extend existing feedback table with richer metadata ─────────────────────
ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'app',  -- app | whatsapp | notification
  ADD COLUMN IF NOT EXISTS sentiment VARCHAR(10),             -- positive | negative | neutral
  ADD COLUMN IF NOT EXISTS resolved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

ALTER TABLE feedback
  DROP CONSTRAINT IF EXISTS feedback_type_check;
ALTER TABLE feedback
  ADD CONSTRAINT feedback_type_check
  CHECK (type IN ('voice_note', 'thumbs_down', 'whatsapp_message', 'text', 'suggestion', 'bug'));

-- ── WhatsApp conversations log (inbound + outbound) ────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  direction      VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  source         VARCHAR(20) NOT NULL CHECK (source IN ('whatsapp', 'app', 'system', 'push')),
  content_type   VARCHAR(20) NOT NULL CHECK (content_type IN ('text', 'voice', 'image', 'location', 'system')),
  content        TEXT,
  raw_text       TEXT,           -- transcription if voice
  media_url      TEXT,
  intent         VARCHAR(40),    -- job_creation, price_capture, schedule_query, etc.
  confidence     FLOAT,
  metadata       JSONB DEFAULT '{}'::jsonb,
  related_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversations_provider_created_idx
  ON conversations(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS conversations_intent_idx
  ON conversations(intent);
CREATE INDEX IF NOT EXISTS conversations_source_idx
  ON conversations(source);

-- ── Feature registry (AI help content + discovery tracking) ───────────────
CREATE TABLE IF NOT EXISTS feature_registry (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key    VARCHAR(50) UNIQUE NOT NULL,
  name_pt        TEXT NOT NULL,
  name_en        TEXT NOT NULL,
  description_pt TEXT,
  description_en TEXT,
  deep_link      TEXT,
  keywords_pt    TEXT[],        -- match provider's question
  keywords_en    TEXT[],
  help_steps_pt  TEXT[],        -- step-by-step walkthrough
  help_steps_en  TEXT[],
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_feature_status (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  feature_key         VARCHAR(50) NOT NULL,
  status              VARCHAR(15) NOT NULL DEFAULT 'unknown',
                          -- unknown | discovered | used | struggling | proficient
  help_requested_count INTEGER NOT NULL DEFAULT 0,
  first_seen_at       TIMESTAMPTZ,
  last_used_at        TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, feature_key)
);

CREATE INDEX IF NOT EXISTS pfs_provider_idx ON provider_feature_status(provider_id);

-- ── Notification log (what was sent, what counts toward daily cap) ─────────
CREATE TABLE IF NOT EXISTS notification_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  kind        VARCHAR(40) NOT NULL,
    -- morning_briefing | pre_job | post_job_price | end_of_day | goodnight |
    -- invoice_nudge | payment_reminder | photo_nudge | app_nudge | streak | error | custom
  channel     VARCHAR(10) NOT NULL CHECK (channel IN ('whatsapp', 'push', 'sms', 'none')),
  proactive   BOOLEAN NOT NULL DEFAULT TRUE,
  content     TEXT,
  metadata    JSONB DEFAULT '{}'::jsonb,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notif_log_provider_sent_idx
  ON notification_log(provider_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS notif_log_kind_idx ON notification_log(kind);

-- ── Seed the 6 v1.0 features for AI help ───────────────────────────────────
INSERT INTO feature_registry (feature_key, name_pt, name_en, description_pt, description_en, deep_link, keywords_pt, keywords_en, help_steps_pt, help_steps_en)
VALUES
  ('voice_capture',
   'Captura por Voz', 'Voice Capture',
   'Envia uma nota de voz e eu organizo em trabalho.',
   'Send a voice note and I''ll organize it into a job.',
   'trego://jobs',
   ARRAY['voz', 'nota', 'gravar', 'microfone', 'falar', 'voice'],
   ARRAY['voice', 'record', 'speak', 'audio', 'note', 'microphone'],
   ARRAY['Mantém o botão do microfone premido no WhatsApp', 'Fala normalmente (ex: "Trabalho na Maria, sexta às 10, canalização")', 'Larga o botão — eu recebo e organizo'],
   ARRAY['Hold the microphone button in WhatsApp', 'Speak naturally (e.g. "Job at Maria''s, Friday 10h, plumbing")', 'Release — I receive and organize']),
  ('price_capture',
   'Registo de Preço', 'Price Capture',
   'Depois do trabalho, manda só o número.',
   'After the job, just send the number.',
   'trego://money',
   ARRAY['preço', 'cobrar', 'cobrei', 'valor', 'ganhei'],
   ARRAY['price', 'charge', 'charged', 'amount', 'earned'],
   ARRAY['Acaba o trabalho', 'Manda o número — ex: "85"', 'Eu guardo'],
   ARRAY['Finish the job', 'Send the number — e.g. "85"', 'I save it']),
  ('photo_attach',
   'Adicionar Fotos', 'Add Photos',
   'Fotos antes/durante/depois ficam guardadas no trabalho.',
   'Before/during/after photos are saved to the job.',
   'trego://photos',
   ARRAY['foto', 'fotos', 'imagem', 'câmara', 'antes', 'depois'],
   ARRAY['photo', 'photos', 'image', 'camera', 'before', 'after'],
   ARRAY['Abre o trabalho no app', 'Toca em "Adicionar foto"', 'Escolhe antes/durante/depois'],
   ARRAY['Open the job in the app', 'Tap "Add photo"', 'Choose before/during/after']),
  ('schedule_query',
   'Ver Agenda', 'Check Schedule',
   'Pergunta "o que tenho amanhã?" e eu respondo.',
   'Ask "what''s on tomorrow?" and I''ll tell you.',
   'trego://calendar',
   ARRAY['agenda', 'calendário', 'amanhã', 'hoje', 'semana'],
   ARRAY['schedule', 'calendar', 'tomorrow', 'today', 'week'],
   ARRAY['Pergunta no WhatsApp', 'Ex: "O que tenho amanhã?"', 'Eu respondo com a tua agenda'],
   ARRAY['Ask in WhatsApp', 'e.g. "What''s on tomorrow?"', 'I''ll reply with your schedule']),
  ('client_query',
   'Histórico de Cliente', 'Client History',
   'Pergunta quando foste a um cliente ou quanto cobras.',
   'Ask when you last visited a client or what you typically charge.',
   'trego://clients',
   ARRAY['cliente', 'histórico', 'quando', 'última'],
   ARRAY['client', 'history', 'when', 'last'],
   ARRAY['Pergunta: "Quando fui à Maria?"', 'Ou: "Quanto cobro por caldeira?"', 'Eu respondo'],
   ARRAY['Ask: "When was I last at Maria''s?"', 'Or: "What do I charge for boilers?"', 'I''ll answer']),
  ('invoice_create',
   'Criar Fatura', 'Create Invoice',
   'Quando o trabalho acaba, posso preparar a fatura Moloni.',
   'When a job is done, I can prepare the Moloni invoice.',
   'trego://billing',
   ARRAY['fatura', 'faturar', 'invoice', 'moloni', 'recibo'],
   ARRAY['invoice', 'bill', 'billing', 'moloni', 'receipt'],
   ARRAY['Acaba o trabalho com preço', 'Eu pergunto se queres fatura', 'Toca em "Criar" — tudo automático'],
   ARRAY['Finish the job with price', 'I''ll ask if you want an invoice', 'Tap "Create" — fully automatic'])
ON CONFLICT (feature_key) DO NOTHING;
