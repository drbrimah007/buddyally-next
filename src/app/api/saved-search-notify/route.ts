// POST /api/saved-search-notify
// Called fire-and-forget from the client right after an activity is created.
// Evaluates every notify_new=true saved_search against the new activity and,
// for each match, sends push (via FCM) + email (via Resend) + writes an
// in-app notification row. Also bumps the saved_search's last_seen_at so the
// /dashboard/feed "Saved: …" badge doesn't re-surface the same match.
//
// Body: { activity_id: string }
//
// Env (shared with /api/notify):
//   SUPABASE_SERVICE_ROLE_KEY      (required)
//   FIREBASE_SERVICE_ACCOUNT_JSON  (optional — skips push if unset)
//   RESEND_API_KEY                 (optional — skips email if unset)
//   NOTIFY_EMAIL_FROM              (optional — default "BuddyAlly <alerts@buddyally.com>")
//   NEXT_PUBLIC_SITE_URL           (optional — used in email CTA)

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { sendEmailViaResend, escapeHtml } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ────────────────── Firebase Admin (lazy, shared with /api/notify) ──────────────────
let fbAdmin: any = null
async function getFirebaseAdmin() {
  if (fbAdmin) return fbAdmin
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    // @ts-ignore -- optional peer
    const admin = await import('firebase-admin')
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) })
    }
    fbAdmin = admin
    return admin
  } catch (e) {
    console.error('[saved-search-notify] Firebase init failed', e)
    return null
  }
}

