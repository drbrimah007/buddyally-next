-- Activity contribution model (v2) — replaces the single `tip_enabled` boolean
-- with an intent-based category plus an optional freeform note.
--   • 'free'    — generosity, no cost
--   • 'split'   — shared expense, fairness
--   • 'gas'     — practical gas money, not profit
--   • 'tips'    — optional appreciation (old behaviour)
--   • 'bring'   — social exchange, bring-something
--   • 'covered' — already taken care of
-- `tip_enabled` is kept for backward compat; new rows set it from the type.
-- Idempotent. Applied to Supabase project `buddyally` on 2026-04-24.

BEGIN;

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS contribution_type text
    CHECK (contribution_type IN ('free','split','gas','tips','bring','covered')),
  ADD COLUMN IF NOT EXISTS contribution_note text;

-- Backfill: existing rows — tip_enabled=true → 'tips', false/null → 'free'.
UPDATE activities
   SET contribution_type = CASE WHEN tip_enabled IS TRUE THEN 'tips' ELSE 'free' END
 WHERE contribution_type IS NULL;

COMMIT;
