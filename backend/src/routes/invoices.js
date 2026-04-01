const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/invoices — list all invoices for provider
router.get('/', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.id, i.job_id, i.moloni_invoice_id, i.total, i.status,
              i.issued_at, i.due_date, i.pdf_url,
              j.title AS job_title, j.client_name
       FROM invoices i
       LEFT JOIN jobs j ON j.id = i.job_id
       WHERE i.provider_id = $1
       ORDER BY i.issued_at DESC NULLS LAST`,
      [req.provider.id]
    );
    res.json({ invoices: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/invoices/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.*, j.title AS job_title, j.client_name, j.address
       FROM invoices i
       LEFT JOIN jobs j ON j.id = i.job_id
       WHERE i.id = $1 AND i.provider_id = $2`,
      [req.params.id, req.provider.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });

    const { rows: lines } = await pool.query(
      `SELECT * FROM invoice_lines WHERE invoice_id = $1`,
      [req.params.id]
    );
    res.json({ invoice: { ...rows[0], lines } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
