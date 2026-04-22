-- ═════════════════════════════════════════════════════════════════
-- BuddyAlly v2 Schema Alignment
-- Run this in Supabase SQL Editor. Idempotent — safe to re-run.
--
-- Why: v2 code writes to columns that don't exist in the original v1
-- schema (sql/001_schema.sql, 002_connect.sql, 003_location_system.sql
-- in the v1 project). Running v2 against the v1 DB will fail on:
--   • messages.content (v1 has `body`)
--   • reports.reported_type / reported_id (v1 has reported_user_id)
--   • activities.state_code
--   • profiles.socials (jsonb)
--   • profiles.verified_selfie
--   • connect_codes.image_url / links / social_profiles
-- This migration adds the missing columns and backfills where safe.
-- ═════════════════════════════════════════════════════════════════

BEGIN;

-- ─── MESSAGES ─────────────────────────────────────────────────────
-- v2 writes `content`, v1 had `body`. Keep both in sync.
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS content text;

-- One-time backfill: copy body → content when content is null
UPDATE messages
  SET content = body
  WHERE content IS NULL AND body IS NOT NULL;

-- Make content NOT NULL going forward (use COALESCE so body-only rows survive)
UPDATE messages SET content = '' WHERE content IS NULL;
ALTER TABLE messages ALTER COLUMN content SET DEFAULT '';
ALTER TABLE messages ALTER COLUMN content SET NOT NULL;

-- Keep body nullable so old code still works during cutover
ALTER TABLE messages ALTER COLUMN body DROP NOT NULL;

-- Trigger: if a row is inserted with one populated and the other null, mirror it
CREATE OR REPLACE FUNCTION sync_message_body_content() RETURNS trigger AS $$
BEGIN
  IF NEW.content IS NULL OR NEW.content = '' THEN NEW.content := COALESCE(NEW.body, ''); END IF;
  IF NEW.body IS NULL OR NEW.body = '' THEN NEW.body := COALESCE(NEW.content, ''); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_message_body_content ON messages;
CREATE TRIGGER trg_sync_message_body_content
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION sync_message_body_content();

-- ─── REPORTS ──────────────────────────────────────────────────────
-- v2 writes `reported_type`, `reported_id` (polymorphic reports),
-- v1 has `reported_user_id` (user-only). Add polymorphic cols and
-- keep reported_user_id in sync for user-type reports.
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS reported_type text,
  ADD COLUMN IF NOT EXISTS reported_id   uuid;

-- Allow reported_user_id to be null (polymorphic reports may target activities/groups)
ALTER TABLE reports ALTER COLUMN reported_user_id DROP NOT NULL;

-- Backfill new cols from legacy rows
UPDATE reports
  SET reported_type = 'user',
      reported_id = reported_user_id
  WHERE reported_type IS NULL AND reported_user_id IS NOT NULL;

-- Mirror user-type reports into the legacy column (keeps old admin tools working)
CREATE OR REPLACE FUNCTION sync_report_legacy() RETURNS trigger AS $$
BEGIN
  IF NEW.reported_type = 'user' AND NEW.reported_user_id IS NULL THEN
    NEW.reported_user_id := NEW.reported_id;
  END IF;
  IF NEW.reported_user_id IS NOT NULL AND NEW.reported_type IS NULL THEN
    NEW.reported_type := 'user';
    NEW.reported_id := NEW.reported_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_report_legacy ON reports;
CREATE TRIGGER trg_sync_report_legacy
  BEFORE INSERT OR UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION sync_report_legacy();

CREATE INDEX IF NOT EXISTS idx_reports_polymorphic ON reports(reported_type, reported_id);

-- ─── ACTIVITIES ───────────────────────────────────────────────────
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS state_code text;

CREATE INDEX IF NOT EXISTS idx_activities_state_code ON activities(state_code);

-- ─── PROFILES ─────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS socials         jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verified_selfie boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS selfie_url      text DEFAULT '',
  ADD COLUMN IF NOT EXISTS fcm_token       text DEFAULT '';

-- ─── CONNECT CODES ────────────────────────────────────────────────
ALTER TABLE connect_codes
  ADD COLUMN IF NOT EXISTS image_url       text DEFAULT '',
  ADD COLUMN IF NOT EXISTS links           jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS social_profiles jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Expand code_type to include v2's `contact_me`
ALTER TABLE connect_codes DROP CONSTRAINT IF EXISTS connect_codes_code_type_check;
ALTER TABLE connect_codes ADD CONSTRAINT connect_codes_code_type_check
  CHECK (code_type IN ('contact_me','car_sale','parked_car','lost_item','bike','pet','package','property','other'));

-- ─── STORAGE BUCKETS (referenced by v2 upload code) ───────────────
-- Public buckets for avatars, activity covers, and connect-code images.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('images', 'images', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('connect-images', 'connect-images', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload to these buckets
DROP POLICY IF EXISTS "auth_write_avatars" ON storage.objects;
CREATE POLICY "auth_write_avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('avatars','images','connect-images'));

DROP POLICY IF EXISTS "auth_update_own" ON storage.objects;
CREATE POLICY "auth_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('avatars','images','connect-images'));

DROP POLICY IF EXISTS "public_read_buckets" ON storage.objects;
CREATE POLICY "public_read_buckets" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id IN ('avatars','images','connect-images'));

-- ─── REVIEWS (v1 had trigger, make sure it's in place) ────────────
CREATE OR REPLACE FUNCTION update_profile_rating() RETURNS trigger AS $$
BEGIN
  UPDATE profiles SET
    rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE reviewed_id = COALESCE(NEW.reviewed_id, OLD.reviewed_id)), 0),
    rating_count = (SELECT COUNT(*) FROM reviews WHERE reviewed_id = COALESCE(NEW.reviewed_id, OLD.reviewed_id)),
    updated_at = now()
  WHERE id = COALESCE(NEW.reviewed_id, OLD.reviewed_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_rating ON reviews;
CREATE TRIGGER trg_update_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_profile_rating();

COMMIT;
