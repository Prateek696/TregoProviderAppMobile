const jwt = require('jsonwebtoken');
const pool = require('../db');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM providers WHERE id = $1', [payload.providerId]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Provider not found' });
    }
    req.provider = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;
