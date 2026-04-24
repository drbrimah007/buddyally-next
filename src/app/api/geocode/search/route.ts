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

// Run two Nominatim queries in parallel and merge:
//   • Primary free-form (cities/neighborhoods/etc.)
//   • Country-only structured (so "United States", "USA", "Nigeria" return
//     the actual country boundary, which Nominatim ranks low for free-form).
// Country results are pinned to the top of the merged list when present.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const limit = url.searchParams.get('limit') || '12'
  if (q.length < 2) return NextResponse.json([])

  const baseParams = {
    format: 'json',
    addressdetails: '1',
    namedetails: '1',
    dedupe: '0',
    limit,
  }

  const [freeForm, countryHit] = await Promise.all([
    fetchNominatim({ ...baseParams, q }),
    // `country=` is a structured Nominatim search field — returns the
    // country boundary itself when the query matches a country name or
    // common alias (USA, U.K., etc.). Returns [] when there's no match.
    fetchNominatim({ ...baseParams, country: q, limit: '3' }),
  ])

  // Pin country boundaries to the top so users searching "United States"
  // see the country before random localities named "United States".
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
