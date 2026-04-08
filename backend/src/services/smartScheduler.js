/**
 * Smart Scheduler — gap-finding, constraint-based job scheduling.
 *
 * Algorithm:
 *   1. Normalise requested date (today / tomorrow / ISO string)
 *   2. Validate working day — skip to next if non-working
 *   3. Load existing bookings for the day
 *   4. Find empty gaps between bookings within each working-hour block
 *   5. Pick the first gap where the job fits
 *   6. If nothing fits, advance to next working day (up to 30 days)
 *   7. Return scheduled slot + human-readable reason
 *
 * Priority handling:
 *   - urgent  → search starts at earliest possible moment, can use the
 *               tightest gaps (buffer reduced to 5 min)
 *   - normal  → standard 15-min buffer
 *   - low     → scheduled after all normal/urgent jobs on that day
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
const SLOT_ALTERNATIVES = 3; // return up to N alternative slots

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Round a Date up to the next 15-minute mark */
function roundUp15(date) {
  const d = new Date(date);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return d;
}

/** Format time as "9:00 AM" */
function fmtTime(date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Format time as "09:00" (24h) */
function fmtTime24(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Human-readable scheduling reason */
function buildMessage(slotStart, slotEnd, offsetDays, reason) {
  const time = fmtTime(slotStart);
  const endTime = fmtTime(slotEnd);

  let dateLabel;
  if (offsetDays === 0) dateLabel = 'Today';
  else if (offsetDays === 1) dateLabel = 'Tomorrow';
  else dateLabel = slotStart.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

  let msg = `Scheduled for ${dateLabel} at ${time}–${endTime}`;
  if (reason) msg += ` (${reason})`;
  return msg;
}

// ── Working hours loader ─────────────────────────────────────────────────────

/**
 * Load provider working hours into a map { dayOfWeek: [{start, end}] }
 * Falls back to Mon–Fri 09:00–18:00 if none configured.
 */
async function loadWorkingHours(providerId) {
  const { rows } = await pool.query(
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

/**
 * Fetch all booked jobs for a provider on a specific date.
 * Returns sorted array of { start: Date, end: Date }.
 */
async function loadBookings(providerId, date, excludeJobId) {
  const dateStr = date.toISOString().split('T')[0];

  const { rows } = await pool.query(
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

  return rows.map(r => {
    const start = new Date(r.scheduled_at);
    const end   = new Date(start.getTime() + r.dur * 60_000);
    return { start, end };
  });
}

// ── Gap finder (core algorithm) ──────────────────────────────────────────────

/**
 * Find all empty gaps within a working-hour block, given existing bookings.
 *
 * @param {Date}   blockStart  - Start of the working block
 * @param {Date}   blockEnd    - End of the working block
 * @param {Array}  bookings    - Sorted array of { start, end } bookings for the day
 * @param {number} bufferMin   - Buffer minutes between jobs
 * @param {Date}   earliest    - Don't return gaps before this time (for "today" constraint)
 * @returns {Array<{start: Date, end: Date, durationMin: number}>}
 */
function findGaps(blockStart, blockEnd, bookings, bufferMin, earliest) {
  const gaps = [];

  // Filter bookings that overlap this block
  const relevant = bookings.filter(b => b.end > blockStart && b.start < blockEnd);

  let cursor = new Date(Math.max(blockStart.getTime(), earliest.getTime()));
  // Round up to 15-min boundary
  cursor = roundUp15(cursor);

  for (const booking of relevant) {
    // Add buffer before this booking
    const bookingStartWithBuffer = new Date(booking.start.getTime() - bufferMin * 60_000);

    if (cursor < bookingStartWithBuffer) {
      const gapEnd = new Date(Math.min(bookingStartWithBuffer.getTime(), blockEnd.getTime()));
      const durationMin = (gapEnd - cursor) / 60_000;
      if (durationMin > 0) {
        gaps.push({ start: new Date(cursor), end: gapEnd, durationMin });
      }
    }

    // Move cursor past booking + buffer
    const afterBooking = new Date(booking.end.getTime() + bufferMin * 60_000);
    if (afterBooking > cursor) {
      cursor = roundUp15(afterBooking);
    }
  }

  // Gap after last booking until block end
  if (cursor < blockEnd) {
    const durationMin = (blockEnd - cursor) / 60_000;
    if (durationMin > 0) {
      gaps.push({ start: new Date(cursor), end: new Date(blockEnd), durationMin });
    }
  }

  return gaps;
}

// ── Day scanner ──────────────────────────────────────────────────────────────

/**
 * Scan a single day for available slots that fit the requested duration.
 *
 * @returns {Array<{start: Date, end: Date}>}  Up to `maxSlots` fitting slots
 */
async function scanDay(providerId, day, schedule, jobDurationMin, bufferMin, excludeJobId, maxSlots) {
  const dow = day.getDay(); // 0=Sun
  const blocks = schedule[dow];
  if (!blocks || blocks.length === 0) return [];

  const bookings = await loadBookings(providerId, day, excludeJobId);
  const now = new Date();
  const slots = [];

  for (const block of blocks) {
    const [sh, sm] = block.start.split(':').map(Number);
    const [eh, em] = block.end.split(':').map(Number);

    const blockStart = new Date(day);
    blockStart.setHours(sh, sm, 0, 0);
    const blockEnd = new Date(day);
    blockEnd.setHours(eh, em, 0, 0);

    // For today, earliest = now; for future days, earliest = blockStart
    const isToday = day.toDateString() === now.toDateString();
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

/**
 * Schedule a job into the next available slot.
 *
 * @param {Object} opts
 * @param {string} opts.providerId    - Provider UUID
 * @param {string} [opts.jobId]       - Job UUID (excluded from conflict check)
 * @param {string} [opts.category]    - Job category for duration lookup
 * @param {number} [opts.durationMin] - Override duration in minutes
 * @param {string} [opts.priority]    - 'urgent' | 'normal' | 'low'
 * @param {string|Date} [opts.preferredDate] - Requested date (ISO string, Date, 'tomorrow', or null for today)
 * @param {string} [opts.preferredTime]      - Requested time "HH:MM" (best-effort)
 *
 * @returns {Object} { scheduledAt, scheduledEnd, durationMinutes, message, reason, alternatives }
 */
async function schedule(opts) {
  const {
    providerId,
    jobId = null,
    category = null,
    durationMin: durationOverride = null,
    priority = 'normal',
    preferredDate = null,
    preferredTime = null,
  } = opts;

  // ── 1. Resolve duration ──────────────────────────────────────────────────
  const jobDuration = durationOverride
    || CATEGORY_DURATIONS[category?.toLowerCase()]
    || 60;

  // ── 2. Resolve buffer by priority ────────────────────────────────────────
  const bufferMin = BUFFER_BY_PRIORITY[priority] ?? 15;

  // ── 3. Load working hours ────────────────────────────────────────────────
  const schedule_ = await loadWorkingHours(providerId);

  // ── 4. Normalise requested date ──────────────────────────────────────────
  const now = new Date();
  let startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);

  if (preferredDate) {
    if (typeof preferredDate === 'string') {
      const lower = preferredDate.toLowerCase().trim();
      if (lower === 'tomorrow' || lower === 'amanhã') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() + 1);
        startDate.setHours(0, 0, 0, 0);
      } else if (lower === 'today' || lower === 'hoje') {
        // already set
      } else {
        // Try ISO parse
        const parsed = new Date(preferredDate);
        if (!isNaN(parsed.getTime())) {
          startDate = new Date(parsed);
          startDate.setHours(0, 0, 0, 0);
        }
      }
    } else if (preferredDate instanceof Date) {
      startDate = new Date(preferredDate);
      startDate.setHours(0, 0, 0, 0);
    }
  }

  // Don't schedule in the past
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);
  if (startDate < todayMidnight) {
    startDate = new Date(todayMidnight);
  }

  // ── 5. Search days for available slot ────────────────────────────────────
  let bestSlot = null;
  let bestDay  = null;
  let bestOffset = 0;
  let reason = '';
  const alternatives = [];

  const requestedDow = startDate.getDay();
  const requestedIsWorkingDay = !!schedule_[requestedDow];

  for (let offset = 0; offset <= MAX_SEARCH_DAYS; offset++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + offset);
    day.setHours(0, 0, 0, 0);

    const slots = await scanDay(
      providerId, day, schedule_, jobDuration, bufferMin, jobId, SLOT_ALTERNATIVES
    );

    if (slots.length === 0) continue;

    // If user requested a specific time, try to honour it
    if (preferredTime && offset === 0) {
      const [ph, pm] = preferredTime.split(':').map(Number);
      const preferred = new Date(day);
      preferred.setHours(ph, pm, 0, 0);

      const match = slots.find(s => s.start.getTime() === preferred.getTime());
      if (match) {
        bestSlot = match;
        bestDay = day;
        bestOffset = offset;
        reason = 'requested time available';
        break;
      }

      // Find the closest slot to preferred time
      const closest = slots.reduce((a, b) =>
        Math.abs(a.start - preferred) <= Math.abs(b.start - preferred) ? a : b
      );
      bestSlot = closest;
      bestDay = day;
      bestOffset = offset;
      reason = `nearest slot to requested ${preferredTime}`;
      // Collect alternatives
      for (const s of slots) {
        if (s !== closest) alternatives.push(s);
      }
      break;
    }

    // No preferred time — take first available
    bestSlot = slots[0];
    bestDay = day;
    bestOffset = offset;

    // Collect alternatives
    for (let i = 1; i < slots.length; i++) alternatives.push(slots[i]);

    break;
  }

  // ── 6. Build result ──────────────────────────────────────────────────────

  if (!bestSlot) {
    // No slot in 30 days — fallback to next working day 09:00
    const fallback = new Date(now);
    for (let d = 1; d <= 7; d++) {
      fallback.setDate(now.getDate() + d);
      if (schedule_[fallback.getDay()]) break;
    }
    fallback.setHours(9, 0, 0, 0);
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

  // Build reason string
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

/**
 * Schedule a job and write the result to the jobs table.
 * This is the main entry point used by parseJob and all creation paths.
 */
async function scheduleAndPersist(opts) {
  const result = await schedule(opts);

  if (opts.jobId) {
    // Only persist if the job hasn't been manually confirmed yet (e.g. by AddJobModal).
    // Jobs manually confirmed via PUT /api/jobs/:id set exec_status='confirmed' before
    // parseJob finishes, so this WHERE prevents the scheduler from overriding manual times.
    await pool.query(
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
  }

  return result;
}

module.exports = {
  schedule,
  scheduleAndPersist,
  loadWorkingHours,
  loadBookings,
  findGaps,
  CATEGORY_DURATIONS,
};
