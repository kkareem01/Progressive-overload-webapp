const API = '/api/sets';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  let payload;
  try { payload = await res.json(); }
  catch { throw new Error(`bad response (${res.status})`); }
  if (!res.ok || payload?.success === false) {
    throw new Error(payload?.error || `request failed (${res.status})`);
  }
  return payload.data;
}

export function listSets({ exercise, since, limit } = {}) {
  const qs = new URLSearchParams();
  if (exercise) qs.set('exercise', exercise);
  if (since)    qs.set('since', since);
  if (limit)    qs.set('limit', String(limit));
  const path = qs.toString() ? `${API}?${qs}` : API;
  return request('GET', path);
}

export function createSet({ exercise, weight, reps, notes }) {
  return request('POST', API, { exercise, weight, reps, notes });
}

export function updateSet(id, patch) {
  return request('PATCH', `${API}?id=${encodeURIComponent(id)}`, patch);
}

export function deleteSet(id) {
  return request('DELETE', `${API}?id=${encodeURIComponent(id)}`);
}
