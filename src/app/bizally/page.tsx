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

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  AVAILABILITY_STATES,
  BIZALLY_ACCENT,
  BIZALLY_ACCENT_BG,
  BIZALLY_ACCENT_FG,
  availabilityMeta,
  haversineMiles,
  isLive,
  type AvailabilityState,
} from '@/lib/business'

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
  const [filter, setFilter] = useState<typeof FILTER_CHIPS[number]['id']>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  // noindex the directory itself
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'; meta.content = 'noindex, follow'
    document.head.appendChild(meta)
    return () => { meta.remove() }
  }, [])

  useEffect(() => { setPage(0) }, [filter, search])

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

  const userLoc = useMemo(
    () => ({ lat: (profile as any)?.home_lat ?? null, lng: (profile as any)?.home_lng ?? null }),
    [profile],
  )

  const filtered = useMemo(() => {
    let out = rows
    if (filter !== 'all' && filter !== 'near') {
      out = out.filter((b) => b.availability_state === filter)
    }
    if (filter === 'near' && userLoc.lat != null && userLoc.lng != null) {
      out = [...out]
        .map((b) => ({ b, d: haversineMiles(userLoc, { lat: b.home_lat, lng: b.home_lng }) }))
        .filter((x) => Number.isFinite(x.d) && x.d <= 25) // 25 mi cap
        .sort((a, c) => a.d - c.d)
        .map((x) => x.b)
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
  }, [rows, filter, search, userLoc])

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

      {/* Filter chips — availability-first, never categories */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 14 }}>
        {FILTER_CHIPS.map((c) => {
          const active = filter === c.id
          const disabled = c.id === 'near' && (userLoc.lat == null || userLoc.lng == null)
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

      {/* Live feed — primary interaction */}
      {loading ? (
        <p style={{ color: '#6b7280', fontSize: 14 }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: 32, textAlign: 'center', color: '#6b7280' }}>
          {filter === 'all' ? (
            <>
              <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>No active businesses right now.</p>
              <p style={{ fontSize: 13, margin: '4px 0 0' }}>When businesses go live, they show up here.</p>
            </>
          ) : (
            <p style={{ margin: 0 }}>No active businesses match this filter.</p>
          )}
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
