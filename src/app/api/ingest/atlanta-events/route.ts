// POST/GET /api/ingest/atlanta-events
//
// Ingests upcoming Atlanta events from Ticketmaster's Discovery API and
// posts them as activities authored by the appropriate Founding Publisher
// account. Idempotent — dedupes against `event_sources(provider, external_id)`
// so re-runs don't double-insert.
//
// Auth:
//   • Vercel cron header `x-vercel-cron: 1` is trusted.
//   • Otherwise requires `Authorization: Bearer ${CRON_SECRET}` (so the
//     admin trigger button can call it from the browser).
//
// Required env:
//   TICKETMASTER_API_KEY      — Discovery API key (free, 5k calls/day)
//   CRON_SECRET               — shared secret for browser-triggered runs
//   SUPABASE_SERVICE_ROLE_KEY — to write to activities + event_sources
//
// If TICKETMASTER_API_KEY is unset, the route returns
// `{ ok: true, ingested: 0, reason: 'no_key' }` — safe to deploy without
// the env var; nothing breaks.

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PROVIDER = 'ticketmaster'

// Atlanta Founding Publisher UUIDs (seeded earlier).
const PUBLISHER = {
  social: '22222222-0000-0000-0000-000000000001',  // ATL Social Pulse — fallback
  faith:  '22222222-0000-0000-0000-000000000002',  // Atlanta Faith Circle — Ticketmaster doesn't cover faith
  culture:'22222222-0000-0000-0000-000000000003',  // Black Atlanta Culture
  sunday: '22222222-0000-0000-0000-000000000004',  // Sunday Social ATL
}

// Map a Ticketmaster classification segment to (publisher, BuddyAlly category).
function classifyEvent(segment: string | null | undefined): { publisher_id: string; category: string } {
  switch ((segment || '').toLowerCase()) {
    case 'sports':         return { publisher_id: PUBLISHER.sunday,  category: 'Sports / Play' }
    case 'music':          return { publisher_id: PUBLISHER.culture, category: 'Events' }
    case 'arts & theatre': return { publisher_id: PUBLISHER.culture, category: 'Events' }
    case 'family':         return { publisher_id: PUBLISHER.sunday,  category: 'Local Activities' }
    default:               return { publisher_id: PUBLISHER.social,  category: 'Events' }
  }
}

type AuthResult = { ok: true; via: 'cron' | 'cron_secret' | 'moderator' } | { ok: false; reason: 'no_auth' | 'not_mod' }

// Three paths to authorize:
//   • Vercel cron header (x-vercel-cron: 1) — trusted out of the box.
//   • Bearer token matches CRON_SECRET env (legacy / for cli use).
//   • Bearer token is a Supabase JWT belonging to a profile with the
//     'admin' or 'moderator' badge — checked via is_moderator() RPC.
//
// The moderator path is what removes the CRON_SECRET dependency for the
// admin trigger button: signed-in admins just need their session JWT.
async function checkAuth(req: Request, supabase: any): Promise<AuthResult> {
  if (req.headers.get('x-vercel-cron') === '1') return { ok: true, via: 'cron' }

  const auth = req.headers.get('authorization') || ''
  const match = auth.match(/^Bearer (.+)$/)
  const token = match?.[1]
  if (!token) return { ok: false, reason: 'no_auth' }

  // CRON_SECRET shortcut (still supported)
  const secret = process.env.CRON_SECRET
  if (secret && token === secret) return { ok: true, via: 'cron_secret' }

  // Otherwise treat the bearer as a Supabase JWT: who is this user, and
  // is_moderator()? The service-role client lets us call auth.getUser
  // with the caller's token + then call the SECURITY DEFINER mod helper.
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return { ok: false, reason: 'no_auth' }
    const { data: isMod } = await supabase.rpc('is_moderator', { p_user: user.id })
    if (isMod === true) return { ok: true, via: 'moderator' }
    return { ok: false, reason: 'not_mod' }
  } catch {
    return { ok: false, reason: 'no_auth' }
  }
}

type TmEvent = {
  id: string
  name: string
  url?: string
  info?: string
  pleaseNote?: string
  dates?: { start?: { localDate?: string; localTime?: string } }
  classifications?: Array<{ segment?: { name?: string } }>
  images?: Array<{ url?: string; ratio?: string; width?: number }>
  _embedded?: {
    venues?: Array<{
      name?: string
      city?: { name?: string }
      address?: { line1?: string }
      location?: { latitude?: string; longitude?: string }
    }>
  }
}

function pickImage(images: TmEvent['images']): string | null {
  if (!images?.length) return null
  // Prefer 16:9 wide images at >= 640px width.
  const wide = images.find((i) => i.ratio === '16_9' && (i.width || 0) >= 640)
  return wide?.url || images[0]?.url || null
}

function buildDescription(e: TmEvent, venueName: string, venueCity: string): string {
  const parts: string[] = []
  if (e.info) parts.push(e.info)
  else parts.push(`${e.name} — ${venueName}${venueCity ? `, ${venueCity}` : ''}.`)
  if (e.pleaseNote) parts.push(e.pleaseNote)
  parts.push(`📍 ${venueName}${venueCity ? `, ${venueCity}` : ''}`)
  if (e.url) parts.push(`Source: Ticketmaster — buy tickets: ${e.url}`)
  parts.push('Hosting buddies welcome — RSVP here if you’re going so others can find you.')
  return parts.join('\n\n').slice(0, 4000)
}

