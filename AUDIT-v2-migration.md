# BuddyAlly v2 Migration Audit

**Date:** 2026-04-22
**Scope:** `BuddyAlly/` (v1 static SPA) → `buddyally-next/` (Next.js 16 rebuild)
**Verdict:** v2 is roughly **55–60% feature-complete**. Core shell, auth, explore, activities, connect-codes, and profile basics are in. Several critical features from v1 are missing, and the schema drifted — writes from v2 code would fail against the v1 database until a migration is applied.

---

## 1. What's done in v2

| Area | Status | File(s) |
|---|---|---|
| Auth (email/password, Google OAuth, reset) | done | `src/hooks/useAuth.ts`, `src/app/login`, `src/app/signup` |
| Splash + redirect | done | `src/app/page.tsx`, `components/AuthRedirect.tsx` |
| Marketing landing | done | `src/app/home/page.tsx` |
| Dashboard shell + bottom nav + badges | done | `src/app/dashboard/layout.tsx` |
| Explore (map/list, haversine radius) | done | `src/app/dashboard/page.tsx` |
| Activities list (created/joined tabs) | done | `src/app/dashboard/activities/page.tsx` |
| Create-activity modal | done | `src/components/CreateActivityModal.tsx` |
| Activity detail modal (joined users) | done | `src/components/ActivityDetailModal.tsx` |
| Public activity page `/a/[id]` (join, chat, report) | done | `src/app/a/[id]/page.tsx` |
| Public contact page `/c/[code]` + bare-code redirect | done | `src/app/c/[code]/page.tsx`, `src/app/[code]/page.tsx` |
| Profile (bio, interests, socials, phone OTP, selfie) | partial | `src/app/dashboard/profile/page.tsx` |
| Connect codes (create, QR, stickers, messages) | done | `src/app/dashboard/codes/page.tsx` — most complete v2 feature |
| Messages list (conversations) | partial | `src/app/dashboard/messages/page.tsx` |
| Alerts/notifications list | done | `src/app/dashboard/alerts/page.tsx` |
| Groups list + create | partial | `src/app/dashboard/groups/page.tsx` |

---

## 2. Schema drift — FIXED in this audit

v2 code writes to columns that don't exist in v1's `sql/001_schema.sql` / `002_connect.sql`. Running v2 against a v1 DB fails on inserts. I've written an idempotent migration that patches every drift without dropping data:

**`supabase/migrations/20260422_v2_schema_alignment.sql`**

| Table | v1 column | v2 column | Fix |
|---|---|---|---|
| `messages` | `body` | `content` | Add `content`, backfill from `body`, two-way sync trigger |
| `reports` | `reported_user_id` | `reported_type` + `reported_id` | Add polymorphic cols, mirror user-type reports to legacy col |
| `activities` | — | `state_code` | Add column + index |
| `profiles` | — | `socials` (jsonb), `verified_selfie`, `selfie_url`, `fcm_token` | Add columns with defaults |
| `connect_codes` | — | `image_url`, `links` (jsonb), `social_profiles` (jsonb) | Add columns |
| `connect_codes.code_type` | 8 values | adds `contact_me` | Expand CHECK constraint |
| Storage buckets | — | `avatars`, `images`, `connect-images` | Create + RLS policies |
| `reviews` trigger | present | needs re-check | Recreate `update_profile_rating()` |

**Action:** open Supabase SQL Editor → paste the migration file → run. It's idempotent, so safe to re-run.

---

## 3. Features MISSING from v2

Ordered by user-visible severity:

### Blocker-level (v2 ships without these = regression from v1)

1. **`/api/notify` Next route** — v2's `/c/[code]/page.tsx` calls `/api/notify` but the route doesn't exist in `src/app/api/`. v1 has `api/notify.js` on Node (Firebase Admin SDK for FCM + email). Port to `src/app/api/notify/route.ts`.
2. **Group chat** — v1 has full group messaging (`js/messages.js#loadGroupChat`, `openGroupChat`); v2 groups page is list/create only. No realtime subscription, no message send, no member roster.
3. **Group member management** — join/leave, admin promote/demote, remove member. v1 has `is_group_admin()` SQL helper + UI; v2 has none.
4. **New-message starter** — v1 has `openNewMessage()` with a user-picker; v2 messages page only shows existing conversations. Users can't start a DM.
5. **Government-ID verification** — v1 `js/safety.js#verifyId` uploads ID doc; v2 profile has selfie but no ID path. Trust/safety regression.

### High-value

6. **Admin panel** — v1 `js/admin.js` (reports queue, user moderation, analytics). v2 has nothing under `/admin`.
7. **Reviews UI** — v1 `js/reviews.js#submitReview` + display on profile. v2 has `reviews` table wired (rating trigger in migration) but no submit/display UI.
8. **Edit-activity modal** — v1 allows host to edit after creation; v2 only has create.
9. **User profile view page** (`/u/[id]` or `/profile/[id]`) — v1 opens another user's profile from chat/activity; v2 has no public profile viewer.
10. **PWA / service worker / FCM push on web** — v1 has full push via Firebase; v2 has `fcm_token` column (just added) but no SW registration or token capture.

### Polish

11. **Toast/snackbar utility** — v1 has inline toast; v2 pages use `alert()` in several places.
12. **Reports moderation UI** — v2 only writes reports; there's no admin view to action them.
13. **Activity RSVP/cancel flow** — join works; cancel and capacity-full gating need parity with v1's `check_activity_full` trigger.
14. **i18n / localization** — v1 has none either, but flagging if you plan it before more screens ship.

---

## 4. Recommended completion order

**Week 1 — unblock:**
a. Apply the migration (above).
b. Port `/api/notify` to a Next route handler (FCM + email).
c. Add toast util, kill remaining `alert()` calls.

**Week 2 — parity:**
d. Group chat + member management.
e. New-message starter.
f. User profile view page + reviews UI.

**Week 3 — trust & ops:**
g. Government-ID verification (upload + pending/verified states).
h. Admin panel (reports queue first, then users).
i. PWA/FCM token capture on dashboard mount.

**Week 4 — polish:**
j. Edit-activity modal.
k. Report moderation actions.
l. End-to-end test: code scan → message → notify → reply.

---

## 5. Risk notes

- **`@supabase/ssr` is installed but unused.** No `middleware.ts`, no server-side session. Server components that read auth will break or silently run anonymous. Add middleware before building admin/SSR features.
- **Two auth sources of truth.** v1 code may still be deployed at the same Supabase project. The sync triggers (`body`↔`content`, `reported_user_id`↔`reported_id`) mean both can coexist during cutover — but decide a cutover date and drop the legacy columns after.
- **Storage bucket names differ.** v2 uploads to `avatars`/`images`/`connect-images`. v1 may use different names; the migration creates the v2 ones. Verify v1 isn't writing to `avatar` (singular) anywhere.
- **`connect_codes.code_type` constraint** was previously rejecting `contact_me` — migration expands it. Any existing code insert code path that hit this error will now succeed.

---

## 6. Files changed in this pass

- **Added:** `supabase/migrations/20260422_v2_schema_alignment.sql` — the schema fix.
- **Added:** `AUDIT-v2-migration.md` — this report.

No app code was modified. Next step is to pick from §4 and start porting.
