const Groq = require('groq-sdk');
const pool = require('../db');
const { sendPushNotification } = require('./notifications');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = 'llama-3.3-70b-versatile';

// Portuguese time-of-day conventions used for date resolution
const PT_TIME_CONVENTIONS = `
Portuguese time conventions — apply these when resolving times:
  "de manhã" or "manhã" → 09:00
  "de tarde" or "tarde"  → 14:00
  "ao final do dia" or "ao fim do dia" → 17:00
  "à noite" or "noite" → 20:00
  "ao meio-dia" or "meio-dia" → 12:00

Portuguese relative date phrases — ALWAYS resolve to an actual calendar date:
  "hoje" → today's date
  "amanhã" → tomorrow's date
  "depois de amanhã" → day after tomorrow
  "sexta" / "sexta-feira" → the coming Friday
  "para a semana" → next week Monday
  Use the current date provided in the user message to resolve all relative references.
  NEVER return "Friday" or "next week" — always return the actual ISO date.
`;

const SYSTEM_PROMPT = `You are a job-parsing assistant for a Portuguese field service marketplace.
Extract structured data from voice-transcribed job descriptions spoken by tradespeople.
The text may be in Portuguese, English, Romanian, or any mix — handle all.

${PT_TIME_CONVENTIONS}

Urgency detection — set "urgent": true if the text contains any of:
  urgente, urgência, emergência, já, imediatamente, agora, hoje (when referring to timing pressure)

Respond ONLY with a valid JSON object (no markdown, no explanation) with these exact fields:
{
  "title": "short job title, 3-6 words (e.g. Fix leaking pipe, Install socket)",
  "service": "same as title or slightly more descriptive",
  "description": "polished 1-3 sentence job description in English summarising all details: what the job is, where, when, for whom, and any price. Write it as a professional brief, not a transcript. Example: 'Fix a leaking pipe under the kitchen sink at Rua Augusta 12, Lisbon. Scheduled for tomorrow at 10:00 for client João Silva. Estimated €80.'",
  "category": "one of: plumbing, electrical, carpentry, painting, general, other",
  "location": "address or area mentioned, or null",
  "address": "full street address if mentioned, or null",
  "datetime": "ISO 8601 datetime string — MUST be an actual date, never a relative phrase, or null",
  "client_name": "client name if mentioned, or null",
  "price": numeric price amount if mentioned (e.g. if '150 euros' → 150), or null,
  "urgent": boolean — true if urgency words detected, false otherwise,
  "confidence": float 0.0 to 1.0 — how confident you are in the extraction
}`;

