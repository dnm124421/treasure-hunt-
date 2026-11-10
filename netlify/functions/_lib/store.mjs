import fs from 'node:fs';
import path from 'node:path';
import { normalizeCode } from './normalize.mjs';

const DB_FILE = path.resolve(process.cwd(), '.data/cosmic_db.json');

function getDefaultData() {
  const defaultClues = [
    {
      id: 'clue-1',
      title: 'Notice board',
      text: 'I carry the news but never speak. Papers hang on me, held by tiny pins. Find the place where students stop to read, and look behind the corner of my frame.',
      locationNote: 'SAMPLE: notice board near main entrance',
      code: 'YEL7N4W',
      displayCode: 'YEL-7N4W',
      active: true,
      hintText: null,
      hintPenaltySec: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'clue-2',
      title: 'Library',
      text: 'Silence is my law and stories are my sleep. Thousands of voices rest upon my shelves. Enter my quiet hall and look beneath the table nearest the door.',
      locationNote: 'SAMPLE: library reading hall',
      code: 'MAR3K9P',
      displayCode: 'MAR-3K9P',
      active: true,
      hintText: null,
      hintPenaltySec: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'clue-3',
      title: 'Canteen',
      text: 'Where hunger ends and queues begin, where tea is hot and gossip is thin. Stand where you pay for your treat, and look under the stack of trays.',
      locationNote: 'SAMPLE: canteen counter',
      code: 'VEN5T2X',
      displayCode: 'VEN-5T2X',
      active: true,
      hintText: null,
      hintPenaltySec: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'clue-4',
      title: 'Staircase',
      text: 'I have many steps but I never walk. Climb me up and climb me down. At my turning point, between two floors, look beneath the rail.',
      locationNote: 'SAMPLE: main staircase landing',
      code: 'SAT8R6D',
      displayCode: 'SAT-8R6D',
      active: true,
      hintText: null,
      hintPenaltySec: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'clue-5',
      title: 'Old tree',
      text: 'I give shade without a roof and shelter without a door. Find the oldest of my kind in the open, and look where my roots meet the ground.',
      locationNote: 'SAMPLE: largest tree in the ground',
      code: 'JUP4H7M',
      displayCode: 'JUP-4H7M',
      active: true,
      hintText: null,
      hintPenaltySec: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'clue-6',
      title: 'Water cooler',
      text: 'I am cold without a fridge, and everyone visits me when thirsty. Go where cups are filled, and look behind the one who stands guard.',
      locationNote: 'SAMPLE: drinking water point',
      code: 'NEP9B3C',
      displayCode: 'NEP-9B3C',
      active: true,
      hintText: null,
      hintPenaltySec: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];

  const defaultTeams = [
    { id: 'team-1', name: 'Nebula-9', accessCode: 'K7M4PX' },
    { id: 'team-2', name: 'Orion-3', accessCode: 'R3T9WC' },
    { id: 'team-3', name: 'Pulsar-7', accessCode: 'H8N2VD' },
    { id: 'team-4', name: 'Zenith-1', accessCode: 'Q5X7JB' },
    { id: 'team-5', name: 'Cosmos-4', accessCode: 'T4C6ZF' },
    { id: 'team-6', name: 'Vortex-5', accessCode: 'W9D3GH' }
  ].map((t, idx) => {
    // Rotation algorithm: left rotation by index
    const N = defaultClues.length;
    const clueOrder = [];
    for (let i = 0; i < N; i++) {
      const clueIndex = (idx + i) % N;
      clueOrder.push(defaultClues[clueIndex].id);
    }

    return {
      id: t.id,
      name: t.name,
      accessCode: t.accessCode,
      members: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
      status: 'waiting',
      endReason: null,
      clueOrder,
      currentIndex: 0,
      solvedCount: 0,
      wrongCount: 0,
      adminUnlockCount: 0,
      startedAtMs: null,
      pausedAtMs: null,
      pausedTotalMs: 0,
      durationMs: 1800000,
      addedMs: 0,
      penaltyMs: 0,
      lastSolvedElapsedMs: null,
      finishedElapsedMs: null,
      lastSolvedAtMs: null,
      lastActivityMs: null,
      recentWrongMs: [],
      lockedUntilMs: 0,
      sessionId: null,
      lastSubmissionId: null,
      lastSubmissionResult: null,
      dqReason: null,
      statusBeforeDq: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  });

  return {
    event: {
      name: 'COSMIC HUNT',
      college: 'Nirmala Memorial Foundation College of Commerce & Science',
      tagline: 'Decode the campus. Reach the stars.',
      eventDateText: '27 Nov 2026 | 10:00 AM',
      eventDateIso: '2026-11-27T10:00:00+05:30',
      status: 'setup', // 'setup' | 'live' | 'stopped'
      durationMs: 1800000,
      leaderboardRevealed: false,
      lockout: { maxWrong: 5, windowSec: 60, lockSec: 30 },
      cluesPerTeam: 6,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    teams: defaultTeams,
    clues: defaultClues,
    attempts: [],
    adminLog: [
      {
        id: 'log-init',
        tsMs: Date.now(),
        action: 'INITIALIZE',
        detail: 'System initialized with sample data for 6 teams and 6 clues',
        by: 'system'
      }
    ],
    loginAttempts: {}
  };
}

let memoryData = null;

export function getDb() {
  if (memoryData) return memoryData;

  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      memoryData = JSON.parse(raw);
      return memoryData;
    }
  } catch (err) {
    console.error('Error reading DB_FILE:', err);
  }

  memoryData = getDefaultData();
  saveDb(memoryData);
  return memoryData;
}

export function saveDb(data) {
  memoryData = data;
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving DB_FILE:', err);
  }
}

export function resetToSample() {
  const fresh = getDefaultData();
  saveDb(fresh);
  return fresh;
}

