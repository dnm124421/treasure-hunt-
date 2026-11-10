import { api } from './api.js';
import { EVENT } from './content.js';

let eventDateMs = new Date(EVENT.dateIso).getTime();
let eventStatus = 'setup';

function updateCountdown() {
  const now = Date.now();
  const diff = eventDateMs - now;

  const daysEl = document.getElementById('count-days');
  const hoursEl = document.getElementById('count-hours');
  const minsEl = document.getElementById('count-mins');
  const secsEl = document.getElementById('count-secs');

  if (diff <= 0 || eventStatus === 'live' || eventStatus === 'stopped') {
    if (daysEl) daysEl.textContent = '00';
    if (hoursEl) hoursEl.textContent = '00';
    if (minsEl) minsEl.textContent = '00';
    if (secsEl) secsEl.textContent = '00';
    return;
  }

  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / (1000 * 60)) % 60);
  const s = Math.floor((diff / 1000) % 60);

  if (daysEl) daysEl.textContent = String(d).padStart(2, '0');
  if (hoursEl) hoursEl.textContent = String(h).padStart(2, '0');
  if (minsEl) minsEl.textContent = String(m).padStart(2, '0');
  if (secsEl) secsEl.textContent = String(s).padStart(2, '0');
}

function updateStatusPill(status) {
  const pill = document.getElementById('event-status-pill');
  const text = document.getElementById('event-status-text');
  if (!pill || !text) return;

  pill.className = 'status-pill';
  if (status === 'live') {
    pill.classList.add('status-playing');
    text.textContent = 'MISSION LIVE';
  } else if (status === 'stopped') {
    pill.classList.add('status-completed');
    text.textContent = 'MISSION ENDED';
  } else {
    pill.classList.add('status-waiting');
    text.textContent = 'NOT STARTED';
  }
}

async function loadConfig() {
  try {
    const res = await api.getPublicConfig();
    if (res.ok && res.data) {
      if (res.data.eventDateIso) {
        eventDateMs = new Date(res.data.eventDateIso).getTime();
      }
      eventStatus = res.data.status || 'setup';
      updateStatusPill(eventStatus);
    }
  } catch (err) {
    console.warn('Using baked-in configuration fallbacks.');
  }
}

// Background Video Controller (FIX-01)
const v = document.getElementById('heroVideo');
if (v) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection && navigator.connection.saveData;
  if (reduce || saveData) {
    v.removeAttribute('autoplay');
    v.pause();
    v.preload = 'none';
  } else {
    v.muted = true;
    v.play().catch(() => {
      window.addEventListener('pointerdown', () => v.play(), { once: true });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        v.pause();
      } else {
        v.play().catch(() => {});
      }
    });
  }
}

// Initial calls
loadConfig();
updateCountdown();
setInterval(updateCountdown, 1000);
setInterval(loadConfig, 30000);
