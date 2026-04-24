// Shared geo helpers. Centralized so every place picker in the app agrees
// on how to name a place, compute distance, and fall back to IP-based geo.
//
// Background: Nominatim's address fields don't always include `borough` for
// NYC sub-entities like Queens — it may only expose `suburb` / `city_district`
// while `city` collapses up to "New York". That's why a Queens search used to
// get rendered as "New York, New York" in v2. The extractor here walks from
// most-specific to least-specific fields AND strips "County"/"City of"
// wrappers, then collapses duplicate state-names in the display string.

export type NominatimPlace = {
  lat: string | number
  lon: string | number
  display_name?: string
  class?: string
  type?: string
  address?: {
    neighbourhood?: string
    suburb?: string
    city_district?: string
    borough?: string
    town?: string
    village?: string
    hamlet?: string
    municipality?: string
    city?: string
    county?: string
    state?: string
    state_district?: string
    region?: string
    country_code?: string
    'ISO3166-2-lvl4'?: string
  }
}

export type PlacePick = {
  name: string           // "Queens"
  state: string          // "New York"
  stateCode: string      // "NY"
  countryCode: string    // "US", "NG", "VG" — uppercase ISO-3166-1 alpha-2
  display: string        // "Queens, New York"
  lat: number
  lng: number
}

function clean(str: string | undefined) {
  if (!str) return ''
  return str
    .replace(/^City of\s+/i, '')
    .replace(/^Borough of\s+/i, '')
    .replace(/^Town of\s+/i, '')
    .replace(/^Village of\s+/i, '')
    .replace(/\s+County$/i, '')
    .trim()
}

export function extractPlaceName(place: NominatimPlace): string {
  const addr = place.address || {}
  // Most-specific → least-specific. Suburb/city_district catches NYC boroughs
  // like Queens/Brooklyn when Nominatim doesn't set the `borough` field.
  const candidates = [
    clean(addr.neighbourhood),
    clean(addr.suburb),
    clean(addr.city_district),
    clean(addr.borough),
    clean(addr.town),
    clean(addr.village),
    clean(addr.hamlet),
    clean(addr.municipality),
    clean(addr.city),
    clean(addr.county),
  ].filter(Boolean)
  if (candidates.length > 0) return candidates[0]
  const firstSeg = (place.display_name || '').split(',')[0].trim()
  return firstSeg || 'Unknown'
}

export function extractStateCode(place: NominatimPlace): string {
  const addr = place.address || {}
  const iso = addr['ISO3166-2-lvl4']
  if (iso && iso.startsWith('US-')) return iso.replace('US-', '')
  return ''
}

export function extractStateName(place: NominatimPlace): string {
  const addr = place.address || {}
  return addr.state || addr.state_district || addr.region || ''
}

export function formatPlaceDisplay(place: NominatimPlace): string {
  const name = extractPlaceName(place)
  const state = extractStateName(place)
  if (!state) return name
  // Collapse "New York, New York" → "New York" — no point repeating.
  if (name.toLowerCase() === state.toLowerCase()) return name
  return `${name}, ${state}`
}

export function pickPlace(place: NominatimPlace): PlacePick {
  const cc = (place.address?.country_code || '').toUpperCase()
  return {
    name: extractPlaceName(place),
    state: extractStateName(place),
    stateCode: extractStateCode(place),
    countryCode: cc,
    display: formatPlaceDisplay(place),
    lat: typeof place.lat === 'string' ? parseFloat(place.lat) : place.lat,
    lng: typeof place.lon === 'string' ? parseFloat(place.lon) : place.lon,
  }
}

// Render a search result row consistently. Shows the place's specific name
// bold, then its context (state / country) dim. Used inside autocomplete
// dropdowns.
export function renderPlaceLabel(place: NominatimPlace): { primary: string; secondary: string } {
  const primary = extractPlaceName(place)
  const state = extractStateName(place)
  const addr = place.address || {}
  const country = addr.country_code ? addr.country_code.toUpperCase() : ''
  const secondary = [state, country && country !== 'US' ? country : ''].filter(Boolean).join(' · ')
  return { primary, secondary }
}

// Haversine distance in miles between two coordinates.
export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 3958.8
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function formatDistance(miles: number): string {
  if (miles < 0.3) return Math.round(miles * 5280) + ' ft away'
  if (miles < 1) return Math.round(miles * 10) / 10 + ' mi away'
  return Math.round(miles) + ' mi away'
}

// --- Nominatim network wrappers ---------------------------------------------

const NOMINATIM = 'https://nominatim.openstreetmap.org'

export async function searchPlaces(query: string, limit = 5): Promise<NominatimPlace[]> {
  if (!query || query.trim().length < 2) return []
  try {
    const res = await fetch(
      `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=${limit}`,
      { headers: { 'Accept-Language': 'en' } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<NominatimPlace | null> {
  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data && data.address ? data : null
  } catch {
    return null
  }
}

// --- IP-based location fallback --------------------------------------------

// Used as the last-resort default when the user has no cached session
// location and no profile location. ipapi.co returns lat/lng/city/region
// with a lenient free tier and no key required.
export type IpLocation = {
  lat: number
  lng: number
  city: string
  state: string
  stateCode: string
  country: string
  display: string
}

export async function getIpLocation(): Promise<IpLocation | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' })
    if (!res.ok) return null
    const d = await res.json()
    if (d.error || d.latitude == null || d.longitude == null) return null
    const city = d.city || ''
    const state = d.region || ''
    const stateCode = d.region_code || ''
    return {
      lat: d.latitude,
      lng: d.longitude,
      city,
      state,
      stateCode,
      country: d.country_code || '',
      display: state && city.toLowerCase() !== state.toLowerCase() ? `${city}, ${state}` : city || state,
    }
  } catch {
    return null
  }
}
