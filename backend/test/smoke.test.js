/**
 * Smoke test — loads the entire app with stubbed DB + FCM and asserts routes
 * respond (no crashes on boot, no 500s on happy paths).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');

process.env.ADMIN_API_TOKEN = 'test-admin';
process.env.JWT_SECRET = 'test-jwt';

const { MockPool } = require('./mockPool');
const mock = new MockPool();

// Stub the DB
const dbPath = path.resolve(__dirname, '../src/db.js');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: mock };

// Stub FCM
require.cache[path.resolve(__dirname, '../src/services/notifications.js')] = {
  exports: { sendPushNotification: async () => {} }, loaded: true, id: '', filename: ''
};

// Stub firebase admin (some routes may touch it)
try {
  require.cache[path.resolve(__dirname, '../src/services/firebaseAdmin.js')] = {
    exports: { auth: () => ({ verifyIdToken: async () => ({ uid: 'u1', phone_number: '+351' }) }) },
    loaded: true, id: '', filename: '',
  };
} catch (_) {}

// Stub cloudinary
try {
  require.cache[path.resolve(__dirname, '../src/services/cloudinary.js')] = {
    exports: { uploadPhoto: async () => ({ secure_url: 'https://test/photo.jpg' }) },
    loaded: true, id: '', filename: '',
  };
} catch (_) {}

// Stub groq so aiParser doesn't actually call the API
try {
  require.cache[require.resolve('groq-sdk')] = {
    exports: function Groq() { return { chat: { completions: { create: async () => ({ choices: [{ message: { content: '{"confidence":0.9,"service":"stub","title":"stub"}' } }] }) } } }; },
    loaded: true, id: '', filename: '',
  };
} catch (_) {}

// Build the express app WITHOUT calling listen. We inline the router setup.
const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/admin', require('../src/routes/admin'));
app.use('/api/feedback', require('../src/routes/feedback'));
app.use('/api/webhook/whatsapp', require('../src/routes/whatsapp'));

let server;
test.before(() => new Promise((resolve) => {
  server = app.listen(0, () => resolve());
}));
test.after(() => new Promise((resolve) => { server.close(() => resolve()); }));

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    http.get({ hostname: '127.0.0.1', port, path, headers }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: data ? JSON.parse(data) : null }); }
        catch (_) { resolve({ status: res.statusCode, text: data }); }
      });
    }).on('error', reject);
  });
}

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const payload = typeof body === 'string' ? body : JSON.stringify(body || {});
    const req = http.request({
      method: 'POST', hostname: '127.0.0.1', port, path,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers }
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: data ? JSON.parse(data) : null }); }
        catch (_) { resolve({ status: res.statusCode, text: data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

test('smoke: /health → 200 ok', async () => {
  const r = await get('/health');
  assert.equal(r.status, 200);
  assert.equal(r.json.status, 'ok');
});

test('smoke: /api/admin/* requires token', async () => {
  const r = await get('/api/admin/jobs/summary');
  assert.equal(r.status, 401);
});

test('smoke: admin summary with token', async () => {
  mock.reset();
  mock.when(/.*/, [{ raw_count: 0, total: 0, total_price: 0 }]);
  const r = await get('/api/admin/jobs/summary', { 'X-Admin-Token': 'test-admin' });
  assert.equal(r.status, 200);
});

test('smoke: /api/webhook/whatsapp GET verify rejects without token', async () => {
  const r = await get('/api/webhook/whatsapp');
  assert.equal(r.status, 403);
});

test('smoke: /api/webhook/whatsapp POST is always 200 (Meta ACK contract)', async () => {
  mock.reset();
  mock.when(/.*/, []);
  const r = await post('/api/webhook/whatsapp', { entry: [] });
  assert.equal(r.status, 200);
});

test('smoke: feedback requires auth → 401', async () => {
  const r = await post('/api/feedback', { type: 'thumbs_down' });
  assert.equal(r.status, 401);
});
