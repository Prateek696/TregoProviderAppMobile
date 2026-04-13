/**
 * Admin auth middleware.
 *
 * Two ways to authenticate an admin:
 *  1. X-Admin-Token header matches process.env.ADMIN_API_TOKEN
 *     (simple machine-to-machine token for Miguel's Lovable dashboard)
 *  2. A valid provider JWT whose provider row has is_admin = true
 */
const jwt = require('jsonwebtoken');
const pool = require('../db');

async function adminMiddleware(req, res, next) {
  const headerToken = req.headers['x-admin-token'];
  if (headerToken && process.env.ADMIN_API_TOKEN && headerToken === process.env.ADMIN_API_TOKEN) {
    req.admin = { source: 'token' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
      const { rows } = await pool.query(
        `SELECT id, name, is_admin FROM providers WHERE id = $1 AND is_admin = TRUE`,
        [payload.providerId]
      );
      if (rows.length) {
        req.admin = { source: 'jwt', provider: rows[0] };
        return next();
      }
    } catch (_) { /* fall through to 401 */ }
  }

  return res.status(401).json({ error: 'Admin access required' });
}

module.exports = adminMiddleware;
