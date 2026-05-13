/**
 * Tiny localStorage cache + offline write queue.
 * All updates return new objects/arrays — no in-place mutation.
 */

const CACHE_PREFIX  = 'overload:cache:';
const QUEUE_KEY     = 'overload:queue';
const TIMER_DEFAULT = 'overload:timer-default';

function safeGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (err) { console.warn('localStorage set failed', err); }
}

/* ---------- per-exercise cache of recent sets ---------- */

export function cacheSets(exercise, sets) {
  safeSet(CACHE_PREFIX + exercise, { fetchedAt: Date.now(), sets });
}

export function readCachedSets(exercise) {
  const entry = safeGet(CACHE_PREFIX + exercise);
  return entry?.sets ?? [];
}

export function appendCachedSet(exercise, set) {
  const existing = readCachedSets(exercise);
  cacheSets(exercise, [set, ...existing]);
}

export function removeCachedSet(exercise, id) {
  const existing = readCachedSets(exercise);
  cacheSets(exercise, existing.filter((s) => s.id !== id));
}

export function replaceCachedSet(exercise, updated) {
  const existing = readCachedSets(exercise);
  cacheSets(exercise, existing.map((s) => (s.id === updated.id ? updated : s)));
}

/* ---------- offline write queue ---------- */

export function readQueue() {
  return safeGet(QUEUE_KEY) ?? [];
}

export function enqueue(item) {
  const next = [...readQueue(), { ...item, queuedAt: Date.now() }];
  safeSet(QUEUE_KEY, next);
  return next;
}

export function dequeueById(tempId) {
  const next = readQueue().filter((q) => q.tempId !== tempId);
  safeSet(QUEUE_KEY, next);
  return next;
}

export function clearQueue() {
  safeSet(QUEUE_KEY, []);
}

/* ---------- user prefs ---------- */

export function getDefaultRest() {
  return safeGet(TIMER_DEFAULT) ?? 120;
}

export function setDefaultRest(seconds) {
  safeSet(TIMER_DEFAULT, seconds);
}

/* ---------- helpers ---------- */

export function newTempId() {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
