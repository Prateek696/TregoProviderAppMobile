/**
 * Week 3 crons — morning push, mid-day reminders, post-job price prompt,
 * end-of-day summary, goodnight, daily proactive-counter reset.
 *
 * All crons use pg_try_advisory_lock to prevent duplicate fires when
 * multiple instances are running (Playbook B19).
 */
const pool = require('../db');
const { sendPushNotification } = require('./notifications');
const sender = require('./whatsappSender');
const { briefingForProvider } = require('./briefing');

async function withAdvisoryLock(lockId, fn) {
  const { rows } = await pool.query('SELECT pg_try_advisory_lock($1) AS got', [lockId]);
  if (!rows[0].got) return { skipped: true, reason: 'lock_held' };
  try {
    return await fn();
  } catch (err) {
    // Most likely cause: Week 3 migrations not yet applied. Fail-soft so crons
    // don't spam errors — they'll start working once migrations run.
    if (/does not exist|undefined column|undefined_table/i.test(err.message)) {
      console.warn(`[cron ${lockId}] skipped (migrations pending?): ${err.message}`);
      return { skipped: true, reason: 'migrations_pending' };
    }
    throw err;
  } finally {
    await pool.query('SELECT pg_advisory_unlock($1)', [lockId]);
  }
}

// ── 1. Morning push / briefing ──────────────────────────────────────────
// Fires every 15 minutes. Triggers for providers whose typical_wake_time
// falls within the next 0-14 minutes, or 08:00 if typical_wake_time is null.
async function morningPushTick(now = new Date()) {
  return withAdvisoryLock(2001, async () => {
    const { rows: providers } = await pool.query(
      `SELECT p.id, p.name, p.phone, p.fcm_token, p.trego_nickname, p.locale,
              p.timezone, p.typical_wake_time, p.last_bom_dia_at
       FROM providers p
       WHERE p.phone IS NOT NULL
         AND (p.last_bom_dia_at IS NULL OR p.last_bom_dia_at < NOW() - INTERVAL '20 hours')`
    );

    const ms15 = 15 * 60 * 1000;
    let pushed = 0;
    for (const p of providers) {
      // Compute provider's current local time
      let localHour, localMinute;
      try {
        const fmt = new Intl.DateTimeFormat('en-US', { timeZone: p.timezone || 'Europe/Lisbon', hour: 'numeric', minute: 'numeric', hour12: false });
        const parts = fmt.formatToParts(now);
        localHour = Number(parts.find((x) => x.type === 'hour').value);
        localMinute = Number(parts.find((x) => x.type === 'minute').value);
      } catch (_) { localHour = now.getUTCHours(); localMinute = now.getUTCMinutes(); }

      const wakeTime = p.typical_wake_time || '08:00';
      const [wh, wm] = String(wakeTime).split(':').map((n) => parseInt(n, 10));

      // Fire if current local minute is within [wake, wake+15)
      const nowMinutes = localHour * 60 + localMinute;
      const wakeMinutes = wh * 60 + (wm || 0);
      if (nowMinutes < wakeMinutes || nowMinutes >= wakeMinutes + 15) continue;

      const isPT = (p.locale || 'pt-PT').startsWith('pt');
      const nickname = p.trego_nickname || 'Trego';
      const push = isPT
        ? `Bom dia ${p.name || ''} ☀️ Toca para acordar o ${nickname}.`
        : `Morning ${p.name || ''} ☀️ Tap to wake ${nickname}.`;

      if (p.fcm_token) {
        try { await sendPushNotification(p.fcm_token, 'Bom dia', push.trim()); } catch (_) {}
      }
      pushed++;
    }
    return { pushed, total: providers.length };
  });
}

