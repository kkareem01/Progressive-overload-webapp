/**
 * Tiny shared helpers. Keep pure.
 */

export function localDateKey(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatShortDate(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export function todayKey() {
  return localDateKey(new Date());
}

export function isSameLocalDate(a, b) {
  return localDateKey(a) === localDateKey(b);
}

/** Group sets by local date key, newest day first; sets inside a day stay newest-first. */
export function groupByDay(sets) {
  const map = new Map();
  for (const s of sets) {
    const key = localDateKey(s.performed_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export function formatSet(s) {
  const w = Number(s.weight);
  const wStr = Number.isInteger(w) ? String(w) : w.toFixed(1);
  return `${wStr} × ${s.reps}`;
}

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function fragmentFromTemplate(id) {
  const tpl = document.getElementById(id);
  if (!tpl) throw new Error(`template not found: ${id}`);
  return tpl.content.cloneNode(true);
}
