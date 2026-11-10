import { api } from '../api.js';
import { formatMs } from '../timer.js';

const ADMIN_TOKEN_KEY = 'ch_admin_token';
const adminToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);

if (!adminToken) {
  window.location.replace('/ops-x7q/');
}

// Elements
const tabsNav = document.getElementById('tabs-nav');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const toastContainer = document.getElementById('toast-container');
const btnLogout = document.getElementById('btn-logout');

// Teams elements
const teamsTbody = document.getElementById('teams-tbody');
const btnAddTeam = document.getElementById('btn-add-team');
const btnPrintSlips = document.getElementById('btn-print-slips');
const printArea = document.getElementById('print-area');

const modalTeam = document.getElementById('modal-team');
const modalTeamTitle = document.getElementById('modal-team-title');
const editTeamId = document.getElementById('edit-team-id');
const editTeamName = document.getElementById('edit-team-name');
const editMember1 = document.getElementById('edit-member-1');
const editMember2 = document.getElementById('edit-member-2');
const editMember3 = document.getElementById('edit-member-3');
const editMember4 = document.getElementById('edit-member-4');
const editTeamCode = document.getElementById('edit-team-code');
const btnCancelTeam = document.getElementById('btn-cancel-team');
const btnSaveTeam = document.getElementById('btn-save-team');

// Clues elements
const cluesTbody = document.getElementById('clues-tbody');
const btnAddClue = document.getElementById('btn-add-clue');
const btnImportClues = document.getElementById('btn-import-clues');
const modalClue = document.getElementById('modal-clue');
const modalClueTitle = document.getElementById('modal-clue-title');
const editClueId = document.getElementById('edit-clue-id');
const editClueTitle = document.getElementById('edit-clue-title');
const editClueText = document.getElementById('edit-clue-text');
const editClueCode = document.getElementById('edit-clue-code');
const btnGenCode = document.getElementById('btn-gen-code');
const editClueLocation = document.getElementById('edit-clue-location');
const btnCancelClue = document.getElementById('btn-cancel-clue');
const btnSaveClue = document.getElementById('btn-save-clue');

// Assignment elements
const assignmentCards = document.getElementById('assignment-cards');
const btnAutoShuffle = document.getElementById('btn-auto-shuffle');

// Settings elements
const formSettings = document.getElementById('form-settings');
const settingName = document.getElementById('setting-name');
const settingCollege = document.getElementById('setting-college');
const settingTagline = document.getElementById('setting-tagline');
const settingDateText = document.getElementById('setting-date-text');
const settingDateIso = document.getElementById('setting-date-iso');
const settingDurationMin = document.getElementById('setting-duration-min');
const settingCluesPerTeam = document.getElementById('setting-clues-per-team');
const settingLockoutWrong = document.getElementById('setting-lockout-wrong');
const settingLockoutWindow = document.getElementById('setting-lockout-window');
const settingLockoutLock = document.getElementById('setting-lockout-lock');

// Logs & Export elements
const adminAuditList = document.getElementById('admin-audit-list');
const fullAttemptsList = document.getElementById('full-attempts-list');
const btnExportResults = document.getElementById('btn-export-results');
const btnExportAttempts = document.getElementById('btn-export-attempts');
const btnExportAdminLog = document.getElementById('btn-export-admin-log');

// Danger Zone
const btnLoadSample = document.getElementById('btn-load-sample');
const btnResetEvent = document.getElementById('btn-reset-event');

let state = null;

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

// Tab Switching
tabsNav.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  const target = btn.dataset.tab;

  tabButtons.forEach(b => {
    b.classList.remove('active', 'border-primary', 'text-white', 'font-bold');
    b.classList.add('border-transparent', 'text-text-muted');
  });
  btn.classList.add('active', 'border-primary', 'text-white', 'font-bold');
  btn.classList.remove('border-transparent', 'text-text-muted');

  tabContents.forEach(tc => {
    if (tc.id === `tab-${target}`) {
      tc.classList.remove('hidden');
    } else {
      tc.classList.add('hidden');
    }
  });
});

btnLogout.addEventListener('click', () => {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  window.location.replace('/ops-x7q/');
});

async function loadData() {
  try {
    const res = await api.adminAction(adminToken, 'getAdminState');
    if (!res.ok || !res.data || !res.data.ok) {
      if (res.status === 401) window.location.replace('/ops-x7q/');
      return;
    }
    state = res.data;
    renderAll();
  } catch (err) {
    console.error('Failed to load management state:', err);
  }
}

