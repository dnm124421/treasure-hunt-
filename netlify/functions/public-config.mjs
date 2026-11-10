import { getDb } from './_lib/store.mjs';

export async function handler(event) {
  const db = getDb();
  const ev = db.event || {};
  const teamsCount = (db.teams || []).length;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=30'
    },
    body: JSON.stringify({
      name: ev.name || 'COSMIC HUNT',
      college: ev.college || 'Nirmala Memorial Foundation College of Commerce & Science',
      tagline: ev.tagline || 'Decode the campus. Reach the stars.',
      eventDateText: ev.eventDateText || '27 Nov 2026 | 10:00 AM',
      eventDateIso: ev.eventDateIso || '2026-11-27T10:00:00+05:30',
      status: ev.status || 'setup',
      cluesPerTeam: ev.cluesPerTeam || 6,
      teamsCount,
      serverNowMs: Date.now()
    })
  };
}

