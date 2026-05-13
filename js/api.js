/**
 * Local data layer. Same exported shape as the old fetch wrappers,
 * but backed entirely by localStorage via store.js. No network.
 */
import { readCachedSets } from './store.js';

export function listSets({ exercise, since, limit = 500 } = {}) {
  let sets = readCachedSets(exercise);
  if (since) {
    const sinceTs = new Date(since).getTime();
    sets = sets.filter((s) => new Date(s.performed_at).getTime() >= sinceTs);
  }
  return Promise.resolve(sets.slice(0, limit));
}

export function createSet({ exercise, weight, reps, notes }) {
  const w = Number(weight);
  const r = Number.parseInt(reps, 10);
  if (!Number.isFinite(w) || w < 0 || w > 9999) {
    return Promise.reject(new Error('weight must be 0–9999'));
  }
  if (!Number.isInteger(r) || r < 1 || r > 999) {
    return Promise.reject(new Error('reps must be 1–999'));
  }
  const saved = {
    id: `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    exercise,
    weight: w,
    reps: r,
    performed_at: new Date().toISOString(),
    notes: notes ?? null,
  };
  return Promise.resolve(saved);
}

export function deleteSet(_id) {
  return Promise.resolve({ id: _id });
}
