/**
 * Admin API — 9 endpoints Miguel needs for the Lovable dashboard.
 * All routes behind adminMiddleware.
 */
const express = require('express');
const pool = require('../db');
const admin = require('../middleware/admin');

const router = express.Router();
router.use(admin);

function parseDate(v, fallback) {
  if (!v) return fallback;
  const d = new Date(v);
  return isNaN(d.getTime()) ? fallback : d;
}

function startOfDayUTC(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
function endOfDayUTC(d) {
  const x = startOfDayUTC(d);
  x.setUTCDate(x.getUTCDate() + 1);
  return x;
}

// 1. GET /api/admin/jobs/summary?date=YYYY-MM-DD
router.get('/jobs/summary', async (req, res, next) => {
  try {
    const day = parseDate(req.query.date, new Date());
    const from = startOfDayUTC(day);
    const to = endOfDayUTC(day);

    const { rows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'raw')         AS raw_count,
         COUNT(*) FILTER (WHERE status = 'structured')  AS structured_count,
         COUNT(*) FILTER (WHERE status = 'scheduled')   AS scheduled_count,
         COUNT(*) FILTER (WHERE status = 'discarded')   AS discarded_count,
         COUNT(*) FILTER (WHERE exec_status = 'completed') AS completed_count,
         COUNT(*) AS total,
         COALESCE(SUM(price), 0)::float AS total_price
       FROM jobs
       WHERE created_at >= $1 AND created_at < $2`,
      [from, to]
    );
    res.json({ date: from.toISOString().slice(0, 10), ...rows[0] });
  } catch (e) { next(e); }
});

// 2. GET /api/admin/jobs/accuracy?date=
router.get('/jobs/accuracy', async (req, res, next) => {
  try {
    const day = parseDate(req.query.date, new Date());
    const from = startOfDayUTC(day);
    const to = endOfDayUTC(day);

    const { rows } = await pool.query(
      `SELECT
         COUNT(*) AS total,
         AVG(ai_confidence)::float AS avg_confidence,
         COUNT(*) FILTER (WHERE ai_confidence >= 0.8) AS high_conf,
         COUNT(*) FILTER (WHERE ai_confidence >= 0.5 AND ai_confidence < 0.8) AS mid_conf,
         COUNT(*) FILTER (WHERE ai_confidence < 0.5) AS low_conf,
         COUNT(*) FILTER (WHERE status = 'discarded') AS discarded
       FROM jobs
       WHERE created_at >= $1 AND created_at < $2
         AND ai_confidence IS NOT NULL`,
      [from, to]
    );
    res.json({ date: from.toISOString().slice(0, 10), ...rows[0] });
  } catch (e) { next(e); }
});

// 3. GET /api/admin/jobs/failures?date=
router.get('/jobs/failures', async (req, res, next) => {
  try {
    const day = parseDate(req.query.date, new Date());
    const from = startOfDayUTC(day);
    const to = endOfDayUTC(day);

    const { rows } = await pool.query(
      `SELECT j.id, j.raw_text, j.status, j.ai_confidence, j.provider_id,
              p.name AS provider_name, j.created_at
       FROM jobs j
       LEFT JOIN providers p ON p.id = j.provider_id
       WHERE j.created_at >= $1 AND j.created_at < $2
         AND (j.status = 'discarded' OR j.ai_confidence < 0.5 OR j.status = 'raw')
       ORDER BY j.created_at DESC
       LIMIT 200`,
      [from, to]
    );
    res.json({ date: from.toISOString().slice(0, 10), failures: rows });
  } catch (e) { next(e); }
});

// 4. GET /api/admin/providers/active?date=
router.get('/providers/active', async (req, res, next) => {
  try {
    const day = parseDate(req.query.date, new Date());
    const from = startOfDayUTC(day);
    const to = endOfDayUTC(day);

    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.phone,
              COUNT(DISTINCT j.id) FILTER (WHERE j.created_at >= $1 AND j.created_at < $2) AS jobs_today,
              COUNT(DISTINCT c.id) FILTER (WHERE c.created_at >= $1 AND c.created_at < $2 AND c.source = 'whatsapp') AS whatsapp_msgs_today,
              p.last_bom_dia_at
       FROM providers p
       LEFT JOIN jobs j ON j.provider_id = p.id
       LEFT JOIN conversations c ON c.provider_id = p.id
       GROUP BY p.id
       HAVING COUNT(DISTINCT j.id) FILTER (WHERE j.created_at >= $1 AND j.created_at < $2) > 0
           OR COUNT(DISTINCT c.id) FILTER (WHERE c.created_at >= $1 AND c.created_at < $2) > 0
       ORDER BY jobs_today DESC`,
      [from, to]
    );
    res.json({ date: from.toISOString().slice(0, 10), providers: rows });
  } catch (e) { next(e); }
});

