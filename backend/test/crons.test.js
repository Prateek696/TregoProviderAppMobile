/**
 * Integration tests for Week 3 crons against a mocked DB.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { MockPool } = require('./mockPool');

const mock = new MockPool();
const dbPath = path.resolve(__dirname, '../src/db.js');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: mock };

// Stub sender to avoid HTTP calls
const senderPath = path.resolve(__dirname, '../src/services/whatsappSender.js');
const sent = [];
require.cache[senderPath] = {
  id: senderPath, filename: senderPath, loaded: true,
  exports: {
    isConfigured: () => false,
    isWindowOpen: async () => true,
    openWindow: async () => {},
    sendSequence: async (p, msgs, meta) => { sent.push({ p: p.id, msgs, meta }); return { sent: msgs.length }; },
  },
};

// Stub FCM
const notifPath = path.resolve(__dirname, '../src/services/notifications.js');
const pushes = [];
require.cache[notifPath] = {
  id: notifPath, filename: notifPath, loaded: true,
  exports: { sendPushNotification: async (t, title, body) => { pushes.push({ t, title, body }); } },
};

const crons = require('../src/services/crons');

function reset() { mock.reset(); sent.length = 0; pushes.length = 0; mock.when('pg_try_advisory_lock', [{ got: true }]); mock.when('pg_advisory_unlock', [{ pg_advisory_unlock: true }]); }

test('withAdvisoryLock — skips when lock not acquired', async () => {
  mock.reset();
  mock.when('pg_try_advisory_lock', [{ got: false }]);
  const r = await crons.withAdvisoryLock(999, async () => 'ran');
  assert.deepEqual(r, { skipped: true, reason: 'lock_held' });
});

test('withAdvisoryLock — runs + unlocks on success', async () => {
  mock.reset();
  mock.when('pg_try_advisory_lock', [{ got: true }]);
  mock.when('pg_advisory_unlock', [{ pg_advisory_unlock: true }]);
  const r = await crons.withAdvisoryLock(1, async () => 'yay');
  assert.equal(r, 'yay');
  assert.ok(mock.queries.some((q) => q.sql.includes('pg_advisory_unlock')));
});

test('morningPushTick — no providers → zero pushed', async () => {
  reset();
  mock.when('SELECT p.id, p.name, p.phone', []);
  const r = await crons.morningPushTick();
  assert.equal(r.pushed, 0);
});

test('morningPushTick — fires for provider whose local wake-time is now', async () => {
  reset();
  const now = new Date();
  // Use provider timezone UTC so wake matches current minute
  const hh = now.getUTCHours();
  const mm = now.getUTCMinutes();
  const wake = `${String(hh).padStart(2, '0')}:${String(Math.max(0, mm - 2)).padStart(2, '0')}`;
  mock.when('FROM providers', [{
    id: 'p1', name: 'Carlos', phone: '+351', fcm_token: 'tok', trego_nickname: 'Trego',
    locale: 'pt-PT', timezone: 'UTC', typical_wake_time: wake, last_bom_dia_at: null,
  }]);
  const r = await crons.morningPushTick(now);
  assert.equal(r.pushed, 1);
  assert.equal(pushes.length, 1);
  assert.ok(pushes[0].body.toLowerCase().includes('bom dia'));
});

test('preJobReminderTick — sends to provider with job in 60 min', async () => {
  reset();
  mock.when(/FROM jobs j\s*LEFT JOIN clients/, [{
    id: 'j1', address: 'Rua A', location: null, scheduled_at: new Date(Date.now() + 60 * 60 * 1000),
    provider_id: 'p1', client_name: 'Maria', phone: '+351', fcm_token: null, locale: 'pt-PT', provider_name: 'Carlos',
  }]);
  const r = await crons.preJobReminderTick();
  assert.equal(r.sent, 1);
  assert.ok(sent[0].msgs[0].toLowerCase().includes('caminho'));
});

test('postJobPriceTick — sends for unpriced completed job', async () => {
  reset();
  mock.when(/FROM jobs j\s*LEFT JOIN clients/, [{
    id: 'j2', scheduled_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    provider_id: 'p1', client_name: 'Maria', phone: '+351', fcm_token: null, locale: 'pt-PT', provider_name: 'Carlos',
  }]);
  const r = await crons.postJobPriceTick();
  assert.equal(r.sent, 1);
  assert.ok(sent[0].msgs[0].toLowerCase().includes('cobraste'));
});

test('goodnightTick — skips providers with zero activity', async () => {
  reset();
  mock.when('FROM providers p', [{ id: 'p1', name: 'Carlos', phone: '+351', fcm_token: null, locale: 'pt-PT' }]);
  mock.when('FROM jobs WHERE provider_id', [{ completed: 0, pending: 0, earned: 0 }]);
  const r = await crons.goodnightTick();
  assert.equal(r.sent, 0);
});

test('goodnightTick — sends summary + goodnight when there was activity', async () => {
  reset();
  mock.when('FROM providers p', [{ id: 'p1', name: 'Carlos', phone: '+351', fcm_token: null, locale: 'pt-PT' }]);
  mock.when('FROM jobs WHERE provider_id', [{ completed: 3, pending: 1, earned: 270 }]);
  const r = await crons.goodnightTick();
  assert.equal(r.sent, 1);
  const msg = sent[0].msgs.join(' | ');
  assert.ok(msg.includes('€270'));
  assert.ok(msg.toLowerCase().includes('boa noite'));
});

test('dailyResetTick — runs reset SQL and reports affected rows', async () => {
  reset();
  mock.when('UPDATE providers', { rowCount: 5, rows: [] });
  const r = await crons.dailyResetTick();
  assert.equal(r.reset, 5);
});
