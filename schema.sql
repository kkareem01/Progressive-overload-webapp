-- Run once after provisioning the Vercel Postgres database.
-- Pipe via:  vercel postgres connect < schema.sql
-- Or paste into the Vercel Postgres web console.

CREATE TABLE IF NOT EXISTS sets (
  id           SERIAL PRIMARY KEY,
  exercise     TEXT NOT NULL,
  weight       NUMERIC(6,2) NOT NULL CHECK (weight >= 0),
  reps         INTEGER NOT NULL CHECK (reps > 0),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_sets_exercise_date ON sets(exercise, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sets_performed_at  ON sets(performed_at DESC);
