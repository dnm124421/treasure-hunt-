import { api } from '../api.js';
import { formatMs } from '../timer.js';

const ADMIN_TOKEN_KEY = 'ch_admin_token';
const ALLOWED_ADMIN = 'dnm124421@gmail.com';

// Login elements
const viewLogin = document.getElementById('view-login');
const formLogin = document.getElementById('form-login');
const adminEmailInput = document.getElementById('admin-email');
const adminPasswordInput = document.getElementById('admin-password');
const btnTogglePwd = document.getElementById('btn-toggle-pwd');
const loginError = document.getElementById('login-error');
const viewDashboard = document.getElementById('view-dashboard');
const btnLogout = document.getElementById('btn-logout');
const adminUserDisplay = document.getElementById('admin-user-display');

// Dashboard metrics & controls
const badgeEventStatus = document.getElementById('badge-event-status');
const liveServerClock = document.getElementById('live-server-clock');
const btnPauseAll = document.getElementById('btn-pause-all');
const btnResumeAll = document.getElementById('btn-resume-all');
const btnToggleReveal = document.getElementById('btn-toggle-reveal');
const revealToggleLabel = document.getElementById('reveal-toggle-label');
const btnStopMission = document.getElementById('btn-stop-mission');
const btnStartAllWaiting = document.getElementById('btn-start-all-waiting');

const statTeamsTotal = document.getElementById('stat-teams-total');
const statTeamsPlaying = document.getElementById('stat-teams-playing');
const statTeamsCompleted = document.getElementById('stat-teams-completed');
const statTeamsDq = document.getElementById('stat-teams-dq');

const liveTeamsTbody = document.getElementById('live-teams-tbody');
const vaultList = document.getElementById('vault-list');
const btnToggleCodes = document.getElementById('btn-toggle-codes');
const routeMatrixList = document.getElementById('route-matrix-list');
const liveAttemptsList = document.getElementById('live-attempts-list');
const btnExportAttemptsCsv = document.getElementById('btn-export-attempts-csv');

// Modals
const modalTime = document.getElementById('modal-time');
const modalTimeTitle = document.getElementById('modal-time-title');
const modalTimeTeamId = document.getElementById('modal-time-team-id');
const modalTimeMinutes = document.getElementById('modal-time-minutes');
const modalTimeReason = document.getElementById('modal-time-reason');
const btnCancelTime = document.getElementById('btn-cancel-time');
const btnConfirmAddTime = document.getElementById('btn-confirm-add-time');
const btnConfirmRemoveTime = document.getElementById('btn-confirm-remove-time');

const modalPenalty = document.getElementById('modal-penalty');
const modalPenaltyTeamId = document.getElementById('modal-penalty-team-id');
const modalPenaltySeconds = document.getElementById('modal-penalty-seconds');
const modalPenaltyReason = document.getElementById('modal-penalty-reason');
const btnCancelPenalty = document.getElementById('btn-cancel-penalty');
const btnConfirmPenalty = document.getElementById('btn-confirm-penalty');

const modalConfirm = document.getElementById('modal-confirm');
const modalConfirmTitle = document.getElementById('modal-confirm-title');
const modalConfirmMessage = document.getElementById('modal-confirm-message');
const modalConfirmInputWrap = document.getElementById('modal-confirm-input-wrap');
const modalConfirmInput = document.getElementById('modal-confirm-input');
const btnModalCancel = document.getElementById('btn-modal-cancel');
const btnModalProceed = document.getElementById('btn-modal-proceed');

const toastContainer = document.getElementById('toast-container');

let adminToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);
let showVaultCodes = false;
let currentState = null;
let pollTimer = null;
let onConfirmAction = null;

// Toast helper
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `p-3 rounded text-xs font-mono border ${
    type === 'danger'
      ? 'bg-danger/20 border-danger text-danger'
      : type === 'warn'
      ? 'bg-warn/20 border-warn text-warn'
      : 'bg-success/20 border-success text-success'
  } shadow-lg transition-all duration-300`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Password toggle
