import { DAYS, EXERCISE_TO_DAY } from './exercises.js';
import { renderDay } from './views/day.js';
import { renderLogger } from './views/logger.js';
import { readQueue, dequeueById } from './store.js';
import { createSet } from './api.js';
import { setStatus, clearStatus } from './status.js';
import { el, fragmentFromTemplate } from './util.js';

const view    = document.getElementById('view');
const title   = document.getElementById('title');
const backBtn = document.getElementById('back-btn');

const routes = {
  home:     ()       => renderHome(),
  day:      (params) => renderDayView(params.day),
  logger:   (params) => renderLoggerView(params.exercise),
};

function setTitle(t) { title.textContent = t; }

function setBackVisible(visible) {
  backBtn.hidden = !visible;
}

function pushRoute(name, params = {}) {
  const hash = paramsToHash(name, params);
  if (location.hash !== hash) {
    history.pushState(null, '', hash);
  }
  resolveRoute();
}

function paramsToHash(name, params) {
  if (name === 'home') return '#/';
  if (name === 'day')  return `#/day/${encodeURIComponent(params.day)}`;
  if (name === 'logger') return `#/logger/${encodeURIComponent(params.exercise)}`;
  return '#/';
}

function parseHash() {
  const h = location.hash || '#/';
  const parts = h.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0)                       return { name: 'home', params: {} };
  if (parts[0] === 'day'    && parts[1])        return { name: 'day',    params: { day: parts[1] } };
  if (parts[0] === 'logger' && parts[1])        return { name: 'logger', params: { exercise: parts[1] } };
  return { name: 'home', params: {} };
}

function resolveRoute() {
  // tear down previous view if it left a cleanup
  if (view._cleanupCurrent) {
    try { view._cleanupCurrent(); } catch {}
    view._cleanupCurrent = null;
  }

  const { name, params } = parseHash();
  // validate params
  if (name === 'day' && !DAYS.includes(params.day))               return go('home');
  if (name === 'logger' && !EXERCISE_TO_DAY[params.exercise])     return go('home');

  setBackVisible(name !== 'home');
  routes[name](params);
}

function go(name, params) {
  pushRoute(name, params);
}

/* ---------- views ---------- */

function renderHome() {
  setTitle('Overload');
  const frag = fragmentFromTemplate('tpl-home');
  view.replaceChildren(frag);
  view.querySelectorAll('[data-day]').forEach((btn) => {
    btn.addEventListener('click', () => go('day', { day: btn.dataset.day }));
  });
}

function renderDayView(day) {
  renderDay(view, day, {
    onTitle: setTitle,
    onPickExercise: (name) => go('logger', { exercise: name }),
  });
}

function renderLoggerView(exercise) {
  renderLogger(view, exercise, {
    onTitle: setTitle,
    onBack: () => go('day', { day: EXERCISE_TO_DAY[exercise] }),
  });
}

/* ---------- offline queue flush ---------- */

async function flushQueue() {
  const queued = readQueue();
  if (queued.length === 0) return;
  setStatus('queued', `syncing ${queued.length}`, { sticky: true });
  let okCount = 0;
  for (const item of queued) {
    try {
      await createSet({ exercise: item.exercise, weight: item.weight, reps: item.reps, notes: item.notes });
      dequeueById(item.tempId);
      okCount++;
    } catch {
      // stop on first failure to preserve order
      setStatus('error', 'sync failed');
      return;
    }
  }
  setStatus('ok', `synced ${okCount}`);
}

/* ---------- wire up ---------- */

backBtn.addEventListener('click', () => {
  const { name, params } = parseHash();
  if (name === 'logger') return go('day', { day: EXERCISE_TO_DAY[params.exercise] });
  return go('home');
});

window.addEventListener('popstate', resolveRoute);
window.addEventListener('hashchange', resolveRoute);
window.addEventListener('online', flushQueue);
window.addEventListener('focus', flushQueue);

resolveRoute();
flushQueue();
clearStatus();

// PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW register failed', err);
    });
  });
}
