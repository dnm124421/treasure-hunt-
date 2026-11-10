import { getDb, saveDb } from './_lib/store.mjs';
import { normalizeCode } from './_lib/normalize.mjs';
import { signToken } from './_lib/auth.mjs';
import crypto from 'node:crypto';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const now = Date.now();
  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { code, force } = body;
  const normalized = normalizeCode(code);
  const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'local-client';
  const ipHash = crypto.createHash('md5').update(clientIp).digest('hex').slice(0, 12);

  const db = getDb();
  if (!db.loginAttempts) db.loginAttempts = {};

  const ipAttempt = db.loginAttempts[ipHash] || { windowStartMs: now, count: 0, lockedUntilMs: 0 };
  if (now < ipAttempt.lockedUntilMs) {
    const retryAfterSec = Math.ceil((ipAttempt.lockedUntilMs - now) / 1000);
    return {
      statusCode: 429,
      body: JSON.stringify({
        ok: false,
        reason: 'rate_limited',
        retryAfterSec,
        serverNowMs: now
      })
    };
  }

  if (now - ipAttempt.windowStartMs > 5 * 60 * 1000) {
    ipAttempt.windowStartMs = now;
    ipAttempt.count = 0;
  }

  // Admin trigger code check
  const adminTriggerCode = process.env.ADMIN_TRIGGER_CODE || 'DHRUV7';
  const adminEmails = (process.env.ADMIN_EMAILS || 'dnm124421@gmail.com').split(',').map(e => e.trim());
  
  // Use timing-safe comparison
  const normalizedTrigger = normalizeCode(adminTriggerCode);
  if (normalized.length > 0 && normalized.length === normalizedTrigger.length) {
    const a = Buffer.from(normalized);
    const b = Buffer.from(normalizedTrigger);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      // Mask the admin email for display
      const email = adminEmails[0] || '';
      const [user, domain] = email.split('@');
      const maskedEmail = user ? `${user[0]}${'•'.repeat(Math.max(0, user.length - 1))}@${domain}` : '';
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          admin: true,
          adminEmail: maskedEmail,
          serverNowMs: now
        })
      };
    }
  }

  // Find team by access code
  const team = db.teams.find(t => normalizeCode(t.accessCode) === normalized);

  if (!team) {
    ipAttempt.count++;
    if (ipAttempt.count >= 10) {
      ipAttempt.lockedUntilMs = now + 30 * 1000;
    }
    db.loginAttempts[ipHash] = ipAttempt;
    saveDb(db);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: false,
        reason: 'invalid',
        serverNowMs: now
      })
    };
  }

  // Team found
  ipAttempt.count = 0;
  db.loginAttempts[ipHash] = ipAttempt;

  // Check single-device rule
  if (team.sessionId && !force) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: false,
        reason: 'active_elsewhere',
        teamName: team.name,
        serverNowMs: now
      })
    };
  }

  // Assign fresh sessionId
  const sessionId = 'sid_' + crypto.randomUUID().slice(0, 12);
  team.sessionId = sessionId;
  team.lastActivityMs = now;
  saveDb(db);

  const token = signToken({ teamId: team.id, sid: sessionId });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      token,
      teamName: team.name,
      serverNowMs: now
    })
  };
}

