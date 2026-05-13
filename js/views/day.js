import { EXERCISES_BY_DAY, DAY_LABELS } from '../exercises.js';
import { listSets } from '../api.js';
import { cacheSets, readCachedSets } from '../store.js';
import { el, fragmentFromTemplate, formatShortDate, formatSet, groupByDay } from '../util.js';

function topSetOf(sets) {
  let best = null;
  let bestScore = -Infinity;
  for (const s of sets) {
    const score = Number(s.weight) * Number(s.reps);
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return best;
}

function lastSessionSummary(setsNewestFirst) {
  if (!setsNewestFirst || setsNewestFirst.length === 0) return null;
  const grouped = groupByDay(setsNewestFirst);
  const [dateKey, sets] = grouped[0];
  const top = topSetOf(sets);
  return {
    dateKey,
    date: sets[0].performed_at,
    top,
    count: sets.length,
  };
}

function renderRow(name, onTap) {
  const cached = readCachedSets(name);
  const summary = lastSessionSummary(cached);
  const lastText = summary
    ? `${formatShortDate(summary.date)} · ${formatSet(summary.top)} · ${summary.count} set${summary.count === 1 ? '' : 's'}`
    : 'No data yet';
  const row = el(
    'li',
    { class: 'exrow', role: 'button', tabindex: '0', onclick: () => onTap(name) },
    el('div', {},
      el('div', { class: 'name' }, name),
      el('div', { class: 'last', dataset: { last: 'true' } }, lastText),
    ),
    el('span', { class: 'chev' }, '›'),
  );
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(name); }
  });
  return row;
}

async function refreshLast(exercise, row) {
  try {
    const sets = await listSets({ exercise, limit: 20 });
    cacheSets(exercise, sets);
    const summary = lastSessionSummary(sets);
    const lastEl = row.querySelector('[data-last]');
    if (lastEl) {
      lastEl.textContent = summary
        ? `${formatShortDate(summary.date)} · ${formatSet(summary.top)} · ${summary.count} set${summary.count === 1 ? '' : 's'}`
        : 'No data yet';
    }
  } catch {
    /* offline → keep cached text */
  }
}

export function renderDay(container, day, { onTitle, onPickExercise }) {
  onTitle(DAY_LABELS[day] ?? 'Workout');
  const frag = fragmentFromTemplate('tpl-day');
  const list = frag.getElementById('exlist');
  const exercises = EXERCISES_BY_DAY[day] ?? [];
  const rows = exercises.map((name) => {
    const row = renderRow(name, onPickExercise);
    list.append(row);
    return { name, row };
  });
  container.replaceChildren(frag);
  // Refresh each row's "last" in parallel — cached value shows immediately.
  rows.forEach(({ name, row }) => { refreshLast(name, row); });
}
