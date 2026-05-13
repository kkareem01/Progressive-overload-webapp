/**
 * Personal record helpers.
 *
 * A set is a PR if it beats every prior set on at least one of:
 *   - max weight at any reps
 *   - max reps at the same weight
 *   - estimated 1RM (Epley: w * (1 + r/30))
 *
 * Pure functions — no I/O, no mutation.
 */

export function estimatedOneRm(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r <= 0) return 0;
  return w * (1 + r / 30);
}

/**
 * Given a candidate set and the set's prior history (sets BEFORE the candidate),
 * return an array of PR tags that apply. Empty array = no PR.
 *
 * @param {{weight:number, reps:number}} candidate
 * @param {Array<{weight:number, reps:number}>} priorSets
 * @returns {Array<'WEIGHT'|'REPS'|'1RM'>}
 */
export function prTagsFor(candidate, priorSets) {
  if (!candidate || !Array.isArray(priorSets) || priorSets.length === 0) {
    // First set ever for this exercise — not progressive overload yet, just a baseline.
    return [];
  }
  const tags = [];

  const maxWeight = priorSets.reduce((m, s) => Math.max(m, Number(s.weight) || 0), 0);
  if (Number(candidate.weight) > maxWeight) tags.push('WEIGHT');

  const sameWeightSets = priorSets.filter((s) => Number(s.weight) === Number(candidate.weight));
  if (sameWeightSets.length > 0) {
    const maxReps = sameWeightSets.reduce((m, s) => Math.max(m, Number(s.reps) || 0), 0);
    if (Number(candidate.reps) > maxReps) tags.push('REPS');
  }

  const candidate1rm = estimatedOneRm(candidate.weight, candidate.reps);
  const max1rm = priorSets.reduce(
    (m, s) => Math.max(m, estimatedOneRm(s.weight, s.reps)),
    0
  );
  if (candidate1rm > max1rm + 1e-6) tags.push('1RM');

  return tags;
}

/**
 * Reduce sets (any order) into per-set PR annotations, processed chronologically
 * so each set is compared against everything that came before it.
 *
 * @param {Array<{id:any,weight:number,reps:number,performed_at:string}>} sets
 * @returns {Map<any, Array<string>>}  id → tags
 */
export function annotatePrs(sets) {
  const byDateAsc = [...sets].sort(
    (a, b) => new Date(a.performed_at) - new Date(b.performed_at)
  );
  const tagsById = new Map();
  const history = [];
  for (const s of byDateAsc) {
    const tags = prTagsFor(s, history);
    if (tags.length) tagsById.set(s.id, tags);
    history.push(s);
  }
  return tagsById;
}
