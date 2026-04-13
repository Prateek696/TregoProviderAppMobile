require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');

const authRouter = require('./routes/auth');
const jobsRouter = require('./routes/jobs');
const profileRouter = require('./routes/profile');
const contactsRouter = require('./routes/contacts');
const whatsappRouter = require('./routes/whatsapp');
const invoicesRouter = require('./routes/invoices');
const adminRouter = require('./routes/admin');
const feedbackRouter = require('./routes/feedback');

const pool = require('./db');
const { sendPushNotification } = require('./services/notifications');
const crons = require('./services/crons');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';
    console.log(`${color}${req.method} ${req.path} → ${status}${reset} (${ms}ms)${req.body && Object.keys(req.body).length ? ' body:' + JSON.stringify(req.body).slice(0, 120) : ''}`);
  });
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/webhook/whatsapp', whatsappRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/feedback', feedbackRouter);

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── End-of-day digest — fires at 19:00 Portugal time (UTC+1, UTC+0 in winter)
// Cron runs at 18:00 UTC to hit 19:00 Portugal time (WET = UTC+0, WEST = UTC+1)
// Using 18:00 UTC covers both winter and summer — adjust if needed
cron.schedule('0 18 * * *', async () => {
  console.log('[Digest] Running end-of-day digest...');

  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setUTCDate(tomorrowEnd.getUTCDate() + 1);

    // Get all providers with digest enabled and a valid FCM token
    const { rows: providers } = await pool.query(
      `SELECT p.id, p.fcm_token, p.name,
              COALESCE(ps.digest_enabled, TRUE) AS digest_enabled
       FROM providers p
       LEFT JOIN provider_settings ps ON ps.provider_id = p.id
       WHERE p.fcm_token IS NOT NULL
         AND COALESCE(ps.digest_enabled, TRUE) = TRUE`
    );

    for (const provider of providers) {
      const { rows: todayCount } = await pool.query(
        `SELECT COUNT(*) AS count FROM jobs
         WHERE provider_id = $1 AND created_at >= $2 AND created_at < $3`,
        [provider.id, todayStart, tomorrowStart]
      );

      const { rows: tomorrowCount } = await pool.query(
        `SELECT COUNT(*) AS count FROM jobs
         WHERE provider_id = $1 AND scheduled_at >= $2 AND scheduled_at < $3`,
        [provider.id, tomorrowStart, tomorrowEnd]
      );

      const today = parseInt(todayCount[0].count);
      const tomorrow = parseInt(tomorrowCount[0].count);

      const body = [
        today > 0 ? `You logged ${today} job${today > 1 ? 's' : ''} today.` : 'No jobs logged today.',
        tomorrow > 0 ? `Tomorrow: ${tomorrow} job${tomorrow > 1 ? 's' : ''} scheduled.` : '',
        'Anything missing? Tap to log.',
      ].filter(Boolean).join(' ');

      await sendPushNotification(provider.fcm_token, "Today's summary", body);
    }

    console.log(`[Digest] Sent to ${providers.length} providers.`);
  } catch (err) {
    console.error('[Digest] Error:', err.message);
  }
});

// ── Week 3 crons — morning push, reminders, price, goodnight, reset ────────
// Morning push: every 15 min, fires within each provider's typical_wake_time window
cron.schedule('*/15 * * * *', async () => {
  try {
    const r = await crons.morningPushTick();
    if (r && r.pushed) console.log('[Morning]', r);
  } catch (e) { console.error('[Morning] error:', e.message); }
});

// Pre-job reminders: every 5 min — looks 55-65 min ahead
cron.schedule('*/5 * * * *', async () => {
  try {
    const r = await crons.preJobReminderTick();
    if (r && r.sent) console.log('[PreJob]', r);
  } catch (e) { console.error('[PreJob] error:', e.message); }
});

// Post-job price capture: every 15 min — looks 1-6h back
cron.schedule('*/15 * * * *', async () => {
  try {
    const r = await crons.postJobPriceTick();
    if (r && r.sent) console.log('[PostJob]', r);
  } catch (e) { console.error('[PostJob] error:', e.message); }
});

// Goodnight / end-of-day: 18:00 UTC (mirrors legacy digest)
cron.schedule('0 18 * * *', async () => {
  try {
    const r = await crons.goodnightTick();
    console.log('[Goodnight]', r);
  } catch (e) { console.error('[Goodnight] error:', e.message); }
});

// Daily proactive counter reset: every 15 min (TZ-aware, idempotent)
cron.schedule('*/15 * * * *', async () => {
  try {
    const r = await crons.dailyResetTick();
    if (r && r.reset) console.log('[Reset]', r);
  } catch (e) { console.error('[Reset] error:', e.message); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Trego backend running on port ${PORT}`);
});
