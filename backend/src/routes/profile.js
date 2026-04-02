const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/profile
router.get('/', auth, async (req, res, next) => {
  try {
    res.json({ provider: req.provider });
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile
router.put(
  '/',
  auth,
  body('name').optional().isString().trim().notEmpty(),
  body('trade').optional().isString().trim().notEmpty(),
  body('nif').optional().isLength({ min: 9, max: 9 }).isNumeric(),
  body('fcm_token').optional().isString(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, trade, nif, fcm_token } = req.body;

    try {
      const { rows } = await pool.query(
        `UPDATE providers
         SET name = COALESCE($1, name),
             trade = COALESCE($2, trade),
             nif = COALESCE($3, nif),
             fcm_token = COALESCE($4, fcm_token)
         WHERE id = $5
         RETURNING *`,
        [name, trade, nif, fcm_token, req.provider.id]
      );

      res.json({ provider: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
