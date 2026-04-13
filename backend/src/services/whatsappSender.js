/**
 * WhatsApp Sender — Meta Cloud API wrapper enforcing the "Texting Rule" from
 * the Trego Conversation Playbook v7.0: multiple short messages with 0.6-1.2s
 * randomized pauses between them. Also tracks the 24-hour session window.
 */

const pool = require('../db');
const policy = require('./notificationPolicy');

const META_BASE = 'https://graph.facebook.com/v19.0';

function randomPauseMs() {
  // Playbook B12: randomize pause 0.6 - 1.2s to feel human
  return 600 + Math.floor(Math.random() * 600);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks whether Meta credentials are configured.
 * Silently no-ops if missing (pending Meta Business verification).
 */
function isConfigured() {
  return !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

/**
 * Whether the provider has an OPEN 24h session window with us.
 * Opened any time the user sends an inbound message.
 */
async function isWindowOpen(providerId, now = new Date()) {
  const { rows } = await pool.query(
    `SELECT whatsapp_window_opened_at FROM providers WHERE id = $1`,
    [providerId]
  );
  if (!rows.length || !rows[0].whatsapp_window_opened_at) return false;
  const diff = now - new Date(rows[0].whatsapp_window_opened_at);
  return diff < 24 * 60 * 60 * 1000; // < 24h
}

/**
 * Record that the window opened (call this on every inbound WhatsApp message).
 */
async function openWindow(providerId) {
  await pool.query(
    `UPDATE providers SET whatsapp_window_opened_at = NOW() WHERE id = $1`,
    [providerId]
  );
}

/**
 * Raw send to Meta Cloud API. Returns { ok, status, body }.
 * Does NOT enforce texting rule or window policy.
 */
async function sendRaw(toPhone, text, { isTemplate = false, templateName, languageCode = 'pt_PT', templateComponents } = {}) {
  if (!isConfigured()) return { ok: false, skipped: true, reason: 'not_configured' };

  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  const payload = isTemplate
    ? {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'template',
        template: { name: templateName, language: { code: languageCode }, components: templateComponents || [] },
      }
    : { messaging_product: 'whatsapp', to: toPhone, type: 'text', text: { body: text } };

  try {
    const res = await fetch(`${META_BASE}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Send a sequence of messages with human pauses. Follows Texting Rule.
 * messages: string[] OR { text, pauseMs }[].
 * If the 24h session window is closed and `allowTemplate` is true, the first
 * message will be sent as a pre-approved template (caller must provide templateName).
 */
async function sendSequence(provider, messages, { allowTemplate = false, templateName, kind = 'custom', proactive = true, relatedJobId = null, priority = 'normal' } = {}) {
  const toPhone = provider.phone?.replace(/^\+/, '');
  if (!toPhone) return { sent: 0, skipped: true, reason: 'no_phone' };

  // ── Policy gate: cap + bundling + quiet hours ──────────────────────────
  const gate = await policy.shouldSend(provider.id, { kind, priority, channel: 'whatsapp' });
  if (!gate.allow) {
    await policy.recordSend(provider.id, kind, 'whatsapp', messages[0] || '', { proactive, skipped: true, error: gate.reason, jobId: relatedJobId });
    return { sent: 0, skipped: true, reason: gate.reason };
  }

  const windowOpen = await isWindowOpen(provider.id);
  const canSendFreeform = windowOpen;

  const normalized = messages.map((m) => (typeof m === 'string' ? { text: m, pauseMs: randomPauseMs() } : m));
  let sent = 0;

  for (let i = 0; i < normalized.length; i++) {
    const m = normalized[i];
    let result;
    if (i === 0 && !canSendFreeform && allowTemplate && templateName) {
      result = await sendRaw(toPhone, m.text, { isTemplate: true, templateName });
    } else if (!canSendFreeform) {
      // Window closed and we can't use a template → abort; caller should push instead
      return { sent, skipped: true, reason: 'window_closed' };
    } else {
      result = await sendRaw(toPhone, m.text);
    }

    if (result.ok || result.skipped) {
      sent++;
      await logOutbound(provider.id, m.text, { kind, proactive, relatedJobId, skipped: result.skipped });
    } else {
      await logOutbound(provider.id, m.text, { kind, proactive, relatedJobId, error: result.error || result.body });
      break; // stop the sequence on first error
    }

    // Pause before the next message (not after the last)
    if (i < normalized.length - 1) await sleep(m.pauseMs);
  }

  return { sent };
}

async function logOutbound(providerId, text, { kind, proactive, relatedJobId, skipped, error } = {}) {
  try {
    await pool.query(
      `INSERT INTO conversations
        (provider_id, direction, source, content_type, content, intent, related_job_id, metadata)
       VALUES ($1, 'outbound', 'whatsapp', 'text', $2, $3, $4, $5)`,
      [providerId, text, kind || null, relatedJobId, JSON.stringify({ skipped: skipped || false, error: error || null })]
    );
  } catch (_) { /* best effort */ }
  // Single source of truth for notification_log + cap increment
  await policy.recordSend(providerId, kind || 'custom', 'whatsapp', text, { proactive, skipped, error, jobId: relatedJobId });
}

/**
 * Count proactive messages already sent today (timezone-aware via reset cron).
 * Returns true when provider is at or above their daily cap.
 */
async function atDailyCap(providerId) {
  const { rows } = await pool.query(
    `SELECT proactive_messages_today AS count, max_daily_messages AS cap FROM providers WHERE id = $1`,
    [providerId]
  );
  if (!rows.length) return true;
  return rows[0].count >= rows[0].cap;
}

module.exports = {
  isConfigured,
  isWindowOpen,
  openWindow,
  sendRaw,
  sendSequence,
  atDailyCap,
  randomPauseMs,
};