export async function GET(req: Request)  { return run(req) }
export async function POST(req: Request) { return run(req) }

async function run(req: Request) {
  // Build the service-role client up front so checkAuth can use it for
  // the JWT → is_moderator() lookup.
  let supabase
  try { supabase = createServiceRoleClient() }
  catch { return NextResponse.json({ error: 'service_role_missing' }, { status: 500 }) }

  const auth = await checkAuth(req, supabase)
  if (!auth.ok) {
    return NextResponse.json({
      error: 'unauthorized',
      reason: auth.reason,
      hint: auth.reason === 'not_mod'
        ? 'Your account is signed in but does not have the admin/moderator badge.'
        : 'Send Authorization: Bearer <session-jwt> from a signed-in admin, or set CRON_SECRET in Vercel and use that.',
    }, { status: 401 })
  }

  const apiKey = process.env.TICKETMASTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: true, ingested: 0, reason: 'no_key', authed_via: auth.via })
  }

  // Discovery API: Atlanta market, upcoming, sorted by date asc.
  // dmaId=220 is Atlanta. countryCode=US fallback.
  const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json')
  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('city', 'Atlanta')
  url.searchParams.set('countryCode', 'US')
  url.searchParams.set('size', '50')
  url.searchParams.set('sort', 'date,asc')

  const tmRes = await fetch(url.toString(), { cache: 'no-store' })
  if (!tmRes.ok) {
    return NextResponse.json({ error: 'ticketmaster_failed', status: tmRes.status }, { status: 502 })
  }
  const tmJson: any = await tmRes.json().catch(() => ({}))
  const events: TmEvent[] = tmJson?._embedded?.events || []

  // (supabase already initialized above in the auth block — reuse it.)
  // Pre-fetch existing external_ids so we skip dedupes in O(1).
  const externalIds = events.map((e) => e.id).filter(Boolean)
  const { data: existing } = await supabase
    .from('event_sources')
    .select('external_id')
    .eq('provider', PROVIDER)
    .in('external_id', externalIds)
  const existingSet = new Set((existing as Array<{ external_id: string }> | null)?.map((r) => r.external_id) || [])

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const horizon = new Date(); horizon.setDate(horizon.getDate() + 60)

  let ingested = 0
  let skipped_existing = 0
  let skipped_other = 0
  const errors: Array<{ id: string; err: string }> = []

  for (const ev of events) {
    if (!ev.id || !ev.name) { skipped_other++; continue }
    if (existingSet.has(ev.id)) { skipped_existing++; continue }

    const localDate = ev.dates?.start?.localDate
    if (!localDate) { skipped_other++; continue }
    const eventDate = new Date(localDate + 'T00:00:00')
    if (eventDate < today || eventDate > horizon) { skipped_other++; continue }

    const venue = ev._embedded?.venues?.[0]
    const venueName = venue?.name || 'Atlanta'
    const venueCity = venue?.city?.name || 'Atlanta'
    const lat = venue?.location?.latitude ? parseFloat(venue.location.latitude) : 33.749
    const lng = venue?.location?.longitude ? parseFloat(venue.location.longitude) : -84.388

    const segment = ev.classifications?.[0]?.segment?.name || ''
    const { publisher_id, category } = classifyEvent(segment)

    const cover = pickImage(ev.images)
    const description = buildDescription(ev, venueName, venueCity)
    const time = ev.dates?.start?.localTime || null

    // Insert the activity row first, then the event_sources mapping.
    const { data: act, error: actErr } = await supabase
      .from('activities')
      .insert({
        title: ev.name.slice(0, 200),
        description,
        category,
        location_text: `${venueName}, ${venueCity}`,
        location_display: venueName,
        location_lat: lat,
        location_lng: lng,
        location_mode: 'area',
        state_code: 'GA',
        location_country: 'US',
        date: localDate,
        time,
        max_participants: null,           // Open per spec — no cap on seeded events
        contribution_type: 'free',
        status: 'open',
        created_by: publisher_id,
        tags: [segment || 'Event'].filter(Boolean),
        tip_enabled: false,
        cover_image_url: cover,
      })
      .select('id')
      .single()

    if (actErr || !act) {
      errors.push({ id: ev.id, err: actErr?.message || 'insert_failed' })
      continue
    }

    const { error: srcErr } = await supabase
      .from('event_sources')
      .insert({
        provider: PROVIDER,
        external_id: ev.id,
        external_url: ev.url || null,
        activity_id: act.id,
        raw_payload: ev as any,
      })

    if (srcErr) {
      // Roll back the activity if we can't record the source — keeps the
      // dedupe table authoritative. (Best-effort; a stray row is fine.)
      await supabase.from('activities').delete().eq('id', act.id)
      errors.push({ id: ev.id, err: 'event_sources_insert_failed: ' + srcErr.message })
      continue
    }

    ingested++
  }

  return NextResponse.json({
    ok: true,
    fetched: events.length,
    ingested,
    skipped_existing,
    skipped_other,
    errors: errors.slice(0, 10),
  })
}
