/**
 * Smart Scheduler — gap-finding, constraint-based job scheduling.
 *
 * IMPORTANT: All date/time math uses UTC methods (setUTCHours, getUTCDay, etc.)
 * so the scheduler is independent of server timezone. Working hours like "08:00"
 * are treated as 08:00 UTC.
 *
 * Algorithm:
 *   1. Normalise requested date (today / tomorrow / ISO string)
 *   2. Validate working day — skip to next if non-working
 *   3. Load existing bookings for the day
 *   4. Find empty gaps between bookings within each working-hour block
 *   5. Pick the first gap where the job fits
 *   6. If nothing fits, advance to next working day (up to 30 days)
 *   7. Return scheduled slot + human-readable reason
 */

const pool = require('../db');

// ── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_DURATIONS = {
  plumbing:    90,
  electrical:  120,
  carpentry:   180,
  painting:    240,
  cleaning:    120,
  hvac:        150,
  landscaping: 180,
  general:     60,
  other:       60,
};

const BUFFER_BY_PRIORITY = {
  urgent: 5,
  normal: 15,
  low:    15,
};

const MAX_SEARCH_DAYS  = 30;
const SLOT_ALTERNATIVES = 3;

// ── UTC Helpers ─────────────────────────────────────────────────────────────

/** Get midnight UTC for a given Date */
function utcMidnight(d) {
  const r = new Date(d);
  r.setUTCHours(0, 0, 0, 0);
  return r;
}

/** Round a Date up to the next 15-minute mark (UTC) */
function roundUp15(date) {
  const d = new Date(date);
  d.setUTCMinutes(Math.ceil(d.getUTCMinutes() / 15) * 15, 0, 0);
  return d;
}

