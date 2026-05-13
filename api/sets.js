import { sql } from '@vercel/postgres';

const VALID_EXERCISES = new Set([
  'Leg Press', 'Seated Leg Curl', 'Leg Extension', 'Hip Abduction',
  'Hip Adduction', 'Standing Calf Raise',
  'Incline Bench Press', 'Pec Deck Fly', 'EZ Bar Front Raise',
  'Cable Lateral Raise', 'Dumbbell Lateral Raise',
  'Overhead Tricep Extension', 'Tricep Push Downs',
  'Lat Pulldown', 'Close-Grip Cable Row', 'Dumbbell Shrugs',
  'Deficit Pendlay Rows', 'Pull-Up', 'Incline Dumbbell Curl',
  'Bayesian Cable Curl', '45° Preacher Hammer Curl', 'Reverse Pec Deck',
]);

const ok = (res, data) => res.status(200).json({ success: true, data, error: null });
const fail = (res, code, error) => res.status(code).json({ success: false, data: null, error });

function validatePayload(body) {
  if (!body || typeof body !== 'object') return 'body must be an object';
  const { exercise, weight, reps } = body;
  if (typeof exercise !== 'string' || !VALID_EXERCISES.has(exercise)) {
    return `unknown exercise: ${exercise}`;
  }
  const w = Number(weight);
  if (!Number.isFinite(w) || w < 0 || w > 9999) return 'weight must be 0–9999';
  const r = Number.parseInt(reps, 10);
  if (!Number.isInteger(r) || r < 1 || r > 999) return 'reps must be 1–999';
  if (body.notes != null && typeof body.notes !== 'string') return 'notes must be a string';
  if (body.notes && body.notes.length > 500) return 'notes max 500 chars';
  return null;
}

function parseId(req) {
  const id = Number.parseInt(req.query?.id ?? '', 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function handleGet(req, res) {
  const { exercise, since, limit } = req.query;
  const max = Math.min(Number.parseInt(limit ?? '500', 10) || 500, 2000);

  let rows;
  if (exercise && since) {
    rows = (await sql`
      SELECT id, exercise, weight::float AS weight, reps, performed_at, notes
      FROM sets
      WHERE exercise = ${exercise} AND performed_at >= ${since}
      ORDER BY performed_at DESC
      LIMIT ${max}
    `).rows;
  } else if (exercise) {
    rows = (await sql`
      SELECT id, exercise, weight::float AS weight, reps, performed_at, notes
      FROM sets
      WHERE exercise = ${exercise}
      ORDER BY performed_at DESC
      LIMIT ${max}
    `).rows;
  } else if (since) {
    rows = (await sql`
      SELECT id, exercise, weight::float AS weight, reps, performed_at, notes
      FROM sets
      WHERE performed_at >= ${since}
      ORDER BY performed_at DESC
      LIMIT ${max}
    `).rows;
  } else {
    rows = (await sql`
      SELECT id, exercise, weight::float AS weight, reps, performed_at, notes
      FROM sets
      ORDER BY performed_at DESC
      LIMIT ${max}
    `).rows;
  }
  return ok(res, rows);
}

async function handlePost(req, res) {
  const error = validatePayload(req.body);
  if (error) return fail(res, 400, error);
  const { exercise, weight, reps, notes } = req.body;
  const { rows } = await sql`
    INSERT INTO sets (exercise, weight, reps, notes)
    VALUES (${exercise}, ${weight}, ${reps}, ${notes ?? null})
    RETURNING id, exercise, weight::float AS weight, reps, performed_at, notes
  `;
  return ok(res, rows[0]);
}

async function handlePatch(req, res) {
  const id = parseId(req);
  if (!id) return fail(res, 400, 'missing or invalid id');
  const body = req.body || {};
  const patch = {};
  if (body.weight !== undefined) {
    const w = Number(body.weight);
    if (!Number.isFinite(w) || w < 0 || w > 9999) return fail(res, 400, 'weight must be 0–9999');
    patch.weight = w;
  }
  if (body.reps !== undefined) {
    const r = Number.parseInt(body.reps, 10);
    if (!Number.isInteger(r) || r < 1 || r > 999) return fail(res, 400, 'reps must be 1–999');
    patch.reps = r;
  }
  if (body.notes !== undefined) {
    if (body.notes !== null && typeof body.notes !== 'string') return fail(res, 400, 'notes must be a string');
    if (body.notes && body.notes.length > 500) return fail(res, 400, 'notes max 500 chars');
    patch.notes = body.notes;
  }
  if (Object.keys(patch).length === 0) return fail(res, 400, 'no fields to update');

  const { rows } = await sql`
    UPDATE sets SET
      weight = COALESCE(${patch.weight ?? null}, weight),
      reps   = COALESCE(${patch.reps ?? null}, reps),
      notes  = CASE WHEN ${patch.notes !== undefined} THEN ${patch.notes ?? null} ELSE notes END
    WHERE id = ${id}
    RETURNING id, exercise, weight::float AS weight, reps, performed_at, notes
  `;
  if (rows.length === 0) return fail(res, 404, 'set not found');
  return ok(res, rows[0]);
}

async function handleDelete(req, res) {
  const id = parseId(req);
  if (!id) return fail(res, 400, 'missing or invalid id');
  const { rowCount } = await sql`DELETE FROM sets WHERE id = ${id}`;
  if (rowCount === 0) return fail(res, 404, 'set not found');
  return ok(res, { id });
}

export default async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':    return await handleGet(req, res);
      case 'POST':   return await handlePost(req, res);
      case 'PATCH':  return await handlePatch(req, res);
      case 'DELETE': return await handleDelete(req, res);
      default:
        res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
        return fail(res, 405, `method ${req.method} not allowed`);
    }
  } catch (err) {
    console.error('api/sets error:', err);
    return fail(res, 500, 'internal server error');
  }
}
