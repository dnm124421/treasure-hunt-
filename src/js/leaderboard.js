import { api } from './api.js';
import { formatMs } from './timer.js';

const stateLocked = document.getElementById('state-locked');
const stateRevealed = document.getElementById('state-revealed');
const lockedTeamsCount = document.getElementById('locked-teams-count');
const lockedCluesCount = document.getElementById('locked-clues-count');
const lockedStatusPill = document.getElementById('locked-status-pill');
const lockedStatusText = document.getElementById('locked-status-text');
const rankedTbody = document.getElementById('ranked-tbody');
const btnFullscreen = document.getElementById('btn-fullscreen');

let wasLocked = true;
let ceremonyInProgress = false;

// Fullscreen Projector Toggle
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn('Fullscreen request failed:', err);
    });
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

if (btnFullscreen) {
  btnFullscreen.addEventListener('click', toggleFullscreen);
}

// F key shortcut for Fullscreen (FIX-05)
document.addEventListener('keydown', (e) => {
  if (e.key === 'f' || e.key === 'F') {
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
    toggleFullscreen();
  }
});

// Cursor autohide in fullscreen (UX-B2)
let cursorTimer = null;
function resetCursorHide() {
  document.body.style.cursor = '';
  clearTimeout(cursorTimer);
  cursorTimer = setTimeout(() => {
    if (document.fullscreenElement) {
      document.body.style.cursor = 'none';
    }
  }, 3000);
}

document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    document.body.style.cursor = 'none';
    document.addEventListener('mousemove', resetCursorHide);
  } else {
    document.body.style.cursor = '';
    clearTimeout(cursorTimer);
    document.removeEventListener('mousemove', resetCursorHide);
  }
});

function renderLocked(data) {
  stateLocked.classList.remove('hidden');
  stateRevealed.classList.add('hidden');

  if (lockedTeamsCount) lockedTeamsCount.textContent = data.teamsCount || 6;
  if (lockedCluesCount) lockedCluesCount.textContent = data.cluesPerTeam || 6;

  if (lockedStatusPill && lockedStatusText) {
    lockedStatusPill.className = 'status-pill';
    const status = data.status || 'setup';
    if (status === 'live') {
      lockedStatusPill.classList.add('status-playing');
      lockedStatusText.textContent = 'LIVE';
    } else if (status === 'stopped') {
      lockedStatusPill.classList.add('status-completed');
      lockedStatusText.textContent = 'ENDED';
    } else {
      lockedStatusPill.classList.add('status-waiting');
      lockedStatusText.textContent = 'NOT STARTED';
    }
  }
}

function getStatusBadge(status) {
  switch (status) {
    case 'completed':
      return `<span class="status-pill status-completed"><span class="status-pill-dot"></span>DONE</span>`;
    case 'playing':
      return `<span class="status-pill status-playing"><span class="status-pill-dot"></span>PLAYING</span>`;
    case 'paused':
      return `<span class="status-pill status-paused"><span class="status-pill-dot"></span>PAUSED</span>`;
    case 'timeup':
      return `<span class="status-pill status-timeup"><span class="status-pill-dot"></span>TIME UP</span>`;
    case 'disqualified':
      return `<span class="status-pill status-disqualified"><span class="status-pill-dot"></span>DQ</span>`;
    case 'waiting':
      return `<span class="status-pill status-waiting"><span class="status-pill-dot"></span>WAITING</span>`;
    default:
      return `<span class="status-pill status-waiting"><span class="status-pill-dot"></span>${status}</span>`;
  }
}

function renderRevealed(data) {
  stateLocked.classList.add('hidden');
  stateRevealed.classList.remove('hidden');

  const teams = data.teams || [];
  if (teams.length === 0) {
    rankedTbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-text-muted">No teams found.</td></tr>`;
    return;
  }

  rankedTbody.innerHTML = teams.map((t) => {
    let rankBadge = '';
    let rowHighlight = '';

    if (t.status === 'disqualified') {
      rankBadge = `<span class="text-danger font-bold text-xs">—</span>`;
      rowHighlight = 'opacity-60 bg-danger/5';
    } else if (t.rank === 1) {
      rankBadge = `
        <span class="inline-flex items-center gap-1 text-gold font-bold text-base">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
          #1
        </span>`;
      rowHighlight = 'bg-gold/10 border-l-4 border-gold';
    } else if (t.rank === 2) {
      rankBadge = `<span class="text-silver font-bold text-sm">#2</span>`;
      rowHighlight = 'bg-silver/5 border-l-4 border-silver';
    } else if (t.rank === 3) {
      rankBadge = `<span class="text-bronze font-bold text-sm">#3</span>`;
      rowHighlight = 'bg-bronze/5 border-l-4 border-bronze';
    } else {
      rankBadge = `<span class="text-text-muted text-sm font-mono">#${t.rank}</span>`;
    }

    const timeStr = (t.status === 'waiting') ? '--:--.---' : formatMs(t.timeMs || 0).full;

    return `
      <tr class="hover:bg-panel-solid/90 transition-colors ${rowHighlight}">
        <td class="py-4 px-4 font-bold">${rankBadge}</td>
        <td class="py-4 px-4 font-heading font-bold text-white tracking-wider projector-scale">${t.name}</td>
        <td class="py-4 px-4 text-center font-bold text-primary-light projector-scale">${t.solved} / ${data.cluesPerTeam || 6}</td>
        <td class="py-4 px-4 text-right font-mono text-white projector-scale">${timeStr}</td>
        <td class="py-4 px-4 text-center">${getStatusBadge(t.status)}</td>
      </tr>
    `;
  }).join('');
}

// Reveal ceremony countdown (UX-B1)
function showRevealCeremony(callback) {
  ceremonyInProgress = true;
  stateLocked.classList.add('hidden');
  stateRevealed.classList.add('hidden');

  const ceremony = document.createElement('div');
  ceremony.className = 'fixed inset-0 z-50 bg-bg/95 backdrop-blur-md flex items-center justify-center';
  ceremony.innerHTML = `
    <div class="text-center space-y-4">
      <div class="font-mono text-sm text-primary-light tracking-widest animate-pulse">DECRYPTING RESULTS...</div>
      <div id="ceremony-countdown" class="font-mono text-7xl font-bold text-white">3</div>
    </div>
  `;
  document.body.appendChild(ceremony);

  const countEl = ceremony.querySelector('#ceremony-countdown');
  let count = 3;
  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      countEl.textContent = count;
    } else {
      clearInterval(interval);
      ceremony.style.opacity = '0';
      ceremony.style.transition = 'opacity 0.4s ease';
      setTimeout(() => {
        ceremony.remove();
        ceremonyInProgress = false;
        callback();
      }, 400);
    }
  }, 1000);
}

async function fetchLeaderboard() {
  if (document.hidden || ceremonyInProgress) return;
  try {
    const res = await api.getLeaderboard();
    if (res.ok && res.data) {
      if (res.data.revealed) {
        if (wasLocked) {
          wasLocked = false;
          showRevealCeremony(() => renderRevealed(res.data));
        } else {
          renderRevealed(res.data);
        }
      } else {
        wasLocked = true;
        renderLocked(res.data);
      }
    }
  } catch (err) {
    console.warn('Leaderboard poll error:', err);
  }
}

fetchLeaderboard();
setInterval(fetchLeaderboard, 5000);
