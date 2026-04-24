'use client'

// Explore — production layout.
// Two-column grid: sidebar (area filter + Dynamic Noticeboard) + main (map-tagged
// area banner + paginated activity card grid).
//
// Integrations layered on top of the base design:
//   • SaveSearchButton  — lets the user persist the current filter into
//                         /dashboard/saved-searches (feeds notifications).
//   • URL param hydration — when Saved Searches → "Run now" navigates here
//                         with ?q=&category=&city=&radius=&free=1, we pick
//                         those up on first mount so the round-trip works.

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useActivities } from '@/hooks/useActivities'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import CreateActivityModal from '@/components/CreateActivityModal'
import ActivityDetailModal from '@/components/ActivityDetailModal'
import SafetyBanner from '@/components/SafetyBanner'
import Paginator from '@/components/Paginator'
import SaveSearchButton from '@/components/SaveSearchButton'
import ExploreMap, { type ExploreMapItem } from '@/components/ExploreMap'
import { contributionBadge } from '@/lib/contribution'
import {
  haversineMiles,
  formatDistance,
  searchPlaces as searchPlacesApi,
  reverseGeocode,
  pickPlace,
  getIpLocation,
  renderPlaceLabel,
} from '@/lib/geo'

const EXPLORE_PAGE_SIZE = 12

function formatTiming(a: any) {
  if (a.timing_mode === 'flexible') return a.availability_label || 'Flexible'
  if (a.timing_mode === 'recurring') return a.recurrence_freq || 'Recurring'
  if (a.date) {
    const d = new Date(a.date)
    const month = d.toLocaleString('default', { month: 'short' })
    const day = d.getDate()
    return `${month} ${day}${a.time ? ' at ' + a.time : ''}`
  }
  return 'TBA'
}

// Category color palette.
//   • ride/travel/party/event/help/learning keep their signal colors so
//     you can scan the feed at a glance (reds for events, green for help, etc.)
//   • Everything else (pray, wellness, outdoor, local activities, others)
//     defaults to the site blue — that's the brand primary.
function categoryColor(category?: string) {
  const c = (category || '').toLowerCase()
  if (c.includes('ride') || c.includes('travel')) return { dot: '#3293CB', bg: '#EAF6FC', text: '#197BB8' }
  if (c.includes('event') || c.includes('party')) return { dot: '#EF4444', bg: '#FEF2F2', text: '#DC2626' }
  if (c.includes('help') || c.includes('support') || c.includes('dog') || c.includes('baby')) return { dot: '#22C55E', bg: '#F0FDF4', text: '#16A34A' }
  if (c.includes('learning') || c.includes('gaming') || c.includes('sports')) return { dot: '#8B5CF6', bg: '#F5F3FF', text: '#7C3AED' }
  // Site-default blue fallback (pray, wellness, outdoor, local activities, others)
  return { dot: '#3293CB', bg: '#EAF6FC', text: '#197BB8' }
}