btnTogglePwd.addEventListener('click', () => {
  adminPasswordInput.type = adminPasswordInput.type === 'password' ? 'text' : 'password';
});

// Authentication handling
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  const email = adminEmailInput.value.trim().toLowerCase();
  const password = adminPasswordInput.value;

  if (email !== ALLOWED_ADMIN) {
    loginError.textContent = 'Access denied. Email not authorized.';
    loginError.classList.remove('hidden');
    return;
  }

  // Create local admin token for session
  const token = `admin_token_${Date.now()}_${btoa(email)}`;
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  adminToken = token;

  const verified = await checkAuth();
  if (verified) {
    showDashboard();
    showToast('Authenticated as Administrator.');
  } else {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    loginError.textContent = 'Incorrect email or password.';
    loginError.classList.remove('hidden');
  }
});

btnLogout.addEventListener('click', () => {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  adminToken = null;
  if (pollTimer) clearInterval(pollTimer);
  showLogin();
  showToast('Logged out of Command Center.', 'warn');
});

function showLogin() {
  viewLogin.classList.remove('hidden');
  viewDashboard.classList.add('hidden');
}

function showDashboard() {
  viewLogin.classList.add('hidden');
  viewDashboard.classList.remove('hidden');
  if (adminUserDisplay) adminUserDisplay.textContent = ALLOWED_ADMIN;
  startPolling();
}

async function checkAuth() {
  if (!adminToken) return false;
  try {
    const res = await api.adminAction(adminToken, 'whoami');
    return res.ok && res.data && res.data.ok;
  } catch {
    return false;
  }
}

// Polling and rendering
function startPolling() {
  fetchState();
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(fetchState, 3500);

  // Sync timeouts every 15s
  setInterval(() => {
    if (adminToken) api.adminAction(adminToken, 'syncTimeouts');
  }, 15000);

  // Clock tick
  setInterval(() => {
    if (liveServerClock) {
      liveServerClock.textContent = new Date().toLocaleTimeString('en-IN', { hour12: false });
    }
  }, 1000);
}

async function fetchState() {
  if (!adminToken) return;
  try {
    const res = await api.adminAction(adminToken, 'getAdminState');
    if (!res.ok || !res.data || !res.data.ok) {
      if (res.status === 401) {
        showLogin();
      }
      return;
    }
    currentState = res.data;
    renderDashboard(res.data);
  } catch (err) {
    console.warn('Admin state fetch error:', err);
  }
}

function renderDashboard(data) {
  const ev = data.event || {};
  const teams = data.teams || [];
  const clues = data.clues || [];
  const attempts = data.attempts || [];

  // Top event status badge
  badgeEventStatus.className = 'status-pill';
  if (ev.status === 'live') {
    badgeEventStatus.classList.add('status-playing');
    badgeEventStatus.innerHTML = '<span class="status-pill-dot"></span>LIVE';
  } else if (ev.status === 'stopped') {
    badgeEventStatus.classList.add('status-completed');
    badgeEventStatus.innerHTML = '<span class="status-pill-dot"></span>STOPPED';
  } else {
    badgeEventStatus.classList.add('status-waiting');
    badgeEventStatus.innerHTML = '<span class="status-pill-dot"></span>SETUP';
  }

  // Reveal Leaderboard Toggle Label
  revealToggleLabel.textContent = ev.leaderboardRevealed ? 'LEADERBOARD: REVEALED' : 'LEADERBOARD: HIDDEN';
  if (ev.leaderboardRevealed) {
    btnToggleReveal.classList.add('bg-primary/20', 'border-primary');
  } else {
    btnToggleReveal.classList.remove('bg-primary/20', 'border-primary');
  }

  // 4 Metrics
  statTeamsTotal.textContent = teams.length;
  statTeamsPlaying.textContent = teams.filter(t => t.status === 'playing' || t.status === 'paused').length;
  statTeamsCompleted.textContent = teams.filter(t => t.status === 'completed').length;
  statTeamsDq.textContent = teams.filter(t => t.status === 'disqualified').length;

  // Render Live Team Table
  renderTeamsTable(teams);

  // Render Lower Panels
  renderClueVault(clues);
  renderRouteMatrix(teams, clues);
  renderAttemptsFeed(attempts);
}

