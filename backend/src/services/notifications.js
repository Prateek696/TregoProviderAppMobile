const admin = require('./firebaseAdmin');
const pool = require('../db');
const policy = require('./notificationPolicy');

// ── Bundling (Playbook §5.9): 3+ within 5 min → one coalesced notification ─
const BUNDLE_WINDOW_MS = 5 * 60 * 1000;

// Map<providerId, { count, timer, titles, fcmToken, data, body }>
const pendingBundles = new Map();

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
 *   providerId   — enables policy gate (cap + quiet hours + bundling)
 *   kind         — notification kind (morning_briefing, pre_job, post_job_price, ...)
 *   bundleable   — accumulate in 5-min window if 3+ arrive (Playbook §5.9)
 *   critical     — bypass cap + quiet hours (sync confirmations, payments)
 *   data         — extra FCM data payload
 */
async function sendPushNotification(fcmToken, title, body, options = {}) {
  const { providerId, kind = 'custom', bundleable = false, critical = false, data = {} } = options;

  // ── Policy gate (cap + quiet hours + bundling rejection) ─────────────────
  if (providerId) {
    const priority = critical ? 'critical' : 'normal';
    const gate = await policy.shouldSend(providerId, { kind, priority, channel: 'push' });
    if (!gate.allow) {
      await policy.recordSend(providerId, kind, 'push', title, { proactive: true, skipped: true, error: gate.reason });
      return;
    }
  }

  // ── Bundling (queue the actual send) ─────────────────────────────────────
  if (bundleable && providerId) {
    const existing = pendingBundles.get(providerId);
    if (existing) {
      existing.count += 1;
      existing.titles.push(title);
      return;
    }
    const bundle = { count: 1, titles: [title], fcmToken, data, body, providerId, kind };
    bundle.timer = setTimeout(async () => {
      pendingBundles.delete(providerId);
      if (bundle.count >= 3) {
        await _send(fcmToken, `${bundle.count} jobs ready`, 'Tap to review.', data);
        await policy.recordSend(providerId, kind, 'push', bundle.titles.join(' | '), { proactive: true });
      } else {
        for (let i = 0; i < bundle.count; i++) {
          await _send(fcmToken, bundle.titles[i] || title, body, data);
          await policy.recordSend(providerId, kind, 'push', bundle.titles[i] || title, { proactive: true });
        }
      }
    }, BUNDLE_WINDOW_MS);
    pendingBundles.set(providerId, bundle);
    return;
  }

  // ── Direct send ──────────────────────────────────────────────────────────
  await _send(fcmToken, title, body, data);
  if (providerId) {
    await policy.recordSend(providerId, kind, 'push', title, { proactive: !critical, skipped: false });
  }
}

module.exports = { sendPushNotification };
