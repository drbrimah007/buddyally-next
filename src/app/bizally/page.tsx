'use client'

// Bizally — businesses participating in real-world flow.
//
// NOT a marketplace. NOT a directory. NOT search-first.
//
// The page reads as a feed of who's ACTIVE RIGHT NOW. Filters are
// availability states ("Open now", "Available today", "Taking requests"),
// not categories. Search exists but lives below the live feed as a
// secondary affordance — the primary interaction is "scroll the
// active feed."
//
// Indexing: noindex on this directory itself (it's a long list of
// links, not high-value SEO content). Individual business pages
// control their own indexability via business_is_indexable().

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  AVAILABILITY_STATES,
  BIZALLY_ACCENT,
  BIZALLY_ACCENT_BG,
  BIZALLY_ACCENT_FG,
  BUSINESS_CATEGORIES,
  availabilityMeta,
  categoryLabel,
  haversineMiles,
  isLive,
  type AvailabilityState,
} from '@/lib/business'
import { searchPlaces as searchPlacesApi, pickPlace, renderPlaceLabel } from '@/lib/geo'

const PAGE_SIZE = 30

type Biz = {
  id: string
  slug: string
  name: string
  tagline: string
  logo_url: string
  cover_image_url: string
  categories: string[]
  home_display_name: string | null
  home_lat: number | null
  home_lng: number | null
  availability_state: AvailabilityState
  status_message: string | null
  status_updated_at: string
  status_expires_at: string | null
}

const FILTER_CHIPS: { id: 'all' | AvailabilityState | 'near'; label: string; emoji: string }[] = [
  { id: 'all',              label: 'All active',       emoji: '✨' },
  { id: 'open',             label: 'Open now',         emoji: '🟢' },
  { id: 'available_today',  label: 'Available today',  emoji: '🟡' },
  { id: 'taking_requests',  label: 'Taking requests',  emoji: '🟠' },
  { id: 'near',             label: 'Near me',          emoji: '📍' },
]

