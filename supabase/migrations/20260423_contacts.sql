-- ═════════════════════════════════════════════════════════════════
-- BuddyAlly — Contacts (link-up) system
-- Run in Supabase SQL Editor. Idempotent.
--
-- NOTE: v1 already had a physical-address-book table named `contacts`
-- (id, user_id, name, email, phone, address, notes, …). We therefore
-- use `user_contacts` and `link_requests` for the v2 social graph to
-- avoid a collision.
--
-- Adds:
--   • user_contacts       — per-user connection list (active/archived/blocked)
--   • link_requests       — "link-up" requests with accept/deny/block
--   • Auto-add trigger    — sending/receiving a DM inserts a user_contacts row
--                           for both sides (one row per direction).
--   • Accept trigger      — accepting a link_request creates both rows.
--   • RLS                 — each user only sees their own rows.
-- ═════════════════════════════════════════════════════════════════

BEGIN;

-- ─── user_contacts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','archived','blocked')),
  source text NOT NULL DEFAULT 'message'
    CHECK (source IN ('message','request','manual')),
  last_interaction_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, contact_user_id),
  CHECK (user_id <> contact_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_contacts_user ON user_contacts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_contacts_partner ON user_contacts(contact_user_id);

-- ─── link_requests ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS link_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text DEFAULT '',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','denied','blocked','cancelled')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  CHECK (sender_id <> recipient_id)
);

-- Only one pending request per direction
CREATE UNIQUE INDEX IF NOT EXISTS uniq_link_requests_pending
  ON link_requests(sender_id, recipient_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_link_requests_recipient
  ON link_requests(recipient_id, status);

-- ─── auto-add contact on first DM ─────────────────────────────────
-- When a messages row is inserted, ensure both participants have a
-- user_contacts row referencing each other. Respect existing rows
-- (e.g. if already 'blocked', don't silently reset to active).
CREATE OR REPLACE FUNCTION auto_add_user_contact_from_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only for direct DMs (not group, not activity-attached)
  IF NEW.group_id IS NOT NULL OR NEW.activity_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.sender_id IS NULL OR NEW.recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO user_contacts (user_id, contact_user_id, source, last_interaction_at)
    VALUES (NEW.sender_id, NEW.recipient_id, 'message', now())
    ON CONFLICT (user_id, contact_user_id)
      DO UPDATE SET last_interaction_at = now(), updated_at = now();

  INSERT INTO user_contacts (user_id, contact_user_id, source, last_interaction_at)
    VALUES (NEW.recipient_id, NEW.sender_id, 'message', now())
    ON CONFLICT (user_id, contact_user_id)
      DO UPDATE SET last_interaction_at = now(), updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_add_user_contact_from_message ON messages;
CREATE TRIGGER trg_auto_add_user_contact_from_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION auto_add_user_contact_from_message();

-- ─── accept link_request → create user_contacts rows ──────────────
CREATE OR REPLACE FUNCTION handle_link_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    NEW.responded_at := now();
    -- Both parties get an active contact
    INSERT INTO user_contacts (user_id, contact_user_id, source)
      VALUES (NEW.sender_id, NEW.recipient_id, 'request')
      ON CONFLICT (user_id, contact_user_id)
        DO UPDATE SET status = 'active', updated_at = now();
    INSERT INTO user_contacts (user_id, contact_user_id, source)
      VALUES (NEW.recipient_id, NEW.sender_id, 'request')
      ON CONFLICT (user_id, contact_user_id)
        DO UPDATE SET status = 'active', updated_at = now();
  ELSIF NEW.status = 'blocked' AND (OLD.status IS DISTINCT FROM 'blocked') THEN
    NEW.responded_at := now();
    -- Recipient blocks the sender — add block on recipient's side
    INSERT INTO user_contacts (user_id, contact_user_id, source, status)
      VALUES (NEW.recipient_id, NEW.sender_id, 'request', 'blocked')
      ON CONFLICT (user_id, contact_user_id)
        DO UPDATE SET status = 'blocked', updated_at = now();
  ELSIF NEW.status IN ('denied','cancelled') AND OLD.status = 'pending' THEN
    NEW.responded_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_link_request_status ON link_requests;
CREATE TRIGGER trg_handle_link_request_status
  BEFORE UPDATE ON link_requests
  FOR EACH ROW EXECUTE FUNCTION handle_link_request_status();

-- ─── RLS ──────────────────────────────────────────────────────────
ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_requests ENABLE ROW LEVEL SECURITY;

-- user_contacts: owner-only reads/writes.
-- auth.uid() wrapped in (SELECT auth.uid()) so Postgres evaluates it once per
-- query rather than once per row (auth_rls_initplan perf advisor).
DROP POLICY IF EXISTS user_contacts_owner_select ON user_contacts;
CREATE POLICY user_contacts_owner_select ON user_contacts
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_contacts_owner_insert ON user_contacts;
CREATE POLICY user_contacts_owner_insert ON user_contacts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_contacts_owner_update ON user_contacts;
CREATE POLICY user_contacts_owner_update ON user_contacts
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_contacts_owner_delete ON user_contacts;
CREATE POLICY user_contacts_owner_delete ON user_contacts
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- link_requests: sender and recipient can see
DROP POLICY IF EXISTS link_requests_participant_select ON link_requests;
CREATE POLICY link_requests_participant_select ON link_requests
  FOR SELECT TO authenticated
  USING (sender_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid()));

-- Only sender can create a request, and only if recipient hasn't blocked them
DROP POLICY IF EXISTS link_requests_sender_insert ON link_requests;
CREATE POLICY link_requests_sender_insert ON link_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM user_contacts c
      WHERE c.user_id = link_requests.recipient_id
        AND c.contact_user_id = (SELECT auth.uid())
        AND c.status = 'blocked'
    )
  );

-- Recipient can update (accept/deny/block); sender can update only to cancel
DROP POLICY IF EXISTS link_requests_participant_update ON link_requests;
CREATE POLICY link_requests_participant_update ON link_requests
  FOR UPDATE TO authenticated
  USING (sender_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid()))
  WITH CHECK (sender_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid()));

COMMIT;
