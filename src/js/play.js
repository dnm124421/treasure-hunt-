import { api } from './api.js';
import { teamSession } from './team-session.js';
import { CountdownTimer, formatMs } from './timer.js';

const token = teamSession.getToken();
if (!token) {
  window.location.replace('/login');
}

// Elements
const navTeamName = document.getElementById('nav-team-name');
const signalBadge = document.getElementById('signal-badge');
const signalText = document.getElementById('signal-text');
const offlineBanner = document.getElementById('offline-banner');
const btnSoundToggle = document.getElementById('btn-sound-toggle');
const iconSoundOff = document.getElementById('icon-sound-off');
const iconSoundOn = document.getElementById('icon-sound-on');

// Views
const viewGame = document.getElementById('view-game');
const viewWaiting = document.getElementById('view-waiting');
const overlayPaused = document.getElementById('overlay-paused');
const pausedTimerEl = document.getElementById('paused-timer');
const viewCompleted = document.getElementById('view-completed');
const completedTimeEl = document.getElementById('completed-time');
const viewTimeup = document.getElementById('view-timeup');
const timeupSolvedEl = document.getElementById('timeup-solved');
const viewDisqualified = document.getElementById('view-disqualified');
const viewSignedout = document.getElementById('view-signedout');
const viewStopped = document.getElementById('view-stopped');
const stoppedSolvedEl = document.getElementById('stopped-solved');

// HUD
const gameTimerEl = document.getElementById('game-timer');
const progressLabel = document.getElementById('progress-label');
const progressPercent = document.getElementById('progress-percent');
const progressSegments = document.querySelectorAll('#progress-segments .seg');
const clueCard = document.getElementById('clue-card');
const clueEyebrow = document.getElementById('clue-eyebrow');
const clueText = document.getElementById('clue-text');
const inputCode = document.getElementById('input-code');
const btnSubmitCode = document.getElementById('btn-submit-code');
const codeFeedback = document.getElementById('code-feedback');
const toggleSolvedBtn = document.getElementById('toggle-solved');
const solvedTrayLabel = document.getElementById('solved-tray-label');
const solvedChevron = document.getElementById('solved-chevron');
const solvedList = document.getElementById('solved-list');

// Sound synthesis via Web Audio API
let soundEnabled = false;
let audioCtx = null;

function playSound(type) {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'correct') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(160, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    }
  } catch {}
}

btnSoundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    iconSoundOff.classList.add('hidden');
    iconSoundOn.classList.remove('hidden');
    playSound('correct');
  } else {
    iconSoundOff.classList.remove('hidden');
    iconSoundOn.classList.add('hidden');
  }
});

// Timer Instance
const timer = new CountdownTimer({
  onTick: ({ formatted, colorClass, pulseClass, frozen }) => {
    if (gameTimerEl) {
      gameTimerEl.textContent = formatted.full;
      gameTimerEl.className = `font-mono text-4xl sm:text-5xl font-bold tracking-tight ${colorClass} ${pulseClass}`;
    }
    if (frozen && pausedTimerEl) {
      pausedTimerEl.textContent = formatted.full;
    }
  },
  onExpire: () => {
    fetchState();
  }
});

// Draft protection
const DRAFT_KEY = 'ch_draft_code';
const savedDraft = sessionStorage.getItem(DRAFT_KEY);
if (savedDraft) {
  inputCode.value = savedDraft;
}

inputCode.addEventListener('input', (e) => {
  let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (val.length > 3) {
    val = val.slice(0, 3) + '-' + val.slice(3, 7);
  }
  inputCode.value = val;
  sessionStorage.setItem(DRAFT_KEY, val);
  hideFeedback();
});

function hideFeedback() {
  codeFeedback.classList.add('hidden');
  codeFeedback.textContent = '';
}

