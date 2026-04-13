/**
 * Integration test for the WhatsApp webhook — verifies that inbound text,
 * voice, forward, and image messages are classified and routed correctly
 * against a mocked DB + sender.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { MockPool } = require('./mockPool');
const mock = new MockPool();

// Inject mock db
const dbPath = path.resolve(__dirname, '../src/db.js');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: mock };

// Stub whatsappSender (avoid real HTTP calls)
const senderPath = path.resolve(__dirname, '../src/services/whatsappSender.js');
const sentMessages = [];
require.cache[senderPath] = {
  id: senderPath, filename: senderPath, loaded: true,
  exports: {
    isConfigured: () => false,
    isWindowOpen: async () => true,
    openWindow: async () => {},
    sendRaw: async () => ({ ok: true, skipped: true }),
    sendSequence: async (provider, messages, meta) => {
      sentMessages.push({ provider: provider.id, messages, meta });
      return { sent: messages.length };
    },
    atDailyCap: async () => false,
    randomPauseMs: () => 0,
  },
};

// Stub the AI parser to avoid calling Groq in tests
const parserPath = path.resolve(__dirname, '../src/services/aiParser.js');
require.cache[parserPath] = {
  id: parserPath, filename: parserPath, loaded: true,
  exports: { parseJob: async () => ({ title: 'stub', confidence: 0.9 }) },
};

// Stub whisper transcription
const whisperPath = path.resolve(__dirname, '../src/services/whisper.js');
require.cache[whisperPath] = {
  id: whisperPath, filename: whisperPath, loaded: true,
  exports: { transcribeAudio: async () => 'trabalho na Maria canalização' },
};

const { __internal: wa } = require('../src/routes/whatsapp');

function provider(overrides = {}) {
  return { id: 'p1', phone: '+351912345678', locale: 'pt-PT', trego_nickname: 'Trego', name: 'Carlos', ...overrides };
}

function resetMock() {
  mock.reset();
  sentMessages.length = 0;
  // Default provider lookup
  mock.when('FROM providers WHERE phone', [provider()]);
  // Default job insert: echo back a fresh row
  mock.when('INSERT INTO jobs', [{ id: 'j1', provider_id: 'p1', status: 'raw' }]);
  // Default SELECT on jobs after parse
  mock.when('SELECT ai_confidence, title, service, client_name', [{ ai_confidence: 0.85, title: 'canalização', service: 'canalização', client_name: 'Maria', scheduled_at: null, status: 'structured' }]);
}

test('bom dia → morning briefing handler triggers sendSequence', async () => {
  resetMock();
  mock.when('FROM jobs j', []); // no jobs today
  await wa.processMessage({ from: '+351912345678', type: 'text', text: { body: 'Bom dia Trego' } });
  assert.ok(sentMessages.length > 0, 'expected a briefing to be sent');
  const last = sentMessages.at(-1);
  assert.equal(last.meta.kind, 'morning_briefing');
  assert.ok(last.messages[0].toLowerCase().includes('bom dia'));
});

test('free text → createJobFromText inserts + sends confirm', async () => {
  resetMock();
  await wa.processMessage({
    from: '+351912345678',
    type: 'text',
    text: { body: 'trabalho na Maria sexta às 10 canalização' },
  });
  // Should have inserted into jobs + sent a confirmation sequence
  const insertedJob = mock.queries.some((q) => q.sql.includes('INSERT INTO jobs'));
  assert.ok(insertedJob, 'expected job insert');
  const confirm = sentMessages.find((m) => m.meta.kind === 'job_confirm');
  assert.ok(confirm, 'expected job_confirm message');
});

test('forwarded text → creates job with whatsapp_forward intake source', async () => {
  resetMock();
  await wa.processMessage({
    from: '+351912345678',
    type: 'text',
    text: { body: 'Preciso de canalizador, Rua do Ouro 45, esta semana' },
    context: { forwarded: true },
  });
  const insert = mock.queries.find((q) => q.sql.includes('INSERT INTO jobs'));
  assert.ok(insert, 'insert ran');
  assert.equal(insert.values[2], 'whatsapp_forward', 'intake_source = whatsapp_forward');
});

test('image with caption → parsed as job', async () => {
  resetMock();
  await wa.processMessage({
    from: '+351912345678',
    type: 'image',
    image: { id: 'm1', caption: 'Renovação cozinha Rua Augusta próxima semana' },
  });
  const insert = mock.queries.find((q) => q.sql.includes('INSERT INTO jobs'));
  assert.ok(insert);
  assert.equal(insert.values[2], 'whatsapp_image');
});

test('image without caption → asks for context (no job created)', async () => {
  resetMock();
  await wa.processMessage({
    from: '+351912345678',
    type: 'image',
    image: { id: 'm2', caption: '' },
  });
  const insert = mock.queries.find((q) => q.sql.includes('INSERT INTO jobs'));
  assert.equal(insert, undefined, 'no job insert');
  const ask = sentMessages.find((m) => m.meta.kind === 'image_no_context');
  assert.ok(ask);
});

test('unknown sender → no action taken', async () => {
  resetMock();
  mock.reset();
  mock.when('FROM providers WHERE phone', []);
  await wa.processMessage({ from: '+999999', type: 'text', text: { body: 'hi' } });
  assert.equal(sentMessages.length, 0);
});
