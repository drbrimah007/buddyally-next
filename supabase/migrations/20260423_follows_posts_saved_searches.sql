-- ═══════════════════════════════════════════════════════════════════
-- BuddyAlly v2 — Follow graph, Posts feed, Saved Searches
-- Idempotent. Keeps existing user_contacts + link_requests untouched.
-- Applied to Supabase project `buddyally` on 2026-04-23.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── follows (one-way graph) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_followed ON follows(followed_id, created_at DESC);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS follows_public_read ON follows;
CREATE POLICY follows_public_read ON follows
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS follows_owner_insert ON follows;
CREATE POLICY follows_owner_insert ON follows
  FOR INSERT TO authenticated
  WITH CHECK (
    follower_id = (SELECT auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM user_contacts c
      WHERE c.user_id = follows.followed_id
        AND c.contact_user_id = (SELECT auth.uid())
        AND c.status = 'blocked'
    )
  );

DROP POLICY IF EXISTS follows_owner_delete ON follows;
CREATE POLICY follows_owner_delete ON follows
  FOR DELETE TO authenticated
  USING (follower_id = (SELECT auth.uid()));

-- ─── posts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public','followers','allies')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS posts_visibility_read ON posts;
CREATE POLICY posts_visibility_read ON posts
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      user_id = (SELECT auth.uid())
      OR (
        visibility = 'public'
        AND NOT EXISTS (
          SELECT 1 FROM user_contacts c
          WHERE c.user_id = posts.user_id
            AND c.contact_user_id = (SELECT auth.uid())
            AND c.status = 'blocked'
        )
      )
      OR (
        visibility = 'followers'
        AND EXISTS (
          SELECT 1 FROM follows f
          WHERE f.follower_id = (SELECT auth.uid())
            AND f.followed_id = posts.user_id
        )
      )
      OR (
        visibility = 'allies'
        AND EXISTS (
          SELECT 1 FROM user_contacts c
          WHERE c.user_id = (SELECT auth.uid())
            AND c.contact_user_id = posts.user_id
            AND c.status = 'active'
        )
      )
    )
  );

DROP POLICY IF EXISTS posts_owner_insert ON posts;
CREATE POLICY posts_owner_insert ON posts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS posts_owner_update ON posts;
CREATE POLICY posts_owner_update ON posts
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS posts_owner_delete ON posts;
CREATE POLICY posts_owner_delete ON posts
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ─── saved_searches ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  filter_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  notify_new boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_searches_notify
  ON saved_searches(user_id) WHERE notify_new = true;

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_searches_owner_select ON saved_searches;
CREATE POLICY saved_searches_owner_select ON saved_searches
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS saved_searches_owner_insert ON saved_searches;
CREATE POLICY saved_searches_owner_insert ON saved_searches
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS saved_searches_owner_update ON saved_searches;
CREATE POLICY saved_searches_owner_update ON saved_searches
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS saved_searches_owner_delete ON saved_searches;
CREATE POLICY saved_searches_owner_delete ON saved_searches
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ─── updated_at triggers ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_posts_touch ON posts;
CREATE TRIGGER trg_posts_touch BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_saved_searches_touch ON saved_searches;
CREATE TRIGGER trg_saved_searches_touch BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMIT;
