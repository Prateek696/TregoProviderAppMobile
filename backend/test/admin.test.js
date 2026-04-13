/**
 * Integration tests for the admin API using a mocked pg Pool.
 * We hook Node's require cache so ../src/db returns our mock.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const { MockPool } = require('./mockPool');

const mock = new MockPool();

// Monkey-patch require so that any require('./db') or '../db' returns our mock
const origResolve = Module._resolveFilename;
const dbPath = path.resolve(__dirname, '../src/db.js');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: mock };

// Force admin token for tests
process.env.ADMIN_API_TOKEN = 'test-admin';
process.env.JWT_SECRET = 'test-jwt-secret';

// Now require Express app pieces. We need to stub pool BEFORE they load.
const express = require('express');
const adminRouter = require('../src/routes/admin');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  return app;
}

async function hit(app, method, url, { headers = {}, body } = {}) {
  const http = require('node:http');
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = server.address().port;
      const req = http.request({
        method, hostname: '127.0.0.1', port, path: url,
        headers: { 'Content-Type': 'application/json', ...headers },
      }, (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => {
          server.close();
          try { resolve({ status: res.statusCode, json: data ? JSON.parse(data) : null }); }
          catch (e) { resolve({ status: res.statusCode, text: data }); }
        });
      });
      req.on('error', (e) => { server.close(); reject(e); });
      if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
      req.end();
    });
  });
}

test('admin: 401 without credentials', async () => {
  mock.reset();
  const app = makeApp();
  const r = await hit(app, 'GET', '/api/admin/jobs/summary');
  assert.equal(r.status, 401);
});

test('admin: 200 with X-Admin-Token', async () => {
  mock.reset();
  mock.when('FROM jobs', [{ raw_count: '1', structured_count: '2', scheduled_count: '3', discarded_count: '0', completed_count: '5', total: '11', total_price: 1234 }]);
  const app = makeApp();
  const r = await hit(app, 'GET', '/api/admin/jobs/summary?date=2026-04-15', { headers: { 'X-Admin-Token': 'test-admin' } });
  assert.equal(r.status, 200);
  assert.equal(r.json.total, '11');
});

test('admin: accuracy endpoint returns expected shape', async () => {
  mock.reset();
  mock.when('AVG(ai_confidence)', [{ total: '5', avg_confidence: 0.78, high_conf: '3', mid_conf: '1', low_conf: '1', discarded: '0' }]);
  const app = makeApp();
  const r = await hit(app, 'GET', '/api/admin/jobs/accuracy', { headers: { 'X-Admin-Token': 'test-admin' } });
  assert.equal(r.status, 200);
  assert.equal(r.json.total, '5');
  assert.equal(r.json.avg_confidence, 0.78);
});

test('admin: feedback queue returns items (unread default)', async () => {
  mock.reset();
  mock.when('FROM feedback', [
    { id: 'f1', type: 'thumbs_down', notes: 'bad parse', read: false, provider_name: 'Carlos', provider_phone: '+351912' },
  ]);
  const app = makeApp();
  const r = await hit(app, 'GET', '/api/admin/feedback/queue', { headers: { 'X-Admin-Token': 'test-admin' } });
  assert.equal(r.status, 200);
  assert.equal(r.json.items.length, 1);
  assert.equal(r.json.items[0].id, 'f1');
});

test('admin: feedback mark read (PATCH)', async () => {
  mock.reset();
  mock.when('UPDATE feedback', [{ id: 'f1', read: true, resolved: true }]);
  const app = makeApp();
  const r = await hit(app, 'PATCH', '/api/admin/feedback/f1/read', {
    headers: { 'X-Admin-Token': 'test-admin' },
    body: { resolved: true },
  });
  assert.equal(r.status, 200);
  assert.equal(r.json.item.read, true);
});

test('admin: all 9 endpoints respond 200 with token', async () => {
  mock.reset();
  // Return empty rows for everything
  mock.when(/.*/, []);
  const app = makeApp();
  const endpoints = [
    ['GET', '/api/admin/jobs/summary'],
    ['GET', '/api/admin/jobs/accuracy'],
    ['GET', '/api/admin/jobs/failures'],
    ['GET', '/api/admin/providers/active'],
    ['GET', '/api/admin/feedback/queue'],
    ['GET', '/api/admin/providers/retention'],
    ['GET', '/api/admin/parsing/errors'],
    ['GET', '/api/admin/notifications/engagement'],
  ];
  for (const [m, u] of endpoints) {
    const r = await hit(app, m, u, { headers: { 'X-Admin-Token': 'test-admin' } });
    assert.equal(r.status, 200, `${m} ${u} → ${r.status}`);
  }
});
