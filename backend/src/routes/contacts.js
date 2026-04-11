const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/contacts — list all clients/contacts for this provider
router.get('/', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
              COALESCE(json_agg(DISTINCT cp.*) FILTER (WHERE cp.id IS NOT NULL), '[]'::json) AS phones,
              COALESCE(json_agg(DISTINCT ce.*) FILTER (WHERE ce.id IS NOT NULL), '[]'::json) AS emails
       FROM clients c
       LEFT JOIN contact_phones cp ON cp.client_id = c.id
       LEFT JOIN contact_emails ce ON ce.client_id = c.id
       WHERE c.provider_id = $1
         AND (c.sync_status IS NULL OR c.sync_status != 'synced')
       GROUP BY c.id
       ORDER BY c.name ASC`,
      [req.provider.id]
    );
    res.json({ contacts: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/contacts/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
              COALESCE(json_agg(DISTINCT cp.*) FILTER (WHERE cp.id IS NOT NULL), '[]'::json) AS phones,
              COALESCE(json_agg(DISTINCT ce.*) FILTER (WHERE ce.id IS NOT NULL), '[]'::json) AS emails
       FROM clients c
       LEFT JOIN contact_phones cp ON cp.client_id = c.id
       LEFT JOIN contact_emails ce ON ce.client_id = c.id
       WHERE c.id = $1 AND c.provider_id = $2
       GROUP BY c.id`,
      [req.params.id, req.provider.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Contact not found' });
    res.json({ contact: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/contacts/sync — bulk import from phone contacts (plan v2)
// Accepts array of { name, phones: [{ number, label }], emails: [{ email, label }], source_contact_id }
router.post(
  '/sync',
  auth,
  body('contacts').isArray({ min: 1 }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { contacts } = req.body;
    let imported = 0;
    let skipped = 0;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const contact of contacts) {
        const { name, phones = [], emails = [], source_contact_id } = contact;
        if (!name) { skipped++; continue; }

        // Upsert by source_contact_id when available, otherwise plain insert
        let rows;
        if (source_contact_id) {
          // Partial unique index: (provider_id, source_contact_id) WHERE source_contact_id IS NOT NULL
          ({ rows } = await client.query(
            `INSERT INTO clients (provider_id, name, phone, source_contact_id, sync_status)
             VALUES ($1, $2, $3, $4, 'synced')
             ON CONFLICT (provider_id, source_contact_id) DO UPDATE SET
               name        = EXCLUDED.name,
               phone       = EXCLUDED.phone,
               sync_status = 'synced',
               updated_at  = NOW()
             RETURNING id`,
            [req.provider.id, name, phones[0]?.number || null, source_contact_id]
          ));
        } else {
          // No device ID — skip if same name already exists for this provider
          ({ rows } = await client.query(
            `INSERT INTO clients (provider_id, name, phone, sync_status)
             VALUES ($1, $2, $3, 'synced')
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [req.provider.id, name, phones[0]?.number || null]
          ));
          if (!rows.length) { skipped++; continue; }
        }

        const clientId = rows[0].id;

        // Upsert phones
        for (const p of phones) {
          if (!p.number) continue;
          await client.query(
            `INSERT INTO contact_phones (client_id, label, number)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [clientId, p.label || 'mobile', p.number]
          );
        }

        // Upsert emails
        for (const e of emails) {
          if (!e.email) continue;
          await client.query(
            `INSERT INTO contact_emails (client_id, label, email)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [clientId, e.label || 'work', e.email]
          );
        }

        imported++;
      }

      await client.query('COMMIT');
      res.json({ imported, skipped, total: contacts.length });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

// POST /api/contacts — create a single contact manually
router.post(
  '/',
  auth,
  body('name').isString().trim().notEmpty(),
  body('phone').optional().isString(),
  body('email').optional().isEmail(),
  body('nif').optional().isLength({ min: 9, max: 9 }).isNumeric(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, phone, email, nif, notes } = req.body;

    try {
      const { rows } = await pool.query(
        `INSERT INTO clients (provider_id, name, phone, email, nif, notes, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'trego-only')
         RETURNING *`,
        [req.provider.id, name, phone || null, email || null, nif || null, notes || null]
      );
      res.status(201).json({ contact: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/contacts/:id
router.put(
  '/:id',
  auth,
  body('name').optional().isString().trim(),
  body('phone').optional().isString(),
  body('email').optional().isEmail(),
  body('nif').optional().isLength({ min: 9, max: 9 }).isNumeric(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, phone, email, nif, notes } = req.body;

    try {
      const { rows } = await pool.query(
        `UPDATE clients
         SET name    = COALESCE($1, name),
             phone   = COALESCE($2, phone),
             email   = COALESCE($3, email),
             nif     = COALESCE($4, nif),
             notes   = COALESCE($5, notes),
             updated_at = NOW()
         WHERE id = $6 AND provider_id = $7
         RETURNING *`,
        [name, phone, email, nif, notes, req.params.id, req.provider.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Contact not found' });
      res.json({ contact: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
