/**
 * Unit + integration tests for notificationPolicy.js — Playbook §5.9.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { MockPool } = require('./mockPool');

const mock = new MockPool();
const dbPath = path.resolve(__dirname, '../src/db.js');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: mock };

const policy = require('../src/services/notificationPolicy');

// Helper — set up a provider row
function mkProvider(overrides = {}) {
  return {
    id: 'p1',
    timezone: 'UTC',              // tests pin to UTC for determinism
    max_daily_messages: 6,
    proactive_messages_today: 0,
    last_bom_dia_at: null,
    ...overrides,
  };
}

test('inQuietHours: 22:00 UTC → true', () => {
  const d = new Date('2026-04-15T22:30:00Z');
  assert.equal(policy.inQuietHours('UTC', d), true);
});

test('inQuietHours: 10:00 UTC → false', () => {
  const d = new Date('2026-04-15T10:30:00Z');
  assert.equal(policy.inQuietHours('UTC', d), false);
});

test('inQuietHours: 06:59 UTC → true (edge)', () => {
  const d = new Date('2026-04-15T06:30:00Z');
  assert.equal(policy.inQuietHours('UTC', d), true);
});

test('inQuietHours: 07:00 UTC → false (edge)', () => {
  const d = new Date('2026-04-15T07:00:00Z');
  assert.equal(policy.inQuietHours('UTC', d), false);
});

test('shouldSend: non-proactive kinds always allowed', async () => {
  mock.reset();
  // No provider query expected — early return
  const r = await policy.shouldSend('p1', { kind: 'job_confirm' });
  assert.equal(r.allow, true);
});

test('shouldSend: critical priority bypasses cap + quiet', async () => {
  mock.reset();
  mock.when('FROM providers', [mkProvider({ proactive_messages_today: 999 })]);
  const r = await policy.shouldSend('p1', { kind: 'error', priority: 'critical' });
  assert.equal(r.allow, true);
});

test('shouldSend: CRITICAL_KIND bypasses gate', async () => {
  const r = await policy.shouldSend('p1', { kind: 'offline_sync_confirm' });
  assert.equal(r.allow, true);
});

test('shouldSend: unknown provider → denied', async () => {
  mock.reset();
  mock.when('FROM providers', []);
  const r = await policy.shouldSend('nope', { kind: 'morning_push' });
  assert.equal(r.allow, false);
  assert.equal(r.reason, 'no_provider');
});

test('shouldSend: at cap → denied with cap reason', async () => {
  mock.reset();
  mock.when('FROM providers', [mkProvider({ proactive_messages_today: 6 })]);
  // Pin test clock to 10:00 UTC (outside quiet hours)
  const origDate = Date.now; Date.now = () => new Date('2026-04-15T10:00:00Z').getTime();
  try {
    const r = await policy.shouldSend('p1', { kind: 'photo_nudge' });
    assert.equal(r.allow, false);
    assert.equal(r.reason, 'daily_cap');
    assert.equal(r.cap, 6);
  } finally { Date.now = origDate; }
});

test('shouldSend: in quiet hours → denied', async () => {
  mock.reset();
  mock.when('FROM providers', [mkProvider()]);
  // Pin clock to 23:00 UTC
  const origDate = Date.now; Date.now = () => new Date('2026-04-15T23:00:00Z').getTime();
  try {
    const r = await policy.shouldSend('p1', { kind: 'photo_nudge' });
    assert.equal(r.allow, false);
    assert.equal(r.reason, 'quiet_hours');
  } finally { Date.now = origDate; }
});

test('shouldSend: 3+ in 5 min → bundled', async () => {
  mock.reset();
  mock.when('FROM providers', [mkProvider({ proactive_messages_today: 1 })]);
  mock.when('FROM notification_log', [{ n: 3 }]);
  // 10:00 UTC, not quiet
  const origDate = Date.now; Date.now = () => new Date('2026-04-15T10:00:00Z').getTime();
  try {
    const r = await policy.shouldSend('p1', { kind: 'photo_nudge' });
    assert.equal(r.allow, false);
    assert.equal(r.reason, 'bundled');
  } finally { Date.now = origDate; }
});

test('shouldSend: under cap + outside quiet + <3 recent → allowed', async () => {
  mock.reset();
  mock.when('FROM providers', [mkProvider({ proactive_messages_today: 2 })]);
  mock.when('FROM notification_log', [{ n: 1 }]);
  const origDate = Date.now; Date.now = () => new Date('2026-04-15T10:00:00Z').getTime();
  try {
    const r = await policy.shouldSend('p1', { kind: 'photo_nudge' });
    assert.equal(r.allow, true);
  } finally { Date.now = origDate; }
});

test('recordSend: increments proactive counter when proactive+succeeded', async () => {
  mock.reset();
  mock.when('INSERT INTO notification_log', { rows: [], rowCount: 1 });
  mock.when('UPDATE providers', { rows: [], rowCount: 1 });
  await policy.recordSend('p1', 'photo_nudge', 'whatsapp', 'hello', { proactive: true });
  const incremented = mock.queries.some((q) => q.sql.includes('UPDATE providers'));
  assert.ok(incremented, 'should increment counter on successful proactive send');
});

test('recordSend: skipped → inserts log but no counter increment', async () => {
  mock.reset();
  mock.when('INSERT INTO notification_log', { rows: [], rowCount: 1 });
  await policy.recordSend('p1', 'photo_nudge', 'whatsapp', 'hello', { proactive: true, skipped: true });
  const incremented = mock.queries.some((q) => q.sql.includes('UPDATE providers'));
  assert.equal(incremented, false, 'should NOT increment counter when skipped');
});

test('recordSend: non-proactive (reply) → no counter increment', async () => {
  mock.reset();
  mock.when('INSERT INTO notification_log', { rows: [], rowCount: 1 });
  await policy.recordSend('p1', 'job_confirm', 'whatsapp', 'hello', { proactive: false });
  const incremented = mock.queries.some((q) => q.sql.includes('UPDATE providers'));
  assert.equal(incremented, false);
});
