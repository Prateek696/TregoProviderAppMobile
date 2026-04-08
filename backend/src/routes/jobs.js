const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const auth = require('../middleware/auth');
const { parseJob } = require('../services/aiParser');
const { transcribeAudio } = require('../services/whisper');
const { uploadPhoto } = require('../services/cloudinary');
const { schedule, scheduleAndPersist } = require('../services/smartScheduler');

const upload = multer({
  dest: '/tmp/trego-audio/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.mp4', '.m4a', '.wav', '.webm', '.ogg', '.flac'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Audio files only.'));
    }
  },
});

const photoUpload = multer({
  dest: '/tmp/trego-photos/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Image files only.'));
    }
  },
});

const router = express.Router();

// Valid exec statuses the mobile app uses
const EXEC_STATUSES = ['pending', 'confirmed', 'en-route', 'on-site', 'paused', 'delayed', 'completed', 'cancelled'];
// Valid AI pipeline statuses
const AI_STATUSES = ['raw', 'processing', 'structured', 'scheduled', 'billed'];

// POST /api/jobs — create raw job from text and fire AI parse
router.post(
  '/',
  auth,
  body('raw_text').isString().trim().notEmpty(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { raw_text } = req.body;

    try {
      const intake_source = req.body.intake_source || 'manual';
      const { rows } = await pool.query(
        `INSERT INTO jobs (provider_id, raw_text, status, exec_status, intake_source)
         VALUES ($1, $2, 'raw', 'pending', $3)
         RETURNING *`,
        [req.provider.id, raw_text, intake_source]
      );
      const job = rows[0];

      parseJob(job.id, raw_text, req.provider.id, req.provider.fcm_token).catch((err) => {
        console.error(`AI parse failed for job ${job.id}:`, err.message);
      });

      res.status(201).json({ job });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/jobs — list all jobs for this provider
router.get('/', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT j.*, c.name AS client_name, c.email AS client_email,
              c.phone AS client_phone, c.nif AS client_nif
       FROM jobs j
       LEFT JOIN clients c ON j.client_id = c.id
       WHERE j.provider_id = $1
         AND j.status != 'discarded' AND j.exec_status != 'cancelled'
       ORDER BY j.created_at DESC`,
      [req.provider.id]
    );
    res.json({ jobs: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/digest — end-of-day summary for push notification
router.get('/digest', auth, async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    const { rows: todayJobs } = await pool.query(
      `SELECT COUNT(*) AS count FROM jobs
       WHERE provider_id = $1 AND created_at >= $2 AND created_at < $3`,
      [req.provider.id, todayStart, tomorrowStart]
    );

    const { rows: tomorrowJobs } = await pool.query(
      `SELECT COUNT(*) AS count FROM jobs
       WHERE provider_id = $1 AND scheduled_at >= $2 AND scheduled_at < $3`,
      [req.provider.id, tomorrowStart, tomorrowEnd]
    );

    res.json({
      today_count: parseInt(todayJobs[0].count),
      tomorrow_count: parseInt(tomorrowJobs[0].count),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/earnings — provider revenue summary
router.get('/earnings', auth, async (req, res, next) => {
  try {
    const providerId = req.provider.id;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total earned (all time) from completed jobs
    const { rows: totalRows } = await pool.query(
      `SELECT COALESCE(SUM(COALESCE(actual_price, price, 0)), 0) AS total
       FROM jobs WHERE provider_id = $1 AND exec_status = 'completed'`,
      [providerId]
    );

    // This month
    const { rows: monthRows } = await pool.query(
      `SELECT COALESCE(SUM(COALESCE(actual_price, price, 0)), 0) AS total
       FROM jobs WHERE provider_id = $1 AND exec_status = 'completed'
       AND completed_at >= $2`,
      [providerId, monthStart]
    );

    // Last month
    const { rows: lastMonthRows } = await pool.query(
      `SELECT COALESCE(SUM(COALESCE(actual_price, price, 0)), 0) AS total
       FROM jobs WHERE provider_id = $1 AND exec_status = 'completed'
       AND completed_at >= $2 AND completed_at < $3`,
      [providerId, lastMonthStart, lastMonthEnd]
    );

    // Completed jobs with price breakdown (last 30)
    const { rows: recentJobs } = await pool.query(
      `SELECT id, title, COALESCE(actual_price, price, 0) AS amount,
              completed_at, client_name, category
       FROM jobs WHERE provider_id = $1 AND exec_status = 'completed'
       ORDER BY completed_at DESC NULLS LAST LIMIT 30`,
      [providerId]
    );

    // Per-month breakdown (last 6 months)
    const { rows: monthlyRows } = await pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('month', completed_at), 'Mon') AS month,
              COALESCE(SUM(COALESCE(actual_price, price, 0)), 0) AS total,
              COUNT(*) AS jobs
       FROM jobs WHERE provider_id = $1 AND exec_status = 'completed'
         AND completed_at >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', completed_at)
       ORDER BY DATE_TRUNC('month', completed_at)`,
      [providerId]
    );

    res.json({
      total_earned: parseFloat(totalRows[0].total),
      this_month: parseFloat(monthRows[0].total),
      last_month: parseFloat(lastMonthRows[0].total),
      monthly_breakdown: monthlyRows,
      recent_jobs: recentJobs,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/stats — provider dashboard stats
router.get('/stats', auth, async (req, res, next) => {
  try {
    const providerId = req.provider.id;

    const { rows: counts } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE exec_status NOT IN ('completed','cancelled')) AS active,
         COUNT(*) FILTER (WHERE exec_status = 'completed') AS completed,
         COUNT(*) FILTER (WHERE exec_status = 'cancelled') AS cancelled,
         COUNT(*) AS total
       FROM jobs WHERE provider_id = $1`,
      [providerId]
    );

    // Win rate = completed / (completed + cancelled) * 100
    const completed = parseInt(counts[0].completed) || 0;
    const cancelled = parseInt(counts[0].cancelled) || 0;
    const winRate = completed + cancelled > 0
      ? Math.round((completed / (completed + cancelled)) * 100)
      : 0;

    // Average response time (minutes between job created_at and first status change)
    // Approximated as avg time between creation and confirmed
    res.json({
      active_jobs: parseInt(counts[0].active),
      completed_jobs: completed,
      total_jobs: parseInt(counts[0].total),
      win_rate: winRate,
      rating: null,
      rating_count: 0,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT j.*, c.name AS client_name, c.email AS client_email,
              c.phone AS client_phone, c.nif AS client_nif
       FROM jobs j
       LEFT JOIN clients c ON j.client_id = c.id
       WHERE j.id = $1 AND j.provider_id = $2`,
      [req.params.id, req.provider.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Job not found' });
    res.json({ job: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/jobs/:id — provider edits job fields
router.put(
  '/:id',
  auth,
  body('title').optional().isString().trim(),
  body('description').optional().isString().trim(),
  body('service').optional().isString().trim(),
  body('location').optional().isString().trim(),
  body('address').optional().isString().trim(),
  body('category').optional().isString().trim(),
  body('priority').optional().isIn(['low', 'normal', 'medium', 'high', 'urgent']),
  body('notes').optional().isString(),
  body('price').optional().isNumeric(),
  body('bid_amount').optional().isNumeric(),
  body('actual_price').optional().isNumeric(),
  body('scheduled_at').optional().isISO8601(),
  body('status').optional().isIn(AI_STATUSES),
  body('exec_status').optional().isIn(EXEC_STATUSES),
  body('payment_received').optional().isBoolean(),
  body('cash_amount').optional().isNumeric(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      title, description, service, location, address, category,
      priority, notes, price, bid_amount, actual_price,
      scheduled_at, status, exec_status,
      payment_received, cash_amount, client_id, estimated_duration_minutes,
    } = req.body;

    // Build lifecycle timestamps based on exec_status transition
    const extraUpdates = {};
    if (exec_status === 'en-route') extraUpdates.started_at = 'NOW()';
    if (exec_status === 'on-site') extraUpdates.on_site_at = 'NOW()';
    if (exec_status === 'paused') extraUpdates.paused_at = 'NOW()';
    if (exec_status === 'completed') extraUpdates.completed_at = 'NOW()';
    if (exec_status === 'cancelled') extraUpdates.cancelled_at = 'NOW()';

    try {
      const { rows } = await pool.query(
        `UPDATE jobs
         SET title             = COALESCE($1,  title),
             description       = COALESCE($2,  description),
             service           = COALESCE($3,  service),
             location          = COALESCE($4,  location),
             address           = COALESCE($5,  address),
             category          = COALESCE($6,  category),
             priority          = COALESCE($7,  priority),
             notes             = COALESCE($8,  notes),
             price             = COALESCE($9,  price),
             bid_amount        = COALESCE($10, bid_amount),
             actual_price      = COALESCE($11, actual_price),
             scheduled_at      = COALESCE($12, scheduled_at),
             status            = COALESCE($13, status),
             exec_status       = COALESCE($14, exec_status),
             payment_received  = COALESCE($15, payment_received),
             cash_amount       = COALESCE($16, cash_amount),
             client_id                  = COALESCE($17, client_id),
             estimated_duration_minutes = COALESCE($18, estimated_duration_minutes),
             updated_at                 = NOW()
         WHERE id = $19 AND provider_id = $20
         RETURNING *`,
        [
          title, description, service, location, address, category,
          priority, notes, price, bid_amount, actual_price,
          scheduled_at, status, exec_status,
          payment_received ?? null, cash_amount ?? null,
          client_id ?? null,
          estimated_duration_minutes ?? null,
          req.params.id, req.provider.id,
        ]
      );
      if (!rows.length) return res.status(404).json({ error: 'Job not found' });

      // Apply timestamp updates if any
      if (Object.keys(extraUpdates).length) {
        const setClauses = Object.keys(extraUpdates).map((k) => `${k} = ${extraUpdates[k]}`).join(', ');
        await pool.query(
          `UPDATE jobs SET ${setClauses} WHERE id = $1`,
          [req.params.id]
        );
      }

      // Log status transition if exec_status changed
      if (exec_status) {
        const prev = await pool.query(`SELECT exec_status FROM jobs WHERE id = $1`, [req.params.id]);
        const oldStatus = prev.rows[0]?.exec_status;
        if (oldStatus !== exec_status) {
          await pool.query(
            `INSERT INTO job_status_log (job_id, old_status, new_status) VALUES ($1, $2, $3)`,
            [req.params.id, oldStatus, exec_status]
          );
        }
      }

      res.json({ job: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/jobs/transcribe — upload audio, transcribe only (no job created), for notification review flow
router.post('/transcribe', auth, upload.single('audio'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'Audio file is required' });
  const filePath = req.file.path;
  try {
    const rawText = await transcribeAudio(filePath);
    res.json({ raw_text: rawText });
  } catch (err) {
    next(err);
  } finally {
    fs.unlink(filePath, () => {});
    fs.unlink(filePath + '.m4a', () => {});
  }
});

// POST /api/jobs/voice — upload audio, transcribe, create job, fire AI parse
router.post('/voice', auth, upload.single('audio'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'Audio file is required' });

  const filePath = req.file.path;

  try {
    const rawText = await transcribeAudio(filePath);

    const intake_source = req.body?.intake_source || 'bubble';
    const { rows } = await pool.query(
      `INSERT INTO jobs (provider_id, raw_text, status, exec_status, intake_source)
       VALUES ($1, $2, 'raw', 'pending', $3)
       RETURNING *`,
      [req.provider.id, rawText, intake_source]
    );
    const job = rows[0];

    parseJob(job.id, rawText, req.provider.id, req.provider.fcm_token).catch((err) => {
      console.error(`AI parse failed for job ${job.id}:`, err.message);
    });

    res.status(201).json({ job });
  } catch (err) {
    next(err);
  } finally {
    // transcribeAudio renames file to .m4a — clean up whichever exists
    fs.unlink(filePath, () => {});
    fs.unlink(filePath + '.m4a', () => {});
  }
});

// POST /api/jobs/sync — offline sync: multiple audio files
router.post('/sync', auth, upload.array('audio', 20), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'At least one audio file is required' });
  }

  const results = [];

  for (const file of req.files) {
    try {
      const rawText = await transcribeAudio(file.path);

      const { rows } = await pool.query(
        `INSERT INTO jobs (provider_id, raw_text, status, exec_status)
         VALUES ($1, $2, 'raw', 'pending')
         RETURNING *`,
        [req.provider.id, rawText]
      );
      const job = rows[0];

      parseJob(job.id, rawText, req.provider.id, req.provider.fcm_token).catch((err) => {
        console.error(`AI parse failed for job ${job.id}:`, err.message);
      });

      results.push({ success: true, job });
    } catch (err) {
      results.push({ success: false, error: err.message, file: file.originalname });
    } finally {
      fs.unlink(file.path, () => {});
    }
  }

  const synced = results.filter((r) => r.success).length;
  if (synced > 0) {
    const { sendPushNotification } = require('../services/notifications');
    await sendPushNotification(
      req.provider.fcm_token,
      'Offline jobs synced',
      `${synced} job${synced > 1 ? 's' : ''} uploaded and being processed.`
    );
  }

  res.json({ synced, total: req.files.length, results });
});

// POST /api/jobs/:id/reschedule — re-run smart scheduler for an existing job
router.post('/:id/reschedule', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, category, priority, scheduled_at FROM jobs WHERE id = $1 AND provider_id = $2`,
      [req.params.id, req.provider.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Job not found' });

    const job = rows[0];
    const result = await scheduleAndPersist({
      providerId: req.provider.id,
      jobId: job.id,
      category: job.category,
      priority: req.body.priority || job.priority || 'normal',
      preferredDate: req.body.preferred_date || null,
      preferredTime: req.body.preferred_time || null,
    });

    res.json({ schedule: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/jobs/schedule — preview scheduling without creating a job
router.post('/schedule', auth, async (req, res, next) => {
  try {
    const result = await schedule({
      providerId: req.provider.id,
      category: req.body.category || 'general',
      priority: req.body.priority || 'normal',
      durationMin: req.body.duration_minutes || null,
      preferredDate: req.body.preferred_date || null,
      preferredTime: req.body.preferred_time || null,
    });

    res.json({
      scheduled_date: result.scheduledAt.toISOString().split('T')[0],
      scheduled_start: result.scheduledAt.toISOString(),
      scheduled_end: result.scheduledEnd.toISOString(),
      duration_minutes: result.durationMinutes,
      message: result.message,
      reason: result.reason,
      alternatives: result.alternatives.map(a => ({
        start: a.scheduledAt.toISOString(),
        end: a.scheduledEnd.toISOString(),
        message: a.message,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/:id/photos — list all photos for a job
router.get('/:id/photos', auth, async (req, res, next) => {
  try {
    const { rows: jobRows } = await pool.query(
      `SELECT id FROM jobs WHERE id = $1 AND provider_id = $2`,
      [req.params.id, req.provider.id]
    );
    if (!jobRows.length) return res.status(404).json({ error: 'Job not found' });

    const { rows } = await pool.query(
      `SELECT id, photo_url, phase, source, latitude, longitude, captured_at, created_at
       FROM job_photos WHERE job_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json({ photos: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/jobs/:id/photo — attach a photo to a job
router.post('/:id/photo', auth, photoUpload.single('photo'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'Photo file is required' });

  const filePath = req.file.path;

  try {
    // Verify job belongs to this provider
    const { rows: jobRows } = await pool.query(
      `SELECT id FROM jobs WHERE id = $1 AND provider_id = $2`,
      [req.params.id, req.provider.id]
    );
    if (!jobRows.length) return res.status(404).json({ error: 'Job not found' });

    const photoUrl = await uploadPhoto(filePath, `trego/jobs/${req.params.id}`);

    const phase = req.body.phase || 'during';   // before | during | after
    const source = req.body.source || 'provider'; // client | provider

    const { rows } = await pool.query(
      `INSERT INTO job_photos (job_id, photo_url, phase, source, captured_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [req.params.id, photoUrl, phase, source]
    );

    res.json({ photo: rows[0] });
  } catch (err) {
    next(err);
  } finally {
    fs.unlink(filePath, () => {});
  }
});

// POST /api/jobs/:id/bill — trigger Moloni invoice creation
router.post('/:id/bill', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT j.*, c.name AS client_name, c.email AS client_email, c.nif AS client_nif
       FROM jobs j
       LEFT JOIN clients c ON j.client_id = c.id
       WHERE j.id = $1 AND j.provider_id = $2`,
      [req.params.id, req.provider.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Job not found' });

    const job = rows[0];

    const { createInvoice } = require('../services/moloni');
    const invoice = await createInvoice(job, req.provider);

    const { rows: updated } = await pool.query(
      `UPDATE jobs
       SET invoice_status = 'sent',
           moloni_invoice_id = $1,
           status = 'billed',
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [invoice.id || null, job.id]
    );

    // Also store in invoices table
    await pool.query(
      `INSERT INTO invoices (provider_id, job_id, client_id, moloni_invoice_id, invoice_number, status, total, pdf_url)
       VALUES ($1, $2, $3, $4, $5, 'ISSUED', $6, $7)`,
      [
        req.provider.id, job.id, job.client_id,
        invoice.id || null, invoice.number || null,
        invoice.total || job.price || null,
        invoice.pdf_url || null,
      ]
    );

    const { sendPushNotification } = require('../services/notifications');
    await sendPushNotification(
      req.provider.fcm_token,
      'Invoice sent',
      `Invoice sent to ${job.client_name || 'client'}.`
    );

    res.json({ job: updated[0], invoice });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
