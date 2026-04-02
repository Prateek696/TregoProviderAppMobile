const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/profile — returns provider + services + locations + working hours
router.get('/', auth, async (req, res, next) => {
  try {
    const providerId = req.provider.id;

    const [servicesRes, locationsRes, hoursRes, citiesRes, billingRes] = await Promise.all([
      pool.query(
        'SELECT * FROM provider_services WHERE provider_id = $1 ORDER BY display_order',
        [providerId]
      ),
      pool.query(
        'SELECT * FROM provider_locations WHERE provider_id = $1 ORDER BY is_primary DESC',
        [providerId]
      ),
      pool.query(
        'SELECT * FROM provider_working_hours WHERE provider_id = $1 ORDER BY day_of_week',
        [providerId]
      ),
      pool.query(
        'SELECT city_name FROM provider_coverage_cities WHERE provider_id = $1',
        [providerId]
      ),
      pool.query(
        'SELECT * FROM provider_billing WHERE provider_id = $1',
        [providerId]
      ),
    ]);

    res.json({
      provider: {
        ...req.provider,
        services: servicesRes.rows,
        locations: locationsRes.rows,
        working_hours: hoursRes.rows,
        coverage_cities: citiesRes.rows.map(r => r.city_name),
        billing: billingRes.rows[0] || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile
// Accepts: name, last_name, trade, nif, fcm_token,
//          services[], locations[], working_hours[], coverage_radius,
//          coverage_unlimited, coverage_mode, coverage_cities[]
router.put(
  '/',
  auth,
  body('name').optional().isString().trim().notEmpty(),
  body('last_name').optional().isString().trim(),
  body('trade').optional().isString().trim().notEmpty(),
  body('nif').optional().isString(),
  body('fcm_token').optional().isString(),
  body('country_code').optional().isString(),
  body('assistant_name').optional().isString().trim(),
  body('orb_color').optional().isString(),
  body('coverage_radius').optional().isInt({ min: 1 }),
  body('coverage_unlimited').optional().isBoolean(),
  body('coverage_mode').optional().isIn(['radius', 'city']),
  body('calendar_connected').optional().isBoolean(),
  body('calendar_provider').optional().isIn(['google', 'outlook', 'apple', 'other']),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, last_name, trade, nif, fcm_token,
      country_code, assistant_name, orb_color,
      services, locations, working_hours,
      coverage_radius, coverage_unlimited, coverage_mode, coverage_cities,
      calendar_connected, calendar_provider,
      billing,
    } = req.body;

    const providerId = req.provider.id;

    try {
      // 1. Update scalar fields on providers
      await pool.query(
        `UPDATE providers
         SET name               = COALESCE($1, name),
             last_name          = COALESCE($2, last_name),
             trade              = COALESCE($3, trade),
             nif                = COALESCE($4, nif),
             fcm_token          = COALESCE($5, fcm_token),
             country_code       = COALESCE($6, country_code),
             assistant_name     = COALESCE($7, assistant_name),
             orb_color          = COALESCE($8, orb_color),
             coverage_radius    = COALESCE($9, coverage_radius),
             coverage_unlimited = COALESCE($10, coverage_unlimited),
             coverage_mode      = COALESCE($11, coverage_mode),
             calendar_connected = COALESCE($12, calendar_connected),
             calendar_provider  = COALESCE($13, calendar_provider)
         WHERE id = $14`,
        [name, last_name, trade, nif, fcm_token,
         country_code, assistant_name, orb_color,
         coverage_radius, coverage_unlimited, coverage_mode,
         calendar_connected, calendar_provider,
         providerId]
      );

      // 1b. Billing info — upsert
      if (billing) {
        await pool.query(
          `INSERT INTO provider_billing
             (provider_id, billing_name, vat, address, city, postal_code, use_personal_info)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (provider_id) DO UPDATE
             SET billing_name      = EXCLUDED.billing_name,
                 vat               = EXCLUDED.vat,
                 address           = EXCLUDED.address,
                 city              = EXCLUDED.city,
                 postal_code       = EXCLUDED.postal_code,
                 use_personal_info = EXCLUDED.use_personal_info,
                 updated_at        = NOW()`,
          [providerId, billing.name, billing.vat, billing.address,
           billing.city, billing.postalCode, billing.usePersonalInfo ?? false]
        );
      }

      // 2. Services — replace all
      if (Array.isArray(services) && services.length > 0) {
        await pool.query(
          'DELETE FROM provider_services WHERE provider_id = $1',
          [providerId]
        );
        for (let i = 0; i < services.length; i++) {
          const svc = services[i];
          await pool.query(
            `INSERT INTO provider_services (provider_id, service_name, category, display_order)
             VALUES ($1, $2, $3, $4)`,
            [providerId, svc.name || svc, svc.category || null, i]
          );
        }
      }

      // 3. Locations — replace all
      if (Array.isArray(locations) && locations.length > 0) {
        await pool.query(
          'DELETE FROM provider_locations WHERE provider_id = $1',
          [providerId]
        );
        for (let i = 0; i < locations.length; i++) {
          const loc = locations[i];
          await pool.query(
            `INSERT INTO provider_locations
               (provider_id, nickname, street, city, zip_code, is_primary)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [providerId, loc.nickname, loc.street, loc.city, loc.zipCode, i === 0]
          );
        }
      }

      // 4. Working hours — upsert by day
      if (Array.isArray(working_hours) && working_hours.length > 0) {
        for (const day of working_hours) {
          await pool.query(
            `INSERT INTO provider_working_hours (provider_id, day_of_week, is_active, blocks)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (provider_id, day_of_week)
             DO UPDATE SET is_active = $3, blocks = $4`,
            [providerId, day.day_of_week, day.is_active, JSON.stringify(day.blocks || [])]
          );
        }
      }

      // 5. Coverage cities — replace all
      if (Array.isArray(coverage_cities)) {
        await pool.query(
          'DELETE FROM provider_coverage_cities WHERE provider_id = $1',
          [providerId]
        );
        for (const city of coverage_cities) {
          await pool.query(
            'INSERT INTO provider_coverage_cities (provider_id, city_name) VALUES ($1, $2)',
            [providerId, city]
          );
        }
      }

      // Return updated profile
      const { rows } = await pool.query(
        'SELECT * FROM providers WHERE id = $1',
        [providerId]
      );
      res.json({ provider: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