function showFeedback(text, isError = true) {
  codeFeedback.textContent = text;
  codeFeedback.className = `text-xs font-mono pt-1 ${isError ? 'text-danger' : 'text-success'}`;
  codeFeedback.classList.remove('hidden');
}

function setView(state) {
  viewGame.classList.add('hidden');
  viewWaiting.classList.add('hidden');
  overlayPaused.classList.add('hidden');
  viewCompleted.classList.add('hidden');
  viewTimeup.classList.add('hidden');
  viewDisqualified.classList.add('hidden');
  viewSignedout.classList.add('hidden');
  viewStopped.classList.add('hidden');

  switch (state) {
    case 'playing':
      viewGame.classList.remove('hidden');
      break;
    case 'waiting':
      viewWaiting.classList.remove('hidden');
      break;
    case 'paused':
      viewGame.classList.remove('hidden');
      overlayPaused.classList.remove('hidden');
      break;
    case 'completed':
      viewCompleted.classList.remove('hidden');
      break;
    case 'timeup':
      viewTimeup.classList.remove('hidden');
      break;
    case 'disqualified':
      viewDisqualified.classList.remove('hidden');
      break;
    case 'signed_out':
      viewSignedout.classList.remove('hidden');
      teamSession.clear();
      break;
    case 'stopped':
      viewStopped.classList.remove('hidden');
      break;
    default:
      viewGame.classList.remove('hidden');
  }
}

function updateProgressHUD(progress) {
  if (!progress) return;
  const current = progress.current || 1;
  const total = progress.total || 6;
  const solved = Math.max(0, current - 1);

  progressLabel.textContent = `CLUE ${current} OF ${total}`;
  const pct = Math.round((solved / total) * 100);
  progressPercent.textContent = `${pct}% DECRYPTED`;

  progressSegments.forEach((seg, idx) => {
    seg.className = 'seg rounded-sm transition-all duration-300';
    if (idx < solved) {
      seg.classList.add('bg-primary');
    } else if (idx === solved) {
      seg.classList.add('border', 'border-primary-light', 'bg-primary/20', 'animate-pulse');
    } else {
      seg.classList.add('bg-border');
    }
  });
}

function updateSolvedTray(solvedListItems) {
  const items = solvedListItems || [];
  solvedTrayLabel.textContent = `SOLVED CLUES (${items.length})`;

  if (items.length === 0) {
    solvedList.innerHTML = '<div class="text-text-muted/60 text-center font-mono py-2">No clues solved yet</div>';
    return;
  }

  solvedList.innerHTML = items.map(item => `
    <div class="flex items-center justify-between p-2 bg-bg border border-border rounded font-mono text-xs">
      <span class="text-success font-bold">✓ WAYPOINT 0${item.number}</span>
      <span class="text-text-muted">${item.title}</span>
    </div>
  `).join('');
}

let isSubmitting = false;