/** Format UTC time as "9:00 AM" */
function fmtTime(date) {
  const h = date.getUTCHours();
  const m = date.getUTCMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Human-readable scheduling reason */
function buildMessage(slotStart, slotEnd, offsetDays, reason) {
  const time = fmtTime(slotStart);
  const endTime = fmtTime(slotEnd);

  let dateLabel;
  if (offsetDays === 0) dateLabel = 'Today';
  else if (offsetDays === 1) dateLabel = 'Tomorrow';
  else {
    // Manual UTC-safe date formatting
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    dateLabel = `${days[slotStart.getUTCDay()]} ${slotStart.getUTCDate()} ${months[slotStart.getUTCMonth()]}`;
  }

  let msg = `Scheduled for ${dateLabel} at ${time}–${endTime}`;
  if (reason) msg += ` (${reason})`;
  return msg;
}

// ── Working hours loader ─────────────────────────────────────────────────────

async function loadWorkingHours(providerId, db = pool) {
  const { rows } = await db.query(
    `SELECT day_of_week, is_active, blocks
     FROM provider_working_hours
     WHERE provider_id = $1`,
    [providerId]
  );

  const schedule = {};
  for (const row of rows) {
    if (row.is_active && Array.isArray(row.blocks) && row.blocks.length > 0) {
      schedule[row.day_of_week] = row.blocks;
    }
  }

  // Default: Mon(1)–Fri(5) 09:00–18:00
  if (Object.keys(schedule).length === 0) {
    for (let d = 1; d <= 5; d++) {
      schedule[d] = [{ start: '09:00', end: '18:00' }];
    }
  }

  return schedule;
}

// ── Existing bookings loader ─────────────────────────────────────────────────

async function loadBookings(providerId, date, excludeJobId, db = pool) {
  const dateStr = date.toISOString().split('T')[0];

  const { rows } = await db.query(
    `SELECT scheduled_at,
            COALESCE(estimated_duration_minutes, 60) AS dur
     FROM jobs
     WHERE provider_id = $1
       AND ($2::uuid IS NULL OR id != $2)
       AND exec_status IN ('pending', 'confirmed', 'en-route', 'on-site', 'paused')
       AND scheduled_at IS NOT NULL
       AND scheduled_at::date = $3
     ORDER BY scheduled_at`,
    [providerId, excludeJobId || null, dateStr]
  );

  const bookings = rows.map(r => {
    const start = new Date(r.scheduled_at);
    const end   = new Date(start.getTime() + r.dur * 60_000);
    return { start, end };
  });

  console.log(`[Scheduler] loadBookings ${dateStr}: found ${bookings.length} existing jobs`,
    bookings.map(b => `${b.start.toISOString().slice(11,16)}-${b.end.toISOString().slice(11,16)}`));

  return bookings;
}

// ── Gap finder (core algorithm) ──────────────────────────────────────────────

function findGaps(blockStart, blockEnd, bookings, bufferMin, earliest) {
  const gaps = [];
  const relevant = bookings.filter(b => b.end > blockStart && b.start < blockEnd);

  let cursor = new Date(Math.max(blockStart.getTime(), earliest.getTime()));
  cursor = roundUp15(cursor);

  for (const booking of relevant) {
    const bookingStartWithBuffer = new Date(booking.start.getTime() - bufferMin * 60_000);

    if (cursor < bookingStartWithBuffer) {
      const gapEnd = new Date(Math.min(bookingStartWithBuffer.getTime(), blockEnd.getTime()));
      const durationMin = (gapEnd - cursor) / 60_000;
      if (durationMin > 0) {
        gaps.push({ start: new Date(cursor), end: gapEnd, durationMin });
      }
    }

    const afterBooking = new Date(booking.end.getTime() + bufferMin * 60_000);
    if (afterBooking > cursor) {
      cursor = roundUp15(afterBooking);
    }
  }

  if (cursor < blockEnd) {
    const durationMin = (blockEnd - cursor) / 60_000;
    if (durationMin > 0) {
      gaps.push({ start: new Date(cursor), end: new Date(blockEnd), durationMin });
    }
  }

  return gaps;
}

// ── Day scanner ──────────────────────────────────────────────────────────────

async function scanDay(providerId, day, schedule, jobDurationMin, bufferMin, excludeJobId, maxSlots, db = pool) {
  const dow = day.getUTCDay(); // 0=Sun — UTC day of week
  const blocks = schedule[dow];
  if (!blocks || blocks.length === 0) return [];

  const bookings = await loadBookings(providerId, day, excludeJobId, db);
  const now = new Date();
  const slots = [];

  for (const block of blocks) {
    const [sh, sm] = block.start.split(':').map(Number);
    const [eh, em] = block.end.split(':').map(Number);

    const blockStart = new Date(day);
    blockStart.setUTCHours(sh, sm, 0, 0);
    const blockEnd = new Date(day);
    blockEnd.setUTCHours(eh, em, 0, 0);

    // For today, earliest = now; for future days, earliest = blockStart
    const todayStr = now.toISOString().split('T')[0];
    const dayStr   = day.toISOString().split('T')[0];
    const isToday  = dayStr === todayStr;
    const earliest = isToday ? now : blockStart;

    const gaps = findGaps(blockStart, blockEnd, bookings, bufferMin, earliest);

    for (const gap of gaps) {
      if (gap.durationMin >= jobDurationMin) {
        slots.push({
          start: new Date(gap.start),
          end:   new Date(gap.start.getTime() + jobDurationMin * 60_000),
        });
        if (slots.length >= maxSlots) return slots;
      }
    }
  }

  return slots;
}

// ── Main scheduler ───────────────────────────────────────────────────────────

async function schedule(opts, db = pool) {
  const {
    providerId,
    jobId = null,
    category = null,
    durationMin: durationOverride = null,
    priority = 'normal',
    preferredDate = null,
    preferredTime = null,
  } = opts;

  const jobDuration = durationOverride
    || CATEGORY_DURATIONS[category?.toLowerCase()]
    || 60;

  const bufferMin = BUFFER_BY_PRIORITY[priority] ?? 15;

  const schedule_ = await loadWorkingHours(providerId, db);

  // ── Normalise requested date (all UTC) ──────────────────────────────────
  const now = new Date();
  let startDate = utcMidnight(now);

  if (preferredDate) {
    if (typeof preferredDate === 'string') {
      const lower = preferredDate.toLowerCase().trim();
      if (lower === 'tomorrow' || lower === 'amanhã') {
        startDate = utcMidnight(now);
        startDate.setUTCDate(startDate.getUTCDate() + 1);
      } else if (lower === 'today' || lower === 'hoje') {
        // already set
      } else {
        const parsed = new Date(preferredDate);
        if (!isNaN(parsed.getTime())) {
          startDate = utcMidnight(parsed);
        }
      }
    } else if (preferredDate instanceof Date) {
      startDate = utcMidnight(preferredDate);
    }
  }

  // Don't schedule in the past
  const todayMidnight = utcMidnight(now);
  if (startDate < todayMidnight) {
    startDate = new Date(todayMidnight);
  }

  console.log(`[Scheduler] startDate=${startDate.toISOString()}, preferredTime=${preferredTime}, duration=${jobDuration}min`);

  // ── Search days for available slot ──────────────────────────────────────
  let bestSlot = null;
  let bestDay  = null;
  let bestOffset = 0;
  let reason = '';
  const alternatives = [];

  const requestedDow = startDate.getUTCDay();
  const requestedIsWorkingDay = !!schedule_[requestedDow];

  for (let offset = 0; offset <= MAX_SEARCH_DAYS; offset++) {
    const day = new Date(startDate);
    day.setUTCDate(startDate.getUTCDate() + offset);
    day.setUTCHours(0, 0, 0, 0);

    const slots = await scanDay(
      providerId, day, schedule_, jobDuration, bufferMin, jobId, SLOT_ALTERNATIVES, db
    );

    if (slots.length === 0) continue;

    // If user requested a specific time, try to honour it
    if (preferredTime && offset === 0) {
      const [ph, pm] = preferredTime.split(':').map(Number);
      const preferred = new Date(day);
      preferred.setUTCHours(ph, pm, 0, 0);

      const match = slots.find(s => s.start.getTime() === preferred.getTime());
      if (match) {
        bestSlot = match;
        bestDay = day;
        bestOffset = offset;
        reason = 'requested time available';
        break;
      }

      const closest = slots.reduce((a, b) =>
        Math.abs(a.start - preferred) <= Math.abs(b.start - preferred) ? a : b
      );
      bestSlot = closest;
      bestDay = day;
      bestOffset = offset;
      reason = `nearest slot to requested ${preferredTime}`;
      for (const s of slots) {
        if (s !== closest) alternatives.push(s);
      }
      break;
    }

    // No preferred time — take first available
    bestSlot = slots[0];
    bestDay = day;
    bestOffset = offset;

    for (let i = 1; i < slots.length; i++) alternatives.push(slots[i]);

    break;
  }

  // ── Build result ────────────────────────────────────────────────────────

  if (!bestSlot) {
    const fallback = utcMidnight(now);
    for (let d = 1; d <= 7; d++) {
      fallback.setUTCDate(now.getUTCDate() + d);
      if (schedule_[fallback.getUTCDay()]) break;
    }
    fallback.setUTCHours(9, 0, 0, 0);
    const fallbackEnd = new Date(fallback.getTime() + jobDuration * 60_000);

    return {
      scheduledAt:      fallback,
      scheduledEnd:     fallbackEnd,
      durationMinutes:  jobDuration,
      message:          buildMessage(fallback, fallbackEnd, 1, 'no gaps found — fallback slot'),
      reason:           'no_availability_fallback',
      alternatives:     [],
    };
  }

  if (!reason) {
    if (bestOffset === 0) {
      reason = 'earliest available slot';
    } else if (!requestedIsWorkingDay && bestOffset > 0) {
      reason = 'next working day — requested date is off';
    } else if (bestOffset > 0) {
      reason = `requested day full — moved ${bestOffset} day${bestOffset > 1 ? 's' : ''} ahead`;
    }
  }

  const message = buildMessage(bestSlot.start, bestSlot.end, bestOffset, reason);

  return {
    scheduledAt:      bestSlot.start,
    scheduledEnd:     bestSlot.end,
    durationMinutes:  jobDuration,
    message,
    reason,
    alternatives:     alternatives.map(a => ({
      scheduledAt: a.start,
      scheduledEnd: a.end,
      message: buildMessage(a.start, a.end, bestOffset, 'alternative slot'),
    })),
  };
}

// ── Convenience: schedule + persist to DB ────────────────────────────────────

function providerLockKey(providerId) {
  const hex = providerId.replace(/-/g, '').slice(0, 8);
  return parseInt(hex, 16) & 0x7fffffff;
}

async function scheduleAndPersist(opts) {
  const client = await pool.connect();
  const lockKey = providerLockKey(opts.providerId);
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);

    console.log(`[Scheduler] Lock acquired for provider ${opts.providerId}, job ${opts.jobId}`);

    const result = await schedule(opts, client);

    console.log(`[Scheduler] Job ${opts.jobId} → ${result.scheduledAt.toISOString()} (${result.reason})`);

    if (opts.jobId) {
      const { rowCount } = await client.query(
        `UPDATE jobs
         SET scheduled_at              = $1,
             estimated_duration_minutes = $2,
             auto_scheduled            = TRUE,
             schedule_message          = $3,
             updated_at                = NOW()
         WHERE id = $4
           AND exec_status = 'pending'`,
        [
          result.scheduledAt.toISOString(),
          result.durationMinutes,
          result.message,
          opts.jobId,
        ]
      );
      console.log(`[Scheduler] UPDATE rowCount=${rowCount} for job ${opts.jobId}`);
    }

    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  schedule,
  scheduleAndPersist,
  loadWorkingHours,
  loadBookings,
  findGaps,
  CATEGORY_DURATIONS,
};