function renderAll() {
  renderTeams(state.teams || []);
  renderClues(state.clues || []);
  renderAssignment(state.teams || [], state.clues || []);
  populateSettings(state.event || {});
  renderLogs(state.adminLog || [], state.attempts || []);
}

// TAB 1: TEAMS
function renderTeams(teams) {
  teamsTbody.innerHTML = teams.map(t => `
    <tr class="hover:bg-bg/40 transition-colors">
      <td class="py-3 px-4 font-bold text-white uppercase">${t.name}</td>
      <td class="py-3 px-4 text-text-muted text-[11px]">${(t.members || []).join(', ')}</td>
      <td class="py-3 px-4 text-center">
        <span class="px-2 py-1 bg-bg border border-border rounded font-bold text-primary-light">${t.accessCode || '—'}</span>
      </td>
      <td class="py-3 px-4 text-center text-xs uppercase">${t.status}</td>
      <td class="py-3 px-4 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <button class="btn-secondary text-[10px] h-7 px-2" onclick="window.editTeam('${t.id}')">EDIT</button>
          <button class="btn-secondary text-[10px] h-7 px-2" onclick="window.regenTeamCode('${t.id}')">REGEN CODE</button>
          <button class="btn-danger text-[10px] h-7 px-2" onclick="window.deleteTeam('${t.id}')">DELETE</button>
        </div>
      </td>
    </tr>
  `).join('');
}

btnAddTeam.addEventListener('click', () => {
  editTeamId.value = '';
  modalTeamTitle.textContent = 'ADD TEAM';
  editTeamName.value = 'New Team';
  editMember1.value = 'Player 1';
  editMember2.value = 'Player 2';
  editMember3.value = 'Player 3';
  editMember4.value = 'Player 4';
  editTeamCode.value = '';
  modalTeam.classList.remove('hidden');
});

window.editTeam = function(id) {
  const team = state.teams.find(t => t.id === id);
  if (!team) return;
  editTeamId.value = team.id;
  modalTeamTitle.textContent = `EDIT TEAM: ${team.name}`;
  editTeamName.value = team.name;
  editMember1.value = team.members[0] || '';
  editMember2.value = team.members[1] || '';
  editMember3.value = team.members[2] || '';
  editMember4.value = team.members[3] || '';
  editTeamCode.value = team.accessCode || '';
  modalTeam.classList.remove('hidden');
};

btnCancelTeam.addEventListener('click', () => modalTeam.classList.add('hidden'));

btnSaveTeam.addEventListener('click', async () => {
  const id = editTeamId.value;
  const name = editTeamName.value.trim();
  const members = [
    editMember1.value.trim() || 'Player 1',
    editMember2.value.trim() || 'Player 2',
    editMember3.value.trim() || 'Player 3',
    editMember4.value.trim() || 'Player 4'
  ];
  const accessCode = editTeamCode.value.trim();

  modalTeam.classList.add('hidden');

  if (id) {
    const res = await api.adminAction(adminToken, 'updateTeam', { teamId: id, name, members, accessCode });
    if (res.ok) {
      showToast('Team updated.');
      loadData();
    }
  } else {
    const res = await api.adminAction(adminToken, 'createTeam', { name, members, accessCode });
    if (res.ok) {
      showToast('Team created.');
      loadData();
    }
  }
});

window.regenTeamCode = async function(teamId) {
  const res = await api.adminAction(adminToken, 'regenerateCode', { teamId });
  if (res.ok) {
    showToast(`New code: ${res.data.accessCode}`);
    loadData();
  }
};

window.deleteTeam = async function(teamId) {
  if (!confirm('Are you sure you want to delete this team?')) return;
  const res = await api.adminAction(adminToken, 'deleteTeam', { teamId });
  if (res.ok) {
    showToast('Team deleted.');
    loadData();
  }
};

