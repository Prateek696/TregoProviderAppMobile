/**
 * Adaptive Morning Briefing — Playbook Section 2.1
 * 1-2 jobs → fully conversational, each job gets its own message
 * 3-4 jobs → paired (2 jobs per message)
 * 5+ jobs → summary + first stop + deep link to the app
 * 0 jobs → one free-day line
 */

const pool = require('../db');

const EUR = (n) => `€${Number(n).toFixed(0)}`;
const TIME = (d) => {
  if (!d) return 'TBD';
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

async function todaysJobs(providerId, at = new Date()) {
  const start = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate(), 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const { rows } = await pool.query(
    `SELECT j.id, j.title, j.service, j.category, j.address, j.location,
            j.scheduled_at, j.price, j.estimated_duration_minutes,
            c.name AS client_name
     FROM jobs j
     LEFT JOIN clients c ON j.client_id = c.id
     WHERE j.provider_id = $1
       AND j.scheduled_at >= $2 AND j.scheduled_at < $3
       AND COALESCE(j.exec_status, 'pending') NOT IN ('cancelled', 'completed')
       AND COALESCE(j.status, 'raw') != 'discarded'
     ORDER BY j.scheduled_at ASC`,
    [providerId, start, end]
  );
  return rows;
}

function buildBriefing(name, jobs, { locale = 'pt-PT', nickname = 'Trego' } = {}) {
  const isPT = (locale || 'pt-PT').startsWith('pt');
  const greeting = isPT ? `Bom dia ${name} ☀️` : `Morning ${name} ☀️`;
  const messages = [greeting];

  if (!jobs.length) {
    messages.push(isPT ? 'Dia livre. À espera de chamadas ou descanso?' : 'Free day. Expecting calls or resting?');
    return messages;
  }

  const total = jobs.reduce((s, j) => s + Number(j.price || 0), 0);
  const potencial = total > 0 ? (isPT ? `${EUR(total)} potencial.` : `${EUR(total)} potential.`) : null;

  if (jobs.length <= 2) {
    // fully conversational — each job its own message
    messages.push(isPT ? `${jobs.length} trabalho${jobs.length > 1 ? 's' : ''} hoje:` : `${jobs.length} job${jobs.length > 1 ? 's' : ''} today:`);
    for (const j of jobs) {
      const when = TIME(j.scheduled_at);
      const client = j.client_name || (isPT ? 'cliente' : 'client');
      const where = j.address || j.location || '';
      const svc = j.service || j.title || (isPT ? 'trabalho' : 'job');
      const price = j.price ? ` ~${EUR(j.price)}` : '';
      messages.push(`${when} — ${client}, ${where}. ${svc}.${price}`.trim());
    }
    if (potencial) messages.push(isPT ? `${potencial} Bora 💪` : `${potencial} Let's go 💪`);
  } else if (jobs.length <= 4) {
    // paired: 2 per line
    messages.push(isPT ? `Dia cheio — ${jobs.length} trabalhos!` : `Full day — ${jobs.length} jobs!`);
    for (let i = 0; i < jobs.length; i += 2) {
      const row = jobs.slice(i, i + 2).map((j) => {
        const client = j.client_name || 'cliente';
        const svc = j.service || j.title || '';
        const price = j.price ? ` ~${EUR(j.price)}` : '';
        return `${TIME(j.scheduled_at)} ${client} — ${svc}${price}`.trim();
      }).join('  |  ');
      messages.push(row);
    }
    if (potencial) messages.push(isPT ? `${potencial} 💪` : `${potencial} 💪`);
  } else {
    // 5+ — summary + first stop + app deep link
    messages.push(isPT
      ? `Dia pesado — ${jobs.length} trabalhos!${total > 0 ? ' ' + EUR(total) + ' potencial.' : ''}`
      : `Big day — ${jobs.length} jobs!${total > 0 ? ' ' + EUR(total) + ' potential.' : ''}`);
    const first = jobs[0];
    const client = first.client_name || 'cliente';
    messages.push(isPT
      ? `Primeiro: ${client} às ${TIME(first.scheduled_at)}${first.address ? ', ' + first.address : ''}.`
      : `First stop: ${client} at ${TIME(first.scheduled_at)}${first.address ? ', ' + first.address : ''}.`);
    messages.push(isPT ? 'Dia completo no app 👉 trego.app/jobs' : 'See your full day in the app 👉 trego.app/jobs');
  }

  return messages;
}

/**
 * Build morning briefing messages for a provider. Returns plain-text sequence.
 */
async function briefingForProvider(provider, at = new Date()) {
  const jobs = await todaysJobs(provider.id, at);
  return buildBriefing(provider.name || 'amigo', jobs, {
    locale: provider.locale,
    nickname: provider.trego_nickname,
  });
}

module.exports = { briefingForProvider, buildBriefing, todaysJobs };
