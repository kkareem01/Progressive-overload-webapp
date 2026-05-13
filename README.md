# Overload — Progressive Overload Tracker

A single-user hypertrophy tracker. Log weight × reps in seconds, see what you did last session, beat it.

- **Frontend:** vanilla HTML + CSS + ES modules (no build step)
- **Storage:** browser `localStorage` only — no backend, no database
- **Mobile-first PWA** — installable on iOS / Android home screen

## Features

- Pick **Push / Pull / Leg** day → see your 7-9 exercises with a preview of last session
- Big tap-friendly weight & reps steppers, sticky **Log set** button
- **PR badges** for new max weight, max reps@weight, and estimated 1RM (Epley)
- **Progress chart** of estimated 1RM over time per exercise
- Full **history** with delete
- Works fully offline once installed — data lives on the device

## Run

Any static file server works. Examples:

```bash
# Python
python3 -m http.server 3000

# Or Node
npx serve .

# Or deploy as a static site (Vercel, Netlify, GitHub Pages, etc.)
```

Open `http://localhost:3000`.

## Add to home screen (iPhone)

1. Open the URL in Safari.
2. Share → **Add to Home Screen** → "Add".
3. Launches full-screen, just like an app.

## Where data lives

Everything is in `localStorage` under these keys:

- `overload:cache:<exercise name>` — list of sets for that exercise

There is no server, no sync, no account. The data is **per-browser and per-device**. Clearing browser storage or using a different device starts fresh. Export/backup is up to you (e.g. copy the JSON out of DevTools).

## Adding / renaming exercises

Edit `js/exercises.js` — that's the only source for the exercise list and day groupings. Names are case- and unicode-sensitive (e.g. `45° Preacher Hammer Curl`).

## File map

```
index.html             single page, templates inline
styles.css             dark mobile-first theme
manifest.json + sw.js  PWA installability + offline shell
icons/icon.svg         app icon

js/app.js              hash router, SW register
js/api.js              localStorage-backed data layer
js/store.js            localStorage read/write helpers
js/pr.js               PR computation (Epley 1RM)
js/status.js           top-bar status pill
js/util.js             date / formatting / DOM helpers
js/exercises.js        the 24 exercises grouped by day
js/views/day.js        exercise list with last-session preview
js/views/logger.js     log / progress / history tabs + steppers
js/views/progress.js   Chart.js line chart of est. 1RM
js/views/history.js    full set history with delete
```

## Out of scope (on purpose)

No auth, no multi-user, no workout templates, no plate calculator, no cross-device sync.