function renderTeamsTable(teams) {
  const now = Date.now();
  liveTeamsTbody.innerHTML = teams.map(t => {
    // Time string
    let timeDisplay = '--:--';
    let timeColor = 'text-white';

    if (t.status === 'playing' || t.status === 'paused') {
      const leftMs = t.timeLeftMs != null ? t.timeLeftMs : 1800000;
      const formatted = formatMs(leftMs);
      timeDisplay = `${formatted.min}:${formatted.sec}`;
      if (leftMs < 60000) {
        timeColor = 'text-danger font-bold animate-pulse';
      } else if (leftMs < 300000) {
        timeColor = 'text-warn font-bold';
      }
      if (t.status === 'paused') timeDisplay += ' (P)';
    } else if (t.status === 'completed') {
      const doneMs = t.finishedElapsedMs || t.lastSolvedElapsedMs || 0;
      const formatted = formatMs(doneMs);
      timeDisplay = `${formatted.min}:${formatted.sec}`;
      timeColor = 'text-success';
    } else if (t.status === 'timeup') {
      timeDisplay = '00:00';
      timeColor = 'text-warn';
    }

    // Relative activity
    let lastActiveText = '—';
    if (t.lastActivityMs) {
      const secAgo = Math.floor((now - t.lastActivityMs) / 1000);
      lastActiveText = secAgo < 60 ? `${secAgo}s ago` : `${Math.floor(secAgo / 60)}m ago`;
    }

    // Progress segments
    const total = (t.clueOrder && t.clueOrder.length) || 6;
    const current = t.currentIndex || 0;
    const segsHtml = Array.from({ length: total }, (_, i) => {
      let bg = 'bg-border';
      if (i < current) bg = 'bg-primary';
      else if (i === current && t.status === 'playing') bg = 'bg-primary-light animate-pulse';
      return `<div class="w-2.5 h-1.5 rounded-xs ${bg}"></div>`;
    }).join('');

    return `
      <tr class="hover:bg-bg/40 transition-colors">
        <td class="py-3 px-4">
          <div class="font-bold text-white uppercase">${t.name}</div>
          <div class="pt-1">${getStatusPillHtml(t.status)}</div>
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-1">${segsHtml}</div>
          <div class="text-[10px] text-text-muted mt-1">${t.solvedCount || 0} / ${total} solved</div>
        </td>
        <td class="py-3 px-4 text-center font-bold ${timeColor}">${timeDisplay}</td>
        <td class="py-3 px-4 text-center text-text-muted">${t.wrongCount || 0}</td>
        <td class="py-3 px-4 text-center text-text-muted text-[11px]">${lastActiveText}</td>
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5 flex-wrap">
            ${t.status === 'waiting' ? `
              <button class="btn-primary text-[10px] h-7 px-2" onclick="window.adminCmd('startTeam', '${t.id}')">START</button>
            ` : ''}

            ${t.status === 'playing' ? `
              <button class="btn-secondary text-[10px] h-7 px-2" onclick="window.adminCmd('pauseTeam', '${t.id}')">PAUSE</button>
            ` : ''}

            ${t.status === 'paused' ? `
              <button class="btn-primary text-[10px] h-7 px-2" onclick="window.adminCmd('resumeTeam', '${t.id}')">RESUME</button>
            ` : ''}

            ${(t.status === 'playing' || t.status === 'paused') ? `
              <button class="btn-secondary text-[10px] h-7 px-1.5" title="Adjust Time" onclick="window.openTimeModal('${t.id}', '${t.name}')">+/- TIME</button>
              <button class="btn-secondary text-[10px] h-7 px-1.5" title="Add Penalty" onclick="window.openPenaltyModal('${t.id}', '${t.name}')">PENALTY</button>
              <button class="btn-secondary text-[10px] h-7 px-1.5 text-success border-success" title="Manual Unlock" onclick="window.adminCmd('manualUnlock', '${t.id}')">UNLOCK</button>
            ` : ''}

            ${t.status === 'disqualified' ? `
              <button class="btn-secondary text-[10px] h-7 px-2 text-primary-light" onclick="window.adminCmd('requalify', '${t.id}')">RE-QUALIFY</button>
            ` : `
              <button class="btn-danger text-[10px] h-7 px-1.5" onclick="window.adminCmd('disqualify', '${t.id}')">DQ</button>
            `}

            <button class="btn-secondary text-[10px] h-7 px-1.5 text-danger border-danger" title="Reset Team" onclick="window.adminCmd('resetTeam', '${t.id}')">RESET</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function getStatusPillHtml(status) {
  switch (status) {
    case 'playing': return '<span class="status-pill status-playing text-[10px] py-0.5"><span class="status-pill-dot"></span>PLAYING</span>';
    case 'completed': return '<span class="status-pill status-completed text-[10px] py-0.5"><span class="status-pill-dot"></span>COMPLETED</span>';
    case 'paused': return '<span class="status-pill status-paused text-[10px] py-0.5"><span class="status-pill-dot"></span>PAUSED</span>';
    case 'timeup': return '<span class="status-pill status-timeup text-[10px] py-0.5"><span class="status-pill-dot"></span>TIME UP</span>';
    case 'disqualified': return '<span class="status-pill status-disqualified text-[10px] py-0.5"><span class="status-pill-dot"></span>DQ</span>';
    default: return '<span class="status-pill status-waiting text-[10px] py-0.5"><span class="status-pill-dot"></span>WAITING</span>';
  }
}

// Panel 1: Clue Vault
btnToggleCodes.addEventListener('click', () => {
  showVaultCodes = !showVaultCodes;
  btnToggleCodes.textContent = showVaultCodes ? 'HIDE CODES' : 'SHOW CODES';
  if (currentState) renderClueVault(currentState.clues || []);
});

function renderClueVault(clues) {
  vaultList.innerHTML = clues.map(c => `
    <div class="p-2.5 bg-bg border border-border rounded text-xs space-y-1">
      <div class="flex items-center justify-between">
        <span class="font-bold text-white uppercase">${c.title}</span>
        <span class="font-mono text-[11px] px-1.5 py-0.5 rounded ${showVaultCodes ? 'bg-primary/20 text-primary-light font-bold' : 'bg-border text-text-muted'}">
          ${showVaultCodes ? c.displayCode || c.code : '••••••••'}
        </span>
      </div>
      <p class="text-text-muted text-[11px] line-clamp-2">${c.text}</p>
      <div class="text-[10px] text-primary-light/80 font-mono">LOC: ${c.locationNote || 'Not specified'}</div>
    </div>
  `).join('');
}

// Panel 2: Route Matrix
function renderRouteMatrix(teams, clues) {
  routeMatrixList.innerHTML = teams.map(t => {
    const chips = (t.clueOrder || []).map((cid, idx) => {
      let chipClass = 'bg-border text-text-muted';
      if (idx < t.currentIndex) chipClass = 'bg-primary text-bg font-bold';
      else if (idx === t.currentIndex && (t.status === 'playing' || t.status === 'paused')) chipClass = 'border border-primary-light text-primary-light font-bold';
      return `<span class="px-1.5 py-0.5 rounded text-[10px] font-mono ${chipClass}">C${idx + 1}</span>`;
    }).join(' ');

    return `
      <div class="p-2 bg-bg border border-border rounded flex items-center justify-between text-xs">
        <span class="font-bold text-white truncate max-w-[100px]">${t.name}</span>
        <div class="flex items-center gap-1">${chips}</div>
      </div>
    `;
  }).join('');
}

// Panel 3: Attempts Feed
function renderAttemptsFeed(attempts) {
  if (attempts.length === 0) {
    liveAttemptsList.innerHTML = '<div class="text-text-muted/60 text-center py-4">No attempts recorded yet</div>';
    return;
  }

  liveAttemptsList.innerHTML = attempts.slice(0, 40).map(a => {
    let tag = '<span class="text-danger font-bold">FAIL</span>';
    if (a.result === 'correct') tag = '<span class="text-success font-bold">PASS</span>';
    else if (a.result === 'admin_unlock') tag = '<span class="text-primary-light font-bold">ADMIN</span>';
    else if (a.result === 'locked') tag = '<span class="text-warn font-bold">LOCK</span>';

    const timeStr = new Date(a.tsMs).toLocaleTimeString('en-IN', { hour12: false });

    return `
      <div class="p-1.5 bg-bg/80 border border-border/80 rounded flex items-center justify-between text-[11px]">
        <div class="flex items-center gap-2 truncate">
          <span class="text-text-muted">${timeStr}</span>
          <span class="font-bold text-white truncate max-w-[90px]">${a.teamName}</span>
          <span class="text-primary-light">${a.entered}</span>
        </div>
        <div>${tag}</div>
      </div>
    `;
  }).join('');
}

// Global actions
btnPauseAll.addEventListener('click', async () => {
  const res = await api.adminAction(adminToken, 'pauseAll');
  if (res.ok) {
    showToast(`Paused all active teams (${res.data.count || 0}).`, 'warn');
    fetchState();
  }
});

btnResumeAll.addEventListener('click', async () => {
  const res = await api.adminAction(adminToken, 'resumeAll');
  if (res.ok) {
    showToast(`Resumed all paused teams (${res.data.count || 0}).`);
    fetchState();
  }
});

btnStartAllWaiting.addEventListener('click', async () => {
  const res = await api.adminAction(adminToken, 'startAllWaiting');
  if (res.ok) {
    showToast(`Started ${res.data.count || 0} waiting teams.`);
    fetchState();
  }
});

btnToggleReveal.addEventListener('click', () => {
  const target = !currentState?.event?.leaderboardRevealed;
  openConfirmModal(
    target ? 'REVEAL LEADERBOARD?' : 'HIDE LEADERBOARD?',
    target ? 'This will publish live scores and rankings to the public leaderboard and projector.' : 'This will hide all public team rankings.',
    async () => {
      const res = await api.adminAction(adminToken, 'setReveal', { revealed: target });
      if (res.ok) {
        showToast(target ? 'Leaderboard is now REVEALED!' : 'Leaderboard is now HIDDEN.');
        fetchState();
      }
    }
  );
});

btnStopMission.addEventListener('click', () => {
  openConfirmModal(
    'STOP MISSION FOR ALL TEAMS?',
    'This locks all active and paused teams permanently, saving their finished progress.',
    async () => {
      const res = await api.adminAction(adminToken, 'stopMission');
      if (res.ok) {
        showToast('Mission stopped. All teams locked.', 'danger');
        fetchState();
      }
    }
  );
});

// CSV Export for Attempts
btnExportAttemptsCsv.addEventListener('click', () => {
  if (!currentState?.attempts || currentState.attempts.length === 0) {
    showToast('No attempts to export.', 'warn');
    return;
  }
  const rows = [
    ['Timestamp', 'Team', 'Clue', 'Entered Code', 'Result', 'Elapsed (ms)']
  ];
  currentState.attempts.forEach(a => {
    rows.push([
      new Date(a.tsMs).toISOString(),
      `"${a.teamName}"`,
      `"${a.clueTitle}"`,
      `"${a.entered}"`,
      a.result,
      a.elapsedMs || 0
    ]);
  });
  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `cosmic_hunt_attempts_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('Exported attempts CSV.');
});

// Window command helpers for table actions
window.adminCmd = async function(action, teamId) {
  if (action === 'resetTeam') {
    openConfirmModal(
      'RESET TEAM?',
      'This clears progress and resets this team to the waiting state.',
      async () => {
        const res = await api.adminAction(adminToken, action, { teamId });
        if (res.ok) {
          showToast('Team reset successfully.');
          fetchState();
        }
      }
    );
    return;
  }

  const res = await api.adminAction(adminToken, action, { teamId });
  if (res.ok) {
    showToast(`Action ${action} executed.`);
    fetchState();
  }
};

window.openTimeModal = function(teamId, teamName) {
  modalTimeTeamId.value = teamId;
  modalTimeTitle.textContent = `ADJUST TIME: ${teamName}`;
  modalTime.classList.remove('hidden');
};

btnCancelTime.addEventListener('click', () => modalTime.classList.add('hidden'));

btnConfirmAddTime.addEventListener('click', async () => {
  const teamId = modalTimeTeamId.value;
  const minutes = modalTimeMinutes.value;
  const reason = modalTimeReason.value;
  modalTime.classList.add('hidden');
  const res = await api.adminAction(adminToken, 'addTime', { teamId, minutes, reason });
  if (res.ok) {
    showToast(`Added ${minutes} minutes.`);
    fetchState();
  }
});

btnConfirmRemoveTime.addEventListener('click', async () => {
  const teamId = modalTimeTeamId.value;
  const minutes = modalTimeMinutes.value;
  const reason = modalTimeReason.value;
  modalTime.classList.add('hidden');
  const res = await api.adminAction(adminToken, 'removeTime', { teamId, minutes, reason });
  if (res.ok) {
    showToast(`Removed ${minutes} minutes.`, 'warn');
    fetchState();
  }
});

window.openPenaltyModal = function(teamId, teamName) {
  modalPenaltyTeamId.value = teamId;
  modalPenalty.classList.remove('hidden');
};

btnCancelPenalty.addEventListener('click', () => modalPenalty.classList.add('hidden'));

btnConfirmPenalty.addEventListener('click', async () => {
  const teamId = modalPenaltyTeamId.value;
  const seconds = modalPenaltySeconds.value;
  const reason = modalPenaltyReason.value;
  modalPenalty.classList.add('hidden');
  const res = await api.adminAction(adminToken, 'addPenalty', { teamId, seconds, reason });
  if (res.ok) {
    showToast(`Applied ${seconds}s time penalty.`);
    fetchState();
  }
});

// Confirmation modal helper
function openConfirmModal(title, msg, onProceed, requiresResetInput = false) {
  modalConfirmTitle.textContent = title;
  modalConfirmMessage.textContent = msg;
  onConfirmAction = onProceed;

  if (requiresResetInput) {
    modalConfirmInputWrap.classList.remove('hidden');
    modalConfirmInput.value = '';
  } else {
    modalConfirmInputWrap.classList.add('hidden');
  }

  modalConfirm.classList.remove('hidden');
}

btnModalCancel.addEventListener('click', () => {
  modalConfirm.classList.add('hidden');
  onConfirmAction = null;
});

btnModalProceed.addEventListener('click', () => {
  if (!modalConfirmInputWrap.classList.contains('hidden')) {
    if (modalConfirmInput.value.trim().toUpperCase() !== 'RESET') {
      showToast('Type "RESET" to confirm.', 'danger');
      return;
    }
  }
  modalConfirm.classList.add('hidden');
  if (onConfirmAction) onConfirmAction();
  onConfirmAction = null;
});

// Check auth on load
(async () => {
  if (adminToken && await checkAuth()) {
    showDashboard();
  } else {
    showLogin();
  }
})();