// ── 2. Pre-job reminder (~60 min before) ─────────────────────────────────
async function preJobReminderTick(now = new Date()) {
  return withAdvisoryLock(2002, async () => {
    const windowStart = new Date(now.getTime() + 55 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 65 * 60 * 1000);
    const { rows } = await pool.query(
      `SELECT j.id, j.address, j.location, j.scheduled_at, j.provider_id,
              c.name AS client_name,
              p.phone, p.fcm_token, p.locale, p.name AS provider_name
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
       LEFT JOIN providers p ON p.id = j.provider_id
       WHERE j.scheduled_at >= $1 AND j.scheduled_at < $2
         AND COALESCE(j.exec_status, 'pending') NOT IN ('cancelled', 'completed')
         AND COALESCE(j.status, 'raw') != 'discarded'
         AND NOT EXISTS (
           SELECT 1 FROM notification_log n
           WHERE n.provider_id = j.provider_id AND n.kind = 'pre_job'
             AND (n.metadata->>'job_id') = j.id::text
             AND n.sent_at >= NOW() - INTERVAL '3 hours'
         )`,
      [windowStart, windowEnd]
    );
    let sent = 0;
    for (const row of rows) {
      const isPT = (row.locale || 'pt-PT').startsWith('pt');
      const addr = row.address || row.location || '';
      const maps = addr ? `https://maps.google.com/?q=${encodeURIComponent(addr)}` : null;
      const msg = isPT
        ? `A caminho ${row.client_name ? 'd' + (row.client_name.startsWith('a') ? 'a ' : 'o ') + row.client_name : 'do próximo trabalho'}? 📍${maps ? ' ' + maps : ''}`
        : `Heading to ${row.client_name || 'your next job'}? 📍${maps ? ' ' + maps : ''}`;
      try {
        await sender.sendSequence({ id: row.provider_id, phone: row.phone, locale: row.locale, name: row.provider_name },
          [msg], { kind: 'pre_job', proactive: true, relatedJobId: row.id });
      } catch (_) {}
      // Also push in case WhatsApp window is closed
      if (row.fcm_token) {
        try { await sendPushNotification(row.fcm_token, isPT ? 'Próximo trabalho' : 'Next job', msg); } catch (_) {}
      }
      await pool.query(
        `INSERT INTO notification_log (provider_id, kind, channel, proactive, content, metadata)
         VALUES ($1, 'pre_job', 'push', TRUE, $2, $3)`,
        [row.provider_id, msg, JSON.stringify({ job_id: row.id })]
      );
      sent++;
    }
    return { sent };
  });
}

// ── 3. Post-job price capture (30 min after scheduled end) ─────────────
async function postJobPriceTick(now = new Date()) {
  return withAdvisoryLock(2003, async () => {
    // Jobs scheduled between 1h and 6h ago that are missing a price
    const from = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const to = new Date(now.getTime() - 60 * 60 * 1000);
    const { rows } = await pool.query(
      `SELECT j.id, j.scheduled_at, j.provider_id, c.name AS client_name,
              p.phone, p.fcm_token, p.locale, p.name AS provider_name
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
       LEFT JOIN providers p ON p.id = j.provider_id
       WHERE j.scheduled_at >= $1 AND j.scheduled_at < $2
         AND COALESCE(j.price, 0) = 0 AND COALESCE(j.actual_price, 0) = 0
         AND COALESCE(j.exec_status, 'pending') NOT IN ('cancelled')
         AND NOT EXISTS (
           SELECT 1 FROM notification_log n
           WHERE n.provider_id = j.provider_id AND n.kind = 'post_job_price'
             AND (n.metadata->>'job_id') = j.id::text
         )
       LIMIT 200`,
      [from, to]
    );
    let sent = 0;
    for (const row of rows) {
      const isPT = (row.locale || 'pt-PT').startsWith('pt');
      const client = row.client_name || (isPT ? 'no trabalho' : 'on the job');
      const msg = isPT
        ? `Boa 👍 Quanto cobraste ${row.client_name ? 'n' + (row.client_name.startsWith('a') ? 'a ' : 'o ') + row.client_name : 'no último trabalho'}?`
        : `Nice one 👍 What did you charge at ${row.client_name || 'the last job'}?`;
      try {
        await sender.sendSequence({ id: row.provider_id, phone: row.phone, locale: row.locale, name: row.provider_name },
          [msg], { kind: 'post_job_price', proactive: true, relatedJobId: row.id });
      } catch (_) {}
      await pool.query(
        `INSERT INTO notification_log (provider_id, kind, channel, proactive, content, metadata)
         VALUES ($1, 'post_job_price', 'whatsapp', TRUE, $2, $3)`,
        [row.provider_id, msg, JSON.stringify({ job_id: row.id })]
      );
      sent++;
    }
    return { sent };
  });
}

