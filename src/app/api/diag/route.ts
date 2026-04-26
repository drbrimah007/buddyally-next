// GET /api/diag
//
// Reports which env vars the running deployment can see. Returns booleans
// only (never the values themselves) so it's safe to hit from a browser.
// Use this when something says "X env not configured" to confirm whether
// it's a Vercel save issue or a code path issue.

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KEYS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'TICKETMASTER_API_KEY',
  'CRON_SECRET',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
  'RESEND_API_KEY',
] as const

export async function GET() {
  const envs: Record<string, { present: boolean; length: number }> = {}
  for (const k of KEYS) {
    const v = process.env[k]
    envs[k] = { present: !!v, length: v ? v.length : 0 }
  }
  return NextResponse.json({
    ok: true,
    deployment: {
      vercel_env: process.env.VERCEL_ENV || null,
      vercel_url: process.env.VERCEL_URL || null,
      git_commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    },
    env_present: envs,
    note: 'Boolean presence + char length only. Values are never returned.',
  })
}
