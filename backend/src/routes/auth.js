const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const admin = require('../services/firebaseAdmin');

const router = express.Router();

/**
 * POST /api/auth/firebase
 *
 * Mobile verifies OTP directly with Firebase Phone Auth,
 * then sends the resulting Firebase ID token here.
 * We verify it, upsert the provider, and return our own JWT.
 */
router.post(
  '/firebase',
  body('idToken').notEmpty().withMessage('Firebase ID token required'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { idToken } = req.body;

    try {
      // Verify the Firebase ID token
      const decoded = await admin.auth().verifyIdToken(idToken);
      const phone = decoded.phone_number;

      if (!phone) {
        return res.status(400).json({ error: 'Token does not contain a phone number' });
      }

      // Upsert provider by phone
      const { rows } = await pool.query(
        `INSERT INTO providers (phone)
         VALUES ($1)
         ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
         RETURNING *`,
        [phone]
      );

      const provider = rows[0];
      const isNew = provider.name === null;

      const token = jwt.sign(
        { providerId: provider.id },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({ token, provider, isNew });
    } catch (err) {
      if (err.code?.startsWith('auth/')) {
        return res.status(401).json({ error: 'Invalid or expired Firebase token' });
      }
      next(err);
    }
  }
);

module.exports = router;
