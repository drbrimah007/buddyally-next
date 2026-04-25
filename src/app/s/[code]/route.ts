// Resolves /s/<code> to its destination URL and 302-redirects.
//
// Uses a Route Handler (not a page) because:
//   • This is pure indirection — no UI, no React tree.
//   • Lets us return a 302 cleanly so search engines treat the destination
//     as the canonical URL, not /s/<code>.
//   • Also bumps hit_count fire-and-forget for cheap analytics.
//
// We use the public anon Supabase URL/key (NEXT_PUBLIC_*) so the request
// stays read-only against the open RLS select policy on short_links —
// no service role needed.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function fallback(req: Request) {
  return NextResponse.redirect(new URL('/', req.url), { status: 302 })
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params
  if (!code || code.length > 32) return fallback(req)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return fallback(req)

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const { data, error } = await supabase
    .from('short_links')
    .select('url, hit_count')
    .eq('code', code)
    .maybeSingle()

  if (error || !data?.url) return fallback(req)

  // Fire-and-forget hit increment. Don't await — we want the redirect snappy.
  void supabase
    .from('short_links')
    .update({ hit_count: (data.hit_count || 0) + 1 })
    .eq('code', code)
    .then(() => undefined)

  return NextResponse.redirect(data.url, { status: 302 })
}
