import { getDb, saveDb } from './_lib/store.mjs';
import { verifyToken } from './_lib/auth.mjs';
import { calculateTeamTimes } from './_lib/time.mjs';

export async function handler(event) {
  const now = Date.now();
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  const payload = verifyToken(token);
  if (!payload || !payload.teamId || !payload.sid) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'signed_out', serverNowMs: now })
    };
  }

  const db = getDb();
  const team = db.teams.find(t => t.id === payload.teamId);

  if (!team || team.sessionId !== payload.sid) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'signed_out', serverNowMs: now })
    };
  }

  // Update activity
  team.lastActivityMs = now;

  // Calculate timer and check lazy timeout
  const timeInfo = calculateTeamTimes(team, now);
  if (team.status === 'playing' && timeInfo.timeLeftMs <= 0) {
    team.status = 'timeup';
    team.endReason = 'timeup';
    saveDb(db);
  }

  // Event level stop check
  let effectiveState = team.status;
  if (db.event.status === 'stopped' && (team.status === 'playing' || team.status === 'paused' || team.status === 'waiting')) {
    effectiveState = 'stopped';
  }

  // Total clues
  const totalClues = team.clueOrder.length || 6;
  const currentIndex = team.currentIndex;

  // Solved list (titles only)
  const solved = [];
  for (let i = 0; i < currentIndex; i++) {
    const clueId = team.clueOrder[i];
    const cObj = db.clues.find(c => c.id === clueId);
    solved.push({
      number: i + 1,
      title: cObj ? cObj.title : `Clue ${i + 1}`
    });
  }

  // Current clue
  let currentClue = null;
  if (currentIndex < totalClues && (effectiveState === 'playing' || effectiveState === 'paused')) {
    const clueId = team.clueOrder[currentIndex];
    const cObj = db.clues.find(c => c.id === clueId);
    if (cObj) {
      currentClue = {
        number: currentIndex + 1,
        text: cObj.text
      };
    }
  }

  const finished = (team.status === 'completed' || team.status === 'timeup' || effectiveState === 'stopped') ? {
    elapsedMs: team.finishedElapsedMs || team.lastSolvedElapsedMs || timeInfo.elapsedMs,
    solved: team.solvedCount || 0
  } : null;

  saveDb(db);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serverNowMs: now,
      state: effectiveState,
      teamName: team.name,
      timer: {
        timeLeftMs: timeInfo.timeLeftMs,
        frozen: timeInfo.frozen
      },
      progress: {
        current: Math.min(currentIndex + 1, totalClues),
        total: totalClues
      },
      clue: currentClue,
      solved,
      lockedUntilMs: team.lockedUntilMs || 0,
      finished
    })
  };
}

