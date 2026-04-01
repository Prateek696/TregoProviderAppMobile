const admin = require('./firebaseAdmin');
const pool = require('../db');

// ── Notification bundling (4.9) ───────────────────────────────────────────────
// Accumulate bundleable notifications per provider for 5 minutes, then send once.
// Hard cap: each provider gets at most 6 Trego notifications per day.

const BUNDLE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const DAILY_CAP = 6;

// Map<providerId, { count: number, timer: NodeJS.Timeout, titles: string[] }>
const pendingBundles = new Map();

// Map<providerId, { date: string, sent: number }>
const dailyCounts = new Map();

function getDailyCount(providerId) {
  const today = new Date().toISOString().split('T')[0];
  const entry = dailyCounts.get(providerId);
  if (!entry || entry.date !== today) {
    dailyCounts.set(providerId, { date: today, sent: 0 });
    return 0;
  }
  return entry.sent;
}

function incrementDailyCount(providerId) {
  const today = new Date().toISOString().split('T')[0];
  const entry = dailyCounts.get(providerId);
  if (!entry || entry.date !== today) {
    dailyCounts.set(providerId, { date: today, sent: 1 });
  } else {
    entry.sent += 1;
  }
}

// ── Quiet hours check (4.7) ───────────────────────────────────────────────────
async function isQuietHours(providerId) {
  if (!providerId) return false;
  try {
    const { rows } = await pool.query(
      `SELECT quiet_hours_enabled, quiet_hours_start, quiet_hours_end
       FROM provider_settings WHERE provider_id = $1`,
      [providerId]
    );
    if (!rows.length) return false;
    const { quiet_hours_enabled, quiet_hours_start, quiet_hours_end } = rows[0];
    if (!quiet_hours_enabled) return false;

    const nowHour = new Date().getHours(); // local server hour
    const start = quiet_hours_start ?? 21;
    const end = quiet_hours_end ?? 7;

    // Handles overnight range e.g. 21–07
    if (start > end) {
      return nowHour >= start || nowHour < end;
    }
    return nowHour >= start && nowHour < end;
  } catch (err) {
    console.error('Quiet hours check error:', err.message);
    return false;
  }
}

// ── Core send ────────────────────────────────────────────────────────────────
async function _send(fcmToken, title, body, data = {}) {
  if (!fcmToken) return;
  try {
    const message = {
      token: fcmToken,
      notification: { title, body },
    };
    if (Object.keys(data).length) {
      message.data = data;
    }
    await admin.messaging().send(message);
  } catch (err) {
    console.error('FCM send error:', err.message);
  }
}

/**
 * sendPushNotification(fcmToken, title, body, options?)
 *
 * options:
 *   providerId   — enables quiet-hours check and bundling
 *   bundleable   — if true, accumulate in 5-min window (4.9)
 *   critical     — if true, skip quiet hours (e.g. offline sync confirms)
 *   data         — extra FCM data payload
 */
async function sendPushNotification(fcmToken, title, body, options = {}) {
  const { providerId, bundleable = false, critical = false, data = {} } = options;

  // ── Daily cap (4.9) ─────────────────────────────────────────────────────────
  if (providerId && !critical) {
    if (getDailyCount(providerId) >= DAILY_CAP) {
      console.log(`[notifications] Daily cap reached for provider ${providerId} — suppressing.`);
      return;
    }
  }

  // ── Quiet hours (4.7) ────────────────────────────────────────────────────────
  if (providerId && !critical) {
    const quiet = await isQuietHours(providerId);
    if (quiet) {
      console.log(`[notifications] Quiet hours active for provider ${providerId} — suppressing.`);
      return;
    }
  }

  // ── Bundling (4.9) ───────────────────────────────────────────────────────────
  if (bundleable && providerId) {
    const existing = pendingBundles.get(providerId);
    if (existing) {
      // Already accumulating — add to bundle
      existing.count += 1;
      existing.titles.push(title);
      return; // don't send yet
    } else {
      // Start a new bundle window
      const bundle = { count: 1, titles: [title], fcmToken, data };
      bundle.timer = setTimeout(async () => {
        pendingBundles.delete(providerId);
        if (bundle.count >= 3) {
          // Send bundled notification
          if (getDailyCount(providerId) < DAILY_CAP) {
            await _send(fcmToken, `${bundle.count} jobs ready for review`, `Tap to see all your new jobs.`, data);
            incrementDailyCount(providerId);
          }
        } else {
          // Below threshold — send individually (first one)
          for (let i = 0; i < bundle.count; i++) {
            if (getDailyCount(providerId) < DAILY_CAP) {
              await _send(fcmToken, bundle.titles[i] || title, body, data);
              incrementDailyCount(providerId);
            }
          }
        }
      }, BUNDLE_WINDOW_MS);
      pendingBundles.set(providerId, bundle);
      return; // send after window
    }
  }

  // ── Direct send ──────────────────────────────────────────────────────────────
  await _send(fcmToken, title, body, data);
  if (providerId) incrementDailyCount(providerId);
}

module.exports = { sendPushNotification };
