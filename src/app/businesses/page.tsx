'use client'

// /businesses — public directory of published business pages.
//
// Stays out of /sitemap.xml and not linked from /robots.txt — owners
// who want their business indexed must opt in per-page (and meet the
// quality bar). The directory itself ALWAYS noindexes (it's a long
// list of links, not high-value SEO content).
//
// Filters:
//   • free-text search across name + tagline + categories
//   • category chip multi-select
//   • "near me" sort using the user's profile.home_lat/lng — purely
//     client-side haversine on rows pre-fetched by the SQL bbox
//
// Pagination: 24 per page client-side, capped at 200 rows fetched.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { BUSINESS_CATEGORIES, MAX_CATEGORIES, categoryLabel, haversineMiles } from '@/lib/business'
import Paginator from '@/components/Paginator'

const PAGE_SIZE = 24

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
}

export default function BusinessesDirectoryPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Biz[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pickedCats, setPickedCats] = useState<string[]>([])
  const [sortNear, setSortNear] = useState(false)
  const [page, setPage] = useState(0)

  // Hide from search engines no matter what
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'; meta.content = 'noindex, follow'
    document.head.appendChild(meta)
    return () => { meta.remove() }
  }, [])

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [search, pickedCats, sortNear])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      let q = supabase
        .from('business_profiles')
        .select('id, slug, name, tagline, logo_url, cover_image_url, categories, home_display_name, home_lat, home_lng')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(200)
      if (pickedCats.length > 0) {
        // overlap operator: matches if any picked category is in the row's array
        q = q.overlaps('categories', pickedCats)
      }
      const { data } = await q
      setRows((data as any) || [])
      setLoading(false)
    })()
  }, [pickedCats])

  const userLoc = useMemo(
    () => ({ lat: (profile as any)?.home_lat ?? null, lng: (profile as any)?.home_lng ?? null }),
    [profile],
  )

  // Client-side filter + sort
  const filtered = useMemo(() => {
    let out = rows
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter((b) =>
        b.name.toLowerCase().includes(q) ||
        (b.tagline || '').toLowerCase().includes(q) ||
        (b.categories || []).some((c) => c.toLowerCase().includes(q)),
      )
    }
    if (sortNear && userLoc.lat != null && userLoc.lng != null) {
      out = [...out]
        .map((b) => ({ b, d: haversineMiles(userLoc, { lat: b.home_lat, lng: b.home_lng }) }))
        .sort((a, c) => a.d - c.d)
        .map((x) => x.b)
    }
    return out
  }, [rows, search, sortNear, userLoc])

  function toggleCat(id: string) {
    setPickedCats((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_CATEGORIES) return prev
      return [...prev, id]
    })
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, totalPages - 1)
  const pageRows = filtered.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>Businesses</h1>
        <Link href="/dashboard/business" style={{ color: '#3293cb', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
          List your business →
        </Link>
      </div>

      {/* Search bar */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, tagline, or category…"
        style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: 12, fontSize: 14, color: '#111827' }}
      />

      {/* Filter row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {userLoc.lat != null && userLoc.lng != null ? (
          <button
            onClick={() => setSortNear(!sortNear)}
            style={{
              padding: '8px 14px', borderRadius: 999, border: '1.5px solid',
              borderColor: sortNear ? '#3293cb' : '#e5e7eb',
              background: sortNear ? '#eff6ff' : '#fff',
              color: sortNear ? '#0652b7' : '#111827',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {sortNear ? '✓ Near you' : '📍 Near you'}
          </button>
        ) : (
          <span style={{ fontSize: 12, color: '#9ca3af', alignSelf: 'center' }}>
            Set your home area in <Link href="/dashboard/profile" style={{ color: '#3293cb' }}>your profile</Link> to filter by distance.
          </span>
        )}
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {BUSINESS_CATEGORIES.map((c) => {
          const selected = pickedCats.includes(c.id)
          const disabled = !selected && pickedCats.length >= MAX_CATEGORIES
          return (
            <button
              key={c.id}
              onClick={() => toggleCat(c.id)}
              disabled={disabled}
              style={{
                padding: '6px 12px', borderRadius: 999,
                border: `1.5px solid ${selected ? '#3293cb' : '#e5e7eb'}`,
                background: selected ? '#eff6ff' : '#fff',
                color: selected ? '#0652b7' : '#111827',
                fontSize: 12, fontWeight: 700,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
              }}
            >
              {c.emoji} {c.label}
            </button>
          )
        })}
      </div>

      {/* Results */}
      <div style={{ marginTop: 24 }}>
        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: 40, textAlign: 'center', color: '#6b7280' }}>
            No businesses match your filters.
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
              Showing {(clampedPage * PAGE_SIZE + 1).toLocaleString()}–{(clampedPage * PAGE_SIZE + pageRows.length).toLocaleString()} of {filtered.length.toLocaleString()}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {pageRows.map((b) => {
                const distance = sortNear && userLoc.lat != null && b.home_lat != null
                  ? haversineMiles(userLoc, { lat: b.home_lat, lng: b.home_lng })
                  : null
                return (
                  <Link key={b.id} href={`/${b.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <article style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {b.cover_image_url && (
                        <img src={b.cover_image_url} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                      )}
                      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          {b.logo_url && <img src={b.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />}
                          <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#111827' }}>{b.name}</h3>
                        </div>
                        {b.tagline && <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px', lineHeight: 1.5 }}>{b.tagline}</p>}
                        <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                          {(b.categories || []).slice(0, 2).map((c) => (
                            <span key={c} style={{ fontSize: 10, fontWeight: 700, color: '#0652b7', background: '#eff6ff', padding: '2px 8px', borderRadius: 6 }}>
                              {categoryLabel(c)}
                            </span>
                          ))}
                          {distance != null && Number.isFinite(distance) && (
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
                              {distance < 1 ? '< 1 mi' : `${Math.round(distance)} mi`}
                            </span>
                          )}
                          {b.home_display_name && distance == null && (
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
                              📍 {b.home_display_name.split(',')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  </Link>
                )
              })}
            </div>
            <div style={{ marginTop: 18 }}>
              <Paginator page={clampedPage} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
