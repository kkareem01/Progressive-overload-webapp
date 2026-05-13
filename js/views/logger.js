import { listSets, createSet, deleteSet } from '../api.js';
import {
  cacheSets, readCachedSets, appendCachedSet, removeCachedSet,
  newTempId,
} from '../store.js';
import { annotatePrs, prTagsFor } from '../pr.js';
import {
  el, fragmentFromTemplate, formatSet, formatShortDate,
  groupByDay, todayKey, localDateKey,
} from '../util.js';
import { setStatus } from '../status.js';
import { renderProgressTab } from './progress.js';
import { renderHistoryTab } from './history.js';

const TABS = ['log', 'progress', 'history'];

function partition(sets) {
  const today = [];
  const prior = [];
  const k = todayKey();
  for (const s of sets) {
    if (localDateKey(s.performed_at) === k) today.push(s);
    else prior.push(s);
  }
  return { today, prior };
}

function priorLatestSession(priorSets) {
  if (priorSets.length === 0) return null;
  const grouped = groupByDay(priorSets);
  return grouped[0]; // [dateKey, sets]
}

function renderSetRow(s, tags, { onDelete } = {}) {
  const items = [];
  items.push(el('span', { class: 'set-label' }, formatSet(s)));
  if (tags && tags.length) {
    items.push(el('span', { class: 'pr-badge' }, tags.join(' · ') + ' PR'));
  }
  const right = [el('span', { class: 'set-meta' }, ...items)];
  if (onDelete) {
    right.push(el('button', {
      class: 'delbtn', 'aria-label': 'Delete set',
      onclick: () => onDelete(s),
    }, '×'));
  }
  return el('li', {}, ...right);
}