// ── Auto-schedule: find next available slot from provider working hours ──────
async function autoSchedule(providerId, jobId) {
  // Load provider working hours (0=Sun … 6=Sat)
  const { rows: wh } = await pool.query(
    `SELECT day_of_week, is_active, blocks FROM provider_working_hours WHERE provider_id = $1`,
    [providerId]
  );

  // Build schedule map; default Mon-Fri 09:00-17:00 if none configured
  const scheduleMap = {};
  for (const row of wh) {
    if (row.is_active && Array.isArray(row.blocks) && row.blocks.length > 0) {
      scheduleMap[row.day_of_week] = row.blocks;
    }
  }
  if (Object.keys(scheduleMap).length === 0) {
    for (let d = 1; d <= 5; d++) scheduleMap[d] = [{ start: '09:00', end: '17:00' }];
  }

  const JOB_DURATION_MIN = 90;
  const now = new Date();

  for (let offset = 0; offset <= 14; offset++) {
    const day = new Date(now);
    day.setDate(now.getDate() + offset);
    day.setHours(0, 0, 0, 0);

    const dow = day.getDay();
    const blocks = scheduleMap[dow];
    if (!blocks) continue;

    const firstBlock = blocks[0];
    const [sh, sm] = firstBlock.start.split(':').map(Number);
    const [eh, em] = firstBlock.end.split(':').map(Number);

    const dayStart = new Date(day);
    dayStart.setHours(sh, sm, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(eh, em, 0, 0);

    // If today, slot must start at or after now
    let slotStart = new Date(dayStart);
    if (offset === 0 && now > slotStart) {
      slotStart = new Date(now);
      slotStart.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
    }

    // Get existing confirmed jobs for this day, ordered by start time
    const dateStr = day.toISOString().split('T')[0];
    const { rows: existing } = await pool.query(
      `SELECT scheduled_at, COALESCE(estimated_duration_minutes, 90) AS dur
       FROM jobs
       WHERE provider_id = $1
         AND id != $2
         AND exec_status IN ('confirmed', 'en-route', 'on-site', 'paused')
         AND scheduled_at::date = $3
       ORDER BY scheduled_at`,
      [providerId, jobId, dateStr]
    );

    // Push slotStart past any overlapping existing jobs
    for (const e of existing) {
      const eStart = new Date(e.scheduled_at);
      const eEnd   = new Date(eStart.getTime() + e.dur * 60000);
      if (slotStart < eEnd && slotStart >= eStart) slotStart = new Date(eEnd);
      else if (slotStart < eStart) break; // gap found before this job
    }

    // Check slot fits within working hours
    const slotEnd = new Date(slotStart.getTime() + JOB_DURATION_MIN * 60000);
    if (slotEnd <= dayEnd) return slotStart;
  }

  // Fallback: next Monday 09:00
  const fallback = new Date(now);
  fallback.setDate(now.getDate() + 1);
  fallback.setHours(9, 0, 0, 0);
  return fallback;
}

// Fields that count as "recognisable job content"
function hasJobContent(parsed) {
  return !!(
    parsed.title ||
    parsed.service ||
    parsed.client_name ||
    parsed.datetime ||
    parsed.location ||
    parsed.address
  );
}

async function parseJob(jobId, rawText, providerId, fcmToken) {
  // Provide today's date so the model can resolve relative dates
  const todayISO = new Date().toISOString().split('T')[0];
  const userMessage = `Today's date: ${todayISO}\n\n${rawText}`;

  await pool.query(
    `UPDATE jobs SET status = 'processing', updated_at = NOW() WHERE id = $1`,
    [jobId]
  );
  await pool.query(
    `INSERT INTO job_status_log (job_id, old_status, new_status) VALUES ($1, 'raw', 'processing')`,
    [jobId]
  );

  let parsed;
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 300,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    parsed = JSON.parse(content);
  } catch (err) {
    console.error(`AI parse error for job ${jobId}:`, err.message);
    await pool.query(
      `UPDATE jobs SET status = 'raw', updated_at = NOW() WHERE id = $1`,
      [jobId]
    );
    return;
  }

  const { title, service, description, category, location, address, datetime, client_name, price, urgent, confidence } = parsed;

  // ── Garbage detection (4.5) ──────────────────────────────────────────────────
  // If confidence is very low and no recognisable fields, discard the job
  if ((confidence || 0) < 0.3 && !hasJobContent(parsed)) {
    await pool.query(
      `UPDATE jobs SET status = 'discarded', updated_at = NOW() WHERE id = $1`,
      [jobId]
    );
    await sendPushNotification(
      fcmToken,
      "Didn't catch that",
      'Try again — speak clearly and include the job type.',
      { critical: true }
    );
    return;
  }

  // ── Urgency detection (4.6) ──────────────────────────────────────────────────
  const priority = urgent ? 'urgent' : 'normal';

  // ── Recurring job detection ──────────────────────────────────────────────────
  let recurringFlag = false;
  let recurringNote = null;

  if (client_name && service) {
    try {
      const { rows: prevJobs } = await pool.query(
        `SELECT j.id, j.service, j.scheduled_at, j.price, j.actual_price
         FROM jobs j
         JOIN clients c ON j.client_id = c.id
         WHERE j.provider_id = $1
           AND j.id != $2
           AND j.status IN ('structured', 'scheduled', 'billed')
           AND LOWER(c.name) ILIKE $3
           AND LOWER(j.service) ILIKE $4
         ORDER BY j.created_at DESC
         LIMIT 1`,
        [providerId, jobId, `%${client_name.toLowerCase()}%`, `%${service.toLowerCase().split(' ')[0]}%`]
      );

      if (prevJobs.length) {
        recurringFlag = true;
        const prev = prevJobs[0];
        const prevDate = prev.scheduled_at
          ? new Date(prev.scheduled_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
          : 'previously';
        const prevPrice = prev.actual_price || prev.price;
        recurringNote = `Follow-up? Previous: ${prevDate}, ${prev.service}${prevPrice ? `, €${prevPrice}` : ''}`;
      }
    } catch (recurringErr) {
      console.error('Recurring check error:', recurringErr.message);
    }
  }

  // ── Duplicate detection (4.2) ────────────────────────────────────────────────
  // Check for a very recent job (last 24h) with same client + service → flag as possible duplicate
  let duplicateFlag = false;
  let duplicateJobId = null;

  if (client_name && service) {
    try {
      const { rows: recentDups } = await pool.query(
        `SELECT j.id, j.title
         FROM jobs j
         JOIN clients c ON j.client_id = c.id
         WHERE j.provider_id = $1
           AND j.id != $2
           AND j.created_at >= NOW() - INTERVAL '24 hours'
           AND j.status NOT IN ('discarded', 'cancelled')
           AND LOWER(c.name) ILIKE $3
           AND LOWER(COALESCE(j.service, j.title, '')) ILIKE $4
         LIMIT 1`,
        [providerId, jobId, `%${client_name.toLowerCase()}%`, `%${service.toLowerCase().split(' ')[0]}%`]
      );

      if (recentDups.length) {
        duplicateFlag = true;
        duplicateJobId = recentDups[0].id;
      }
    } catch (dupErr) {
      console.error('Duplicate check error:', dupErr.message);
    }
  }

  // ── Persist parsed fields ────────────────────────────────────────────────────
  await pool.query(
    `UPDATE jobs
     SET status          = 'structured',
         title           = COALESCE($1, title),
         service         = COALESCE($2, service),
         description     = COALESCE($3, description),
         category        = COALESCE($4, category),
         location        = COALESCE($5, location),
         address         = COALESCE($6, address),
         scheduled_at    = COALESCE($7, scheduled_at),
         price           = COALESCE($8, price),
         priority        = $9,
         ai_confidence   = $10,
         recurring_flag  = $11,
         recurring_note  = $12,
         updated_at      = NOW()
     WHERE id = $13`,
    [
      title || null,
      service || null,
      description || null,
      category || null,
      location || null,
      address || null,
      datetime || null,
      typeof price === 'number' ? price : null,
      priority,
      typeof confidence === 'number' ? confidence : null,
      recurringFlag,
      recurringNote,
      jobId,
    ]
  );

  // ── Auto-schedule if AI returned no datetime ─────────────────────────────────
  if (!datetime) {
    try {
      const autoTime = await autoSchedule(providerId, jobId);
      await pool.query(
        `UPDATE jobs
         SET scheduled_at               = $1,
             estimated_duration_minutes = COALESCE(estimated_duration_minutes, 90),
             updated_at                 = NOW()
         WHERE id = $2`,
        [autoTime.toISOString(), jobId]
      );
    } catch (autoErr) {
      console.error('Auto-schedule error:', autoErr.message);
    }
  }

  // ── Client fuzzy-match / create ──────────────────────────────────────────────
  if (client_name) {
    try {
      const { rows: existingClients } = await pool.query(
        `SELECT id FROM clients
         WHERE provider_id = $1 AND LOWER(name) ILIKE $2
         LIMIT 1`,
        [providerId, `%${client_name.toLowerCase()}%`]
      );

      let clientId;
      if (existingClients.length) {
        clientId = existingClients[0].id;
      } else {
        const { rows: newClient } = await pool.query(
          `INSERT INTO clients (provider_id, name) VALUES ($1, $2) RETURNING id`,
          [providerId, client_name]
        );
        clientId = newClient[0].id;
      }

      await pool.query(
        `UPDATE jobs SET client_id = $1 WHERE id = $2`,
        [clientId, jobId]
      );
    } catch (clientErr) {
      console.error('Client upsert error:', clientErr.message);
    }
  }

  // ── Push notification ────────────────────────────────────────────────────────
  let notifTitle = urgent ? '🔴 Urgent job ready' : 'Job ready';
  let notifBody;

  if (duplicateFlag) {
    notifBody = `Possible duplicate — you logged a similar job recently. Same job?`;
  } else if (recurringFlag) {
    notifBody = recurringNote;
  } else {
    notifBody = 'Your job has been structured and is ready to review.';
  }

  await sendPushNotification(fcmToken, notifTitle, notifBody, {
    providerId,
    bundleable: true,
    data: {
      type: 'job_created',
      job_id: jobId,
      duplicate_flag: String(duplicateFlag),
      duplicate_job_id: duplicateJobId || '',
    },
  });
}

module.exports = { parseJob };
