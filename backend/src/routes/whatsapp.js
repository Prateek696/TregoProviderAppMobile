const express = require('express');
const pool = require('../db');
const { parseJob } = require('../services/aiParser');

const router = express.Router();

// Webhook verification — Meta sends a GET to verify the endpoint
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

/**
 * Send a WhatsApp reply via Meta Cloud API.
 * Requires WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env.
 * Silently skips if credentials are not yet configured (pending Meta verification).
 */
async function sendWhatsAppReply(to, text) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return; // not yet configured

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        }),
      }
    );
    if (!response.ok) {
      const err = await response.text();
      console.error('WhatsApp reply error:', err);
    }
  } catch (err) {
    console.error('WhatsApp reply send error:', err.message);
  }
}

// Incoming message webhook
// POST /api/webhook/whatsapp
router.post('/', async (req, res) => {
  // Acknowledge immediately — Meta requires 200 within 5 seconds
  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (!message) return;

    // Only handle text messages for now (voice note support requires Groq Whisper via URL)
    if (message.type !== 'text') return;

    const fromPhone = message.from; // e.g. "351912345678"
    const text = message.text?.body;
    if (!text) return;

    // Find provider by phone number
    const normalizedPhone = fromPhone.startsWith('351') ? `+${fromPhone}` : fromPhone;
    const { rows } = await pool.query(
      `SELECT * FROM providers WHERE phone = $1`,
      [normalizedPhone]
    );

    if (!rows.length) {
      console.log(`WhatsApp message from unknown number: ${fromPhone}`);
      return;
    }

    const provider = rows[0];

    // Create raw job with whatsapp intake source
    const { rows: jobRows } = await pool.query(
      `INSERT INTO jobs (provider_id, raw_text, status, exec_status, intake_source)
       VALUES ($1, $2, 'raw', 'pending', 'whatsapp')
       RETURNING *`,
      [provider.id, text]
    );
    const job = jobRows[0];

    // Run AI pipeline — then check confidence for low-confidence reply (4.8)
    try {
      await parseJob(job.id, text, provider.id, provider.fcm_token);

      // Re-fetch the job to get ai_confidence after parsing
      const { rows: parsed } = await pool.query(
        `SELECT ai_confidence, title, service, client_name, scheduled_at
         FROM jobs WHERE id = $1`,
        [job.id]
      );

      if (parsed.length) {
        const j = parsed[0];
        const confidence = j.ai_confidence || 0;

        if (confidence < 0.5) {
          // Build a partial-info reply asking for the missing pieces
          const caught = [];
          if (j.service || j.title) caught.push(j.service || j.title);
          const missing = [];
          if (!j.client_name) missing.push('client name');
          if (!j.scheduled_at) missing.push('date');
          if (!j.service && !j.title) missing.push('service type');

          const replyParts = [];
          if (caught.length) replyParts.push(`I caught: ${caught.join(', ')}.`);
          if (missing.length) replyParts.push(`Missing: ${missing.join(', ')}.`);
          replyParts.push('Can you add the details?');

          await sendWhatsAppReply(fromPhone, replyParts.join(' '));
        }
      }
    } catch (err) {
      console.error(`WhatsApp AI parse failed for job ${job.id}:`, err.message);
    }
  } catch (err) {
    console.error('WhatsApp webhook error:', err.message);
  }
});

module.exports = router;
