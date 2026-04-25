# BuddyAlly — Build & Deploy Workflow

## One-time setup (first clone)

```bash
git clone https://github.com/drbrimah007/buddyally-next.git
cd buddyally-next
npm install
cp .env.local.example .env.local   # fill in the keys (see §5)
```

## Every day, local

```bash
npm run dev        # localhost:3000 with hot reload
```

## Pre-push checklist

```bash
npm run typecheck   # → 0 errors
npm run lint        # warnings OK, no errors
```

If either command isn't aliased in `package.json`, use:

```bash
npx tsc --noEmit
npx next lint
```

## Production build (local verification)

```bash
rm -rf .next       # guaranteed clean slate
npm run build      # Next 16 build, ESLint skipped (runs separately)
npm run start      # serves .next/ on localhost:3000
```

## Git / push

All pushes go through `main` on `origin`. Branch protections and PR
workflow aren't set up yet — small fixes are pushed direct.

Typical flow after changes:

```bash
git add <paths you changed>
git commit -m "Short imperative summary"
git push
```

**Known sandbox quirk:** the Cowork sandbox filesystem won't release
`.git/*.lock` files, so pushes from inside Cowork frequently hit
"Unable to create '.git/index.lock': File exists". Before running any
git command in the sandbox, clear locks:

```bash
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock .git/refs/remotes/origin/main.lock
```

## Deploy

Pushes to `main` auto-deploy on Vercel. To check or trigger manually:

- Dashboard: https://vercel.com/drbrimah007/buddyally-next
- CLI: `vercel --prod`

Vercel runs `npm run build` itself, so no need to commit the `.next/`
directory.

## Supabase migrations

Two ways to apply:

**A · Via MCP (preferred)** — Claude can call
`mcp__supabase__apply_migration` directly against the project id
`mivpibqozkvoicuptgch`. Every applied migration is also saved to
`/supabase/migrations/YYYYMMDD_name.sql` so the repo matches the DB.

**B · Via Supabase CLI (from your terminal):**

```bash
supabase link --project-ref mivpibqozkvoicuptgch
supabase db push      # applies any new migrations under /supabase/migrations/
```

Each migration file is idempotent (`CREATE TABLE IF NOT EXISTS`,
`DROP POLICY IF EXISTS`) so re-applying is safe.

## Environment variables

`.env.local` needs:

```
NEXT_PUBLIC_SUPABASE_URL=https://mivpibqozkvoicuptgch.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...               # from Supabase → Project Settings → API
SUPABASE_SERVICE_ROLE_KEY=...                   # server-only; never ship to client
FIREBASE_SERVICE_ACCOUNT_JSON=...               # optional — FCM push, skip if unset
RESEND_API_KEY=re_...                           # optional — transactional email
NOTIFY_EMAIL_FROM="BuddyAlly <alerts@buddyally.com>"
NEXT_PUBLIC_SITE_URL=https://buddyally.com      # used in email CTAs
```

Vercel side: mirror these in Project Settings → Environment Variables.
Service role key goes to Production/Preview but never to Development
(so local dev uses the anon key only).

## Seed data

The seed lives in the live DB (project `buddyally`), not in migrations,
because it includes real `auth.users` rows. To reset:

```sql
-- Nukes all 56 seed users + their cascading data
DELETE FROM auth.users WHERE email LIKE '%@seed.buddyally.local';
```

To re-seed from scratch, replay the SQL blocks documented in
`docs/AUDIT_2026-04-24.md` §6.

## Health checks

- `GET /api/notify` — should return 405 Method Not Allowed (POST-only)
- `GET /api/geocode/search?q=brooklyn` — should return array of
  Nominatim matches (test after deploy)
- Database advisors: `mcp__supabase__get_advisors` (security + performance)

## Package versions to care about

- Next.js 16.2.4 (no ESLint during build since 16, run `next lint` separately)
- React 19
- Tailwind v4 — remember `@layer base` or utilities get cascaded out
- Framer Motion v12.38 — SSR-safe when imported into 'use client' files
- Leaflet loaded from unpkg at runtime (no npm dep)

## When something breaks

1. `npx tsc --noEmit` — type errors?
2. `npx next build` — build errors?
3. `mcp__supabase__get_advisors` — new security/perf regression?
4. Browser console on the broken page — runtime errors?
5. Supabase → Logs → API — server-side errors?
6. Vercel deploy logs — most recent build failures?
