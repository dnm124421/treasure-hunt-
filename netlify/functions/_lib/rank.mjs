export function rankTeams(teamsList) {
  const activeTeams = [];
  const dqTeams = [];

  for (const t of teamsList) {
    if (t.status === 'disqualified') {
      dqTeams.push({ ...t, rank: null });
    } else {
      activeTeams.push(t);
    }
  }

  activeTeams.sort((a, b) => {
    // 1. More clues solved ranks higher
    const aSolved = a.solvedCount || 0;
    const bSolved = b.solvedCount || 0;
    if (bSolved !== aSolved) {
      return bSolved - aSolved;
    }

    // 2. If equal: lower rank time ranks higher
    // rankTimeMs = (lastSolvedElapsedMs || finishedElapsedMs || 0) + (penaltyMs || 0)
    const aTime = (a.lastSolvedElapsedMs ?? a.finishedElapsedMs ?? 1800000) + (a.penaltyMs || 0);
    const bTime = (b.lastSolvedElapsedMs ?? b.finishedElapsedMs ?? 1800000) + (b.penaltyMs || 0);
    if (aTime !== bTime) {
      return aTime - bTime;
    }

    // 3. If still equal: earlier real timestamp
    const aTs = a.lastSolvedAtMs || a.startedAtMs || 0;
    const bTs = b.lastSolvedAtMs || b.startedAtMs || 0;
    return aTs - bTs;
  });

  const rankedActive = activeTeams.map((team, idx) => ({
    ...team,
    rank: idx + 1
  }));

  return [...rankedActive, ...dqTeams];
}