async function submitCode() {
  const code = inputCode.value.trim();
  if (!code || isSubmitting) return;

  isSubmitting = true;
  btnSubmitCode.disabled = true;
  const origBtnText = btnSubmitCode.innerHTML;
  btnSubmitCode.innerHTML = `
    <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-bg inline" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>DECRYPTING...</span>
  `;

  const submissionId = 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

  try {
    const res = await api.submitCode(token, code, submissionId);

    if (!res.ok || !res.data) {
      showFeedback('Could not reach mission control. Retrying...');
      return;
    }

    const { result, state, progress, lockedUntilMs } = res.data;

    if (result === 'correct') {
      playSound('correct');
      if ('vibrate' in navigator) navigator.vibrate(40);

      clueCard.classList.add('animate-bloom');
      setTimeout(() => clueCard.classList.remove('animate-bloom'), 500);

      sessionStorage.removeItem(DRAFT_KEY);
      inputCode.value = '';
      hideFeedback();

      await fetchState();
    } else if (result === 'wrong') {
      playSound('wrong');
      if ('vibrate' in navigator) navigator.vibrate([60, 40, 60]);

      clueCard.classList.add('animate-shake');
      setTimeout(() => clueCard.classList.remove('animate-shake'), 400);

      showFeedback('Incorrect code. Try again.', true);
      inputCode.select();
    } else if (result === 'locked') {
      playSound('wrong');
      const now = Date.now();
      const waitSec = Math.max(1, Math.ceil((lockedUntilMs - now) / 1000));
      showFeedback(`Too many wrong attempts. Try again in ${waitSec} s.`, true);
      inputCode.disabled = true;
      btnSubmitCode.disabled = true;

      const lockInterval = setInterval(() => {
        const leftSec = Math.max(0, Math.ceil((lockedUntilMs - Date.now()) / 1000));
        if (leftSec <= 0) {
          clearInterval(lockInterval);
          inputCode.disabled = false;
          btnSubmitCode.disabled = false;
          hideFeedback();
        } else {
          showFeedback(`Too many wrong attempts. Try again in ${leftSec} s.`, true);
        }
      }, 1000);
    } else if (result === 'closed') {
      setView(state);
    }
  } catch (err) {
    showFeedback('Network dropped. Your code is saved.');
  } finally {
    isSubmitting = false;
    btnSubmitCode.innerHTML = origBtnText;
    btnSubmitCode.disabled = inputCode.disabled;
  }
}

btnSubmitCode.addEventListener('click', submitCode);
inputCode.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitCode();
});

// Toggle solved clues accordion
toggleSolvedBtn.addEventListener('click', () => {
  const isHidden = solvedList.classList.contains('hidden');
  if (isHidden) {
    solvedList.classList.remove('hidden');
    solvedChevron.classList.add('rotate-180');
  } else {
    solvedList.classList.add('hidden');
    solvedChevron.classList.remove('rotate-180');
  }
});

let isPolling = false;

async function fetchState() {
  if (isPolling) return;
  isPolling = true;

  try {
    const res = await api.getTeamState(token);

    if (!res.ok) {
      signalBadge.className = 'flex items-center gap-1.5 text-[11px] font-mono text-warn';
      signalText.textContent = 'RECONNECTING';
      offlineBanner.classList.remove('hidden');
      isPolling = false;
      return;
    }

    signalBadge.className = 'flex items-center gap-1.5 text-[11px] font-mono text-success';
    signalText.textContent = 'ONLINE';
    offlineBanner.classList.add('hidden');

    const data = res.data;
    if (data.teamName) navTeamName.textContent = data.teamName;

    setView(data.state);

    if (data.state === 'playing' || data.state === 'paused') {
      if (data.timer) {
        timer.sync(data.timer.timeLeftMs, data.timer.frozen);
      }
      if (data.clue) {
        clueEyebrow.textContent = `— WAYPOINT 0${data.clue.number}`;
        clueText.textContent = data.clue.text;
      }
      updateProgressHUD(data.progress);
      updateSolvedTray(data.solved);
    } else {
      timer.stop();
      if (data.state === 'completed' && data.finished) {
        completedTimeEl.textContent = formatMs(data.finished.elapsedMs).full;
      } else if (data.state === 'timeup' && data.finished) {
        timeupSolvedEl.textContent = `CLUES SOLVED: ${data.finished.solved} OF ${data.progress?.total || 6}`;
      } else if (data.state === 'stopped' && data.finished) {
        stoppedSolvedEl.textContent = `Clues Solved: ${data.finished.solved} of ${data.progress?.total || 6}`;
      }
    }
  } catch (err) {
    signalBadge.className = 'flex items-center gap-1.5 text-[11px] font-mono text-warn';
    signalText.textContent = 'RECONNECTING';
    offlineBanner.classList.remove('hidden');
  } finally {
    isPolling = false;
  }
}

// Initial fetch and 4s polling
fetchState();
const pollTimer = setInterval(fetchState, 4000);

// Visibility re-sync
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    fetchState();
  }
});