// Printable Slips Generator
btnPrintSlips.addEventListener('click', () => {
  if (!state?.teams) return;
  printArea.innerHTML = state.teams.map(t => `
    <div class="slip-card">
      <div style="font-size: 22px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px;">
        COSMIC HUNT — TEAM ACCESS SLIP
      </div>
      <div style="font-size: 14px; margin-bottom: 12px; color: #555;">
        Nirmala Memorial Foundation College of Commerce & Science | 27 Nov 2026
      </div>
      <div style="font-size: 26px; font-weight: 800; margin-bottom: 8px;">
        TEAM: ${t.name}
      </div>
      <div style="font-size: 14px; margin-bottom: 16px;">
        Members: ${(t.members || []).join(', ')}
      </div>
      <div style="background: #f0f4f8; padding: 12px; font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 4px; text-align: center; border: 2px solid #000; margin-bottom: 16px;">
        ${t.accessCode}
      </div>
      <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">
        Website Address: Open browser & go to Team Login
      </div>
      <div style="font-size: 10px; color: #444; line-height: 1.4;">
        Directives: Exactly 4 players per team. Inside college premises only. 30 minutes play time. Phones used for outside help lead to disqualification. Organizers' decision is final.
      </div>
    </div>
  `).join('');

  printArea.classList.remove('hidden');
  window.print();
  printArea.classList.add('hidden');
});

// TAB 2: CLUES
function renderClues(clues) {
  cluesTbody.innerHTML = clues.map(c => `
    <tr class="hover:bg-bg/40 transition-colors">
      <td class="py-3 px-4 font-bold text-white">${c.title}</td>
      <td class="py-3 px-4 text-text-muted text-[11px] max-w-xs truncate">${c.text}</td>
      <td class="py-3 px-4 text-center font-bold text-primary-light">${c.displayCode || c.code}</td>
      <td class="py-3 px-4 text-text-muted text-[11px]">${c.locationNote || '—'}</td>
      <td class="py-3 px-4 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <button class="btn-secondary text-[10px] h-7 px-2" onclick="window.editClue('${c.id}')">EDIT</button>
          <button class="btn-danger text-[10px] h-7 px-2" onclick="window.deleteClue('${c.id}')">DELETE</button>
        </div>
      </td>
    </tr>
  `).join('');
}

btnAddClue.addEventListener('click', () => {
  editClueId.value = '';
  modalClueTitle.textContent = 'ADD CLUE';
  editClueTitle.value = '';
  editClueText.value = '';
  editClueCode.value = '';
  editClueLocation.value = '';
  modalClue.classList.remove('hidden');
});

window.editClue = function(id) {
  const clue = state.clues.find(c => c.id === id);
  if (!clue) return;
  editClueId.value = clue.id;
  modalClueTitle.textContent = `EDIT CLUE: ${clue.title}`;
  editClueTitle.value = clue.title;
  editClueText.value = clue.text;
  editClueCode.value = clue.displayCode || clue.code;
  editClueLocation.value = clue.locationNote || '';
  modalClue.classList.remove('hidden');
};

btnCancelClue.addEventListener('click', () => modalClue.classList.add('hidden'));

btnGenCode.addEventListener('click', () => {
  const prefixes = ['MAR', 'VEN', 'JUP', 'SAT', 'NEP', 'YEL', 'SOL', 'LUN'];
  const pfx = prefixes[Math.floor(Math.random() * prefixes.length)];
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rest = '';
  for (let i = 0; i < 4; i++) {
    rest += chars[Math.floor(Math.random() * chars.length)];
  }
  editClueCode.value = `${pfx}-${rest}`;
});

btnSaveClue.addEventListener('click', async () => {
  const id = editClueId.value;
  const title = editClueTitle.value.trim();
  const text = editClueText.value.trim();
  const code = editClueCode.value.trim();
  const locationNote = editClueLocation.value.trim();

  modalClue.classList.add('hidden');

  if (id) {
    const res = await api.adminAction(adminToken, 'updateClue', { clueId: id, title, text, code, locationNote });
    if (res.ok) {
      showToast('Clue updated.');
      loadData();
    }
  } else {
    const res = await api.adminAction(adminToken, 'createClue', { title, text, code, locationNote });
    if (res.ok) {
      showToast('Clue created.');
      loadData();
    }
  }
});

window.deleteClue = async function(clueId) {
  if (!confirm('Are you sure you want to delete this clue?')) return;
  const res = await api.adminAction(adminToken, 'deleteClue', { clueId });
  if (res.ok) {
    showToast('Clue deleted.');
    loadData();
  }
};

