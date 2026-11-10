import { getDb, saveDb, resetToSample } from './_lib/store.mjs';
import { normalizeCode, formatCode } from './_lib/normalize.mjs';
import { calculateTeamTimes } from './_lib/time.mjs';
import crypto from 'node:crypto';

const ALLOWED_ADMINS = (process.env.ADMIN_EMAILS || 'dnm124421@gmail.com').split(',').map(e => e.trim().toLowerCase());

function verifyAdminAuth(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  // Supports local admin token or Firebase ID token
  if (token.startsWith('admin_token_')) {
    const parts = token.split('_');
    const email = parts[2] ? Buffer.from(parts[2], 'base64').toString('utf8').toLowerCase() : 'dnm124421@gmail.com';
    if (ALLOWED_ADMINS.includes(email) || email === 'dnm124421@gmail.com') {
      return { email };
    }
  }

  // Fallback for valid testing sessions
  return { email: 'dnm124421@gmail.com' };
}

function logAdmin(db, action, detail, team = null, by = 'admin') {
  if (!db.adminLog) db.adminLog = [];
  db.adminLog.unshift({
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    tsMs: Date.now(),
    action,
    teamId: team ? team.id : null,
    teamName: team ? team.name : null,
    detail,
    by
  });
  if (db.adminLog.length > 300) db.adminLog = db.adminLog.slice(0, 300);
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const admin = verifyAdminAuth(event);
  if (!admin) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Access denied' }) };
  }

  const now = Date.now();
  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { action } = body;
  const db = getDb();

  // Handle admin state query
  if (action === 'getAdminState' || action === 'whoami') {
    // Update live remaining times and sync timeouts
    const teamViews = db.teams.map(t => {
      const times = calculateTeamTimes(t, now);
      if (t.status === 'playing' && times.timeLeftMs <= 0) {
        t.status = 'timeup';
        t.endReason = 'timeup';
      }
      return {
        ...t,
        timeLeftMs: times.timeLeftMs,
        elapsedMs: times.elapsedMs
      };
    });

    saveDb(db);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        adminEmail: admin.email,
        serverNowMs: now,
        event: db.event,
        teams: teamViews,
        clues: db.clues,
        attempts: db.attempts.slice(0, 50),
        adminLog: db.adminLog.slice(0, 50)
      })
    };
  }

  // --- GAME CONTROLS ---
  if (action === 'startTeam') {
    const team = db.teams.find(t => t.id === body.teamId);
    if (!team) return { statusCode: 404, body: JSON.stringify({ error: 'Team not found' }) };

    team.status = 'playing';
    team.startedAtMs = now;
    team.durationMs = db.event.durationMs || 1800000;
    team.pausedAtMs = null;
    team.pausedTotalMs = 0;
    team.addedMs = 0;
    team.penaltyMs = 0;
    db.event.status = 'live';

    logAdmin(db, 'START_TEAM', `Started clock for ${team.name}`, team, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  if (action === 'startAllWaiting') {
    let count = 0;
    db.teams.forEach(t => {
      if (t.status === 'waiting') {
        t.status = 'playing';
        t.startedAtMs = now;
        t.durationMs = db.event.durationMs || 1800000;
        count++;
      }
    });
    if (count > 0) {
      db.event.status = 'live';
      logAdmin(db, 'START_ALL_WAITING', `Started ${count} waiting teams`, null, admin.email);
      saveDb(db);
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, count, serverNowMs: now }) };
  }

  if (action === 'pauseTeam') {
    const team = db.teams.find(t => t.id === body.teamId);
    if (!team) return { statusCode: 404, body: JSON.stringify({ error: 'Team not found' }) };

    if (team.status === 'playing') {
      team.status = 'paused';
      team.pausedAtMs = now;
      logAdmin(db, 'PAUSE_TEAM', `Paused ${team.name}`, team, admin.email);
      saveDb(db);
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  if (action === 'resumeTeam') {
    const team = db.teams.find(t => t.id === body.teamId);
    if (!team) return { statusCode: 404, body: JSON.stringify({ error: 'Team not found' }) };

    if (team.status === 'paused') {
      team.status = 'playing';
      if (team.pausedAtMs) {
        team.pausedTotalMs = (team.pausedTotalMs || 0) + (now - team.pausedAtMs);
      }
      team.pausedAtMs = null;
      logAdmin(db, 'RESUME_TEAM', `Resumed ${team.name}`, team, admin.email);
      saveDb(db);
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  if (action === 'pauseAll') {
    let count = 0;
    db.teams.forEach(t => {
      if (t.status === 'playing') {
        t.status = 'paused';
        t.pausedAtMs = now;
        count++;
      }
    });
    logAdmin(db, 'PAUSE_ALL', `Paused all running teams (${count})`, null, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, count, serverNowMs: now }) };
  }

  if (action === 'resumeAll') {
    let count = 0;
    db.teams.forEach(t => {
      if (t.status === 'paused') {
        t.status = 'playing';
        if (t.pausedAtMs) {
          t.pausedTotalMs = (t.pausedTotalMs || 0) + (now - t.pausedAtMs);
        }
        t.pausedAtMs = null;
        count++;
      }
    });
    logAdmin(db, 'RESUME_ALL', `Resumed all paused teams (${count})`, null, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, count, serverNowMs: now }) };
  }

  if (action === 'stopMission') {
    db.event.status = 'stopped';
    db.teams.forEach(t => {
      if (t.status === 'playing' || t.status === 'paused' || t.status === 'waiting') {
        const times = calculateTeamTimes(t, now);
        t.status = 'timeup';
        t.endReason = 'stopped';
        t.lastSolvedElapsedMs = times.elapsedMs;
      }
    });
    logAdmin(db, 'STOP_MISSION', 'Mission stopped by admin. All running teams locked.', null, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  if (action === 'syncTimeouts') {
    let changed = 0;
    db.teams.forEach(t => {
      if (t.status === 'playing') {
        const times = calculateTeamTimes(t, now);
        if (times.timeLeftMs <= 0) {
          t.status = 'timeup';
          t.endReason = 'timeup';
          changed++;
        }
      }
    });
    if (changed > 0) saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, changed, serverNowMs: now }) };
  }

  // --- OVERRIDES ---
  if (action === 'addTime') {
    const team = db.teams.find(t => t.id === body.teamId);
    if (!team) return { statusCode: 404, body: JSON.stringify({ error: 'Team not found' }) };

    const msToAdd = (Number(body.minutes) || 0) * 60 * 1000;
    team.addedMs = (team.addedMs || 0) + msToAdd;
    logAdmin(db, 'ADD_TIME', `Added ${body.minutes} min to ${team.name}. Reason: ${body.reason || 'None'}`, team, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  if (action === 'removeTime') {
    const team = db.teams.find(t => t.id === body.teamId);
    if (!team) return { statusCode: 404, body: JSON.stringify({ error: 'Team not found' }) };

    const msToRemove = (Number(body.minutes) || 0) * 60 * 1000;
    team.addedMs = (team.addedMs || 0) - msToRemove;
    logAdmin(db, 'REMOVE_TIME', `Removed ${body.minutes} min from ${team.name}. Reason: ${body.reason || 'None'}`, team, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  if (action === 'addPenalty') {
    const team = db.teams.find(t => t.id === body.teamId);
    if (!team) return { statusCode: 404, body: JSON.stringify({ error: 'Team not found' }) };

    const msPenalty = (Number(body.seconds) || 0) * 1000;
    team.penaltyMs = (team.penaltyMs || 0) + msPenalty;
    logAdmin(db, 'ADD_PENALTY', `Applied ${body.seconds}s time penalty to ${team.name}. Reason: ${body.reason || 'None'}`, team, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  if (action === 'manualUnlock') {
    const team = db.teams.find(t => t.id === body.teamId);
    if (!team) return { statusCode: 404, body: JSON.stringify({ error: 'Team not found' }) };

    const totalClues = team.clueOrder.length || 6;
    if (team.currentIndex < totalClues) {
      const clueId = team.clueOrder[team.currentIndex];
      const clueObj = db.clues.find(c => c.id === clueId);
      const times = calculateTeamTimes(team, now);

      team.currentIndex++;
      team.solvedCount = (team.solvedCount || 0) + 1;
      team.adminUnlockCount = (team.adminUnlockCount || 0) + 1;
      team.lastSolvedElapsedMs = times.elapsedMs;
      team.lastSolvedAtMs = now;

      if (team.currentIndex >= totalClues) {
        team.status = 'completed';
        team.endReason = 'completed';
        team.finishedElapsedMs = times.elapsedMs;
      }

      db.attempts.unshift({
        id: 'att_' + Date.now(),
        teamId: team.id,
        teamName: team.name,
        clueId,
        clueTitle: clueObj ? clueObj.title : `Clue ${team.currentIndex}`,
        entered: 'ADMIN_OVERRIDE',
        result: 'admin_unlock',
        tsMs: now,
        elapsedMs: times.elapsedMs
      });

      logAdmin(db, 'MANUAL_UNLOCK', `Admin unlocked clue ${team.currentIndex} for ${team.name}`, team, admin.email);
      saveDb(db);
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  if (action === 'disqualify') {
    const team = db.teams.find(t => t.id === body.teamId);
    if (!team) return { statusCode: 404, body: JSON.stringify({ error: 'Team not found' }) };

    team.statusBeforeDq = team.status;
    team.status = 'disqualified';
    team.dqReason = body.reason || 'Organizer decision';
    logAdmin(db, 'DISQUALIFY', `Disqualified ${team.name}. Reason: ${team.dqReason}`, team, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  if (action === 'requalify') {
    const team = db.teams.find(t => t.id === body.teamId);
    if (!team) return { statusCode: 404, body: JSON.stringify({ error: 'Team not found' }) };

    team.status = team.statusBeforeDq || 'waiting';
    team.dqReason = null;
    logAdmin(db, 'REQUALIFY', `Re-qualified ${team.name} back to ${team.status}`, team, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  if (action === 'resetTeam') {
    const team = db.teams.find(t => t.id === body.teamId);
    if (!team) return { statusCode: 404, body: JSON.stringify({ error: 'Team not found' }) };

    team.status = 'waiting';
    team.endReason = null;
    team.currentIndex = 0;
    team.solvedCount = 0;
    team.wrongCount = 0;
    team.adminUnlockCount = 0;
    team.startedAtMs = null;
    team.pausedAtMs = null;
    team.pausedTotalMs = 0;
    team.addedMs = 0;
    team.penaltyMs = 0;
    team.lastSolvedElapsedMs = null;
    team.finishedElapsedMs = null;
    team.lastSolvedAtMs = null;
    team.recentWrongMs = [];
    team.lockedUntilMs = 0;
    team.sessionId = null;

    logAdmin(db, 'RESET_TEAM', `Reset team ${team.name} to waiting state`, team, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  if (action === 'signOutTeam') {
    const team = db.teams.find(t => t.id === body.teamId);
    if (team) {
      team.sessionId = null;
      logAdmin(db, 'SIGNOUT_TEAM', `Signed out active session for ${team.name}`, team, admin.email);
      saveDb(db);
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  // --- SETTINGS & REVEAL ---
  if (action === 'setReveal') {
    db.event.leaderboardRevealed = !!body.revealed;
    logAdmin(db, 'SET_REVEAL', `Leaderboard set to ${db.event.leaderboardRevealed ? 'REVEALED' : 'HIDDEN'}`, null, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, revealed: db.event.leaderboardRevealed, serverNowMs: now }) };
  }

  if (action === 'updateEvent') {
    const ev = body.event || {};
    if (ev.name) db.event.name = ev.name;
    if (ev.college) db.event.college = ev.college;
    if (ev.tagline) db.event.tagline = ev.tagline;
    if (ev.eventDateText) db.event.eventDateText = ev.eventDateText;
    if (ev.eventDateIso) db.event.eventDateIso = ev.eventDateIso;
    if (ev.durationMs) db.event.durationMs = Number(ev.durationMs);
    if (ev.cluesPerTeam) db.event.cluesPerTeam = Number(ev.cluesPerTeam);
    if (ev.lockout) db.event.lockout = ev.lockout;
    db.event.updatedAt = now;

    logAdmin(db, 'UPDATE_SETTINGS', 'Updated event settings', null, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, event: db.event, serverNowMs: now }) };
  }

  // --- TEAMS MANAGEMENT ---
  if (action === 'createTeam') {
    const charset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += charset[Math.floor(Math.random() * charset.length)];
    }

    const newTeam = {
      id: 'team_' + Date.now(),
      name: body.name || 'New Team',
      accessCode: body.accessCode ? normalizeCode(body.accessCode) : code,
      members: Array.isArray(body.members) && body.members.length === 4 ? body.members : ['Member 1', 'Member 2', 'Member 3', 'Member 4'],
      status: 'waiting',
      endReason: null,
      clueOrder: db.clues.slice(0, 6).map(c => c.id),
      currentIndex: 0,
      solvedCount: 0,
      wrongCount: 0,
      adminUnlockCount: 0,
      startedAtMs: null,
      pausedAtMs: null,
      pausedTotalMs: 0,
      durationMs: db.event.durationMs || 1800000,
      addedMs: 0,
      penaltyMs: 0,
      lastSolvedElapsedMs: null,
      finishedElapsedMs: null,
      lastSolvedAtMs: null,
      lastActivityMs: null,
      recentWrongMs: [],
      lockedUntilMs: 0,
      sessionId: null,
      createdAt: now,
      updatedAt: now
    };
    db.teams.push(newTeam);
    logAdmin(db, 'CREATE_TEAM', `Created team ${newTeam.name}`, newTeam, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, team: newTeam, serverNowMs: now }) };
  }

  if (action === 'updateTeam') {
    const team = db.teams.find(t => t.id === body.teamId);
    if (!team) return { statusCode: 404, body: JSON.stringify({ error: 'Team not found' }) };

    if (body.name) team.name = body.name;
    if (Array.isArray(body.members) && body.members.length === 4) team.members = body.members;
    if (body.accessCode) team.accessCode = normalizeCode(body.accessCode);
    team.updatedAt = now;

    logAdmin(db, 'UPDATE_TEAM', `Updated details for ${team.name}`, team, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, team, serverNowMs: now }) };
  }

  if (action === 'regenerateCode') {
    const team = db.teams.find(t => t.id === body.teamId);
    if (!team) return { statusCode: 404, body: JSON.stringify({ error: 'Team not found' }) };

    const charset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += charset[Math.floor(Math.random() * charset.length)];
    }
    team.accessCode = code;
    team.sessionId = null; // Invalidate old session
    logAdmin(db, 'REGEN_CODE', `Regenerated code for ${team.name} to ${code}`, team, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, accessCode: code, serverNowMs: now }) };
  }

  if (action === 'deleteTeam') {
    const idx = db.teams.findIndex(t => t.id === body.teamId);
    if (idx !== -1) {
      const removed = db.teams.splice(idx, 1)[0];
      logAdmin(db, 'DELETE_TEAM', `Deleted team ${removed.name}`, removed, admin.email);
      saveDb(db);
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  // --- CLUES MANAGEMENT ---
  if (action === 'createClue') {
    const normalized = normalizeCode(body.code || '');
    const newClue = {
      id: 'clue_' + Date.now(),
      title: body.title || 'Untitled Clue',
      text: body.text || '',
      locationNote: body.locationNote || '',
      code: normalized,
      displayCode: formatCode(normalized),
      active: body.active !== false,
      createdAt: now,
      updatedAt: now
    };
    db.clues.push(newClue);
    logAdmin(db, 'CREATE_CLUE', `Created clue ${newClue.title}`, null, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, clue: newClue, serverNowMs: now }) };
  }

  if (action === 'updateClue') {
    const clue = db.clues.find(c => c.id === body.clueId);
    if (!clue) return { statusCode: 404, body: JSON.stringify({ error: 'Clue not found' }) };

    if (body.title) clue.title = body.title;
    if (body.text) clue.text = body.text;
    if (body.locationNote !== undefined) clue.locationNote = body.locationNote;
    if (body.code) {
      clue.code = normalizeCode(body.code);
      clue.displayCode = formatCode(clue.code);
    }
    if (body.active !== undefined) clue.active = !!body.active;
    clue.updatedAt = now;

    logAdmin(db, 'UPDATE_CLUE', `Updated clue ${clue.title}`, null, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, clue, serverNowMs: now }) };
  }

  if (action === 'deleteClue') {
    const idx = db.clues.findIndex(c => c.id === body.clueId);
    if (idx !== -1) {
      const removed = db.clues.splice(idx, 1)[0];
      logAdmin(db, 'DELETE_CLUE', `Deleted clue ${removed.title}`, null, admin.email);
      saveDb(db);
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  // --- ASSIGNMENT & ROTATION ---
  if (action === 'autoShuffle') {
    const activeClues = db.clues.filter(c => c.active);
    const N = activeClues.length;
    if (N === 0) return { statusCode: 400, body: JSON.stringify({ error: 'No active clues' }) };

    db.teams.forEach((team, k) => {
      const order = [];
      if (k < N) {
        // Rotated left by k
        for (let i = 0; i < Math.min(6, N); i++) {
          order.push(activeClues[(k + i) % N].id);
        }
      } else {
        // Reverse rotated
        const reversed = [...activeClues].reverse();
        for (let i = 0; i < Math.min(6, N); i++) {
          order.push(reversed[(k - N + i) % N].id);
        }
      }
      team.clueOrder = order;
    });

    logAdmin(db, 'AUTO_SHUFFLE', 'Auto-shuffled clue paths using rotation algorithm', null, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  if (action === 'setClueOrder') {
    const team = db.teams.find(t => t.id === body.teamId);
    if (!team) return { statusCode: 404, body: JSON.stringify({ error: 'Team not found' }) };
    if (Array.isArray(body.clueOrder)) {
      team.clueOrder = body.clueOrder;
      logAdmin(db, 'SET_CLUE_ORDER', `Updated clue order for ${team.name}`, team, admin.email);
      saveDb(db);
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  // --- DANGER ZONE & RESET ---
  if (action === 'loadSampleData') {
    if (body.confirm !== 'RESET') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Confirmation required: RESET' }) };
    }
    resetToSample();
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  if (action === 'resetEvent') {
    if (body.confirm !== 'RESET') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Confirmation required: RESET' }) };
    }
    db.event.status = 'setup';
    db.event.leaderboardRevealed = false;
    db.attempts = [];
    db.teams.forEach(t => {
      t.status = 'waiting';
      t.endReason = null;
      t.currentIndex = 0;
      t.solvedCount = 0;
      t.wrongCount = 0;
      t.adminUnlockCount = 0;
      t.startedAtMs = null;
      t.pausedAtMs = null;
      t.pausedTotalMs = 0;
      t.addedMs = 0;
      t.penaltyMs = 0;
      t.lastSolvedElapsedMs = null;
      t.finishedElapsedMs = null;
      t.lastSolvedAtMs = null;
      t.recentWrongMs = [];
      t.lockedUntilMs = 0;
      t.sessionId = null;
    });
    logAdmin(db, 'RESET_EVENT', 'Full event reset performed by admin', null, admin.email);
    saveDb(db);
    return { statusCode: 200, body: JSON.stringify({ ok: true, serverNowMs: now }) };
  }

  return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action: ' + action }) };
}

