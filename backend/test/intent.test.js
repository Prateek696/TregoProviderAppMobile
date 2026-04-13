/**
 * Unit tests: intent classifier.
 * Run with: node --test test/intent.test.js
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classify, INTENTS } = require('../src/services/intentClassifier');

test('Bom dia trego → BOM_DIA', () => {
  assert.equal(classify('Bom dia Trego').intent, INTENTS.BOM_DIA);
  assert.equal(classify('bom dia Chefe').intent, INTENTS.BOM_DIA);
  assert.equal(classify('Boas Trego').intent, INTENTS.BOM_DIA);
  assert.equal(classify('Good morning Trego').intent, INTENTS.BOM_DIA);
});

test('pure number → PRICE_CAPTURE', () => {
  assert.equal(classify('85').intent, INTENTS.PRICE_CAPTURE);
  assert.equal(classify('€120').intent, INTENTS.PRICE_CAPTURE);
  assert.equal(classify('85,50').intent, INTENTS.PRICE_CAPTURE);
  assert.equal(classify('  85   ').intent, INTENTS.PRICE_CAPTURE);
});

test('schedule queries → SCHEDULE_QUERY', () => {
  assert.equal(classify('O que tenho amanhã?').intent, INTENTS.SCHEDULE_QUERY);
  assert.equal(classify("what's on tomorrow?").intent, INTENTS.SCHEDULE_QUERY);
  assert.equal(classify('Minha agenda').intent, INTENTS.SCHEDULE_QUERY);
});

test('money queries → MONEY_QUERY', () => {
  assert.equal(classify('Quanto ganhei esta semana?').intent, INTENTS.MONEY_QUERY);
  assert.equal(classify('how much have i earned this month').intent, INTENTS.MONEY_QUERY);
});

test('billing → BILLING_ACTION', () => {
  assert.equal(classify('manda fatura à Maria').intent, INTENTS.BILLING_ACTION);
  assert.equal(classify('create invoice for maria').intent, INTENTS.BILLING_ACTION);
});

test('support → SUPPORT', () => {
  assert.equal(classify('como gravo trabalhos?').intent, INTENTS.SUPPORT);
  assert.equal(classify('how do I add photos?').intent, INTENTS.SUPPORT);
  assert.equal(classify('ajuda').intent, INTENTS.SUPPORT);
});

test('suggestion → SUGGESTION', () => {
  assert.equal(classify('deviam ter um mapa').intent, INTENTS.SUGGESTION);
  assert.equal(classify('you should have a map').intent, INTENTS.SUGGESTION);
});

test('feedback → FEEDBACK', () => {
  assert.equal(classify('o parser errou').intent, INTENTS.FEEDBACK);
  assert.equal(classify("didn't get it right").intent, INTENTS.FEEDBACK);
});

test('job creation → JOB_CREATION', () => {
  assert.equal(classify('novo trabalho na Maria sexta às 10').intent, INTENTS.JOB_CREATION);
  assert.equal(classify('trabalho quinta em Alfama').intent, INTENTS.JOB_CREATION);
});

test('off-topic → OFF_TOPIC', () => {
  assert.equal(classify('o sporting jogou bem').intent, INTENTS.OFF_TOPIC);
});

test('garbage → UNKNOWN with low confidence', () => {
  const r = classify('jjj');
  assert.equal(r.intent, INTENTS.UNKNOWN);
  assert.ok(r.confidence <= 0.2);
});

test('empty/null input → UNKNOWN', () => {
  assert.equal(classify('').intent, INTENTS.UNKNOWN);
  assert.equal(classify(null).intent, INTENTS.UNKNOWN);
  assert.equal(classify(undefined).intent, INTENTS.UNKNOWN);
});

test('general work (canalização) → GENERAL_WORK fallback', () => {
  assert.equal(classify('maria canalizacao').intent, INTENTS.GENERAL_WORK);
});
