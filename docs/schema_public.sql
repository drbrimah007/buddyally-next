-- ═════════════════════════════════════════════════════════════════
-- BuddyAlly — public schema snapshot
-- Generated 2026-04-24 from Supabase project `mivpibqozkvoicuptgch`
-- 19 tables. All have RLS enabled.
-- Source of truth: /supabase/migrations/*.sql — this file is reference only.
-- ═════════════════════════════════════════════════════════════════

CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT ''::text,
  category text NOT NULL,
  location_text text DEFAULT ''::text,
  location_lat double precision,
  location_lng double precision,
  date date,
  time text DEFAULT ''::text,
  max_participants integer NOT NULL DEFAULT 6,
  tip_enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open'::text,
  safety_notes text DEFAULT ''::text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  location_mode text DEFAULT 'area'::text,
  location_place_id text,
  location_display text,
  location_short text,
  location_place_type text,
  location_country text DEFAULT 'US'::text,
  location_admin1 text,
  location_bbox ARRAY,
  location_venue_note text,
  timing_mode text DEFAULT 'one_time'::text,
  start_date date,
  end_date date,
  start_time text,
  end_time text,
  availability_label text,
  availability_note text,
  recurrence_freq text,
  recurrence_days ARRAY,
  cover_image_url text,
  cover_thumb_url text,
  state_code text,
  contribution_type text,          -- 'free'|'split'|'gas'|'tips'|'bring'|'covered'
  contribution_note text
);

CREATE TABLE public.activity_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.connect_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  code_type text NOT NULL DEFAULT 'other'::text,
  title text NOT NULL DEFAULT ''::text,
  description text DEFAULT ''::text,
  status text NOT NULL DEFAULT 'active'::text,
  push_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  scan_count integer NOT NULL DEFAULT 0,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  image_url text DEFAULT ''::text,
  links jsonb DEFAULT '[]'::jsonb,
  social_profiles jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE public.connect_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  sender_name text DEFAULT ''::text,
  sender_email text DEFAULT ''::text,
  sender_phone text DEFAULT ''::text,
  sender_user_id uuid,
  message text NOT NULL DEFAULT ''::text,
  read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  archived_at timestamp with time zone
);

CREATE TABLE public.connect_scans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL,
  ip_hash text DEFAULT ''::text,
  user_agent text DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.fcm_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  urgent_only boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.follows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  followed_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text,
  status text NOT NULL DEFAULT 'joined'::text,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone
);

CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT ''::text,
  category text DEFAULT ''::text,
  join_mode text NOT NULL DEFAULT 'free'::text,
  location_text text DEFAULT ''::text,
  location_lat double precision,
  location_lng double precision,
  chat_enabled boolean NOT NULL DEFAULT false,
  max_members integer,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.link_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  message text DEFAULT ''::text,
  status text NOT NULL DEFAULT 'pending'::text,  -- pending|accepted|denied|blocked|cancelled
  created_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone
);

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid,
  group_id uuid,
  activity_id uuid,
  body text DEFAULT ''::text,
  is_system boolean NOT NULL DEFAULT false,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  content text NOT NULL DEFAULT ''::text
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text DEFAULT ''::text,
  body text NOT NULL,
  reference_id uuid,
  reference_type text DEFAULT ''::text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  body text NOT NULL,
  visibility text NOT NULL DEFAULT 'public'::text,  -- public|followers|allies
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,                                 -- FK → auth.users(id)
  email text NOT NULL,
  first_name text NOT NULL DEFAULT ''::text,
  last_name text NOT NULL DEFAULT ''::text,
  phone text DEFAULT ''::text,
  city text DEFAULT ''::text,
  bio text DEFAULT ''::text,
  avatar_url text DEFAULT ''::text,
  interests ARRAY DEFAULT '{}'::text[],
  rating_avg numeric NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  verified_email boolean NOT NULL DEFAULT false,
  verified_phone boolean NOT NULL DEFAULT false,
  verified_id boolean NOT NULL DEFAULT false,
  id_verification_status text DEFAULT 'none'::text,
  badges ARRAY DEFAULT '{}'::text[],
  is_admin boolean NOT NULL DEFAULT false,
  blocked_users ARRAY DEFAULT '{}'::uuid[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  home_place_id text,
  home_display_name text,
  home_short_name text,
  home_place_type text,
  home_country_code text DEFAULT 'US'::text,
  home_admin1 text,
  home_admin2 text,
  home_lat double precision,
  home_lng double precision,
  home_bbox ARRAY,
  explore_place_id text,
  explore_display_name text,
  explore_place_type text,
  explore_lat double precision,
  explore_lng double precision,
  explore_bbox ARRAY,
  explore_radius_miles double precision DEFAULT 5,
  explore_scope_type text DEFAULT 'local_radius'::text,
  home_state_code text,
  explore_state_code text,
  verified_selfie boolean DEFAULT false,
  selfie_url text,
  socials jsonb DEFAULT '{}'::jsonb,
  email_verify_code text,
  email_verify_expires timestamp with time zone
);

CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  keys_p256dh text NOT NULL,
  keys_auth text NOT NULL,
  urgent_only boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid,
  reason text NOT NULL,
  details text DEFAULT ''::text,
  status text NOT NULL DEFAULT 'open'::text,
  admin_notes text DEFAULT ''::text,
  resolved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  reported_type text,     -- polymorphic: 'user' | 'activity' | 'message' | 'code'
  reported_id uuid
);

CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL,
  reviewed_id uuid NOT NULL,
  activity_id uuid,
  rating integer NOT NULL,         -- 1-5
  comment text DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.saved_searches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  filter_json jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {q?, category?, city?, radius_mi?, free_only?, ...}
  notify_new boolean NOT NULL DEFAULT true,
  last_seen_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,    -- active|archived|blocked
  source text NOT NULL DEFAULT 'message'::text,   -- message|request|manual
  last_interaction_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ═════════════════════════════════════════════════════════════════
-- All tables have Row Level Security enabled. See the specific
-- migration files under /supabase/migrations/ for the policy text:
--   20260423_contacts.sql            — user_contacts, link_requests, triggers
--   20260423_follows_posts_saved_searches.sql
--   20260424_activity_contribution.sql
-- ═════════════════════════════════════════════════════════════════
