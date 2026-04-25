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

type AuthResult = { ok: true } | { ok: false; reason: 'no_env' | 'no_header' | 'mismatch' }

function checkAuth(req: Request): AuthResult {
  // Vercel cron is trusted by header
  if (req.headers.get('x-vercel-cron') === '1') return { ok: true }
  const auth = req.headers.get('authorization') || ''
  const match = auth.match(/^Bearer (.+)$/)
  const secret = process.env.CRON_SECRET
  if (!secret) return { ok: false, reason: 'no_env' }       // env var missing on the deploy
  if (!match) return { ok: false, reason: 'no_header' }     // browser sent no Bearer token
  if (match[1] !== secret) return { ok: false, reason: 'mismatch' }
  return { ok: true }
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
  const auth = checkAuth(req)
  if (!auth.ok) {
    // Diagnostic 401 — tells you exactly why so you can fix it without
    // spelunking. Does NOT leak the secret value.
    return NextResponse.json({
      error: 'unauthorized',
      reason: auth.reason,
      hint: auth.reason === 'no_env'
        ? 'CRON_SECRET env var is not set on this deployment. Add it in Vercel → Settings → Environment Variables, then Redeploy.'
        : auth.reason === 'no_header'
        ? 'Authorization: Bearer <secret> header missing. The /admin button sends it; if you called this URL directly you need to add the header.'
        : 'CRON_SECRET in env does not match the value sent. Re-copy from Vercel and paste again.',
    }, { status: 401 })
  }

  const apiKey = process.env.TICKETMASTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: true, ingested: 0, reason: 'no_key' })
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

  let supabase
  try { supabase = createServiceRoleClient() }
  catch { return NextResponse.json({ error: 'service_role_missing' }, { status: 500 }) }

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
