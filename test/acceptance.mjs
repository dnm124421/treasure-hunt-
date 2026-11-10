import { handler as loginHandler } from '../netlify/functions/team-login.mjs';
import { handler as stateHandler } from '../netlify/functions/team-state.mjs';
import { handler as submitHandler } from '../netlify/functions/submit-code.mjs';
import { handler as leaderboardHandler } from '../netlify/functions/leaderboard.mjs';
import { handler as adminHandler } from '../netlify/functions/admin-action.mjs';
import { getDb, resetToSample } from '../netlify/functions/_lib/store.mjs';

async function runTests() {
  console.log('--- STARTING COSMIC HUNT ACCEPTANCE TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // Reset to clean sample data
  resetToSample();
  const adminToken = 'admin_token_' + Date.now() + '_' + Buffer.from('dnm124421@gmail.com').toString('base64');

  // Test 1: Wrong team code returns invalid
  {
    const res = await loginHandler({
      httpMethod: 'POST',
      headers: { 'client-ip': '1.2.3.4' },
      body: JSON.stringify({ code: 'WRONG1' })
    });
    const data = JSON.parse(res.body);
    assert(data.ok === false && data.reason === 'invalid', 'Test 1: Wrong team code fails with generic invalid');
  }

  // Test 2: Valid team code login (Nebula-9 -> K7M4PX)
  let nebulaToken = '';
  {
    const res = await loginHandler({
      httpMethod: 'POST',
      headers: { 'client-ip': '1.2.3.4' },
      body: JSON.stringify({ code: 'K7M4PX' })
    });
    const data = JSON.parse(res.body);
    assert(data.ok === true && data.token && data.teamName === 'Nebula-9', 'Test 2: Valid team code logs in and signs token');
    nebulaToken = data.token;
  }

  // Test 3: Initial state is waiting (MISSION NOT STARTED)
  {
    const res = await stateHandler({
      headers: { authorization: `Bearer ${nebulaToken}` }
    });
    const data = JSON.parse(res.body);
    assert(data.state === 'waiting' && data.timer.timeLeftMs === 1800000, 'Test 3: Initial state is waiting with 30:00 timer');
  }

  // Test 4: Leaderboard is hidden by default and leaks NO team names
  {
    const res = await leaderboardHandler({});
    const data = JSON.parse(res.body);
    assert(data.revealed === false && !data.teams, 'Test 4: Leaderboard hidden by default, zero team names leaked');
  }

  // Test 5: Admin starts team Nebula-9
  {
    const db = getDb();
    const team = db.teams.find(t => t.name === 'Nebula-9');
    const res = await adminHandler({
      httpMethod: 'POST',
      headers: { authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'startTeam', teamId: team.id })
    });
    const data = JSON.parse(res.body);
    assert(data.ok === true, 'Test 5: Admin starts team Nebula-9');
  }

  // Test 6: Team state is now playing with active clue and timer running
  {
    const res = await stateHandler({
      headers: { authorization: `Bearer ${nebulaToken}` }
    });
    const data = JSON.parse(res.body);
    assert(data.state === 'playing' && data.clue && data.clue.number === 1 && data.timer.frozen === false, 'Test 6: Team is playing with Waypoint 1 active');
  }

  // Test 7: Submitting code - lowercase, space or no hyphen accepted (clue 1 code is YEL-7N4W)
  {
    const res = await submitHandler({
      httpMethod: 'POST',
      headers: { authorization: `Bearer ${nebulaToken}` },
      body: JSON.stringify({ code: 'yel 7n4w', submissionId: 'test_sub_1' })
    });
    const data = JSON.parse(res.body);
    assert(data.result === 'correct' && data.progress.current === 2, 'Test 7: Normalized code accepted and advances to clue 2');
  }

  // Test 8: Submitting wrong code for clue 2 (correct is MAR-3K9P)
  {
    const res = await submitHandler({
      httpMethod: 'POST',
      headers: { authorization: `Bearer ${nebulaToken}` },
      body: JSON.stringify({ code: 'BAD-CODE', submissionId: 'test_sub_wrong' })
    });
    const data = JSON.parse(res.body);
    assert(data.result === 'wrong', 'Test 8: Wrong code rejected without penalty');
  }

  // Test 9: Anti-spam lockout: 5 wrong attempts triggers lockout
  {
    for (let i = 0; i < 4; i++) {
      await submitHandler({
        httpMethod: 'POST',
        headers: { authorization: `Bearer ${nebulaToken}` },
        body: JSON.stringify({ code: `BAD-${i}`, submissionId: `spam_${i}` })
      });
    }
    const res = await submitHandler({
      httpMethod: 'POST',
      headers: { authorization: `Bearer ${nebulaToken}` },
      body: JSON.stringify({ code: 'BAD-FINAL', submissionId: 'spam_final' })
    });
    const data = JSON.parse(res.body);
    assert(data.result === 'locked' && data.lockedUntilMs > Date.now(), 'Test 9: 5 wrong attempts triggers anti-spam lockout');
  }

  // Test 10: Admin manual unlock
  {
    const db = getDb();
    const team = db.teams.find(t => t.name === 'Nebula-9');
    const res = await adminHandler({
      httpMethod: 'POST',
      headers: { authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'manualUnlock', teamId: team.id })
    });
    const data = JSON.parse(res.body);
    assert(data.ok === true, 'Test 10: Admin manual unlock advances clue');
  }

  // Test 11: Admin pauses team and resumes team
  {
    const db = getDb();
    const team = db.teams.find(t => t.name === 'Nebula-9');
    await adminHandler({
      httpMethod: 'POST',
      headers: { authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'pauseTeam', teamId: team.id })
    });
    let stateRes = await stateHandler({ headers: { authorization: `Bearer ${nebulaToken}` } });
    let stateData = JSON.parse(stateRes.body);
    assert(stateData.state === 'paused' && stateData.timer.frozen === true, 'Test 11a: Admin pause freezes team timer');

    await adminHandler({
      httpMethod: 'POST',
      headers: { authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'resumeTeam', teamId: team.id })
    });
    stateRes = await stateHandler({ headers: { authorization: `Bearer ${nebulaToken}` } });
    stateData = JSON.parse(stateRes.body);
    assert(stateData.state === 'playing' && stateData.timer.frozen === false, 'Test 11b: Admin resume unfreezes team timer');
  }

  // Test 12: Admin reveals leaderboard
  {
    await adminHandler({
      httpMethod: 'POST',
      headers: { authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'setReveal', revealed: true })
    });
    const res = await leaderboardHandler({});
    const data = JSON.parse(res.body);
    assert(data.revealed === true && Array.isArray(data.teams) && data.teams.length > 0 && data.teams[0].name === 'Nebula-9', 'Test 12: Leaderboard reveal publishes ranked teams with Nebula-9 on top');
  }

  console.log(`\n================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

