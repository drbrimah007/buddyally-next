// GET /api/geocode/search?q=...
// Proxy for Nominatim forward geocoding. Reasons we proxy server-side:
//   • Nominatim's usage policy requires a User-Agent header identifying
//     the app; browsers don't let JS set User-Agent, so direct-from-client
//     calls are often rate-limited or empty.
//   • Lets us pass richer params (addressdetails=1, namedetails=1, higher
//     limit, `dedupe=0`) so neighborhoods like "Brownsville, Brooklyn"
//     surface, not just city-level results.
//   • Falls back to a second query with no country bias if the first misses,
//     so small localities still come through when Nominatim's ranking hides them.
//
// Returns the raw Nominatim array — the client's pickPlace/renderPlaceLabel
// logic in @/lib/geo handles shaping.

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const NOMINATIM = 'https://nominatim.openstreetmap.org'
const UA = 'BuddyAlly/1.0 (https://buddyally.com; support@buddyally.com)'

async function fetchNominatim(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${NOMINATIM}/search?${qs}`, {
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'en',
      Accept: 'application/json',
    },
    // Cache at the edge for 6 hours — same query resolves the same way.
    next: { revalidate: 60 * 60 * 6 },
  })
  if (!res.ok) return []
  const data = await res.json().catch(() => [])
  return Array.isArray(data) ? data : []
}

// Run several Nominatim queries in parallel and merge with locality bias.
//
// Why this is more than a single call:
//   • Nominatim's free-form ranking weights by importance/population, so a
//     small NYC neighborhood like "Brownsville, Brooklyn" gets buried under
//     Southgate (UK) or Browns (NZ) when you type "brownsville".
//   • We bias by the caller's country (`?cc=US` from the client, OR the
//     `x-vercel-ip-country` header) and pin in-country results to the top.
//   • We still keep a global free-form pass for genuine international intent
//     ("paris" should still surface Paris, France even from a US viewer).
//   • A separate `country=` structured pass surfaces actual country
//     boundaries when someone types "United States" / "Nigeria".
export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const limit = url.searchParams.get('limit') || '12'
  if (q.length < 2) return NextResponse.json([])

  // Caller's country code, used to bias ranking. Priority:
  //   1. Explicit `?cc=US` from the client (profile home country)
  //   2. Vercel edge IP-country header (set on every prod request)
  //   3. None — pure global free-form
  const ccRaw = (url.searchParams.get('cc') || req.headers.get('x-vercel-ip-country') || '').toLowerCase()
  const cc = /^[a-z]{2}$/.test(ccRaw) ? ccRaw : ''

  const baseParams = {
    format: 'json',
    addressdetails: '1',
    namedetails: '1',
    dedupe: '0',
    limit,
  }

  const [freeForm, countryHit, biasedHit] = await Promise.all([
    fetchNominatim({ ...baseParams, q }),
    // `country=` matches country boundaries — surfaces "United States" itself
    // when typed by name. Returns [] for non-country queries.
    fetchNominatim({ ...baseParams, country: q, limit: '3' }),
    // In-country search — restricts to the caller's country. This is what
    // surfaces Brownsville (Brooklyn) for a US viewer typing "brownsville".
    cc ? fetchNominatim({ ...baseParams, q, countrycodes: cc }) : Promise.resolve([] as any[]),
  ])

  // Order:  country-name boundaries → in-country localities → global free-form
  const countryBoundaries = countryHit.filter((p: any) =>
    p?.class === 'boundary' && p?.type === 'administrative' && (p?.address?.country_code || '').length === 2
  )
  const seen = new Set<string>()
  const merged: any[] = []
  const push = (p: any) => {
    const k = `${p?.osm_type || ''}-${p?.osm_id || ''}`
    if (seen.has(k)) return
    seen.add(k)
    merged.push(p)
  }
  countryBoundaries.forEach(push)
  biasedHit.forEach(push)
  freeForm.forEach(push)

  // Comma-fallback if still nothing (e.g., "Brownsville, Brooklyn, NY"
  // over-constrains and Nominatim returns []).
  if (merged.length === 0 && q.includes(',')) {
    const first = q.split(',')[0].trim()
    if (first.length >= 2) {
      const retry = await fetchNominatim({ ...baseParams, q: first })
      retry.forEach(push)
    }
  }

  return NextResponse.json(merged)
}
