import { api } from './api.js';
import { teamSession } from './team-session.js';

// If already authenticated with a valid session token, redirect to game console
if (teamSession.isLoggedIn()) {
  window.location.replace('/play');
}

const inputEl = document.getElementById('code-input');
const boxes = document.querySelectorAll('.code-box');
const counterEl = document.getElementById('char-counter');
const errorEl = document.getElementById('error-message');
const submitBtn = document.getElementById('btn-submit');
const boxesContainer = document.getElementById('boxes-container');

const toggleRulesBtn = document.getElementById('toggle-rules');
const rulesContent = document.getElementById('rules-content');
const rulesChevron = document.getElementById('rules-chevron');

const conflictModal = document.getElementById('conflict-modal');
const btnCancelConflict = document.getElementById('btn-cancel-conflict');
const btnForceConflict = document.getElementById('btn-force-conflict');

let currentCode = '';
let lockoutTimer = null;

function renderBoxes(val) {
  currentCode = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (inputEl.value !== currentCode) {
    inputEl.value = currentCode;
  }

  boxes.forEach((box, idx) => {
    const char = currentCode[idx] || '';
    box.textContent = char;
    if (char) {
      box.classList.add('border-primary-light', 'shadow-glow');
    } else {
      box.classList.remove('border-primary-light', 'shadow-glow');
    }
  });

  counterEl.textContent = `${currentCode.length} / 6`;
  submitBtn.disabled = currentCode.length !== 6;
  hideError();
}

function showError(msg) {
  if (!errorEl) return;
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
  boxesContainer.classList.add('animate-shake');
  setTimeout(() => boxesContainer.classList.remove('animate-shake'), 400);
}

function hideError() {
  if (errorEl) errorEl.classList.add('hidden');
}

function startLockout(seconds) {
  let left = seconds;
  submitBtn.disabled = true;
  inputEl.disabled = true;

  if (lockoutTimer) clearInterval(lockoutTimer);
  showError(`Too many attempts. Try again in ${left} seconds.`);

  lockoutTimer = setInterval(() => {
    left--;
    if (left <= 0) {
      clearInterval(lockoutTimer);
      hideError();
      inputEl.disabled = false;
      submitBtn.disabled = currentCode.length !== 6;
    } else {
      showError(`Too many attempts. Try again in ${left} seconds.`);
    }
  }, 1000);
}

async function doLogin(force = false) {
  if (currentCode.length !== 6) return;

  hideError();
  submitBtn.disabled = true;
  const originalHtml = submitBtn.innerHTML;
  submitBtn.innerHTML = `
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-bg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>CHECKING...</span>
  `;

  try {
    const res = await api.teamLogin(currentCode, force);

    if (res.status === 429 && res.data.retryAfterSec) {
      startLockout(res.data.retryAfterSec);
      submitBtn.innerHTML = originalHtml;
      return;
    }

    if (!res.ok || !res.data) {
      showError('Signal lost. Check your connection and try again.');
      submitBtn.innerHTML = originalHtml;
      submitBtn.disabled = false;
      return;
    }

    if (res.data.ok) {
      teamSession.save(res.data.token, res.data.teamName);
      window.location.href = '/play';
      return;
    }

    if (res.data.reason === 'active_elsewhere') {
      conflictModal.classList.remove('hidden');
      submitBtn.innerHTML = originalHtml;
      submitBtn.disabled = false;
      return;
    }

    if (res.data.reason === 'rate_limited') {
      startLockout(res.data.retryAfterSec || 30);
      submitBtn.innerHTML = originalHtml;
      return;
    }

    // Generic invalid code
    showError('Invalid team code. Check your slip.');
  } catch (err) {
    showError('Signal lost. Check your connection and try again.');
  } finally {
    submitBtn.innerHTML = originalHtml;
    submitBtn.disabled = currentCode.length !== 6;
  }
}

// Input listeners
inputEl.addEventListener('input', (e) => {
  renderBoxes(e.target.value);
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && currentCode.length === 6) {
    doLogin(false);
  }
});

submitBtn.addEventListener('click', () => doLogin(false));

// Modal handlers
btnCancelConflict.addEventListener('click', () => {
  conflictModal.classList.add('hidden');
});

btnForceConflict.addEventListener('click', () => {
  conflictModal.classList.add('hidden');
  doLogin(true);
});

// Toggle rules accordion
toggleRulesBtn.addEventListener('click', () => {
  const isHidden = rulesContent.classList.contains('hidden');
  if (isHidden) {
    rulesContent.classList.remove('hidden');
    rulesChevron.classList.add('rotate-180');
  } else {
    rulesContent.classList.add('hidden');
    rulesChevron.classList.remove('rotate-180');
  }
});

// Initial focus
window.addEventListener('DOMContentLoaded', () => {
  inputEl.focus();
});