async function sendFcm(opts: {
  supabase: any
  userId: string
  title: string
  body: string
  link: string
}) {
  const admin = await getFirebaseAdmin()
  if (!admin) return { push: 'skipped_no_fcm' as const }

  const { data: tokens } = await opts.supabase
    .from('fcm_tokens')
    .select('token, urgent_only')
    .eq('user_id', opts.userId)

  if (!tokens || tokens.length === 0) return { push: 'skipped_no_tokens' as const }

  // Saved-search matches are not "urgent" — respect urgent_only opt-in
  const targets = tokens.filter((t: any) => !t.urgent_only).map((t: any) => t.token)
  if (targets.length === 0) return { push: 'skipped_all_urgent_only' as const }

  try {
    const res = await admin.messaging().sendEachForMulticast({
      tokens: targets,
      notification: { title: opts.title, body: opts.body },
      data: { type: 'saved_search_match' },
      webpush: { fcmOptions: { link: opts.link } },
    })
    // Prune dead tokens so the table doesn't grow unbounded
    const dead: string[] = []
    res.responses.forEach((r: any, i: number) => {
      if (!r.success) {
        const code = r.error?.code
        if (code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token') dead.push(targets[i])
      }
    })
    if (dead.length) await opts.supabase.from('fcm_tokens').delete().in('token', dead)
    return { push: 'sent' as const, success: res.successCount, failure: res.failureCount, pruned: dead.length }
  } catch (e: any) {
    console.error('[saved-search-notify] FCM send failed', e)
    return { push: 'fcm_error' as const, detail: String(e?.message || e) }
  }
}

// ────────────────── Filter matching ──────────────────
// Mirrors what /dashboard/feed does when surfacing saved_search matches so
// push/email and in-Feed results agree 1:1.
function activityMatchesFilter(activity: any, filter: Record<string, any>): boolean {
  if (filter?.category && filter.category !== 'all' && activity.category !== filter.category) return false
  if (filter?.free_only && activity.is_free !== true) return false
  if (filter?.city) {
    const needle = String(filter.city).toLowerCase()
    const hay = String(activity.location_display || '').toLowerCase()
    if (!hay.includes(needle)) return false
  }
  if (filter?.q) {
    const needle = String(filter.q).toLowerCase()
    const hay = String(activity.title || '').toLowerCase()
    if (!hay.includes(needle)) return false
  }
  // Tag intersection — saved search with `tags: ['Basketball']` only fires
  // for activities tagged Basketball.
  if (Array.isArray(filter?.tags) && filter.tags.length > 0) {
    const aTags: string[] = Array.isArray(activity.tags) ? activity.tags : []
    if (!aTags.some((t: string) => filter.tags.includes(t))) return false
  }
  return true
}

// ────────────────── Email template ──────────────────
function matchEmailHtml(opts: {
  searchName: string
  activity: any
  viewUrl: string
  feedUrl: string
}) {
  const a = opts.activity
  const when = a.date ? new Date(a.date).toLocaleDateString() : (a.availability_label || 'Flexible')
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.06)">
      <div style="background:#3293CB;color:#fff;padding:18px 22px;font-weight:700;font-size:16px">
        New match for your saved search
      </div>
      <div style="padding:22px">
        <p style="margin:0 0 6px;color:#6B7280;font-size:13px">Saved search</p>
        <p style="margin:0 0 16px;font-weight:700;font-size:15px">${escapeHtml(opts.searchName)}</p>

        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px">
          <p style="margin:0 0 4px;font-weight:700;font-size:16px">${escapeHtml(a.title || 'Untitled activity')}</p>
          <p style="margin:0 0 8px;color:#6B7280;font-size:13px">
            ${escapeHtml(a.category || '')}${a.location_display ? ' · ' + escapeHtml(a.location_display) : ''} · ${escapeHtml(when)}
          </p>
          ${a.description ? `<p style="margin:0;font-size:14px;line-height:1.55;color:#4B5563">${escapeHtml(String(a.description).slice(0, 280))}${String(a.description).length > 280 ? '…' : ''}</p>` : ''}
        </div>

        <p style="margin:22px 0 10px">
          <a href="${escapeHtml(opts.viewUrl)}" style="display:inline-block;background:#3293CB;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:700;font-size:14px">
            View activity
          </a>
        </p>
        <p style="margin:0;color:#6B7280;font-size:12px">
          You&rsquo;re getting this because you saved a search with notifications on.
          <a href="${escapeHtml(opts.feedUrl)}" style="color:#3293CB">Manage your saved searches</a>.
        </p>
      </div>
    </div>
  </div></body></html>`
}

// ────────────────── Handler ──────────────────
export async function POST(req: Request) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const activity_id = body?.activity_id
  if (typeof activity_id !== 'string' || activity_id.length < 8) {
    return NextResponse.json({ error: 'activity_id required' }, { status: 400 })
  }

  let supabase
  try { supabase = createServiceRoleClient() }
  catch { return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 }) }

  // 1) Load the activity
  const { data: activity, error: aErr } = await supabase
    .from('activities')
    .select('*, host:profiles!host_id(id, first_name, last_name)')
    .eq('id', activity_id)
    .single()
  if (aErr || !activity) {
    return NextResponse.json({ error: 'Activity not found', detail: aErr?.message }, { status: 404 })
  }

  // 2) Pull every saved search with notifications enabled, excluding self-posts
  //    (don't notify the host about their own activity).
  const { data: searches, error: sErr } = await supabase
    .from('saved_searches')
    .select('id, user_id, name, filter_json, last_seen_at')
    .eq('notify_new', true)
    .neq('user_id', activity.host_id)
  if (sErr) {
    return NextResponse.json({ error: 'Saved search load failed', detail: sErr.message }, { status: 500 })
  }

  // 3) Evaluate each search's filter against the activity
  type Match = { search: any; ownerId: string }
  const matches: Match[] = (searches || [])
    .filter(s => activityMatchesFilter(activity, s.filter_json || {}))
    .map(s => ({ search: s, ownerId: s.user_id as string }))

  if (matches.length === 0) {
    return NextResponse.json({ ok: true, activity_id, matched: 0 })
  }

  // 4) Fetch owner profiles (emails) in one batch
  const ownerIds = Array.from(new Set(matches.map(m => m.ownerId)))
  const { data: ownerRows } = await supabase
    .from('profiles')
    .select('id, email, first_name')
    .in('id', ownerIds)
  const ownersById = new Map<string, any>((ownerRows || []).map((r: any) => [r.id, r]))

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://buddyally.com').replace(/\/$/, '')
  const viewUrl = `${siteUrl}/a/${activity.id}`
  const feedUrl = `${siteUrl}/dashboard/saved-searches`

  // 5) Fan out — push + email + in-app + last_seen_at bump, in parallel per match
  const results = await Promise.all(
    matches.map(async ({ search, ownerId }) => {
      const owner = ownersById.get(ownerId)
      const title = `New match: ${search.name}`
      const bodyText = activity.title
        ? `${activity.title}${activity.location_display ? ' · ' + activity.location_display : ''}`
        : 'A new activity matches your saved search'

      // In-app notification row (Feed also shows it via the saved_match kind,
      // but /dashboard/alerts reads from `notifications`).
      const [, pushRes, emailRes] = await Promise.all([
        supabase.from('notifications').insert({
          user_id: ownerId,
          type: 'saved_search_match',
          title,
          body: bodyText,
          reference_id: activity.id,
          reference_type: 'activity',
        }),
        sendFcm({ supabase, userId: ownerId, title, body: bodyText, link: `/a/${activity.id}` }),
        owner?.email
          ? sendEmailViaResend({
              to: owner.email,
              subject: title,
              html: matchEmailHtml({ searchName: search.name, activity, viewUrl, feedUrl }),
            })
          : Promise.resolve({ email: 'skipped_no_email' as const }),
      ])

      // Bump last_seen_at so Feed's saved_match stream doesn't re-show it.
      await supabase
        .from('saved_searches')
        .update({ last_seen_at: activity.created_at || new Date().toISOString() })
        .eq('id', search.id)

      return { search_id: search.id, owner_id: ownerId, ...pushRes, ...emailRes }
    })
  )

  return NextResponse.json({ ok: true, activity_id, matched: matches.length, results })
}
