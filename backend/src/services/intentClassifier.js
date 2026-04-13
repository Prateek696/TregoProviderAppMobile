/**
 * Intent Classifier — Playbook Section 16.1
 * Classifies every inbound WhatsApp message. Deterministic keyword + pattern
 * match first (fast, free); AI fallback only when nothing matches.
 *
 * Returns { intent, confidence, matchedKeyword? }.
 */

const INTENTS = {
  JOB_CREATION: 'job_creation',
  JOB_UPDATE: 'job_update',
  PRICE_CAPTURE: 'price_capture',
  SCHEDULE_QUERY: 'schedule_query',
  CLIENT_QUERY: 'client_query',
  MONEY_QUERY: 'money_query',
  BILLING_ACTION: 'billing_action',
  PHOTO_ACTION: 'photo_action',
  SUPPORT: 'support',
  FEEDBACK: 'feedback',
  SUGGESTION: 'suggestion',
  GENERAL_WORK: 'general_work',
  OFF_TOPIC: 'off_topic',
  BOM_DIA: 'bom_dia',
  GREETING: 'greeting',
  UNKNOWN: 'unknown',
};

// Deterministic rules (fast path)
const PATTERNS = [
  // "bom dia trego" / "boas trego" / "bom dia chefe"
  { intent: INTENTS.BOM_DIA, regex: /\b(bom dia|boas|good morning|morning)\s+[a-záàâãéèêíïóôõöúçñ]+/i, conf: 0.95 },

  // Pure number = price capture (handled as short-circuit above; kept here for safety)
  { intent: INTENTS.PRICE_CAPTURE, regex: /^\s*€?\s*\d+([.,]\d+)?\s*€?\s*$/, conf: 0.9 },

  // Money queries — must come BEFORE schedule queries so "esta semana" inside "quanto ganhei esta semana" routes to money
  { intent: INTENTS.MONEY_QUERY, regex: /\b(quanto\s+ganh(ei|ou|amos)|how much.*(made|earned|i earned|i've earned)|ganhos|earnings|faturado|revenue)\b/i, conf: 0.9 },

  // Schedule queries
  { intent: INTENTS.SCHEDULE_QUERY, regex: /\b(o que tenho|what.*got|what.*on (today|tomorrow)|amanhã|tomorrow|esta semana|this week|agenda|calendar|schedule)\b/i, conf: 0.85 },

  // Client queries
  { intent: INTENTS.CLIENT_QUERY, regex: /\b(quando fui|when.*(last|at)|histórico|history|cliente|client)\s/i, conf: 0.7 },

  // Billing
  { intent: INTENTS.BILLING_ACTION, regex: /\b(fatura|faturar|invoice|moloni|cobrar|manda fatura|send invoice)\b/i, conf: 0.9 },

  // Feedback/support
  { intent: INTENTS.SUPPORT, regex: /\b(ajuda|help|como\s+(gravo|adiciono|fac[oe])|how do i|how to)\b/i, conf: 0.85 },
  { intent: INTENTS.FEEDBACK, regex: /\b(errou|wrong|parser errou|não apanhou|didn'?t (get|catch))\b/i, conf: 0.8 },
  { intent: INTENTS.SUGGESTION, regex: /\b(deviam|should have|seria bom|would be nice|sugestão|suggest)\b/i, conf: 0.8 },

  // Job creation (new job language)
  { intent: INTENTS.JOB_CREATION, regex: /\b(novo trabalho|new job|marca|agenda[r]?|agendar|schedule)\b/i, conf: 0.85 },
  { intent: INTENTS.JOB_CREATION, regex: /\b(trabalho|obra|serviço|job|work).*(segunda|terça|quarta|quinta|sexta|sábado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, conf: 0.75 },

  // Job updates
  { intent: INTENTS.JOB_UPDATE, regex: /\b(muda|mudar|move|cancel|cancelar|reagenda|reschedule|remarca)\b/i, conf: 0.85 },

  // Off-topic
  { intent: INTENTS.OFF_TOPIC, regex: /\b(sporting|benfica|porto|futebol|football|jogo|weather|tempo)\b/i, conf: 0.7 },
];

const GARBAGE = /^[\W_]+$|^.{0,1}$/; // empty, single char, or only punctuation

function classify(text) {
  if (!text || typeof text !== 'string') {
    return { intent: INTENTS.UNKNOWN, confidence: 0 };
  }
  const t = text.trim();
  // Pure numeric → price capture short-circuit (don't let GARBAGE reject "85")
  if (/^\s*€?\s*\d+([.,]\d+)?\s*€?\s*$/.test(t)) {
    return { intent: INTENTS.PRICE_CAPTURE, confidence: 0.9 };
  }
  if (GARBAGE.test(t)) return { intent: INTENTS.UNKNOWN, confidence: 0.1 };

  for (const p of PATTERNS) {
    if (p.regex.test(t)) return { intent: p.intent, confidence: p.conf };
  }

  // Work-ish general (e.g. "maria canalização"): has 2+ word tokens with a work noun
  const workNouns = /(canaliza|eléctr|electric|pintur|paint|cozin|kitchen|casa banho|bathroom|caldeir|torneir|fuga|leak|autoclism)/i;
  if (workNouns.test(t)) return { intent: INTENTS.GENERAL_WORK, confidence: 0.55 };

  return { intent: INTENTS.UNKNOWN, confidence: 0.2 };
}

/**
 * Format an inbound WhatsApp message for the self-improving log.
 * Returns what to persist in conversations (intent + confidence).
 */
function annotate(text) {
  return classify(text);
}

module.exports = { classify, annotate, INTENTS };