// ── 4. End-of-day summary + goodnight ─────────────────────────────────────
async function goodnightTick(now = new Date()) {
  return withAdvisoryLock(2004, async () => {
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const { rows: providers } = await pool.query(
      `SELECT p.id, p.name, p.phone, p.fcm_token, p.locale
       FROM providers p
       WHERE p.phone IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM notification_log n
           WHERE n.provider_id = p.id AND n.kind = 'goodnight' AND n.sent_at >= $1
         )`,
      [startOfDay]
    );

    let sent = 0;
    for (const p of providers) {
      const { rows: stats } = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE exec_status = 'completed') AS completed,
           COUNT(*) FILTER (WHERE exec_status != 'completed' AND exec_status != 'cancelled') AS pending,
           COALESCE(SUM(COALESCE(actual_price, price)) FILTER (WHERE exec_status = 'completed'), 0)::float AS earned
         FROM jobs WHERE provider_id = $1 AND scheduled_at >= $2 AND scheduled_at < $3`,
        [p.id, startOfDay, endOfDay]
      );
      const s = stats[0];
      const isPT = (p.locale || 'pt-PT').startsWith('pt');
      const messages = [];
      if (Number(s.completed) === 0 && Number(s.pending) === 0) {
        // Zero activity → silence per Playbook §2.3
        continue;
      }
      messages.push(isPT ? `Bom trabalho ${p.name || ''} 💪`.trim() : `Solid day ${p.name || ''} 💪`.trim());
      messages.push(isPT
        ? `${s.completed}/${Number(s.completed) + Number(s.pending)} feitos. €${Number(s.earned).toFixed(0)} hoje.`
        : `${s.completed}/${Number(s.completed) + Number(s.pending)} done. €${Number(s.earned).toFixed(0)} today.`);
      messages.push(isPT ? 'Boa noite 🌙 Acorda-me amanhã.' : 'Goodnight 🌙 Wake me up tomorrow.');

      try {
        await sender.sendSequence(p, messages, { kind: 'goodnight', proactive: true });
      } catch (_) {}
      await pool.query(
        `INSERT INTO notification_log (provider_id, kind, channel, proactive, content)
         VALUES ($1, 'goodnight', 'whatsapp', TRUE, $2)`,
        [p.id, messages.join(' | ')]
      );
      sent++;
    }
    return { sent, total: providers.length };
  });
}

// ── 5. Daily proactive counter reset (TZ-aware) ──────────────────────────
async function dailyResetTick() {
  return withAdvisoryLock(2005, async () => {
    const { rowCount } = await pool.query(
      `UPDATE providers
       SET proactive_messages_today = 0,
           proactive_messages_reset_at = (CURRENT_DATE AT TIME ZONE COALESCE(timezone, 'Europe/Lisbon'))::date
       WHERE proactive_messages_reset_at IS NULL
          OR proactive_messages_reset_at < (CURRENT_DATE AT TIME ZONE COALESCE(timezone, 'Europe/Lisbon'))::date`
    );
    return { reset: rowCount };
  });
}

module.exports = {
  morningPushTick,
  preJobReminderTick,
  postJobPriceTick,
  goodnightTick,
  dailyResetTick,
  withAdvisoryLock,
};
