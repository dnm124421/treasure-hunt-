export function calculateTeamTimes(team, nowMs = Date.now()) {
  if (!team.startedAtMs) {
    return {
      elapsedMs: 0,
      timeLeftMs: team.durationMs || 1800000,
      frozen: false
    };
  }

  const durationMs = team.durationMs || 1800000;
  const addedMs = team.addedMs || 0;
  const penaltyMs = team.penaltyMs || 0;
  const pausedTotalMs = team.pausedTotalMs || 0;

  if (team.status === 'completed' && team.finishedElapsedMs != null) {
    const elapsedMs = team.finishedElapsedMs;
    const timeLeftMs = Math.max(0, durationMs + addedMs - penaltyMs - elapsedMs);
    return { elapsedMs, timeLeftMs, frozen: true };
  }

  if (team.status === 'paused') {
    const effectiveNow = team.pausedAtMs || nowMs;
    const elapsedMs = Math.max(0, effectiveNow - team.startedAtMs - pausedTotalMs);
    const timeLeftMs = Math.max(0, durationMs + addedMs - penaltyMs - elapsedMs);
    return { elapsedMs, timeLeftMs, frozen: true };
  }

  if (team.status === 'timeup' || team.status === 'stopped' || team.status === 'disqualified') {
    const elapsedMs = team.lastSolvedElapsedMs || (nowMs - team.startedAtMs - pausedTotalMs);
    return { elapsedMs, timeLeftMs: 0, frozen: true };
  }

  // Active playing
  const elapsedMs = Math.max(0, nowMs - team.startedAtMs - pausedTotalMs);
  const rawTimeLeft = durationMs + addedMs - penaltyMs - elapsedMs;
  const timeLeftMs = Math.max(0, rawTimeLeft);

  return {
    elapsedMs,
    timeLeftMs,
    frozen: false
  };
}