btnImportClues.addEventListener('click', () => {
  const input = prompt('Paste Clues JSON array (or enter CSV format):');
  if (!input) return;
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      Promise.all(parsed.map(c => api.adminAction(adminToken, 'createClue', c))).then(() => {
        showToast('Imported clues from JSON.');
        loadData();
      });
    }
  } catch {
    alert('Invalid JSON. Please provide a valid JSON array of clues.');
  }
});

// TAB 3: ASSIGNMENT
function renderAssignment(teams, clues) {
  assignmentCards.innerHTML = teams.map(t => {
    const clueOrder = t.clueOrder || [];
    const rows = clueOrder.map((cid, slotIdx) => {
      const clueObj = clues.find(c => c.id === cid);
      return `
        <div class="flex items-center justify-between p-2 bg-bg border border-border rounded text-xs">
          <div class="flex items-center gap-2">
            <span class="font-bold text-primary-light">#${slotIdx + 1}</span>
            <span class="text-white font-medium">${clueObj ? clueObj.title : 'Unknown'}</span>
          </div>
          <div class="flex items-center gap-1">
            <button class="px-1.5 py-0.5 bg-border hover:bg-primary-light hover:text-bg rounded" onclick="window.moveClue('${t.id}', ${slotIdx}, -1)">▲</button>
            <button class="px-1.5 py-0.5 bg-border hover:bg-primary-light hover:text-bg rounded" onclick="window.moveClue('${t.id}', ${slotIdx}, 1)">▼</button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="bg-panel-solid border border-border p-4 rounded space-y-3 frame-offset">
        <div class="flex items-center justify-between">
          <h3 class="font-heading font-bold text-white uppercase text-base">${t.name}</h3>
          <span class="text-xs font-mono text-text-muted">6 CLUES ORDERED</span>
        </div>
        <div class="space-y-1.5">${rows}</div>
      </div>
    `;
  }).join('');
}

window.moveClue = async function(teamId, index, delta) {
  const team = state.teams.find(t => t.id === teamId);
  if (!team) return;
  const newOrder = [...team.clueOrder];
  const target = index + delta;
  if (target < 0 || target >= newOrder.length) return;

  const temp = newOrder[index];
  newOrder[index] = newOrder[target];
  newOrder[target] = temp;

  const res = await api.adminAction(adminToken, 'setClueOrder', { teamId, clueOrder: newOrder });
  if (res.ok) loadData();
};

btnAutoShuffle.addEventListener('click', async () => {
  if (!confirm('Auto-shuffle all team paths using the rotation algorithm?')) return;
  const res = await api.adminAction(adminToken, 'autoShuffle');
  if (res.ok) {
    showToast('Auto-shuffled all paths.');
    loadData();
  }
});

// TAB 4: SETTINGS
function populateSettings(ev) {
  settingName.value = ev.name || 'COSMIC HUNT';
  settingCollege.value = ev.college || 'Nirmala Memorial Foundation College of Commerce & Science';
  settingTagline.value = ev.tagline || 'Decode the campus. Reach the stars.';
  settingDateText.value = ev.eventDateText || '27 Nov 2026 | 10:00 AM';
  settingDateIso.value = ev.eventDateIso || '2026-11-27T10:00:00+05:30';
  settingDurationMin.value = Math.round((ev.durationMs || 1800000) / 60000);
  settingCluesPerTeam.value = ev.cluesPerTeam || 6;

  const lo = ev.lockout || { maxWrong: 5, windowSec: 60, lockSec: 30 };
  settingLockoutWrong.value = lo.maxWrong;
  settingLockoutWindow.value = lo.windowSec;
  settingLockoutLock.value = lo.lockSec;
}

formSettings.addEventListener('submit', async (e) => {
  e.preventDefault();
  const ev = {
    name: settingName.value.trim(),
    college: settingCollege.value.trim(),
    tagline: settingTagline.value.trim(),
    eventDateText: settingDateText.value.trim(),
    eventDateIso: settingDateIso.value.trim(),
    durationMs: Number(settingDurationMin.value) * 60 * 1000,
    cluesPerTeam: Number(settingCluesPerTeam.value),
    lockout: {
      maxWrong: Number(settingLockoutWrong.value),
      windowSec: Number(settingLockoutWindow.value),
      lockSec: Number(settingLockoutLock.value)
    }
  };

  const res = await api.adminAction(adminToken, 'updateEvent', { event: ev });
  if (res.ok) {
    showToast('Settings saved successfully.');
    loadData();
  }
});

// TAB 5: LOGS & EXPORT
function renderLogs(adminLogs, attempts) {
  adminAuditList.innerHTML = adminLogs.slice(0, 50).map(l => {
    const timeStr = new Date(l.tsMs).toLocaleTimeString('en-IN', { hour12: false });
    return `
      <div class="p-2 bg-bg/80 border border-border rounded flex items-center justify-between">
        <div>
          <span class="text-primary-light font-bold">${l.action}</span>
          <span class="text-text-muted text-[11px] ml-2">${l.detail}</span>
        </div>
        <span class="text-text-muted/60 text-[10px]">${timeStr}</span>
      </div>
    `;
  }).join('');

  fullAttemptsList.innerHTML = attempts.slice(0, 50).map(a => {
    const timeStr = new Date(a.tsMs).toLocaleTimeString('en-IN', { hour12: false });
    return `
      <div class="p-2 bg-bg/80 border border-border rounded flex items-center justify-between">
        <div>
          <span class="text-white font-bold">${a.teamName}</span>:
          <span class="text-text-muted">${a.entered}</span>
          <span class="text-primary-light">(${a.clueTitle})</span>
        </div>
        <span class="font-bold ${a.result === 'correct' ? 'text-success' : 'text-danger'}">${a.result}</span>
      </div>
    `;
  }).join('');
}

btnExportResults.addEventListener('click', () => {
  if (!state?.teams) return;
  const rows = [
    ['Rank', 'Team', 'Members', 'Clues Solved', 'Rank Time', 'Status', 'Wrong Attempts', 'Admin Unlocks', 'Penalty (s)']
  ];
  state.teams.forEach((t, idx) => {
    const rankTimeMs = (t.lastSolvedElapsedMs || 0) + (t.penaltyMs || 0);
    rows.push([
      idx + 1,
      `"${t.name}"`,
      `"${(t.members || []).join(', ')}"`,
      t.solvedCount || 0,
      formatMs(rankTimeMs).full,
      t.status,
      t.wrongCount || 0,
      t.adminUnlockCount || 0,
      Math.round((t.penaltyMs || 0) / 1000)
    ]);
  });
  downloadCsv(rows, `cosmic_hunt_results_${Date.now()}.csv`);
});

btnExportAttempts.addEventListener('click', () => {
  if (!state?.attempts) return;
  const rows = [
    ['Timestamp', 'Team', 'Clue', 'Entered Code', 'Result', 'Elapsed (ms)']
  ];
  state.attempts.forEach(a => {
    rows.push([
      new Date(a.tsMs).toISOString(),
      `"${a.teamName}"`,
      `"${a.clueTitle}"`,
      `"${a.entered}"`,
      a.result,
      a.elapsedMs || 0
    ]);
  });
  downloadCsv(rows, `cosmic_hunt_attempts_${Date.now()}.csv`);
});

btnExportAdminLog.addEventListener('click', () => {
  if (!state?.adminLog) return;
  const rows = [
    ['Timestamp', 'Action', 'Detail', 'Team', 'By']
  ];
  state.adminLog.forEach(l => {
    rows.push([
      new Date(l.tsMs).toISOString(),
      l.action,
      `"${l.detail}"`,
      `"${l.teamName || ''}"`,
      l.by
    ]);
  });
  downloadCsv(rows, `cosmic_hunt_audit_log_${Date.now()}.csv`);
});

function downloadCsv(rows, filename) {
  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('Downloaded ' + filename);
}

// TAB 6: DANGER ZONE
btnLoadSample.addEventListener('click', async () => {
  const confirmStr = prompt('Type "RESET" to wipe all data and reload default sample teams and clues:');
  if (confirmStr !== 'RESET') {
    showToast('Action canceled. "RESET" was not entered.', 'warn');
    return;
  }
  const res = await api.adminAction(adminToken, 'loadSampleData', { confirm: 'RESET' });
  if (res.ok) {
    showToast('Sample data reloaded.');
    loadData();
  }
});

btnResetEvent.addEventListener('click', async () => {
  const confirmStr = prompt('Type "RESET" to clear all timers and scores for all teams:');
  if (confirmStr !== 'RESET') {
    showToast('Action canceled. "RESET" was not entered.', 'warn');
    return;
  }
  const res = await api.adminAction(adminToken, 'resetEvent', { confirm: 'RESET' });
  if (res.ok) {
    showToast('Event reset successfully.');
    loadData();
  }
});

loadData();