// 5. GET /api/admin/feedback/queue?status=unread|all&limit=
router.get('/feedback/queue', async (req, res, next) => {
  try {
    const status = req.query.status || 'unread';
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const whereRead = status === 'all' ? '' : 'WHERE f.read = FALSE';

    const { rows } = await pool.query(
      `SELECT f.*, p.name AS provider_name, p.phone AS provider_phone
       FROM feedback f
       LEFT JOIN providers p ON p.id = f.provider_id
       ${whereRead}
       ORDER BY f.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// 6. PATCH /api/admin/feedback/:id/read { resolved? }
router.patch('/feedback/:id/read', async (req, res, next) => {
  try {
    const resolved = !!req.body?.resolved;
    const { rows } = await pool.query(
      `UPDATE feedback
       SET read = TRUE,
           resolved = $2,
           resolved_at = CASE WHEN $2 THEN NOW() ELSE resolved_at END
       WHERE id = $1
       RETURNING *`,
      [req.params.id, resolved]
    );
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json({ item: rows[0] });
  } catch (e) { next(e); }
});

// 7. GET /api/admin/providers/retention?weeks=4
router.get('/providers/retention', async (req, res, next) => {
  try {
    const weeks = Math.min(Math.max(parseInt(req.query.weeks || '4', 10), 1), 26);
    const { rows } = await pool.query(
      `WITH bucket AS (
         SELECT p.id,
                DATE_TRUNC('week', p.created_at) AS cohort_week,
                (SELECT COUNT(*) FROM jobs j
                   WHERE j.provider_id = p.id
                     AND j.created_at >= NOW() - INTERVAL '${weeks} weeks') AS jobs_in_window,
                MAX(j.created_at) AS last_job_at
           FROM providers p
           LEFT JOIN jobs j ON j.provider_id = p.id
          GROUP BY p.id
       )
       SELECT cohort_week,
              COUNT(*)                                       AS cohort_size,
              COUNT(*) FILTER (WHERE jobs_in_window > 0)     AS retained,
              COUNT(*) FILTER (WHERE jobs_in_window >= 5)    AS active_5plus
         FROM bucket
        WHERE cohort_week >= NOW() - INTERVAL '${weeks} weeks'
        GROUP BY cohort_week
        ORDER BY cohort_week ASC`
    );
    res.json({ weeks, cohorts: rows });
  } catch (e) { next(e); }
});

// 8. GET /api/admin/parsing/errors?days=7
router.get('/parsing/errors', async (req, res, next) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days || '7', 10), 1), 90);
    const { rows } = await pool.query(
      `SELECT
         DATE_TRUNC('day', created_at) AS day,
         COUNT(*) FILTER (WHERE status = 'discarded') AS discarded,
         COUNT(*) FILTER (WHERE status = 'raw' AND created_at < NOW() - INTERVAL '10 minutes') AS stuck_raw,
         COUNT(*) FILTER (WHERE ai_confidence < 0.5) AS low_confidence,
         COUNT(*) AS total
       FROM jobs
       WHERE created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE_TRUNC('day', created_at)
       ORDER BY day DESC`
    );
    res.json({ days, buckets: rows });
  } catch (e) { next(e); }
});

// 9. GET /api/admin/notifications/engagement?days=7
router.get('/notifications/engagement', async (req, res, next) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days || '7', 10), 1), 90);
    const { rows } = await pool.query(
      `SELECT
         kind,
         channel,
         COUNT(*) AS sent,
         COUNT(*) FILTER (WHERE (metadata->>'skipped')::boolean IS TRUE) AS skipped,
         COUNT(*) FILTER (WHERE metadata ? 'error') AS errored
       FROM notification_log
       WHERE sent_at >= NOW() - INTERVAL '${days} days'
       GROUP BY kind, channel
       ORDER BY sent DESC`
    );
    res.json({ days, breakdown: rows });
  } catch (e) { next(e); }
});

module.exports = router;
