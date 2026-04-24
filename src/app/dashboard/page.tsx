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

function categoryColor(category?: string) {
  const c = (category || '').toLowerCase()
  if (c.includes('ride') || c.includes('travel')) return { dot: '#3293CB', bg: '#EAF6FC', text: '#197BB8' }
  if (c.includes('event') || c.includes('party')) return { dot: '#EF4444', bg: '#FEF2F2', text: '#DC2626' }
  if (c.includes('help') || c.includes('support') || c.includes('dog') || c.includes('baby')) return { dot: '#22C55E', bg: '#F0FDF4', text: '#16A34A' }
  if (c.includes('learning') || c.includes('gaming') || c.includes('sports')) return { dot: '#8B5CF6', bg: '#F5F3FF', text: '#7C3AED' }
  return { dot: '#64748B', bg: '#F1F5F9', text: '#475569' }
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
  const [cityCoords, setCityCoords] = useState<{ lat: number; lon: number; state?: string } | null>(null)
  const [placeResults, setPlaceResults] = useState<any[]>([])
  const [showPlaces, setShowPlaces] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [userStateCode, setUserStateCode] = useState('')
  const [viewActivityId, setViewActivityId] = useState<string | null>(null)
  const [explorePage, setExplorePage] = useState(0)
  const [activeNoticeIndex, setActiveNoticeIndex] = useState(0)
  const [noticePaused, setNoticePaused] = useState(false)

  const searchTimeout = useRef<any>(null)

  // URL-param hydration — runs once so we don't stomp on user edits.
  // Powers the "Run now" button from /dashboard/saved-searches.
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
    if (city) { setCityInput(city); touched = true }
    if (rad) { const n = Number(rad); if (!Number.isNaN(n)) { setRadius(n); touched = true } }
    if (free === '1') { /* is_free is not a base filter here; saved in filter_json — leave as marker */ touched = true }
    if (touched) hydratedFromParams.current = true
  }, [searchParams])

  useEffect(() => {
    setExplorePage(0)
    setActiveNoticeIndex(0)
  }, [search, category, radius, cityCoords?.lat, cityCoords?.lon, showAll])

  useEffect(() => {
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
      setCityCoords({ lat: ip.lat, lon: ip.lng, state: ip.stateCode || undefined })
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

    searchTimeout.current = setTimeout(async () => {
      const data = await searchPlacesApi(val, 5)
      setPlaceResults(data)
      setShowPlaces(data.length > 0)
    }, 300)
  }

  function saveExploreState(display: string, lat: number | null, lon: number | null, rad: number) {
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
      sessionStorage.setItem('ba_coords', JSON.stringify({ lat, lon }))
    } else {
      sessionStorage.removeItem('ba_coords')
    }
  }

  function selectPlace(place: any) {
    const pick = pickPlace(place)
    setCityInput(pick.display)
    setCityCoords({ lat: pick.lat, lon: pick.lng, state: pick.stateCode || undefined })
    setUserStateCode(pick.stateCode || '')
    setPlaceResults([])
    setShowPlaces(false)
    saveExploreState(pick.display, pick.lat, pick.lng, radius)
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
          setCityCoords({ lat: latitude, lon: longitude, state: pick.stateCode || undefined })
          setUserStateCode(pick.stateCode || '')
          setCityInput(pick.display)
          saveExploreState(pick.display, latitude, longitude, radius)
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
      if (scope === 'nationwide') return true
      if (a.location_mode === 'remote' || a.location_mode === 'nationwide') return true

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

  const noticeItems = useMemo(() => withDistance.slice(0, 8), [withDistance])
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
    }, 3200)

    return () => window.clearInterval(interval)
  }, [noticePaused, noticeItems.length])

  return (
    <main className="min-h-screen bg-[#f4f5f7] px-4 py-5 text-[#111827] sm:px-6 lg:px-8">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .ba-grid{display:grid;grid-template-columns:390px minmax(0,1fr);gap:18px;align-items:start}
            .activity-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
            @media(max-width:1180px){.ba-grid{grid-template-columns:1fr}.activity-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
            @media(max-width:720px){.activity-grid{grid-template-columns:1fr}.filter-scroll{overflow-x:auto;flex-wrap:nowrap!important;padding-bottom:4px}.filter-scroll>*{white-space:nowrap}}
          `,
        }}
      />

      <div className="mx-auto max-w-[1440px]">
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
              className="h-11 rounded-2xl bg-[#3293CB] px-5 text-sm font-black uppercase text-white shadow-[0_10px_24px_rgba(50,147,203,0.25)]"
            >
              + New Activity
            </button>
          </div>
        </header>

        <div className="ba-grid">
          <aside className="space-y-4">
            <section className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Area search</div>
                  <div className="mt-1 text-xl font-black tracking-[-0.04em]">Filter the board</div>
                </div>

                <div className="rounded-full bg-[#EEF8FE] px-3 py-1 text-xs font-bold text-[#197BB8]">
                  {withDistance.length} found
                </div>
              </div>

              <div className="relative">
                <div className="flex h-12 items-center gap-3 rounded-2xl border border-black/10 bg-[#F8FAFC] px-4 text-slate-500">
                  <IconLocation />

                  <input
                    value={cityInput}
                    onChange={(e) => searchPlaces(e.target.value)}
                    placeholder="City or area"
                    className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  />

                  {cityInput && (
                    <button className="text-lg text-slate-400" onClick={clearCity}>
                      ×
                    </button>
                  )}
                </div>

                {showPlaces && placeResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-[54px] z-40 max-h-64 overflow-y-auto rounded-2xl border border-black/10 bg-white shadow-xl">
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

              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                <select
                  value={radius}
                  onChange={(e) => setRadius(parseFloat(e.target.value))}
                  className="h-11 rounded-2xl border border-black/10 bg-white px-3 text-sm font-semibold outline-none"
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
                  className="h-11 rounded-2xl bg-[#EFF8FE] px-4 text-sm font-black text-[#197BB8] ring-1 ring-[#CFE8F8]"
                >
                  {gpsLoading ? 'Locating...' : 'Use GPS'}
                </button>
              </div>

              <div className="mt-3 flex h-12 items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 text-slate-500">
                <IconSearch />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search activities..."
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                />
              </div>

              {/* Save-this-search — persists the current filter as a named
                  saved search (see /dashboard/saved-searches). */}
              <div className="mt-3">
                <SaveSearchButton
                  filter={{
                    q: search || undefined,
                    category: category !== 'all' ? category : undefined,
                    city: cityInput || undefined,
                    radius_mi: radius,
                  }}
                />
              </div>
            </section>

            <section className="rounded-[30px] bg-[#EEE9DF] p-5 shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Dynamic noticeboard</div>
                  <div className="mt-1 text-2xl font-black tracking-[-0.05em]">{cityInput || 'Nearby'}</div>
                </div>

                <div className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-slate-500">
                  {noticePaused ? 'Paused' : 'Blending'}
                </div>
              </div>

              <div
                onMouseEnter={() => setNoticePaused(true)}
                onMouseLeave={() => setNoticePaused(false)}
                className="relative mt-5 h-[280px] overflow-hidden rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/5"
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
                  className="absolute left-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow ring-1 ring-black/10"
                  title="Previous notice"
                >
                  <IconArrow dir="left" />
                </button>

                <button
                  onClick={nextNotice}
                  className="absolute right-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow ring-1 ring-black/10"
                  title="Next notice"
                >
                  <IconArrow />
                </button>

                <AnimatePresence mode="sync">
                  {activeNotice ? (
                    (() => {
                      const color = categoryColor(activeNotice.category)

                      return (
                        <motion.div
                          key={activeNotice.id}
                          className="absolute inset-0 p-6"
                          initial={{ opacity: 0, filter: 'blur(14px)', scale: 1.025 }}
                          animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                          exit={{ opacity: 0, filter: 'blur(18px)', scale: 0.985 }}
                          transition={{ duration: 0.9, ease: 'easeInOut' }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ background: color.dot }} />
                            <span className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: color.text }}>
                              {activeNotice.category}
                            </span>
                          </div>

                          <GrainBlendText text={activeNotice.title} />

                          {activeNotice.description && (
                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{activeNotice.description}</p>
                          )}

                          <div className="mt-4 text-sm font-semibold text-slate-500">
                            {activeNotice.location_mode === 'remote'
                              ? 'Remote / Online'
                              : activeNotice.location_display || activeNotice.location_text || 'Location TBD'}
                            {activeNotice._dist != null ? ` · ${formatDistance(activeNotice._dist)}` : ''}
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
                    }}
                    className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                      activeNotice?.id === a.id ? 'bg-slate-950 text-white' : 'bg-white/70 text-slate-700 hover:bg-white'
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

          <section className="space-y-4">
            <div className="relative min-h-[300px] overflow-hidden rounded-[30px] bg-[#EEE9DF] p-5 shadow-sm ring-1 ring-black/5">
              <div
                className="absolute inset-0 opacity-50"
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

              <div className="relative z-10 mt-5 h-[230px] rounded-[28px] bg-white/45 ring-1 ring-black/5 backdrop-blur-sm">
                <div className="absolute left-1/2 top-1/2 w-[310px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-white/90 p-5 text-center shadow-xl ring-1 ring-black/5">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Selected area</div>
                  <div className="mt-2 text-4xl font-black tracking-[-0.07em]">{cityInput || 'All areas'}</div>
                  <div className="mt-2 text-sm text-slate-500">Pins use the same filtered activity set as the feed.</div>
                </div>

                {noticeItems.map((a: any, index: number) => {
                  const color = categoryColor(a.category)
                  const positions = [
                    [18, 24],
                    [72, 22],
                    [38, 65],
                    [82, 68],
                    [22, 76],
                    [58, 42],
                    [44, 24],
                    [67, 78],
                  ]
                  const [left, top] = positions[index % positions.length]

                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        setActiveNoticeIndex(index)
                        setNoticePaused(true)
                      }}
                      className="absolute z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_10px_rgba(255,255,255,0.5)] transition hover:scale-125"
                      style={{ left: `${left}%`, top: `${top}%`, background: color.dot }}
                      title={a.title}
                    />
                  )
                })}
              </div>
            </div>

            <section className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/5">
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
                          {a.cover_image_url ? (
                            <div className="h-36 overflow-hidden bg-slate-100">
                              <img
                                src={a.cover_image_url}
                                alt=""
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            </div>
                          ) : (
                            <div className="h-24" style={{ background: `linear-gradient(135deg, ${color.bg}, #ffffff)` }} />
                          )}

                          <div className="flex flex-1 flex-col p-4">
                            <div className="mb-3 flex items-start justify-between gap-2">
                              <h3 className="text-[17px] font-black leading-snug tracking-[-0.03em]">{a.title}</h3>
                              <span
                                className="shrink-0 rounded-full px-3 py-1 text-[11px] font-black"
                                style={{ background: color.bg, color: color.text }}
                              >
                                {a.category}
                              </span>
                            </div>

                            <p className="text-[13px] leading-6 text-slate-500">
                              {a.location_mode === 'remote' ? 'Remote / Online' : a.location_display || a.location_text}
                              {a._dist != null && ` · ${formatDistance(a._dist)}`} · {formatTiming(a)}
                            </p>

                            {a.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{a.description}</p>}

                            <div className="mt-4 flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left` : 'Full'}
                              </span>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold text-white ${
                                  a.tip_enabled ? 'bg-amber-600' : 'bg-emerald-600'
                                }`}
                              >
                                {a.tip_enabled ? 'Tips optional' : 'Free'}
                              </span>

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
            </section>
          </section>
        </div>
      </div>

      <SafetyBanner />
      {showCreate && <CreateActivityModal onClose={() => { setShowCreate(false); fetchActivities() }} />}
      {viewActivityId && <ActivityDetailModal activityId={viewActivityId} onClose={() => { setViewActivityId(null); fetchActivities() }} />}
    </main>
  )
}
