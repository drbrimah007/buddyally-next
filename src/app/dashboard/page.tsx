'use client'

import { useState, useEffect, useRef } from 'react'
import { useActivities } from '@/hooks/useActivities'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import CreateActivityModal from '@/components/CreateActivityModal'
import ActivityDetailModal from '@/components/ActivityDetailModal'
import SafetyBanner from '@/components/SafetyBanner'
import Paginator from '@/components/Paginator'

// 3 cards per row × 10 rows = 30 per page.
const EXPLORE_PAGE_SIZE = 30

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => d * Math.PI / 180
  const R = 3958.8
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function formatDistance(miles: number) {
  if (miles < 0.3) return Math.round(miles * 5280) + ' ft away'
  if (miles < 1) return (Math.round(miles * 10) / 10) + ' mi away'
  return Math.round(miles) + ' mi away'
}

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

export default function ExplorePage() {
  const { activities, loading, fetchActivities, joinActivity } = useActivities()
  const { profile, user } = useAuth()
  const router = useRouter()
  const [radius, setRadius] = useState(5)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [showAll, setShowAll] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [cityInput, setCityInput] = useState('')
  const [cityCoords, setCityCoords] = useState<{lat:number,lon:number,state?:string}|null>(null)
  const [placeResults, setPlaceResults] = useState<any[]>([])
  const [showPlaces, setShowPlaces] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [userStateCode, setUserStateCode] = useState('')
  const [viewActivityId, setViewActivityId] = useState<string | null>(null)
  const [explorePage, setExplorePage] = useState(0)
  const searchTimeout = useRef<any>(null)

  // Reset pagination when the visible set changes (filter/search/location/radius).
  // Keeps the user from being stuck on an empty "page 5" after narrowing.
  useEffect(() => { setExplorePage(0) }, [search, category, radius, cityCoords?.lat, cityCoords?.lon, showAll])

  useEffect(() => {
    // Load from sessionStorage first (instant)
    const cached = sessionStorage.getItem('ba_city')
    const cachedCoords = sessionStorage.getItem('ba_coords')
    if (cached) setCityInput(cached)
    if (cachedCoords) { try { setCityCoords(JSON.parse(cachedCoords)) } catch {} }
    // Then fall back to profile
    if (!cached && profile?.home_display_name) setCityInput(profile.home_display_name)
    if (!cachedCoords && profile?.home_lat && profile?.home_lng) setCityCoords({ lat: profile.home_lat, lon: profile.home_lng })
  }, [profile])

  const userInterests = profile?.interests || []
  const categories = showAll || userInterests.length === 0
    ? ['Travel','Local Activities','Sports / Play','Learning','Help / Support','Events','Outdoor','Gaming','Wellness','Ride Share','Dog Walk','Babysit','Party','Pray','Others']
    : userInterests

  // Nominatim city search
  function searchPlaces(val: string) {
    setCityInput(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!val || val.length < 2) { setPlaceResults([]); setShowPlaces(false); return }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=5`)
        const data = await res.json()
        setPlaceResults(data)
        setShowPlaces(data.length > 0)
      } catch { setPlaceResults([]); setShowPlaces(false) }
    }, 300)
  }

  function saveExploreState(display: string, lat: number | null, lon: number | null, rad: number) {
    if (!user) return
    const updates: any = { explore_display_name: display, explore_radius_miles: rad }
    if (lat != null && lon != null) { updates.explore_lat = lat; updates.explore_lng = lon }
    else { updates.explore_lat = null; updates.explore_lng = null }
    // Fire-and-forget from a sync caller — we await inside an IIFE so the query
    // runs AND any RLS/schema errors surface in the console instead of being
    // silently dropped by a no-op .then().
    ;(async () => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
      if (error) console.error('[explore] saveExploreState failed', error)
    })()
    sessionStorage.setItem('ba_city', display)
    if (lat != null && lon != null) sessionStorage.setItem('ba_coords', JSON.stringify({ lat, lon }))
    else sessionStorage.removeItem('ba_coords')
  }

  function selectPlace(place: any) {
    const addr = place.address || {}
    const name = addr.borough || addr.city || addr.town || addr.village || addr.county || place.display_name.split(',')[0]
    const state = addr.state || ''
    const stateCode = (addr['ISO3166-2-lvl4'] || '').replace('US-', '')
    const display = state ? `${name}, ${state}` : name
    const lat = parseFloat(place.lat), lon = parseFloat(place.lon)
    setCityInput(display)
    setCityCoords({ lat, lon, state: stateCode || undefined })
    setUserStateCode(stateCode)
    setPlaceResults([])
    setShowPlaces(false)
    saveExploreState(display, lat, lon, radius)
  }

  function clearCity() {
    setCityInput('')
    setCityCoords(null)
    setPlaceResults([])
    setShowPlaces(false)
    saveExploreState('', null, null, radius)
  }

  // GPS
  function useGPS() {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`)
          const data = await res.json()
          const addr = data.address || {}
          const name = addr.borough || addr.city || addr.town || addr.village || addr.county || 'Your Location'
          const state = addr.state || ''
          const stateCode = (addr['ISO3166-2-lvl4'] || '').replace('US-', '')
          const display = state ? `${name}, ${state}` : name
          setCityCoords({ lat: latitude, lon: longitude, state: stateCode || undefined })
          setUserStateCode(stateCode)
          setCityInput(display)
          saveExploreState(display, latitude, longitude, radius)
        } catch {
          setCityCoords({ lat: latitude, lon: longitude })
          setCityInput('Current Location')
          saveExploreState('Current Location', latitude, longitude, radius)
        }
        setGpsLoading(false)
      },
      () => { setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Filter activities
  const today = new Date(); today.setHours(0,0,0,0)
  const filtered = activities.filter(a => {
    if (category !== 'all' && a.category !== category) return false
    if (category === 'all' && !showAll && userInterests.length > 0 && !userInterests.includes(a.category)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!a.title.toLowerCase().includes(q) && !(a.description || '').toLowerCase().includes(q)) return false
    }
    if (a.status === 'cancelled') return false
    // Filter past one-time activities, keep flexible/recurring
    if (a.timing_mode !== 'flexible' && a.timing_mode !== 'recurring' && a.date) {
      const actDate = new Date(a.date)
      if (!isNaN(actDate.getTime()) && actDate < today) return false
    }
    return true
  })

  // v1-parity proximity scope matcher:
  //   radius = 0    → nationwide (show everything)
  //   radius >= 100 → statewide (require state match; fall back to 100mi radius if no user state)
  //   otherwise     → local radius, require coords on both sides OR remote/nationwide mode
  const coords = cityCoords
  const userState = cityCoords?.state
  const scope: 'nationwide' | 'statewide' | 'local' =
    radius === 0 ? 'nationwide' : (radius >= 100 ? 'statewide' : 'local')

  const withDistance = filtered.map(a => {
    let dist: number | null = null
    if (coords && a.location_lat && a.location_lng) {
      dist = haversineMiles(coords.lat, coords.lon, a.location_lat, a.location_lng)
    }
    return { ...a, _dist: dist }
  }).filter(a => {
    // Without a selected city, bypass geo filtering entirely (v1 parity)
    if (!coords) return true
    // Nationwide browse: show everything
    if (scope === 'nationwide') return true
    // Remote / nationwide-scoped activities always show
    if (a.location_mode === 'remote' || a.location_mode === 'nationwide') return true
    // Statewide browse: match stateCode when we have one, else fall back to 100mi
    if (scope === 'statewide') {
      if (userState && a.state_code) return a.state_code === userState
      if (a._dist == null) return false
      return a._dist <= 100
    }
    // Local radius: must have coords + be within radius
    if (a._dist == null) return false
    return a._dist <= radius
  }).sort((a, b) => {
    if (a._dist != null && b._dist != null) return a._dist - b._dist
    if (a._dist != null) return -1
    if (b._dist != null) return 1
    return 0
  })

  return (
    <div>
      {/* Explore feed grid: 3 per row on desktop, 2 on medium, 1 on phones. */}
      <style dangerouslySetInnerHTML={{ __html: `
        .explore-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:16px}
        @media(max-width:900px){.explore-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:620px){.explore-grid{grid-template-columns:1fr}}
      `}} />
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Explore Activities</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => fetchActivities()} style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }} title="Refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
          <button onClick={() => setShowCreate(true)} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ New Activity</button>
        </div>
      </div>

      {/* Location + GPS + radius */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, position: 'relative', flexWrap: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #E5E7EB', borderRadius: 10, padding: '0 10px', height: 40, background: '#fff' }}>
          <span style={{ fontSize: 14 }}>📍</span>
          <input
            type="text"
            value={cityInput}
            onChange={e => searchPlaces(e.target.value)}
            placeholder="City or area"
            style={{ border: 'none', fontSize: 13, outline: 'none', color: '#111827', width: 200, background: 'transparent' }}
          />
          {cityInput && <span style={{ color: '#6B7280', cursor: 'pointer', fontSize: 13 }} onClick={clearCity}>&times;</span>}
        </div>
        <select
          value={radius}
          onChange={e => setRadius(parseFloat(e.target.value))}
          style={{ height: 40, border: '1px solid #E5E7EB', borderRadius: 10, padding: '0 12px', fontSize: 13, background: '#fff', color: '#111827', cursor: 'pointer' }}
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
        <button onClick={useGPS} disabled={gpsLoading} style={{ height: 40, padding: '0 20px', borderRadius: 10, border: '1px solid #cfe8f8', background: '#eff8fe', color: '#197bb8', fontWeight: 600, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {gpsLoading ? 'Locating...' : 'Use GPS'}
        </button>
        {/* Place results dropdown */}
        {showPlaces && placeResults.length > 0 && (
          <div style={{ position: 'absolute', top: 42, left: 0, width: 280, background: '#fff', border: '1px solid #E5E7EB', borderRadius: '0 0 10px 10px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 999, maxHeight: 220, overflowY: 'auto' }}>
            {placeResults.map((p: any, i: number) => (
              <div key={i} onClick={() => selectPlace(p)} style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                {p.display_name?.substring(0, 60)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <span
          onClick={() => { setCategory('all'); setShowAll(false) }}
          style={{ padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', ...(category === 'all' && !showAll ? { background: '#3293CB', color: '#fff', border: '1px solid #3293CB' } : { background: '#f4f7fa', color: '#111827', border: '1px solid #E5E7EB' }) }}
        >For You</span>
        <span
          onClick={() => { setCategory('all'); setShowAll(true) }}
          style={{ padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', ...(category === 'all' && showAll ? { background: '#3293CB', color: '#fff', border: '1px solid #3293CB' } : { background: '#f4f7fa', color: '#111827', border: '1px solid #E5E7EB' }) }}
        >All</span>
        {categories.map(cat => (
          <span
            key={cat}
            onClick={() => { setCategory(cat); setShowAll(false) }}
            style={{ padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: 'pointer', ...(category === cat ? { background: '#3293CB', color: '#fff', border: '1px solid #3293CB' } : { background: '#f4f7fa', color: '#111827', border: '1px solid #E5E7EB' }) }}
          >{cat}</span>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <input
          type="text"
          placeholder="Search activities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ height: 40, width: '100%', maxWidth: 320, borderRadius: 10, border: '1px solid #E5E7EB', padding: '0 12px', fontSize: 13, background: '#fff', color: '#111827' }}
        />
      </div>

      {/* Activity cards */}
      {loading ? (
        <div>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
              <div style={{ height: 20, background: '#f3f4f6', borderRadius: 8, width: '60%', marginBottom: 12 }} />
              <div style={{ height: 16, background: '#f9fafb', borderRadius: 8, width: '40%', marginBottom: 16 }} />
              <div style={{ height: 48, background: '#f9fafb', borderRadius: 8, marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: 8 }}><div style={{ height: 24, background: '#f3f4f6', borderRadius: 20, width: 80 }} /><div style={{ height: 24, background: '#f3f4f6', borderRadius: 20, width: 60 }} /></div>
            </div>
          ))}
        </div>
      ) : withDistance.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🌍</p>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>No activities in {cityInput || 'your area'} yet</p>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>Be the first to create one!</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setShowCreate(true)} style={{ padding: '12px 24px', borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer', boxShadow: '0 1px 3px rgba(50,147,203,0.3)' }}>Create Activity</button>
            {cityInput && <button onClick={clearCity} style={{ padding: '12px 24px', borderRadius: 14, border: '1px solid #E5E7EB', background: '#fff', color: '#111827', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Show All</button>}
          </div>
        </div>
      ) : (() => {
        const totalPages = Math.max(1, Math.ceil(withDistance.length / EXPLORE_PAGE_SIZE))
        const page = Math.min(explorePage, totalPages - 1)
        const pageItems = withDistance.slice(page * EXPLORE_PAGE_SIZE, (page + 1) * EXPLORE_PAGE_SIZE)
        return (
        <div>
          <div className="explore-grid">
          {pageItems.map(a => {
            const host = a.host as any
            const spotsLeft = a.max_participants - (a.participants?.length || 0)
            const isOwner = user && a.created_by === user.id
            const isJoined = user && (a.participants || []).some((p: any) => p.user_id === user.id)
            return (
              <div
                key={a.id}
                onClick={() => setViewActivityId(a.id)}
                style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', minWidth: 0 }}
              >
                {a.cover_image_url && (
                  <div style={{ margin: '-20px -20px 12px', height: 140, overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
                    <img src={a.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div>
                    <h3 style={{ marginBottom: 4, fontSize: 16, fontWeight: 600 }}>{a.title}</h3>
                    <p style={{ fontSize: 13, color: '#6B7280' }}>
                      {a.location_mode === 'remote' ? 'Remote / Online' : a.location_display || a.location_text}
                      {a._dist != null && ` • ${formatDistance(a._dist)}`}
                      {' • '}{formatTiming(a)}
                    </p>
                  </div>
                  <span style={{ background: '#3293CB', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{a.category}</span>
                </div>
                {a.description && (
                  <p style={{ fontSize: 14, color: '#4B5563', marginBottom: 10, lineHeight: 1.6 }}>{a.description.substring(0, 120)}{a.description.length > 120 ? '...' : ''}</p>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB' }}>
                    {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left` : 'Full'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, ...(a.tip_enabled ? { background: '#D97706', color: '#fff' } : { background: '#059669', color: '#fff' }) }}>
                    {a.tip_enabled ? 'Tips optional' : 'Free'}
                  </span>
                  {a.location_mode === 'remote' && <span style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB' }}>Remote</span>}
                  {a.location_mode === 'nationwide' && <span style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB' }}>Nationwide</span>}
                  {a.location_mode === 'statewide' && <span style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB' }}>Statewide</span>}
                  {host?.verified_selfie && <span style={{ background: '#059669', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>Verified</span>}
                </div>
                {host && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #E5E7EB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#4B5563', overflow: 'hidden' }}>
                        {host.avatar_url ? <img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : (host.first_name?.[0] || '?')}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600 }}>{host.first_name} {host.last_name?.[0] || ''}</p>
                        <p style={{ fontSize: 12, color: '#6B7280' }}><span style={{ color: '#F59E0B' }}>{'★'.repeat(Math.round(host.rating_avg || 0))}</span><span style={{ color: '#E2E8F0' }}>{'★'.repeat(5 - Math.round(host.rating_avg || 0))}</span> {host.rating_avg?.toFixed(1) || '0.0'} ({host.rating_count || 0})</p>
                      </div>
                    </div>
                    {isOwner ? (
                      <span style={{ background: '#3293CB', color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 20 }}>Your Activity</span>
                    ) : isJoined ? (
                      <span style={{ background: '#059669', color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 20 }}>Joined</span>
                    ) : spotsLeft > 0 ? (
                      <button onClick={e => { e.stopPropagation(); joinActivity(a.id, user!.id) }} style={{ background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 1px 3px rgba(50,147,203,0.3)' }}>Join</button>
                    ) : (
                      <span style={{ background: '#F3F4F6', color: '#6B7280', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 20 }}>Full</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          </div>
          <Paginator page={page} totalPages={totalPages} onChange={setExplorePage} />
        </div>
        )
      })()}
      <SafetyBanner />
      {showCreate && <CreateActivityModal onClose={() => { setShowCreate(false); fetchActivities() }} />}
      {viewActivityId && <ActivityDetailModal activityId={viewActivityId} onClose={() => { setViewActivityId(null); fetchActivities() }} />}
    </div>
  )
}
