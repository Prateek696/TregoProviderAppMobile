/**
 * Notification Policy — Playbook §5.9
 *
 *   • Hard cap: 6 proactive messages per day (per provider)
 *   • Bundle 3+ notifications sent within 5 minutes into one
 *   • Quiet hours 21:00 – 07:00 in provider's timezone
 *     (exceptions: sync confirmations + critical alerts bypass)
 *
 * Usage:
 *   const gate = await shouldSend(providerId, { kind, priority, channel });
 *   if (!gate.allow) { log and skip; }
 *
 *   After a successful send:
 *   await recordSend(providerId, kind, channel, content);
 */

const pool = require('../db');

// Kinds that are ALLOWED during quiet hours
const CRITICAL_KINDS = new Set([
  'offline_sync_confirm',
  'payment_received',
  'emergency',
  'error',
]);

// Kinds that DO NOT count toward the proactive cap (replies, operational)
const NON_PROACTIVE_KINDS = new Set([
  'morning_briefing',       // user initiated ("Bom dia")
  'schedule_response',
  'money_response',
  'support_walkthrough',
  'support_unknown',
  'off_topic',
  'feedback_ack',
  'job_confirm',
  'low_conf',
  'price_captured',
  'image_no_context',
  'voice_fail',
]);

/**
 * Checks provider's local hour against the quiet-hours window.
 * Returns true if we're currently IN quiet hours.
 */
function inQuietHours(timezone = 'Europe/Lisbon', now = new Date()) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false });
    const parts = fmt.formatToParts(now);
    const hourPart = parts.find((p) => p.type === 'hour');
    const h = parseInt(hourPart?.value ?? '0', 10);
    // Quiet: 21:00 – 06:59  → h >= 21 OR h < 7
    return h >= 21 || h < 7;
  } catch (_) {
    // Fall back to UTC
    const h = now.getUTCHours();
    return h >= 21 || h < 7;
  }
}

/**
 * Decide whether a provider can receive a proactive message right now.
 * Returns { allow, reason }.
 */
async function shouldSend(providerId, { kind = 'custom', priority = 'normal', channel = 'whatsapp' } = {}) {
  const isCritical = priority === 'critical' || CRITICAL_KINDS.has(kind);
  const isProactive = !NON_PROACTIVE_KINDS.has(kind);

  // Replies (non-proactive) + critical always allowed
  if (!isProactive || isCritical) return { allow: true };

  // Fail-open on any DB error — if the new Week 3 columns/tables don't exist yet
  // (migrations pending), let the send proceed rather than breaking production.
  let p;
  try {
    const { rows } = await pool.query(
      `SELECT id, timezone, max_daily_messages, proactive_messages_today, last_bom_dia_at
       FROM providers WHERE id = $1`,
      [providerId]
    );
    if (!rows.length) return { allow: false, reason: 'no_provider' };
    p = rows[0];
  } catch (err) {
    console.warn('[policy] shouldSend provider lookup failed (failing open):', err.message);
    return { allow: true, reason: 'policy_unavailable' };
  }

  if (inQuietHours(p.timezone, new Date(Date.now()))) {
    return { allow: false, reason: 'quiet_hours' };
  }

  const cap = Math.max(1, p.max_daily_messages || 6);
  if ((p.proactive_messages_today || 0) >= cap) {
    return { allow: false, reason: 'daily_cap', cap };
  }

  // Bundling — fail-open if notification_log table missing
  try {
    const { rows: recent } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM notification_log
       WHERE provider_id = $1 AND proactive = TRUE AND sent_at >= NOW() - INTERVAL '5 minutes'`,
      [providerId]
    );
    if (recent[0].n >= 3) {
      return { allow: false, reason: 'bundled', recent: recent[0].n };
    }
  } catch (err) {
    console.warn('[policy] bundling check failed (ignoring):', err.message);
  }

  return { allow: true };
}

/**
 * Record a send after it actually happened (or was skipped, for audit trail).
 * Increments the proactive counter for the day when proactive+succeeded.
 */
async function recordSend(providerId, kind, channel, content, { proactive, skipped, error, jobId } = {}) {
  const isProactive = proactive !== undefined ? proactive : !NON_PROACTIVE_KINDS.has(kind);
  try {
    await pool.query(
      `INSERT INTO notification_log (provider_id, kind, channel, proactive, content, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [providerId, kind, channel, isProactive, (content || '').slice(0, 500),
       JSON.stringify({ skipped: !!skipped, error: error || null, job_id: jobId || null })]
    );
    if (isProactive && !skipped && !error) {
      await pool.query(
        `UPDATE providers SET proactive_messages_today = proactive_messages_today + 1 WHERE id = $1`,
        [providerId]
      );
    }
  } catch (_) { /* best-effort audit */ }
}

module.exports = {
  shouldSend,
  recordSend,
  inQuietHours,
  CRITICAL_KINDS,
  NON_PROACTIVE_KINDS,
};