function GrainBlendText({ text }: { text: string }) {
  const words = String(text || '').split(' ')

  return (
    <motion.p
      key={text}
      className="relative mt-5 text-3xl font-black leading-tight tracking-[-0.055em] text-slate-950"
      initial="hidden"
      animate="show"
    >
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 text-slate-400 opacity-40 blur-[2px]"
        initial={{ opacity: 0.75, x: -2, y: 1 }}
        animate={{ opacity: 0, x: 3, y: -1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >
        {text}
      </motion.span>

      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="relative inline-block pr-[0.28em]"
          variants={{
            hidden: { opacity: 0, y: 8, filter: 'blur(10px)', scale: 1.015 },
            show: {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              scale: 1,
              transition: { duration: 0.42, delay: index * 0.035, ease: 'easeOut' },
            },
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.p>
  )
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconRefresh() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M21 12a9 9 0 0 1-15.3 6.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 12A9 9 0 0 1 18.3 5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 2v4h-4M6 22v-4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconLocation() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconArrow({ dir = 'right' }: { dir?: 'left' | 'right' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={dir === 'left' ? 'rotate-180' : ''}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ExplorePage() {
  const { activities, loading, fetchActivities, joinActivity } = useActivities()
  const { profile, user } = useAuth()
  const searchParams = useSearchParams()

  const [radius, setRadius] = useState(5)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [showAll, setShowAll] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [cityInput, setCityInput] = useState('')
  // Selected location — lat/lon + state/country of THAT place, not the
  // viewer's device. "Nationwide" scope reads off `country` so selecting
  // London + Nationwide shows UK activities, not US ones.
  const [cityCoords, setCityCoords] = useState<{ lat: number; lon: number; state?: string; country?: string } | null>(null)
  const [placeResults, setPlaceResults] = useState<any[]>([])
  const [showPlaces, setShowPlaces] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [userStateCode, setUserStateCode] = useState('')
  const [viewActivityId, setViewActivityId] = useState<string | null>(null)
  const [explorePage, setExplorePage] = useState(0)
  const [activeNoticeIndex, setActiveNoticeIndex] = useState(0)
  const [noticePaused, setNoticePaused] = useState(false)
  // Noticeboard auto-advance speed in ms. 6000 is the sweet spot; 3500 feels
  // hyperactive and 9000 feels sleepy. User can pick via the label selector.
  const [noticeSpeed, setNoticeSpeed] = useState(6000)

  const searchTimeout = useRef<any>(null)
  // Points at the noticeboard card so clicking a pick in the list below
  // scrolls the card into view (desktop + mobile).
  const noticeboardRef = useRef<HTMLDivElement | null>(null)

  // URL-param hydration — runs once so we don't stomp on user edits.
  // Powers the "Run now" button from /dashboard/saved-searches.
  // Also async-geocodes the city string so cityCoords populates (required
  // for Statewide / Nationwide filters).
  const hydratedFromParams = useRef(false)
  useEffect(() => {
    if (hydratedFromParams.current || !searchParams) return
    const q = searchParams.get('q')
    const cat = searchParams.get('category')
    const city = searchParams.get('city')
    const rad = searchParams.get('radius')
    const free = searchParams.get('free')
    let touched = false
    if (q) { setSearch(q); touched = true }
    if (cat && cat !== 'all') { setCategory(cat); setShowAll(false); touched = true }
    if (city) {
      setCityInput(city)
      touched = true
      // Saved searches only store the city NAME, not coords. Geocode async
      // so Statewide/Nationwide scope filters have a state + country to
      // compare against.
      ;(async () => {
        try {
          const results = await searchPlacesApi(city, 1)
          if (results && results[0]) {
            const pick = pickPlace(results[0])
            setCityCoords({
              lat: pick.lat, lon: pick.lng,
              state: pick.stateCode || undefined,
              country: pick.countryCode || undefined,
            })
          }
        } catch {}
      })()
    }
    if (rad) { const n = Number(rad); if (!Number.isNaN(n)) { setRadius(n); touched = true } }
    if (free === '1') { /* is_free is not a base filter here; saved in filter_json — leave as marker */ touched = true }
    if (touched) hydratedFromParams.current = true
  }, [searchParams])

  useEffect(() => {
    setExplorePage(0)
    setActiveNoticeIndex(0)
  }, [search, category, radius, cityCoords?.lat, cityCoords?.lon, showAll])

  useEffect(() => {
    // If the page was opened via a Saved Search "Run now" URL (which
    // already set city/radius/q/category in the hydration effect above),
    // DON'T stomp it with cached or profile values. URL wins.
    if (hydratedFromParams.current) return

    let didSet = false
    const cached = sessionStorage.getItem('ba_city')
    const cachedCoords = sessionStorage.getItem('ba_coords')

    if (cached) {
      setCityInput(cached)
      didSet = true
    }

    if (cachedCoords) {
      try {
        setCityCoords(JSON.parse(cachedCoords))
        didSet = true
      } catch {}
    }

    if (!cached && profile?.home_display_name) {
      setCityInput(profile.home_display_name)
      didSet = true
    }

    if (!cachedCoords && profile?.home_lat && profile?.home_lng) {
      setCityCoords({ lat: profile.home_lat, lon: profile.home_lng })
      didSet = true
    }

    if (didSet) return

    ;(async () => {
      const ip = await getIpLocation()
      if (!ip) return
      setCityInput(ip.display)
      setCityCoords({ lat: ip.lat, lon: ip.lng, state: ip.stateCode || undefined, country: (ip as any).countryCode || undefined })
      setUserStateCode(ip.stateCode || '')
    })()
  }, [profile])

  const userInterests = profile?.interests || []
  const categories =
    showAll || userInterests.length === 0
      ? [
          'Travel',
          'Local Activities',
          'Sports / Play',
          'Learning',
          'Help / Support',
          'Events',
          'Outdoor',
          'Gaming',
          'Wellness',
          'Ride Share',
          'Dog Walk',
          'Babysit',
          'Party',
          'Pray',
          'Others',
        ]
      : userInterests

  function searchPlaces(val: string) {
    setCityInput(val)

    if (searchTimeout.current) clearTimeout(searchTimeout.current)

    if (!val || val.length < 2) {
      setPlaceResults([])
      setShowPlaces(false)
      return
    }

    // Bump limit to 10 and debounce fast so short partial queries
    // ("Brit", "Virgin", "Abu") surface a proper suggestion list rather
    // than requiring an exact match.
    searchTimeout.current = setTimeout(async () => {
      const data = await searchPlacesApi(val, 10)
      setPlaceResults(data)
      setShowPlaces(data.length > 0)
    }, 200)
  }

  function saveExploreState(display: string, lat: number | null, lon: number | null, rad: number, state?: string, country?: string) {
    if (!user) return

    const updates: any = { explore_display_name: display, explore_radius_miles: rad }

    if (lat != null && lon != null) {
      updates.explore_lat = lat
      updates.explore_lng = lon
    } else {
      updates.explore_lat = null
      updates.explore_lng = null
    }

    ;(async () => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
      if (error) console.error('[explore] saveExploreState failed', error)
    })()

    sessionStorage.setItem('ba_city', display)

    if (lat != null && lon != null) {
      // Cache state + country too so Statewide / Nationwide filters survive
      // page reloads (rehydrated in the init effect).
      sessionStorage.setItem('ba_coords', JSON.stringify({ lat, lon, state: state || null, country: country || null }))
    } else {
      sessionStorage.removeItem('ba_coords')
    }
  }

  function selectPlace(place: any) {
    const pick = pickPlace(place)
    setCityInput(pick.display)
    setCityCoords({ lat: pick.lat, lon: pick.lng, state: pick.stateCode || undefined, country: pick.countryCode || undefined })
    setUserStateCode(pick.stateCode || '')
    setPlaceResults([])
    setShowPlaces(false)

    // If the selected place is COUNTRY-level (Nominatim returned a country
    // boundary, no state), auto-bump radius to Nationwide so the user
    // doesn't sit inside a 5mi ring around a country centroid and see
    // nothing. Detection: country code present, no state code, AND
    // Nominatim's place type indicates a country.
    const isCountry =
      !!pick.countryCode &&
      !pick.stateCode &&
      ((place.type === 'administrative' && place.class === 'boundary') ||
       place.addresstype === 'country' ||
       place.type === 'country')
    const effectiveRadius = isCountry ? 0 : radius
    if (isCountry && radius !== 0) setRadius(0)

    saveExploreState(pick.display, pick.lat, pick.lng, effectiveRadius, pick.stateCode, pick.countryCode)
  }

  function clearCity() {
    setCityInput('')
    setCityCoords(null)
    setPlaceResults([])
    setShowPlaces(false)
    saveExploreState('', null, null, radius)
  }

  function toastErrorLike(msg: string) {
    if (typeof window !== 'undefined') console.warn('[explore/geo]', msg)
  }

  function useGPS() {
    if (!navigator.geolocation) {
      toastErrorLike('GPS not supported in this browser.')
      return
    }

    setGpsLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const place = await reverseGeocode(latitude, longitude)

        if (place) {
          const pick = pickPlace(place)
          setCityCoords({ lat: latitude, lon: longitude, state: pick.stateCode || undefined, country: pick.countryCode || undefined })
          setUserStateCode(pick.stateCode || '')
          setCityInput(pick.display)
          saveExploreState(pick.display, latitude, longitude, radius, pick.stateCode, pick.countryCode)
        } else {
          setCityCoords({ lat: latitude, lon: longitude })
          setCityInput('Current Location')
          saveExploreState('Current Location', latitude, longitude, radius)
        }

        setGpsLoading(false)
      },
      (err) => {
        setGpsLoading(false)
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Enable it in your browser settings.'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'Could not determine your location.'
              : 'Location request timed out.'
        toastErrorLike(msg)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 }
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filtered = activities.filter((a: any) => {
    if (category !== 'all' && a.category !== category) return false

    if (category === 'all' && !showAll && userInterests.length > 0 && !userInterests.includes(a.category)) {
      return false
    }

    if (search) {
      const q = search.toLowerCase()
      if (!(a.title || '').toLowerCase().includes(q) && !(a.description || '').toLowerCase().includes(q)) return false
    }

    if (a.status === 'cancelled') return false

    if (a.timing_mode !== 'flexible' && a.timing_mode !== 'recurring' && a.date) {
      const actDate = new Date(a.date)
      if (!isNaN(actDate.getTime()) && actDate < today) return false
    }

    return true
  })

  const coords = cityCoords
  const userState = cityCoords?.state
  const userCountry = cityCoords?.country  // uppercase ISO-3166-1 alpha-2
  const scope: 'nationwide' | 'statewide' | 'local' = radius === 0 ? 'nationwide' : radius >= 100 ? 'statewide' : 'local'

  const withDistance = filtered
    .map((a: any) => {
      let dist: number | null = null

      if (coords && a.location_lat && a.location_lng) {
        dist = haversineMiles(coords.lat, coords.lon, a.location_lat, a.location_lng)
      }

      return { ...a, _dist: dist }
    })
    .filter((a: any) => {
      if (!coords) return true
      if (a.location_mode === 'remote' || a.location_mode === 'nationwide') return true

      if (scope === 'nationwide') {
        // "Nationwide" is tied to the SELECTED city's country, not the
        // user's device country. Pick BVI → only BVI activities. Pick NY
        // → only US. If we don't know the activity's country yet, fall
        // back to a 300mi radius so we don't over-include.
        if (userCountry && a.location_country) return a.location_country === userCountry
        if (a._dist == null) return false
        return a._dist <= 300
      }

      if (scope === 'statewide') {
        if (userState && a.state_code) return a.state_code === userState
        if (a._dist == null) return false
        return a._dist <= 100
      }

      if (a._dist == null) return false
      return a._dist <= radius
    })
    .sort((a: any, b: any) => {
      if (a._dist != null && b._dist != null) return a._dist - b._dist
      if (a._dist != null) return -1
      if (b._dist != null) return 1
      return 0
    })

  // Buddy Pulse is explicitly a "near me" surface. Even when the user sets
  // Nationwide (which makes the main feed show everything regardless of
  // distance), the pulse carousel should still only feature activities
  // within ~100mi of the selected city. Otherwise searching a place with
  // no local data surfaces a 1,600mi-away activity as the headline, which
  // reads absurd.
  const noticeItems = useMemo(() => {
    if (!coords) return withDistance.slice(0, 8)
    const nearby = withDistance.filter((a: any) => a._dist != null && a._dist <= 100)
    return nearby.slice(0, 8)
  }, [withDistance, coords])
  const safeNoticeIndex = noticeItems.length ? activeNoticeIndex % noticeItems.length : 0
  const activeNotice = noticeItems[safeNoticeIndex]

  const totalPages = Math.max(1, Math.ceil(withDistance.length / EXPLORE_PAGE_SIZE))
  const page = Math.min(explorePage, totalPages - 1)
  const pageItems = withDistance.slice(page * EXPLORE_PAGE_SIZE, (page + 1) * EXPLORE_PAGE_SIZE)

  function nextNotice() {
    if (!noticeItems.length) return
    setActiveNoticeIndex((current) => (current + 1) % noticeItems.length)
  }

  function prevNotice() {
    if (!noticeItems.length) return
    setActiveNoticeIndex((current) => (current - 1 + noticeItems.length) % noticeItems.length)
  }

  useEffect(() => {
    if (noticePaused || noticeItems.length <= 1) return

    const interval = window.setInterval(() => {
      setActiveNoticeIndex((current) => (current + 1) % noticeItems.length)
    }, noticeSpeed)

    return () => window.clearInterval(interval)
  }, [noticePaused, noticeItems.length, noticeSpeed])

  return (
    <main className="min-h-screen bg-[#f4f5f7] px-4 py-5 text-[#111827] sm:px-6 lg:px-8">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Mobile-first: single column stack. Desktop (≥1024px): two
               strictly-equal columns so both sides get the same breathing
               room the stacked single-column view gave each panel. */
            .ba-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:18px;align-items:start}
            @media(min-width:1024px){.ba-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
            /* Both column wrappers fill their grid cell so backdrops span
               the full width assigned by the grid. */
            .ba-grid > *{min-width:0;width:100%}
            .activity-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
            @media(max-width:1350px){.activity-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
            @media(max-width:720px){.activity-grid{grid-template-columns:1fr}.filter-scroll{overflow-x:auto;flex-wrap:nowrap!important;padding-bottom:4px}.filter-scroll>*{white-space:nowrap}}
          `,
        }}
      />

      {/* No wrapper cap — fills the viewport. Combined with the 1fr 1fr grid,
          each column ends up as wide as the old single-column width used to
          be, including the tan backdrop on the right. */}
      <div className="mx-auto w-full">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-black uppercase tracking-[0.2em] text-[#3293CB]">buddyally activities</div>
            <h1 className="mt-1 text-4xl font-black tracking-[-0.055em] sm:text-5xl">What&rsquo;s moving near you?</h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => fetchActivities()}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-black/10 bg-white text-slate-700 shadow-sm"
              title="Refresh"
            >
              <IconRefresh />
            </button>

            <button
              onClick={() => setShowCreate(true)}
              className="h-11 rounded-2xl bg-[#3293CB] px-5 text-sm font-black uppercase text-white shadow-[0_14px_28px_-6px_rgba(50,147,203,0.55),0_4px_10px_-2px_rgba(50,147,203,0.4)] hover:shadow-[0_18px_34px_-8px_rgba(50,147,203,0.65),0_6px_14px_-2px_rgba(50,147,203,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_6px_12px_-2px_rgba(50,147,203,0.35)] transition"
            >
              + New Activity
            </button>
          </div>
        </header>

        {/* ── Area Search — full-width control bar ─────────────────────
            Moved out of the left column so it reads as a GLOBAL control
            (which it is: changing city/radius/search drives both the
            Buddy Pulse carousel AND the map + activity feed).
            On narrow screens the controls wrap naturally. */}
        {/* All controls on ONE ROW on desktop; wraps to multiple lines on
            mobile. The city field is the tallest, full-height input —
            holds the entire "City, State, Country" label naturally. */}
        <section className="mb-5 rounded-[24px] bg-white p-4 sm:p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-wrap items-center gap-3">
            {/* City/area — flex-grow so it takes the most room on desktop.
                h-14 matches siblings' effective height so nothing looks thinner. */}
            <div className="relative flex-1 min-w-[240px]">
              <div className="flex h-14 items-center gap-3 rounded-2xl border border-black/10 bg-[#F8FAFC] px-4 text-slate-500 focus-within:border-[#3293CB] focus-within:ring-2 focus-within:ring-[#3293CB]/20">
                <span className="text-slate-400 shrink-0"><IconLocation /></span>
                {/* h-full + border-0 so the input fills the container's
                    entire height edge-to-edge — no tiny inset field. The
                    parent owns the focus ring via focus-within. */}
                <input
                  value={cityInput}
                  onChange={(e) => searchPlaces(e.target.value)}
                  placeholder="City, area, or country"
                  className="h-full w-full flex-1 bg-transparent text-base font-medium text-slate-900 border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-slate-400 placeholder:font-normal"
                />
                {cityInput && (
                  <button
                    type="button"
                    onClick={clearCity}
                    aria-label="Clear city"
                    title="Clear"
                    className="shrink-0 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 text-xl font-bold leading-none hover:bg-slate-200 hover:text-slate-900 transition"
                  >
                    ×
                  </button>
                )}
              </div>
              {showPlaces && placeResults.length > 0 && (
                <div className="absolute left-0 right-0 top-[62px] z-40 max-h-64 overflow-y-auto rounded-2xl border border-black/10 bg-white shadow-xl">
                  {placeResults.map((p: any, i: number) => {
                    const lbl = renderPlaceLabel(p)
                    return (
                      <button
                        key={i}
                        onClick={() => selectPlace(p)}
                        className="block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                      >
                        <div className="text-sm font-bold text-slate-900">{lbl.primary}</div>
                        {lbl.secondary && <div className="mt-1 text-xs text-slate-500">{lbl.secondary}</div>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <select
              value={radius}
              onChange={(e) => setRadius(parseFloat(e.target.value))}
              className="h-14 rounded-2xl border border-black/10 bg-white px-3 text-sm font-semibold outline-none"
              aria-label="Radius"
            >
              <option value={0.3}>2 blocks</option>
              <option value={0.5}>5 min walk</option>
              <option value={1}>1 mi</option>
              <option value={3}>3 mi</option>
              <option value={5}>5 mi</option>
              <option value={10}>10 mi</option>
              <option value={25}>25 mi</option>
              <option value={50}>50 mi</option>
              <option value={100}>Statewide</option>
              <option value={0}>Nationwide</option>
            </select>

            <button
              onClick={useGPS}
              disabled={gpsLoading}
              className="h-14 rounded-2xl bg-[#EFF8FE] px-4 text-sm font-black text-[#197BB8] ring-1 ring-[#CFE8F8] whitespace-nowrap"
            >
              {gpsLoading ? 'Locating…' : 'Use GPS'}
            </button>

            <div className="flex h-14 flex-1 min-w-[220px] items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 text-slate-500 focus-within:border-[#3293CB] focus-within:ring-2 focus-within:ring-[#3293CB]/20">
              <span className="shrink-0"><IconSearch /></span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search activities…"
                className="h-full w-full flex-1 bg-transparent text-base font-medium text-slate-900 border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <div className="rounded-full bg-[#EEF8FE] px-3 py-1 text-xs font-bold text-[#197BB8] whitespace-nowrap">
                {withDistance.length} found
              </div>
              <SaveSearchButton
                filter={{
                  q: search || undefined,
                  category: category !== 'all' ? category : undefined,
                  city: cityInput || undefined,
                  radius_mi: radius,
                }}
              />
            </div>
          </div>
        </section>

        <div className="ba-grid">
          <aside className="space-y-4">
            <section className="rounded-[30px] bg-[#EEE9DF] p-5 shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs font-black uppercase tracking-[0.18em] text-slate-500">Buddy Pulse</div>
                  {/* Clamp to 2 lines + ellipsis. Never mid-word break — the
                      old `break-words` was forcing "Federal" to wrap to
                      "Fede\nral" on narrow columns when the header was
                      otherwise fine. Font scales responsively. */}
                  <div
                    className="mt-1 text-base sm:text-lg lg:text-2xl font-black tracking-[-0.05em] leading-tight"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'normal', overflowWrap: 'normal' }}
                    title={cityInput || 'Nearby'}
                  >
                    {cityInput || 'Nearby'}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Speed adjuster — defaults to 6000ms. 3500 feels rushed,
                      9000 feels sleepy. 6000 is the Goldilocks pick. */}
                  <select
                    value={noticeSpeed}
                    onChange={(e) => setNoticeSpeed(Number(e.target.value))}
                    className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-slate-500"
                    aria-label="Notice auto-advance speed"
                  >
                    <option value={9000}>Paced</option>
                    <option value={6000}>Normal</option>
                    <option value={3500}>Fast</option>
                  </select>
                  {/* Click-to-resume: if the pulse got pinned by a hover that
                      never resolved (mobile, stuck mouseleave), tapping the
                      pill flips it back on without needing a page refresh. */}
                  <button
                    type="button"
                    onClick={() => setNoticePaused(p => !p)}
                    className={`rounded-full px-3 py-1 text-xs font-bold cursor-pointer transition ${
                      noticePaused
                        ? 'bg-slate-900 text-white hover:bg-slate-700'
                        : 'bg-white/70 text-slate-500 hover:bg-white'
                    }`}
                    title={noticePaused ? 'Click to resume' : 'Click to pause'}
                    aria-pressed={noticePaused}
                  >
                    {noticePaused ? 'Paused' : 'Blending'}
                  </button>
                </div>
              </div>

              <div
                ref={noticeboardRef}
                onMouseEnter={() => setNoticePaused(true)}
                onMouseLeave={() => setNoticePaused(false)}
                className="group relative mt-5 h-[280px] overflow-hidden rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/5"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-multiply"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 20% 30%, #000 0 1px, transparent 1px), radial-gradient(circle at 70% 60%, #000 0 1px, transparent 1px)',
                    backgroundSize: '7px 7px, 11px 11px',
                  }}
                />

                <button
                  onClick={prevNotice}
                  className="absolute left-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow ring-1 ring-black/10 opacity-0 group-hover:opacity-100 transition"
                  title="Previous notice"
                >
                  <IconArrow dir="left" />
                </button>

                <button
                  onClick={nextNotice}
                  className="absolute right-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow ring-1 ring-black/10 opacity-0 group-hover:opacity-100 transition"
                  title="Next notice"
                >
                  <IconArrow />
                </button>

                <AnimatePresence mode="sync">
                  {activeNotice ? (
                    (() => {
                      const color = categoryColor(activeNotice.category)
                      const spotsLeft = (activeNotice.max_participants ?? 0) - ((activeNotice.participants || []).length || 0)
                      const isOwner = user && activeNotice.created_by === user.id
                      const isJoined = user && (activeNotice.participants || []).some((p: any) => p.user_id === user.id)

                      return (
                        <motion.div
                          key={activeNotice.id}
                          onClick={() => setViewActivityId(activeNotice.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') setViewActivityId(activeNotice.id) }}
                          className="absolute inset-0 p-5 sm:p-6 cursor-pointer hover:scale-[1.005] transition flex flex-col"
                          initial={{ opacity: 0, filter: 'blur(14px)', scale: 1.025 }}
                          animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                          exit={{ opacity: 0, filter: 'blur(18px)', scale: 0.985 }}
                          transition={{ duration: 0.9, ease: 'easeInOut' }}
                        >
                          {/* Top: category + title + description.
                              min-h-0 lets the middle shrink so location +
                              actions at the bottom always fit the 280px card. */}
                          <div className="min-h-0 flex-1 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ background: color.dot }} />
                              <span className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: color.text }}>
                                {activeNotice.category}
                              </span>
                            </div>

                            <GrainBlendText text={activeNotice.title} />

                            {activeNotice.description && (
                              // Hard truncate to 160 chars on a single line-clamped
                              // block so the location + action row below always
                              // have a home on a narrow 280px card.
                              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                                {activeNotice.description.length > 160
                                  ? activeNotice.description.slice(0, 157) + '…'
                                  : activeNotice.description}
                              </p>
                            )}
                          </div>

                          {/* Location is pinned above the action row — it never
                              gets shoved off by long descriptions. */}
                          <div className="mt-3 text-sm font-semibold text-slate-500 truncate">
                            {activeNotice.location_mode === 'remote'
                              ? 'Remote / Online'
                              : activeNotice.location_display || activeNotice.location_text || 'Location TBD'}
                            {activeNotice._dist != null ? ` · ${formatDistance(activeNotice._dist)}` : ''}
                          </div>

                          {/* Action row sits in normal flow at the bottom
                              of the flex column. No more absolute overlap. */}
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setViewActivityId(activeNotice.id) }}
                              className="text-sm font-bold text-[#3293CB] hover:underline"
                            >
                              View details →
                            </button>
                            {isOwner ? (
                              <span className="rounded-xl bg-[#3293CB] px-4 py-2 text-xs font-black text-white">Yours</span>
                            ) : isJoined ? (
                              <span className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white">Joined</span>
                            ) : spotsLeft > 0 && user ? (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); joinActivity(activeNotice.id, user.id) }}
                                className="rounded-xl bg-[#3293CB] px-4 py-2 text-xs font-black text-white hover:bg-[#2678A8]"
                              >
                                Join
                              </button>
                            ) : null}
                          </div>
                        </motion.div>
                      )
                    })()
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, filter: 'blur(12px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, filter: 'blur(12px)' }}
                      className="absolute inset-0 grid place-items-center p-5 text-center text-slate-400"
                    >
                      <div>
                        <div className="text-4xl">🌍</div>
                        <div className="mt-2 font-bold">No activities in this area yet.</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-4 space-y-2">
                {noticeItems.slice(0, 4).map((a: any, index: number) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setActiveNoticeIndex(index)
                      setNoticePaused(true)
                      // Scroll the noticeboard card into view so the user
                      // sees the preview they just selected (works desktop + mobile).
                      noticeboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                      activeNotice?.id === a.id ? 'bg-[#3293CB] text-white' : 'bg-white/70 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="text-[11px] font-black uppercase opacity-60">
                      {a.category} · {formatTiming(a)}
                    </div>
                    <div className="mt-1 truncate text-sm font-bold">{a.title}</div>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          {/* Right panel — map + activities live in ONE card so the whole
              right column matches the Buddy Pulse card's height and feel. */}
          <section className="rounded-[30px] bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
            {/* Map strip (top half of the panel) */}
            <div className="relative p-5 bg-[#EEE9DF]">
              <div
                className="absolute inset-0 opacity-50 pointer-events-none"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 20% 20%, rgba(50,147,203,0.28), transparent 24%), radial-gradient(circle at 76% 30%, rgba(139,92,246,0.22), transparent 22%), radial-gradient(circle at 54% 76%, rgba(34,197,94,0.2), transparent 24%)',
                }}
              />

              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Map/filter logic</div>
                  <div className="mt-1 text-2xl font-black tracking-[-0.05em]">Map-tagged activity area</div>
                </div>

                <div className="rounded-full bg-white/75 px-4 py-2 text-sm font-bold text-slate-600">{scope}</div>
              </div>

              {/* Real map — OSM tiles with a pin per activity that has
                  saved coordinates. Clicking a pin focuses it in the
                  noticeboard carousel. Fallback "no pins" tile shows if
                  nothing in the current filter has a location_lat. */}
              <div className="relative z-10 mt-5">
                {(() => {
                  const mapItems: ExploreMapItem[] = withDistance
                    .filter((a: any) => a.location_lat != null && a.location_lng != null)
                    .slice(0, 120) // cap so we don't hammer the tile server
                    .map((a: any) => ({
                      id: a.id, title: a.title, category: a.category,
                      location_lat: a.location_lat, location_lng: a.location_lng,
                    }))
                  if (mapItems.length === 0) {
                    return (
                      <div className="h-[230px] rounded-[28px] bg-white/60 ring-1 ring-black/5 backdrop-blur-sm grid place-items-center text-center p-6">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Selected area</div>
                          <div className="mt-2 text-3xl font-black tracking-[-0.07em]">{cityInput || 'All areas'}</div>
                          <div className="mt-2 text-sm text-slate-500">No activities with a saved pin in this filter yet. Create one and tag it on the map.</div>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <ExploreMap
                      items={mapItems}
                      center={coords ? { lat: coords.lat, lng: coords.lon } : undefined}
                      activeId={activeNotice?.id || null}
                      height={260}
                      onPinClick={(id) => {
                        const idx = noticeItems.findIndex((n: any) => n.id === id)
                        if (idx >= 0) {
                          setActiveNoticeIndex(idx)
                          setNoticePaused(true)
                        } else {
                          // Pin isn't in the top-8 carousel — open the detail modal.
                          setViewActivityId(id)
                        }
                      }}
                    />
                  )
                })()}
              </div>
            </div>
            {/* End of map strip */}

            {/* Activities — bottom half of the right panel, no separate card
                wrapper. Shares the outer white panel with the map above. */}
            <div className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Explore feed</div>
                  <div className="mt-1 text-2xl font-black tracking-[-0.05em]">Activities</div>
                </div>

                <div className="filter-scroll flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setCategory('all')
                      setShowAll(false)
                    }}
                    className={`rounded-full px-4 py-2 text-xs font-black ${
                      category === 'all' && !showAll ? 'bg-[#3293CB] text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    For You
                  </button>

                  <button
                    onClick={() => {
                      setCategory('all')
                      setShowAll(true)
                    }}
                    className={`rounded-full px-4 py-2 text-xs font-black ${
                      category === 'all' && showAll ? 'bg-[#3293CB] text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    All
                  </button>

                  {categories.map((cat: string) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategory(cat)
                        setShowAll(false)
                      }}
                      className={`rounded-full px-4 py-2 text-xs font-black ${
                        category === cat ? 'bg-[#3293CB] text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="activity-grid">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-56 animate-pulse rounded-[24px] bg-slate-100" />
                  ))}
                </div>
              ) : withDistance.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
                  <div className="text-5xl">🌍</div>
                  <div className="mt-4 text-xl font-black tracking-[-0.04em]">
                    No activities in {cityInput || 'your area'} yet
                  </div>
                  <p className="mt-2 text-sm text-slate-500">Be the first to create one.</p>

                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => setShowCreate(true)}
                      className="rounded-2xl bg-[#3293CB] px-5 py-3 text-sm font-black text-white"
                    >
                      Create Activity
                    </button>

                    {cityInput && (
                      <button
                        onClick={clearCity}
                        className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-black text-slate-700"
                      >
                        Show All
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="activity-grid">
                    {pageItems.map((a: any) => {
                      const host = a.host as any
                      const spotsLeft = a.max_participants - (a.participants?.length || 0)
                      const isOwner = user && a.created_by === user.id
                      const isJoined = user && (a.participants || []).some((p: any) => p.user_id === user.id)
                      const color = categoryColor(a.category)

                      return (
                        <article
                          key={a.id}
                          onClick={() => setViewActivityId(a.id)}
                          className="group flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                        >
                          {/* Only render the image slot when the activity
                              actually has a cover. No empty placeholder block
                              — the card starts with content when there's no image. */}
                          {a.cover_image_url && (
                            <div className="h-36 overflow-hidden bg-slate-100">
                              <img
                                src={a.cover_image_url}
                                alt=""
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            </div>
                          )}

                          <div className="flex flex-1 flex-col p-4">
                            {/* Category pill sits on its own line above the
                                title so the title can use the full card width
                                and doesn't get squeezed by the pill. */}
                            <span
                              className="mb-2 self-start rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.04em] shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                              style={{ background: color.bg, color: color.text }}
                            >
                              {a.category}
                            </span>

                            <h3 className="mb-2 text-[17px] font-black leading-snug tracking-[-0.03em]">{a.title}</h3>

                            <p className="text-[13px] leading-6 text-slate-500">
                              {a.location_mode === 'remote' ? 'Remote / Online' : a.location_display || a.location_text}
                              {a._dist != null && ` · ${formatDistance(a._dist)}`} · {formatTiming(a)}
                            </p>

                            {a.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{a.description}</p>}

                            <div className="mt-4 flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left` : 'Full'}
                              </span>

                              {(() => {
                                const b = contributionBadge(a.contribution_type, a.tip_enabled)
                                return (
                                  <span
                                    className="rounded-full px-3 py-1 text-xs font-bold"
                                    style={{ background: b.bg, color: b.fg }}
                                  >
                                    {b.label}
                                  </span>
                                )
                              })()}

                              {a.location_mode === 'remote' && (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Remote</span>
                              )}

                              {a.location_mode === 'nationwide' && (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Nationwide</span>
                              )}

                              {a.location_mode === 'statewide' && (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Statewide</span>
                              )}

                              {host?.verified_selfie && (
                                <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">Verified</span>
                              )}
                            </div>

                            {host && (
                              <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                                <div className="flex items-center gap-2">
                                  <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-slate-100 text-sm font-black text-slate-600">
                                    {host.avatar_url ? (
                                      <img src={host.avatar_url} className="h-full w-full object-cover" alt="" />
                                    ) : (
                                      host.first_name?.[0] || '?'
                                    )}
                                  </div>

                                  <div>
                                    <div className="text-sm font-bold">
                                      {host.first_name} {host.last_name?.[0] || ''}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                      ★ {host.rating_avg?.toFixed(1) || '0.0'} ({host.rating_count || 0})
                                    </div>
                                  </div>
                                </div>

                                {isOwner ? (
                                  <span className="rounded-full bg-[#3293CB] px-3 py-2 text-xs font-black text-white">Yours</span>
                                ) : isJoined ? (
                                  <span className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-black text-white">Joined</span>
                                ) : spotsLeft > 0 ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      joinActivity(a.id, user!.id)
                                    }}
                                    className="rounded-2xl bg-[#3293CB] px-4 py-2 text-xs font-black text-white"
                                  >
                                    Join
                                  </button>
                                ) : (
                                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">Full</span>
                                )}
                              </div>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>

                  <div className="mt-5">
                    <Paginator page={page} totalPages={totalPages} onChange={setExplorePage} />
                  </div>
                </>
              )}
            </div>
            {/* End of activities bottom half (inside the same right panel) */}
          </section>
        </div>
      </div>

      <SafetyBanner />
      {showCreate && <CreateActivityModal onClose={() => { setShowCreate(false); fetchActivities() }} />}
      {viewActivityId && <ActivityDetailModal activityId={viewActivityId} onClose={() => { setViewActivityId(null); fetchActivities() }} />}
    </main>
  )
}
