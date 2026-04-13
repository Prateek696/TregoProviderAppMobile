/**
 * Unit tests: adaptive briefing builder.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildBriefing } = require('../src/services/briefing');

function mkJob(hh, mm, client, service, address, price) {
  return {
    scheduled_at: new Date(Date.UTC(2026, 3, 15, hh, mm)),
    client_name: client,
    service,
    address,
    price,
  };
}

test('zero jobs → single "dia livre" message', () => {
  const m = buildBriefing('Carlos', []);
  assert.ok(m[0].startsWith('Bom dia'));
  assert.ok(m.some((x) => x.toLowerCase().includes('dia livre')));
});

test('1 job → full detail conversational', () => {
  const m = buildBriefing('Carlos', [mkJob(9, 0, 'Maria', 'torneira', 'Rua Augusta 47', 80)]);
  assert.ok(m.length >= 3);
  assert.ok(m[0].includes('Bom dia Carlos'));
  assert.ok(m.some((x) => x.includes('Maria')));
  assert.ok(m.some((x) => x.includes('Rua Augusta 47')));
});

test('2 jobs → two detail lines + potencial', () => {
  const m = buildBriefing('Carlos', [
    mkJob(9, 0, 'Maria', 'torneira', 'Rua A', 80),
    mkJob(14, 0, 'João', 'caldeira', 'Av B', 120),
  ]);
  const maria = m.some((x) => x.includes('Maria'));
  const joao = m.some((x) => x.includes('João'));
  const total = m.some((x) => x.includes('200') && x.toLowerCase().includes('potencial'));
  assert.ok(maria && joao && total);
});

test('4 jobs → paired lines', () => {
  const jobs = [
    mkJob(9, 0, 'A', 's1', 'x', 50),
    mkJob(11, 0, 'B', 's2', 'y', 60),
    mkJob(14, 0, 'C', 's3', 'z', 70),
    mkJob(16, 0, 'D', 's4', 'w', 80),
  ];
  const m = buildBriefing('Carlos', jobs);
  // should have paired rows (A + B on one line, C + D on another)
  const pairedAB = m.some((x) => x.includes('A') && x.includes('B'));
  const pairedCD = m.some((x) => x.includes('C') && x.includes('D'));
  assert.ok(pairedAB && pairedCD, 'expected paired rows');
});

test('6 jobs → summary + first + app link', () => {
  const jobs = [];
  for (let i = 0; i < 6; i++) jobs.push(mkJob(9 + i, 0, `Client${i}`, 's', 'addr', 50));
  const m = buildBriefing('Carlos', jobs);
  assert.ok(m.some((x) => x.includes('Dia pesado')));
  assert.ok(m.some((x) => x.toLowerCase().includes('primeiro')));
  assert.ok(m.some((x) => x.includes('trego.app/jobs')));
});

test('EN locale uses English greeting', () => {
  const m = buildBriefing('Carlos', [], { locale: 'en-US' });
  assert.ok(m[0].includes('Morning'));
});
