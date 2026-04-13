/**
 * WhatsApp webhook — Meta Cloud API
 *
 * Handles:
 *   - Text messages (job creation / queries / help / feedback)
 *   - Voice notes (download → Whisper → AI pipeline)
 *   - Images (caption → AI pipeline)
 *   - Forwarded messages
 *
 * Implements:
 *   - 24-hour session window tracking (Playbook §18)
 *   - Intent classification (Playbook §16)
 *   - Adaptive morning briefing on "Bom dia"
 *   - AI help for "Como funciona?" queries
 *   - Feedback capture
 *   - All inbound logged to conversations table
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const pool = require('../db');
const { parseJob } = require('../services/aiParser');
const { transcribeAudio } = require('../services/whisper');
const { classify, INTENTS } = require('../services/intentClassifier');
const { briefingForProvider } = require('../services/briefing');
const sender = require('../services/whatsappSender');

const router = express.Router();

// ── Meta webhook verification (GET) ────────────────────────────────────────
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

async function findProviderByPhone(fromPhone) {
  const withPlus = fromPhone.startsWith('+') ? fromPhone : `+${fromPhone}`;
  const { rows } = await pool.query(
    `SELECT * FROM providers WHERE phone = $1 OR phone = $2 LIMIT 1`,
    [withPlus, fromPhone]
  );
  return rows[0] || null;
}

async function downloadMedia(mediaId) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token || !mediaId) return null;
  try {
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) return null;
    const meta = await metaRes.json();
    if (!meta.url) return null;
    const binRes = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` } });
    if (!binRes.ok) return null;
    const buf = Buffer.from(await binRes.arrayBuffer());
    const ext = meta.mime_type?.includes('ogg') ? 'ogg'
              : meta.mime_type?.includes('mp4') ? 'mp4'
              : meta.mime_type?.includes('jpeg') || meta.mime_type?.includes('jpg') ? 'jpg'
              : 'bin';
    const tmpPath = path.join(os.tmpdir(), `wa_${Date.now()}_${mediaId}.${ext}`);
    fs.writeFileSync(tmpPath, buf);
    return { path: tmpPath, mimeType: meta.mime_type };
  } catch (err) {
    console.error('[WA] downloadMedia error:', err.message);
    return null;
  }
}

async function logInbound(providerId, o) {
  // Fail-soft: if Week 3 tables aren't yet migrated, still try to open the window.
  try {
    await pool.query(
      `INSERT INTO conversations
         (provider_id, direction, source, content_type, content, raw_text, media_url, intent, confidence, related_job_id, metadata)
       VALUES ($1, 'inbound', 'whatsapp', $2, $3, $4, $5, $6, $7, $8, $9)`,
      [providerId, o.contentType, o.content || null, o.rawText || null, o.mediaUrl || null,
       o.intent || null, o.confidence || null, o.relatedJobId || null, JSON.stringify(o.metadata || {})]
    );
  } catch (err) {
    console.warn('[WA] logInbound skipped (migrations pending?):', err.message);
  }
  try { await sender.openWindow(providerId); }
  catch (err) { console.warn('[WA] openWindow skipped:', err.message); }
}

// ── Action handlers ────────────────────────────────────────────────────────

async function handleBomDia(provider) {
  await pool.query(`UPDATE providers SET last_bom_dia_at = NOW() WHERE id = $1`, [provider.id]);
  const messages = await briefingForProvider(provider);
  await sender.sendSequence(provider, messages, { kind: 'morning_briefing', proactive: false });
}

async function handleScheduleQuery(provider) {
  const msgs = await briefingForProvider(provider);
  await sender.sendSequence(provider, msgs, { kind: 'schedule_response', proactive: false });
}

async function handleMoneyQuery(provider) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 7);
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS n, COALESCE(SUM(COALESCE(actual_price, price)), 0)::float AS total
     FROM jobs
     WHERE provider_id = $1 AND exec_status = 'completed' AND completed_at >= $2`,
    [provider.id, since]
  );
  const n = Number(rows[0].n);
  const total = Number(rows[0].total);
  const avg = n ? (total / n).toFixed(0) : 0;
  const isPT = (provider.locale || 'pt-PT').startsWith('pt');
  await sender.sendSequence(provider, [
    isPT ? `€${total.toFixed(0)} em ${n} trabalho${n === 1 ? '' : 's'} (últimos 7 dias)` : `€${total.toFixed(0)} across ${n} job${n === 1 ? '' : 's'} (last 7 days)`,
    isPT ? `Média: €${avg}` : `Average: €${avg}`,
  ], { kind: 'money_response', proactive: false });
}

async function handleSupport(provider, text) {
  const { rows } = await pool.query(
    `SELECT feature_key, help_steps_pt, help_steps_en, name_pt, name_en, deep_link, keywords_pt, keywords_en
     FROM feature_registry`
  );
  const isPT = (provider.locale || 'pt-PT').startsWith('pt');
  const lower = text.toLowerCase();
  let match = null;
  for (const f of rows) {
    const keys = (isPT ? f.keywords_pt : f.keywords_en) || [];
    if (keys.some((k) => lower.includes(k.toLowerCase()))) { match = f; break; }
  }
  if (!match) {
    await sender.sendSequence(provider, [
      isPT ? 'Hmm, isso ainda não sei fazer.' : "Hmm, can't do that yet.",
      isPT ? 'É algo que gostavas de ter no Trego? Ou queres falar com a equipa?' : 'Something you would like in Trego? Or flag to the team?',
    ], { kind: 'support_unknown', proactive: false });
    return;
  }
  const steps = (isPT ? match.help_steps_pt : match.help_steps_en) || [];
  const seq = [isPT ? 'Sem problema! Vamos lá:' : 'No problem! Here we go:'];
  steps.forEach((step, i) => seq.push(`${i + 1}️⃣ ${step}`));
  if (match.deep_link) seq.push(isPT ? `Experimenta agora: ${match.deep_link}` : `Try now: ${match.deep_link}`);
  await sender.sendSequence(provider, seq, { kind: 'support_walkthrough', proactive: false });
  await pool.query(
    `INSERT INTO provider_feature_status (provider_id, feature_key, status, help_requested_count, first_seen_at, updated_at)
     VALUES ($1, $2, 'struggling', 1, NOW(), NOW())
     ON CONFLICT (provider_id, feature_key)
     DO UPDATE SET help_requested_count = provider_feature_status.help_requested_count + 1,
                   status = CASE WHEN provider_feature_status.status = 'unknown' THEN 'struggling' ELSE provider_feature_status.status END,
                   updated_at = NOW()`,
    [provider.id, match.feature_key]
  );
}

async function handleOffTopic(provider) {
  const isPT = (provider.locale || 'pt-PT').startsWith('pt');
  await sender.sendSequence(provider, [
    isPT ? 'Isso já não é comigo 😄' : "That's above my pay grade 😄",
    isPT ? 'Manda-me o próximo trabalho!' : 'Send me the next job!',
  ], { kind: 'off_topic', proactive: false });
}

async function handleFeedback(provider, text) {
  await pool.query(
    `INSERT INTO feedback (provider_id, type, notes, source)
     VALUES ($1, 'whatsapp_message', $2, 'whatsapp')`,
    [provider.id, text]
  );
  const isPT = (provider.locale || 'pt-PT').startsWith('pt');
  await sender.sendSequence(provider, [
    isPT ? 'Anotado 👍' : 'Noted 👍',
    isPT ? 'Vou passar à equipa. Obrigado!' : "I'll pass it on. Thanks!",
  ], { kind: 'feedback_ack', proactive: false });
}

async function createJobFromText(provider, text, { intakeSource = 'whatsapp', metadata = {} } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO jobs (provider_id, raw_text, status, exec_status, intake_source)
     VALUES ($1, $2, 'raw', 'pending', $3) RETURNING *`,
    [provider.id, text, intakeSource]
  );
  const job = rows[0];
  try {
    await parseJob(job.id, text, provider.id, provider.fcm_token);
    const { rows: parsed } = await pool.query(
      `SELECT ai_confidence, title, service, client_name, scheduled_at, status FROM jobs WHERE id = $1`,
      [job.id]
    );
    const j = parsed[0];
    const isPT = (provider.locale || 'pt-PT').startsWith('pt');
    if (j.status === 'discarded') {
      await sender.sendSequence(provider, [
        isPT ? 'Hmm, não apanhei bem 🎤' : "Hmm, didn't catch that 🎤",
        isPT ? 'Tenta outra vez — escreve ou fala mais perto.' : 'Try again — type or speak closer.',
      ], { kind: 'low_conf', proactive: false, relatedJobId: job.id });
    } else if ((j.ai_confidence || 0) < 0.5) {
      const caught = [];
      if (j.service || j.title) caught.push(j.service || j.title);
      const missing = [];
      if (!j.client_name) missing.push(isPT ? 'nome do cliente' : 'client name');
      if (!j.scheduled_at) missing.push(isPT ? 'data' : 'date');
      const parts = [];
      if (caught.length) parts.push(`${isPT ? 'Apanhei' : 'Got'}: ${caught.join(', ')}.`);
      if (missing.length) parts.push(`${isPT ? 'Falta' : 'Missing'}: ${missing.join(', ')}.`);
      parts.push(isPT ? 'Podes completar?' : 'Can you fill in the rest?');
      await sender.sendSequence(provider, parts, { kind: 'low_conf', proactive: false, relatedJobId: job.id });
    } else {
      const svc = j.service || j.title;
      const when = j.scheduled_at ? new Date(j.scheduled_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : (isPT ? 'em breve' : 'soon');
      await sender.sendSequence(provider, [
        isPT ? `Apanhei ✅ ${svc || 'trabalho'} — ${j.client_name || 'cliente'} — ${when}` : `Got it ✅ ${svc || 'job'} — ${j.client_name || 'client'} — ${when}`,
        isPT ? 'Tudo certo? 👍 ou corrige.' : 'Looks right? 👍 or fix it.',
      ], { kind: 'job_confirm', proactive: false, relatedJobId: job.id });
    }
    return { jobId: job.id };
  } catch (err) {
    console.error(`[WA] AI parse failed job ${job.id}:`, err.message);
    return { jobId: job.id, error: err.message };
  }
}

// ── Main handler ───────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  res.sendStatus(200); // Meta needs <5s ack
  try { await processWebhook(req.body); }
  catch (err) { console.error('[WA] webhook error:', err); }
});

async function processWebhook(body) {
  const entries = body?.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      for (const msg of change?.value?.messages || []) {
        await processMessage(msg);
      }
    }
  }
}

async function processMessage(msg) {
  const fromPhone = msg.from;
  const provider = await findProviderByPhone(fromPhone);
  if (!provider) return;

  const isForwarded = !!(msg.context?.forwarded) || !!(msg.referral);
  const metadata = { forwarded: isForwarded, wa_message_id: msg.id };

  switch (msg.type) {
    case 'text': {
      const text = msg.text?.body || '';
      const { intent, confidence } = classify(text);
      await logInbound(provider.id, { contentType: 'text', content: text, intent, confidence, metadata });
      await routeText(provider, text, intent, { forwarded: isForwarded });
      break;
    }
    case 'audio':
    case 'voice': {
      const mediaId = msg.audio?.id || msg.voice?.id;
      const dl = mediaId ? await downloadMedia(mediaId) : null;
      let text = null;
      if (dl) {
        try { text = await transcribeAudio(dl.path); } catch (e) { console.error('[WA] transcribe:', e.message); }
        fs.unlink(dl.path, () => {});
      }
      const ann = text ? classify(text) : { intent: null, confidence: null };
      await logInbound(provider.id, {
        contentType: 'voice', rawText: text, mediaUrl: mediaId,
        intent: ann.intent, confidence: ann.confidence,
        metadata: { ...metadata, media_id: mediaId },
      });
      if (text) {
        if (ann.intent === INTENTS.BOM_DIA) { await handleBomDia(provider); break; }
        await createJobFromText(provider, text, { intakeSource: isForwarded ? 'whatsapp_forward' : 'whatsapp_voice', metadata });
      } else {
        const isPT = (provider.locale || 'pt-PT').startsWith('pt');
        await sender.sendSequence(provider, [
          isPT ? 'Não consegui ouvir bem 🎤' : "Couldn't hear that 🎤",
          isPT ? 'Podes mandar outra vez? Ou escreve.' : 'Send again? Or type.',
        ], { kind: 'voice_fail', proactive: false });
      }
      break;
    }
    case 'image': {
      const caption = msg.image?.caption || '';
      const mediaId = msg.image?.id;
      await logInbound(provider.id, {
        contentType: 'image', content: caption, mediaUrl: mediaId,
        intent: caption ? classify(caption).intent : INTENTS.PHOTO_ACTION,
        metadata: { ...metadata, media_id: mediaId },
      });
      const isPT = (provider.locale || 'pt-PT').startsWith('pt');
      if (caption && caption.length > 15) {
        await createJobFromText(provider, caption, { intakeSource: 'whatsapp_image', metadata });
      } else {
        await sender.sendSequence(provider, [
          isPT ? 'Boa foto!' : 'Nice photo!',
          isPT ? 'De que trabalho é?' : 'Which job is this for?',
        ], { kind: 'image_no_context', proactive: false });
      }
      break;
    }
    default: {
      await logInbound(provider.id, { contentType: 'system', content: `[${msg.type}]`, metadata });
      break;
    }
  }
}

async function routeText(provider, text, intent, { forwarded } = {}) {
  if (forwarded) return createJobFromText(provider, text, { intakeSource: 'whatsapp_forward' });
  switch (intent) {
    case INTENTS.BOM_DIA:        return handleBomDia(provider);
    case INTENTS.SCHEDULE_QUERY: return handleScheduleQuery(provider);
    case INTENTS.MONEY_QUERY:    return handleMoneyQuery(provider);
    case INTENTS.SUPPORT:        return handleSupport(provider, text);
    case INTENTS.OFF_TOPIC:      return handleOffTopic(provider);
    case INTENTS.FEEDBACK:
    case INTENTS.SUGGESTION:     return handleFeedback(provider, text);
    case INTENTS.PRICE_CAPTURE: {
      const { rows } = await pool.query(
        `SELECT id FROM jobs
         WHERE provider_id = $1 AND COALESCE(price, 0) = 0
           AND COALESCE(exec_status, '') IN ('on-site', 'completed', 'en-route', 'paused')
         ORDER BY updated_at DESC LIMIT 1`,
        [provider.id]
      );
      const match = text.match(/\d+([.,]\d+)?/);
      const price = match ? parseFloat(match[0].replace(',', '.')) : null;
      if (rows.length && price != null) {
        await pool.query(`UPDATE jobs SET actual_price = $2, updated_at = NOW() WHERE id = $1`, [rows[0].id, price]);
        await sender.sendSequence(provider, [`€${price} ✅`], { kind: 'price_captured', proactive: false, relatedJobId: rows[0].id });
      } else {
        return createJobFromText(provider, text);
      }
      return;
    }
    default:
      return createJobFromText(provider, text);
  }
}

module.exports = router;
module.exports.__internal = { findProviderByPhone, createJobFromText, processMessage, routeText };
