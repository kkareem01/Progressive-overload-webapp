import { annotatePrs } from '../pr.js';
import { deleteSet } from '../api.js';
import { removeCachedSet } from '../store.js';
import { setStatus } from '../status.js';
import { el, groupByDay, formatShortDate, formatSet } from '../util.js';

function renderRow(s, tags, onDelete) {
  const right = [];
  right.push(el('span', { class: 'set-label' }, formatSet(s)));
  if (tags && tags.length) {
    right.push(el('span', { class: 'pr-badge' }, tags.join(' · ') + ' PR'));
  }
  return el('li', {},
    el('span', { class: 'set-meta' }, ...right),
    el('button', {
      class: 'delbtn', 'aria-label': 'Delete set',
      onclick: () => onDelete(s),
    }, '×'),
  );
}

export function renderHistoryTab(pane, exercise, sets, onChanged) {
  const list = pane.querySelector('#history-list');
  list.replaceChildren();

  if (!sets || sets.length === 0) {
    list.append(el('li', {}, el('span', { class: 'set-label' }, 'No sets yet')));
    return;
  }

  const tagsById = annotatePrs(sets);
  const grouped = groupByDay(sets);

  async function handleDelete(s) {
    if (!confirm(`Delete this set: ${formatSet(s)}?`)) return;
    try {
      await deleteSet(s.id);
      removeCachedSet(exercise, s.id);
      setStatus('ok', 'deleted');
      if (typeof onChanged === 'function') onChanged();
    } catch (err) {
      setStatus('error', 'delete failed');
    }
  }

  for (const [dateKey, daySets] of grouped) {
    list.append(el('li', { class: 'day-divider' },
      el('span', {}, formatShortDate(daySets[0].performed_at)),
    ));
    for (const s of daySets) {
      list.append(renderRow(s, tagsById.get(s.id), handleDelete));
    }
  }
}
