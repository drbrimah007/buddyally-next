'use client'

// Admin · Short-link traffic.
//
// Every time someone shares an activity / profile via the share panel,
// it mints a /s/<code> short link. The /s/[code] route handler increments
// `short_links.hit_count` on each redirect (fire-and-forget). This page
// surfaces the most-followed short links so you can see which content
// actually moves people off-platform → into BuddyAlly.
//
// Mod-gated client-side via is_moderator() RPC (server-side enforcement
// lives on admin_invite_path / future mod RPCs). Anyone with the 'admin'
// or 'moderator' badge passes.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

type Row = {
  code: string
  url: string
  hit_count: number
  created_at: string
  created_by: string | null
}

export default function AdminShortLinks() {
  const { user, loading: authLoading } = useAuth()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Mod gate
  useEffect(() => {
    if (authLoading || !user) return
    ;(async () => {
      const { data, error } = await supabase.rpc('is_moderator', { p_user: user.id })
      if (error || !data) { setAllowed(false); return }
      setAllowed(true)
    })()
  }, [authLoading, user])

  // Fetch top 200 by hit_count
  useEffect(() => {
    if (!allowed) return
    ;(async () => {
      const { data } = await supabase
        .from('short_links')
        .select('code, url, hit_count, created_at, created_by')
        .order('hit_count', { ascending: false })
        .limit(200)
      setRows((data as Row[]) || [])
      setLoading(false)
    })()
  }, [allowed])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => r.url.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
  }, [rows, search])

  const totalHits = useMemo(() => rows.reduce((s, r) => s + (r.hit_count || 0), 0), [rows])
  const liveLinks = rows.length

  if (authLoading || allowed === null) return <div style={pad}>Checking permissions…</div>
  if (!user) return <div style={pad}>Sign in required.</div>
  if (!allowed) return (
    <div style={pad}>
      <h1 style={h1}>Forbidden</h1>
      <p style={muted}>This page is restricted to moderators.</p>
    </div>
  )

  return (
    <div style={pad}>
      <Link href="/dashboard" style={back}>← Dashboard</Link>
      <p style={kicker}>Admin · Traffic</p>
      <h1 style={h1}>Short-link clicks</h1>
      <p style={muted}>How many times each /s/&lt;code&gt; redirect was followed.</p>

      {/* Headline counters */}
      <div style={statsRow}>
        <div style={statCard}>
          <p style={statLabel}>Total clicks</p>
          <p style={statValue}>{totalHits.toLocaleString()}</p>
        </div>
        <div style={statCard}>
          <p style={statLabel}>Live links</p>
          <p style={statValue}>{liveLinks.toLocaleString()}</p>
        </div>
        <div style={statCard}>
          <p style={statLabel}>Top link</p>
          <p style={statValue}>{rows[0]?.hit_count?.toLocaleString() || '0'}</p>
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter by URL or code…"
        style={searchInput}
      />

      {loading ? (
        <p style={muted}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={muted}>No links match.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((r) => (
            <a
              key={r.code}
              href={`/s/${r.code}`}
              target="_blank"
              rel="noreferrer"
              style={rowStyle}
            >
              <code style={codeStyle}>/s/{r.code}</code>
              <span style={urlStyle} title={r.url}>{r.url.replace(/^https?:\/\//, '')}</span>
              <span style={hitsStyle}>{(r.hit_count || 0).toLocaleString()}</span>
            </a>
          ))}
        </div>
      )}

      <p style={{ ...muted, marginTop: 24, fontSize: 12 }}>
        Wider traffic data (page views, referrers, countries, device, Web Vitals)
        lives in your{' '}
        <a href="https://vercel.com" target="_blank" rel="noreferrer" style={link}>Vercel Analytics</a>{' '}
        dashboard.
      </p>
    </div>
  )
}

const pad: React.CSSProperties = { maxWidth: 880, margin: '0 auto', padding: '24px 20px 80px', color: '#111827' }
const back: React.CSSProperties = { color: '#3293CB', fontWeight: 700, fontSize: 13, textDecoration: 'none' }
const kicker: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: '#3293CB', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '24px 0 8px' }
const h1: React.CSSProperties = { fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 6px' }
const muted: React.CSSProperties = { color: '#6B7280', fontSize: 14, margin: 0 }
const link: React.CSSProperties = { color: '#3293CB', fontWeight: 700, textDecoration: 'none' }

const statsRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 18 }
const statCard: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16 }
const statLabel: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }
const statValue: React.CSSProperties = { fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em', margin: '4px 0 0' }

const searchInput: React.CSSProperties = { marginTop: 18, width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827', background: '#fff' }

const rowStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '110px 1fr 80px',
  gap: 12, alignItems: 'center',
  padding: '10px 12px', background: '#fff',
  border: '1px solid #E5E7EB', borderRadius: 10,
  textDecoration: 'none', color: 'inherit',
}
const codeStyle: React.CSSProperties = {
  background: '#EFF6FF', color: '#0652B7',
  fontSize: 13, fontWeight: 800,
  padding: '3px 8px', borderRadius: 6,
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
}
const urlStyle: React.CSSProperties = { fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const hitsStyle: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: '#111827', textAlign: 'right' }
