/**
 * Feedback API — mic button on job cards, thumbs-down on notifications,
 * suggestion text. Every inbound feedback is logged for product learning.
 */
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const pool = require('../db');
const auth = require('../middleware/auth');
const { transcribeAudio } = require('../services/whisper');

const router = express.Router();
const upload = multer({ dest: '/tmp', limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/feedback — provider submits feedback
// multipart form: type (required), notes?, related_job_id?, source?, audio? (file)
router.post('/', auth, upload.single('audio'), async (req, res, next) => {
  try {
    const type = (req.body.type || '').toLowerCase();
    const validTypes = ['voice_note', 'thumbs_down', 'text', 'suggestion', 'bug'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'invalid_type', valid: validTypes });
    }

    const relatedJobId = req.body.related_job_id || null;
    const notes = (req.body.notes || '').trim() || null;
    const source = (req.body.source || 'app').slice(0, 20);
    const sentiment = type === 'thumbs_down' ? 'negative' : null;

    let transcription = null;
    let audioUrl = null;
    if (req.file && type === 'voice_note') {
      try { transcription = await transcribeAudio(req.file.path); } catch (_) {}
      audioUrl = req.file.path; // local placeholder; real impl would push to Cloudinary
    }

    const { rows } = await pool.query(
      `INSERT INTO feedback
         (provider_id, type, audio_url, transcription, related_job_id, notes, source, sentiment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.provider.id, type, audioUrl, transcription, relatedJobId, notes, source, sentiment]
    );

    // Clean up tmp file after response
    if (req.file) fs.unlink(req.file.path, () => {});

    res.status(201).json({ feedback: rows[0] });
  } catch (e) { next(e); }
});

// GET /api/feedback/mine — provider's own feedback history (for in-app view)
router.get('/mine', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, type, notes, transcription, related_job_id, read, resolved, created_at
       FROM feedback
       WHERE provider_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.provider.id]
    );
    res.json({ items: rows });
  } catch (e) { next(e); }
});

module.exports = router;