export default function BizallyPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Biz[]>([])
  const [loading, setLoading] = useState(true)
  // Filter state — defaults intentionally null until profile loads, so
  // we can flip to 'near' once we know the user has a home location.
  const [filter, setFilter] = useState<typeof FILTER_CHIPS[number]['id'] | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  // "More filters" drawer — collapsed by default to keep Bizally feeling
  // like a feed, not a directory. Inside: optional area override + categories.
  const [moreOpen, setMoreOpen] = useState(false)
  const [pickedCats, setPickedCats] = useState<string[]>([])
  // Area override — if user picks a city here, it replaces their profile
  // location for distance math. Lets people scout businesses in cities
  // they don't live in (planning a trip, etc.).
  const [areaName, setAreaName] = useState('')
  const [areaLat, setAreaLat] = useState<number | null>(null)
  const [areaLng, setAreaLng] = useState<number | null>(null)
  const [areaResults, setAreaResults] = useState<any[]>([])
  const [showAreaResults, setShowAreaResults] = useState(false)
  const areaTimer = useRef<any>(null)
  const areaBoxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (areaBoxRef.current && !areaBoxRef.current.contains(e.target as Node)) setShowAreaResults(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])
  function searchArea(val: string) {
    setAreaName(val); setAreaLat(null); setAreaLng(null)
    if (areaTimer.current) clearTimeout(areaTimer.current)
    if (!val || val.length < 2) { setAreaResults([]); setShowAreaResults(false); return }
    areaTimer.current = setTimeout(async () => {
      const data = await searchPlacesApi(val, 8)
      setAreaResults(data); setShowAreaResults(data.length > 0)
    }, 300)
  }
  function selectArea(place: any) {
    const pick = pickPlace(place)
    setAreaName(pick.display); setAreaLat(pick.lat); setAreaLng(pick.lng)
    setAreaResults([]); setShowAreaResults(false)
    setFilter('near') // picking an area auto-switches to distance filter
  }
  function clearArea() {
    setAreaName(''); setAreaLat(null); setAreaLng(null)
  }

  // noindex the directory itself
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'; meta.content = 'noindex, follow'
    document.head.appendChild(meta)
    return () => { meta.remove() }
  }, [])

  useEffect(() => { setPage(0) }, [filter, search, pickedCats, areaLat, areaLng])

  // Default the filter once we know whether the user has a home location.
  // - has location (from profile OR area override) → 📍 Near me
  // - no location anywhere → ✨ All active (graceful global fallback)
  // Only runs once per filter being null so the user's manual choice
  // doesn't get clobbered.
  useEffect(() => {
    if (filter !== null) return
    const hasLoc = (areaLat != null && areaLng != null)
      || ((profile as any)?.home_lat != null && (profile as any)?.home_lng != null)
    setFilter(hasLoc ? 'near' : 'all')
  }, [profile, areaLat, areaLng, filter])

  // Live feed: active states first, sorted by status_updated_at DESC.
  // We fetch a generous slice (200) and let filters narrow client-side.
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('business_profiles')
        .select('id, slug, name, tagline, logo_url, cover_image_url, categories, home_display_name, home_lat, home_lng, availability_state, status_message, status_updated_at, status_expires_at')
        .eq('status', 'published')
        .neq('availability_state', 'closed')
        .order('status_updated_at', { ascending: false })
        .limit(200)
      // Filter out expired statuses client-side (cron / scheduled job
      // can later flip them DB-side; for now we just hide them)
      const now = Date.now()
      const live = ((data as any) || []).filter((b: Biz) =>
        !b.status_expires_at || new Date(b.status_expires_at).getTime() > now
      )
      setRows(live)
      setLoading(false)
    })()
  }, [])

  // Effective location for distance filter — area override beats profile
  const effectiveLoc = useMemo(
    () => areaLat != null && areaLng != null
      ? { lat: areaLat, lng: areaLng }
      : { lat: (profile as any)?.home_lat ?? null, lng: (profile as any)?.home_lng ?? null },
    [profile, areaLat, areaLng],
  )

  const filtered = useMemo(() => {
    let out = rows
    if (filter && filter !== 'all' && filter !== 'near') {
      out = out.filter((b) => b.availability_state === filter)
    }
    if (filter === 'near' && effectiveLoc.lat != null && effectiveLoc.lng != null) {
      out = [...out]
        .map((b) => ({ b, d: haversineMiles(effectiveLoc, { lat: b.home_lat, lng: b.home_lng }) }))
        .filter((x) => Number.isFinite(x.d) && x.d <= 25) // 25 mi cap
        .sort((a, c) => a.d - c.d)
        .map((x) => x.b)
    }
    if (pickedCats.length > 0) {
      out = out.filter((b) => Array.isArray(b.categories) && b.categories.some((c) => pickedCats.includes(c)))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter((b) =>
        b.name.toLowerCase().includes(q) ||
        (b.tagline || '').toLowerCase().includes(q) ||
        (b.status_message || '').toLowerCase().includes(q),
      )
    }
    return out
  }, [rows, filter, search, effectiveLoc, pickedCats])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, totalPages - 1)
  const pageRows = filtered.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 4px 80px' }}>
      {/* Header — small, no marketplace energy */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
          <span style={{ color: BIZALLY_ACCENT }}>●</span> Bizally
        </h1>
        <Link href="/dashboard/business" style={{ color: BIZALLY_ACCENT, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
          List your business →
        </Link>
      </div>
      <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>
        Businesses already nearby, already active.
      </p>

      {/* Filter chips — availability-first */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 8 }}>
        {FILTER_CHIPS.map((c) => {
          const active = filter === c.id
          const disabled = c.id === 'near' && (effectiveLoc.lat == null || effectiveLoc.lng == null)
          return (
            <button
              key={c.id}
              onClick={() => !disabled && setFilter(c.id)}
              disabled={disabled}
              title={disabled ? 'Set your home area in your profile to enable' : undefined}
              style={{
                padding: '7px 13px', borderRadius: 999,
                border: `1.5px solid ${active ? BIZALLY_ACCENT : '#e5e7eb'}`,
                background: active ? BIZALLY_ACCENT : '#fff',
                color: active ? '#fff' : '#111827',
                fontSize: 12, fontWeight: 700,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
                whiteSpace: 'nowrap', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <span aria-hidden>{c.emoji}</span> {c.label}
            </button>
          )
        })}
      </div>

      {/* Scope hint + More filters drawer trigger */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, fontSize: 11, color: '#6b7280' }}>
        <span>
          {filter === 'near' && effectiveLoc.lat != null
            ? <>Within 25 miles of <b>{areaName || (profile as any)?.home_display_name?.split(',')[0] || 'you'}</b></>
            : <>Showing businesses worldwide. Set your area to narrow.</>}
        </span>
        <button
          onClick={() => setMoreOpen((v) => !v)}
          style={{
            padding: '4px 10px', borderRadius: 999,
            border: '1px solid #e5e7eb', background: '#fff',
            color: '#374151', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          {moreOpen ? 'Hide' : 'More filters'} {moreOpen ? '▲' : '▼'}
          {(pickedCats.length > 0 || (areaLat != null && areaLng != null)) && (
            <span style={{ marginLeft: 4, color: BIZALLY_ACCENT_FG, background: BIZALLY_ACCENT_BG, padding: '0 5px', borderRadius: 4, fontSize: 10 }}>
              {pickedCats.length + (areaLat != null ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Collapsible drawer — area picker + categories */}
      {moreOpen && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, marginBottom: 14 }}>
          {/* Area override */}
          <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>Look in another area</p>
          <div ref={areaBoxRef} style={{ position: 'relative', marginBottom: 12 }}>
            <input
              value={areaName}
              onChange={(e) => searchArea(e.target.value)}
              onFocus={() => areaResults.length > 0 && setShowAreaResults(true)}
              placeholder={(profile as any)?.home_display_name ? `Default: ${(profile as any).home_display_name.split(',')[0]}` : 'Search a city or neighborhood…'}
              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13 }}
              autoComplete="off"
            />
            {showAreaResults && areaResults.length > 0 && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 10px 25px -3px rgba(0,0,0,0.15)', zIndex: 30, maxHeight: 220, overflowY: 'auto' }}>
                {areaResults.map((p: any, i: number) => {
                  const lbl = renderPlaceLabel(p)
                  return (
                    <div
                      key={i}
                      onClick={() => selectArea(p)}
                      style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                    >
                      <div style={{ fontWeight: 600, color: '#111827' }}>{lbl.primary}</div>
                      {lbl.secondary && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>{lbl.secondary}</div>}
                    </div>
                  )
                })}
              </div>
            )}
            {areaLat != null && (
              <button onClick={clearArea} style={{ marginTop: 6, padding: '3px 8px', border: 'none', background: 'transparent', color: '#3293cb', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                ✕ Use my profile area instead
              </button>
            )}
          </div>

          {/* Categories — opt-in narrowing */}
          <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>Narrow by category</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {BUSINESS_CATEGORIES.map((c) => {
              const selected = pickedCats.includes(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => setPickedCats((prev) => prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id])}
                  style={{
                    padding: '5px 10px', borderRadius: 999,
                    border: `1px solid ${selected ? BIZALLY_ACCENT : '#e5e7eb'}`,
                    background: selected ? BIZALLY_ACCENT_BG : '#fff',
                    color: selected ? BIZALLY_ACCENT_FG : '#374151',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {c.emoji} {c.label}
                </button>
              )
            })}
          </div>
          {pickedCats.length > 0 && (
            <button onClick={() => setPickedCats([])} style={{ marginTop: 8, padding: '3px 8px', border: 'none', background: 'transparent', color: '#3293cb', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              ✕ Clear categories
            </button>
          )}
        </div>
      )}

      {/* Live feed — primary interaction */}
      {loading ? (
        <p style={{ color: '#6b7280', fontSize: 14 }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 28, margin: '0 0 8px' }}>{filter === 'near' ? '📍' : '✨'}</p>
          <p style={{ fontWeight: 800, color: '#111827', margin: 0, fontSize: 16 }}>
            {filter === 'near'
              ? 'No businesses active near you yet.'
              : 'No active businesses match this filter.'}
          </p>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '6px 0 16px', lineHeight: 1.5 }}>
            {filter === 'near'
              ? 'Be the first — add your storefront and broadcast when you\'re open.'
              : 'Try a different state filter, or expand to a wider area.'}
          </p>
          <Link
            href="/dashboard/business?id=new"
            style={{
              display: 'inline-block',
              padding: '10px 18px', borderRadius: 12,
              background: BIZALLY_ACCENT, color: '#fff',
              fontSize: 13, fontWeight: 800, textDecoration: 'none',
            }}
          >
            List your business →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pageRows.map((b) => {
            const meta = availabilityMeta(b.availability_state)
            const distance = userLoc.lat != null && b.home_lat != null
              ? haversineMiles(userLoc, { lat: b.home_lat, lng: b.home_lng })
              : null
            const live = isLive(b.availability_state)
            return (
              <Link
                key={b.id}
                href={`/${b.slug}`}
                target="_blank" rel="noopener"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <article style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderLeft: `4px solid ${BIZALLY_ACCENT}`,
                  borderRadius: 14,
                  padding: 14,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}>
                  {b.logo_url && (
                    <img src={b.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Type + name line */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 900, letterSpacing: '0.12em',
                        color: BIZALLY_ACCENT_FG, background: BIZALLY_ACCENT_BG,
                        padding: '2px 7px', borderRadius: 4,
                      }}>
                        BUSINESS
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.name}
                      </span>
                    </div>
                    {/* Status line — the heart of the card */}
                    {live && (
                      <p style={{ fontSize: 13, fontWeight: 700, color: meta.color, margin: '0 0 4px' }}>
                        <span aria-hidden>{meta.emoji}</span> {meta.label}
                        {distance != null && Number.isFinite(distance) && (
                          <span style={{ color: '#6b7280', fontWeight: 600 }}> · {distance < 1 ? '< 1 mi' : `${Math.round(distance)} mi away`}</span>
                        )}
                      </p>
                    )}
                    {b.status_message && (
                      <p style={{ fontSize: 13, color: '#374151', margin: '0 0 4px', lineHeight: 1.5 }}>
                        {b.status_message}
                      </p>
                    )}
                    {!b.status_message && b.tagline && (
                      <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                        {b.tagline}
                      </p>
                    )}
                    {b.home_display_name && (
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
                        📍 {b.home_display_name.split(',')[0]}
                      </p>
                    )}
                  </div>
                </article>
              </Link>
            )
          })}
        </div>
      )}

      {/* Search — secondary, well below the live feed */}
      <div style={{ marginTop: 36 }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
          Looking for something specific?
        </p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search active businesses…"
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, color: '#111827' }}
        />
        {search && (
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
            Showing {filtered.length} match{filtered.length === 1 ? '' : 'es'} for &ldquo;{search}&rdquo;.
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button onClick={() => setPage(Math.max(0, clampedPage - 1))} disabled={clampedPage === 0} style={pageBtn}>← Prev</button>
          <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>{clampedPage + 1} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages - 1, clampedPage + 1))} disabled={clampedPage >= totalPages - 1} style={pageBtn}>Next →</button>
        </div>
      )}
    </div>
  )
}

const pageBtn: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
  background: '#fff', color: '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer',
}
