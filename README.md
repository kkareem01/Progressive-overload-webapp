# Overload — Progressive Overload Tracker

A single-user hypertrophy tracker. Log weight × reps in seconds, see what you did last session, beat it.

- **Frontend:** vanilla HTML + CSS + ES modules (no build step)
- **Backend:** one Vercel serverless route → Vercel Postgres (Neon-backed)
- **Auth:** none — private URL, single user
- **Mobile-first PWA** — installable on iOS / Android home screen

## Features

- Pick **Push / Pull / Leg** day → see your 7-9 exercises with a preview of last session
- Big tap-friendly weight & reps steppers, sticky **Log set** button
- **PR badges** for new max weight, max reps@weight, and estimated 1RM (Epley)
- **Progress chart** of estimated 1RM over time per exercise
- Full **history** with delete
- **Offline-tolerant**: optimistic UI, writes queued in `localStorage`, flushed when back online

## First-time setup

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. From this folder, link to a Vercel project
vercel link

# 3. Add a Postgres database via the Vercel dashboard
#    (Storage tab → Create → Postgres / Neon). Pull env vars locally:
vercel env pull .env.local

# 4. Create the table (once)
vercel postgres connect   # opens a psql shell
\i schema.sql
\q
# Or open the Vercel Postgres web console and paste schema.sql.

# 5. Install the postgres SDK
npm install

# 6. Run locally
vercel dev
```

App is now on `http://localhost:3000`.

## Deploy

```bash
vercel --prod
```

Vercel auto-detects this as a static site with `api/` serverless functions. No build config needed.

## Add to home screen (iPhone)

1. Open the deployed URL in Safari.
2. Share → **Add to Home Screen** → "Add".
3. Launches full-screen, just like an app.

## API contract

Single endpoint: `/api/sets`

| Method | Query / Body | Returns |
|---|---|---|
| `GET`    | `?exercise=Leg+Press&since=2026-01-01&limit=500` | `{success, data: [sets]}` |
| `POST`   | `{exercise, weight, reps, notes?}`               | `{success, data: set}`    |
| `PATCH`  | `?id=N` body `{weight?, reps?, notes?}`          | `{success, data: set}`    |
| `DELETE` | `?id=N`                                          | `{success, data:{id}}`    |

Server validates that `exercise` is in the known list, `weight ≥ 0`, `reps ≥ 1`.

## Smoke tests

```bash
# create a set
curl -s -X POST http://localhost:3000/api/sets \
  -H 'content-type: application/json' \
  -d '{"exercise":"Leg Press","weight":300,"reps":8}' | jq

# read it back
curl -s 'http://localhost:3000/api/sets?exercise=Leg+Press' | jq
```

## Adding / renaming exercises

Edit two places (both files keep their own copies for offline safety):

1. `js/exercises.js` — frontend list (groups by day, drives the UI)
2. `api/sets.js` — `VALID_EXERCISES` set (server-side validation)

They must match. Names are case- and unicode-sensitive (e.g. `45° Preacher Hammer Curl`).

## File map

```
api/sets.js            REST endpoint (GET/POST/PATCH/DELETE)
schema.sql             Postgres table + indexes
index.html             single page, templates inline
styles.css             dark mobile-first theme
manifest.json + sw.js  PWA installability + offline shell
icons/icon.svg         app icon

js/app.js              hash router, queue flusher, SW register
js/api.js              fetch wrappers
js/store.js            localStorage cache + offline queue
js/pr.js               PR computation (Epley 1RM)
js/status.js           top-bar status pill
js/util.js             date / formatting / DOM helpers
js/exercises.js        the 24 exercises grouped by day
js/views/day.js        exercise list with last-session preview
js/views/logger.js     log / progress / history tabs + steppers
js/views/progress.js   Chart.js line chart of est. 1RM
js/views/history.js    full set history, swipe-to-delete
```

## Out of scope (on purpose)

No auth, no multi-user, no workout templates, no plate calculator. The schema and architecture leave room — just add what you need.
