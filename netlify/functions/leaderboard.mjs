import { getDb } from './_lib/store.mjs';
import { rankTeams } from './_lib/rank.mjs';

export async function handler(event) {
  const db = getDb();
  const ev = db.event || {};
  const now = Date.now();
  const teamsCount = (db.teams || []).length;
  const cluesPerTeam = ev.cluesPerTeam || 6;

  if (!ev.leaderboardRevealed) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        revealed: false,
        status: ev.status || 'setup',
        teamsCount,
        cluesPerTeam,
        serverNowMs: now
      })
    };
  }

  // If revealed, compute ranking
  const ranked = rankTeams(db.teams || []);
  const rows = ranked.map(t => {
    const timeMs = (t.status === 'completed' && t.finishedElapsedMs != null)
      ? t.finishedElapsedMs
      : (t.lastSolvedElapsedMs || 0) + (t.penaltyMs || 0);

    return {
      rank: t.rank,
      name: t.name,
      solved: t.solvedCount || 0,
      timeMs,
      status: t.status
    };
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify({
      revealed: true,
      status: ev.status || 'setup',
      teamsCount,
      cluesPerTeam,
      teams: rows,
      serverNowMs: now
    })
  };
}

