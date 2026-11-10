import { getDb, saveDb } from './_lib/store.mjs';
import { verifyToken } from './_lib/auth.mjs';
import { normalizeCode } from './_lib/normalize.mjs';
import { calculateTeamTimes } from './_lib/time.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const now = Date.now();
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  const payload = verifyToken(token);
  if (!payload || !payload.teamId || !payload.sid) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'signed_out', serverNowMs: now })
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { code, submissionId } = body;
  const db = getDb();
  const team = db.teams.find(t => t.id === payload.teamId);

  if (!team || team.sessionId !== payload.sid) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'signed_out', serverNowMs: now })
    };
  }

  // Idempotency check: if the submissionId was just processed, return the cached result
  if (submissionId && team.lastSubmissionId === submissionId && team.lastSubmissionResult) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...team.lastSubmissionResult,
        serverNowMs: now
      })
    };
  }

  // Check game status
  if (db.event.status === 'stopped' || team.status !== 'playing') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: 'closed',
        state: team.status,
        serverNowMs: now
      })
    };
  }

  // Check timer
  const timeInfo = calculateTeamTimes(team, now);
  if (timeInfo.timeLeftMs <= 0) {
    team.status = 'timeup';
    team.endReason = 'timeup';
    saveDb(db);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: 'closed',
        state: 'timeup',
        serverNowMs: now
      })
    };
  }

  // Check anti-spam lockout
  if (team.lockedUntilMs && now < team.lockedUntilMs) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: 'locked',
        lockedUntilMs: team.lockedUntilMs,
        serverNowMs: now
      })
    };
  }

  // Current clue
  const totalClues = team.clueOrder.length || 6;
  const currentIndex = team.currentIndex;
  if (currentIndex >= totalClues) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: 'closed',
        state: 'completed',
        serverNowMs: now
      })
    };
  }

  const currentClueId = team.clueOrder[currentIndex];
  const currentClue = db.clues.find(c => c.id === currentClueId);
  const normalizedInput = normalizeCode(code);
  const correctCode = normalizeCode(currentClue ? currentClue.code : '');

  const isCorrect = (normalizedInput.length > 0 && normalizedInput === correctCode);

  let result = 'wrong';
  if (isCorrect) {
    result = 'correct';
    team.solvedCount = (team.solvedCount || 0) + 1;
    team.currentIndex = currentIndex + 1;
    team.lastSolvedElapsedMs = timeInfo.elapsedMs;
    team.lastSolvedAtMs = now;
    team.recentWrongMs = []; // Reset anti-spam window on correct answer

    if (team.currentIndex >= totalClues) {
      team.status = 'completed';
      team.endReason = 'completed';
      team.finishedElapsedMs = timeInfo.elapsedMs;
    }
  } else {
    result = 'wrong';
    team.wrongCount = (team.wrongCount || 0) + 1;

    // Anti-spam calculation
    const lockoutConfig = db.event.lockout || { maxWrong: 5, windowSec: 60, lockSec: 30 };
    if (lockoutConfig.maxWrong > 0) {
      const windowCutoff = now - lockoutConfig.windowSec * 1000;
      team.recentWrongMs = (team.recentWrongMs || []).filter(ts => ts > windowCutoff);
      team.recentWrongMs.push(now);

      if (team.recentWrongMs.length >= lockoutConfig.maxWrong) {
        team.lockedUntilMs = now + lockoutConfig.lockSec * 1000;
        team.recentWrongMs = [];
        result = 'locked';
      }
    }
  }

  // Attempt logging
  const attemptRecord = {
    id: 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    teamId: team.id,
    teamName: team.name,
    clueId: currentClueId,
    clueTitle: currentClue ? currentClue.title : `Clue ${currentIndex + 1}`,
    entered: normalizedInput,
    result,
    tsMs: now,
    elapsedMs: timeInfo.elapsedMs
  };
  db.attempts.unshift(attemptRecord);
  if (db.attempts.length > 200) {
    db.attempts = db.attempts.slice(0, 200);
  }

  const responsePayload = {
    result,
    state: team.status,
    progress: {
      current: Math.min(team.currentIndex + 1, totalClues),
      total: totalClues
    },
    lockedUntilMs: team.lockedUntilMs || 0
  };

  team.lastSubmissionId = submissionId;
  team.lastSubmissionResult = responsePayload;
  team.lastActivityMs = now;

  saveDb(db);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...responsePayload,
      serverNowMs: now
    })
  };
}