function buildLogger(exercise, { onTitle, onBack }) {
  onTitle(exercise);
  const frag = fragmentFromTemplate('tpl-logger');
  const root = frag.firstElementChild;

  // Wire tabs
  const tabBtns = root.querySelectorAll('.tab');
  const panes = {
    log:      root.querySelector('#pane-log'),
    progress: root.querySelector('#pane-progress'),
    history:  root.querySelector('#pane-history'),
  };
  function switchTab(name) {
    tabBtns.forEach((b) => {
      b.classList.toggle('tab--active', b.dataset.tab === name);
    });
    TABS.forEach((t) => { panes[t].hidden = t !== name; });
    if (name === 'progress') renderProgressTab(panes.progress, exercise, state.sets);
    if (name === 'history')  renderHistoryTab(panes.history, exercise, state.sets, refreshAfterDelete);
  }
  tabBtns.forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  // Wire steppers
  const weightInput = root.querySelector('#weight');
  const repsInput   = root.querySelector('#reps');
  root.querySelectorAll('[data-step]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const which = btn.dataset.step;
      const delta = Number(btn.dataset.delta);
      const input = which === 'weight' ? weightInput : repsInput;
      const cur = Number(input.value) || 0;
      const next = which === 'weight'
        ? Math.max(0, Math.round((cur + delta) * 10) / 10)
        : Math.max(1, Math.round(cur + delta));
      input.value = String(next);
    });
  });
  [weightInput, repsInput].forEach((inp) => {
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('change', () => {
      const n = Number(inp.value);
      if (!Number.isFinite(n) || n < 0) inp.value = inp === weightInput ? '0' : '1';
    });
  });

  // Log button
  root.querySelector('#log-set').addEventListener('click', onLogSet);

  // State
  const state = {
    sets: [],          // all sets for this exercise, newest-first
    prTagsById: new Map(),
  };

  function refreshLists() {
    const { today, prior } = partition(state.sets);
    const latest = priorLatestSession(prior);
    const prevList = root.querySelector('#prev-list');
    const todayList = root.querySelector('#today-list');
    const todayDate = root.querySelector('#today-date');

    todayDate.textContent = today.length ? `(${today.length} set${today.length === 1 ? '' : 's'})` : '';

    // previous session — show all sets that day, dimmed, with PR tags they earned
    prevList.replaceChildren();
    if (latest) {
      const [dateKey, sets] = latest;
      prevList.append(el('li', { class: 'day-divider', html: `<span>${formatShortDate(sets[0].performed_at)}</span>` }));
      sets.forEach((s) => {
        prevList.append(renderSetRow(s, state.prTagsById.get(s.id)));
      });
    } else {
      prevList.append(el('li', {}, el('span', { class: 'set-label' }, 'No prior data')));
    }

    // today's sets — newest at top
    todayList.replaceChildren();
    if (today.length === 0) {
      todayList.append(el('li', {}, el('span', { class: 'set-label' }, 'No sets logged yet today')));
    } else {
      today.forEach((s) => {
        todayList.append(renderSetRow(s, state.prTagsById.get(s.id), {
          onDelete: deleteSetWithConfirm,
        }));
      });
    }
  }

  function recomputePrs() {
    state.prTagsById = annotatePrs(state.sets);
  }

  async function load() {
    // 1. Paint cache instantly
    state.sets = readCachedSets(exercise);
    recomputePrs();
    refreshLists();

    // 2. Refresh from server
    try {
      const fresh = await listSets({ exercise, limit: 500 });
      state.sets = fresh;
      cacheSets(exercise, fresh);
      recomputePrs();
      refreshLists();
    } catch (err) {
      console.warn('listSets failed', err);
    }
  }

  async function onLogSet() {
    const weight = Number(weightInput.value);
    const reps   = Number.parseInt(repsInput.value, 10);
    if (!Number.isFinite(weight) || weight < 0) { setStatus('error', 'bad weight'); return; }
    if (!Number.isInteger(reps) || reps < 1)    { setStatus('error', 'bad reps'); return; }

    const tempId = newTempId();
    const optimistic = {
      id: tempId,
      exercise,
      weight,
      reps,
      performed_at: new Date().toISOString(),
      notes: null,
      _pending: true,
    };

    // optimistic insert
    state.sets = [optimistic, ...state.sets];
    const priorOnly = state.sets.filter((s) => s.id !== tempId);
    const tagsNow = prTagsFor(optimistic, priorOnly);
    if (tagsNow.length) state.prTagsById.set(tempId, tagsNow);
    refreshLists();

    if (navigator.vibrate) navigator.vibrate(15);

    try {
      const saved = await createSet({ exercise, weight, reps });
      state.sets = state.sets.map((s) => (s.id === tempId ? saved : s));
      appendCachedSet(exercise, saved);
      recomputePrs();
      refreshLists();
      setStatus('ok', 'saved');
    } catch (err) {
      // validation failure — undo optimistic insert
      state.sets = state.sets.filter((s) => s.id !== tempId);
      state.prTagsById.delete(tempId);
      recomputePrs();
      refreshLists();
      setStatus('error', err.message || 'save failed');
    }
  }

  async function deleteSetWithConfirm(s) {
    if (!confirm(`Delete this set: ${formatSet(s)}?`)) return;
    // optimistic remove
    state.sets = state.sets.filter((x) => x.id !== s.id);
    recomputePrs();
    refreshLists();
    if (typeof s.id === 'string' && s.id.startsWith('tmp_')) {
      // never persisted; just done
      return;
    }
    try {
      await deleteSet(s.id);
      removeCachedSet(exercise, s.id);
      setStatus('ok', 'deleted');
    } catch (err) {
      setStatus('error', 'delete failed');
      // restore on failure
      state.sets = [s, ...state.sets].sort(
        (a, b) => new Date(b.performed_at) - new Date(a.performed_at)
      );
      recomputePrs();
      refreshLists();
    }
  }

  async function refreshAfterDelete() {
    try {
      const fresh = await listSets({ exercise, limit: 500 });
      state.sets = fresh;
      cacheSets(exercise, fresh);
      recomputePrs();
      refreshLists();
    } catch { /* keep cached */ }
  }

  load();

  return root;
}

export function renderLogger(container, exercise, ctx) {
  const root = buildLogger(exercise, ctx);
  container.replaceChildren(root);
}
