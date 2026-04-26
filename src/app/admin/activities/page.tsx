'use client'

// Admin · all activities — curate the entire feed from one place.
//
// Lists every activity (most-recent first), filterable by free-text and
// by author type (publisher / founder / user). Each row exposes:
//   • Edit  → opens CreateActivityModal in edit mode (same form owners use)
//   • Delete → soft-confirm and remove (cascades to event_sources via FK)
//
// RLS-gated server-side: the activities_update_admin / _delete_admin
// policies (added in the buddy-line schema batch) check is_moderator();
// non-mods will hit a permission error if they try to call this page
// directly. We also short-circuit client-side via the same RPC.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import CreateActivityModal from '@/components/CreateActivityModal'
import Paginator from '@/components/Paginator'

const PAGE_SIZE = 25

type Row = {
  id: string
  title: string
  category: string
  status: string
  date: string | null
  created_at: string
  created_by: string
  location_display: string | null
  max_participants: number | null
  host: { id: string; first_name: string; last_name: string; avatar_url: string | null; account_type: string | null } | null
}

type Filter = 'all' | 'publisher' | 'founder' | 'user'

export default function AdminActivities() {
  const { user, loading: authLoading } = useAuth()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<any | null>(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)

  // Reset to page 1 whenever the filter set changes — otherwise the
  // page number stays stale and shows an empty page after filtering.
  useEffect(() => { setPage(0) }, [search, filter])

  // Mod gate — both client-side check (fast) and server RLS (real).
  useEffect(() => {
    if (authLoading || !user) return
    ;(async () => {
      const { data, error: e } = await supabase.rpc('is_moderator', { p_user: user.id })
      if (e || !data) { setAllowed(false); return }
      setAllowed(true)
    })()
  }, [authLoading, user])

  async function load() {
    setLoading(true); setError('')
    const { data, error: e } = await supabase
      .from('activities')
      .select('id, title, category, status, date, created_at, created_by, location_display, max_participants, host:profiles!created_by(id, first_name, last_name, avatar_url, account_type)')
      .order('created_at', { ascending: false })
      .limit(500)
    if (e) { setError(e.message); setLoading(false); return }
    setRows((data as any) || [])
    setLoading(false)
  }
  useEffect(() => { if (allowed) load() }, [allowed])

  // Client-side filter — simpler than re-querying, dataset is bounded at 500.
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === 'publisher' && r.host?.account_type !== 'founding_publisher') return false
      if (filter === 'founder'   && r.host?.account_type !== 'founding_member')    return false
      if (filter === 'user'      && (r.host?.account_type && r.host.account_type !== 'user')) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const hay = `${r.title} ${r.category} ${r.location_display || ''} ${r.host?.first_name || ''} ${r.host?.last_name || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, filter, search])

  async function deleteRow(r: Row) {
    if (!confirm(`Delete "${r.title}"?\n\nThis cascades to event_sources (Ticketmaster mapping) and activity_participants. Cannot be undone.`)) return
    const { error: e } = await supabase.from('activities').delete().eq('id', r.id)
    if (e) { alert('Delete failed: ' + e.message); return }
    setRows((prev) => prev.filter((x) => x.id !== r.id))
  }

  if (authLoading || allowed === null) return <p style={{ color: '#6B7280' }}>Checking permissions…</p>
  if (!allowed) return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Forbidden</h1>
      <p style={{ color: '#6B7280' }}>This page is restricted to moderators.</p>
    </div>
  )

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Activities</h1>
      <p style={{ color: '#6B7280', fontSize: 13, marginBottom: 18 }}>
        Edit or delete any activity in the system — including seed events posted by Founding
        Publishers and Ticketmaster-ingested events. Owner-authored activities are also editable
        from here.
      </p>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, category, location, host…"
          style={{ flex: 1, minWidth: 220, padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13 }}
        />
        {(['all','publisher','founder','user'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 14px', borderRadius: 10, border: 'none',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              ...(filter === f ? { background: '#3293CB', color: '#fff' } : { background: '#F3F4F6', color: '#374151' }),
            }}
          >
            {f === 'all' ? `All (${rows.length})` : f === 'publisher' ? '📣 Publishers' : f === 'founder' ? '🌱 Founders' : 'Users'}
          </button>
        ))}
        <button
          onClick={load}
          disabled={loading}
          style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#374151' }}
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {error && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <p style={{ color: '#6B7280' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#6B7280' }}>No activities match.</p>
      ) : (() => {
        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
        const clampedPage = Math.min(page, totalPages - 1)
        const pageItems = filtered.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE)
        const startCount = clampedPage * PAGE_SIZE + 1
        const endCount = clampedPage * PAGE_SIZE + pageItems.length
        return (
        <>
        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
          Showing {startCount.toLocaleString()}–{endCount.toLocaleString()} of {filtered.length.toLocaleString()}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pageItems.map((r) => {
            const hostName = `${r.host?.first_name || ''} ${r.host?.last_name || ''}`.trim() || '—'
            const accountTag = r.host?.account_type === 'founding_publisher'
              ? { label: '📣 Publisher', bg: '#FEF3C7', fg: '#92400E' }
              : r.host?.account_type === 'founding_member'
              ? { label: '🌱 Founder', bg: '#ECFDF5', fg: '#065F46' }
              : null
            return (
              <div
                key={r.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 200px 110px auto',
                  alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: '#fff',
                  border: '1px solid #E5E7EB', borderRadius: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Link href={`/a/${r.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{r.title}</Link>
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.category} · {r.location_display || '—'}{r.date ? ` · ${new Date(r.date).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Link href={`/u/${r.host?.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{hostName}</Link>
                  </div>
                  {accountTag && (
                    <span style={{ display: 'inline-block', marginTop: 2, fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 999, background: accountTag.bg, color: accountTag.fg }}>{accountTag.label}</span>
                  )}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, textAlign: 'center',
                  ...(r.status === 'open'
                    ? { background: '#F0FDF4', color: '#065F46' }
                    : r.status === 'cancelled'
                    ? { background: '#FEE2E2', color: '#991B1B' }
                    : { background: '#F3F4F6', color: '#475569' }),
                }}>{r.status}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setEditing(r)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#0652B7' }}
                  >Edit</button>
                  <button
                    onClick={() => deleteRow(r)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#DC2626' }}
                  >Delete</button>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 14 }}>
          <Paginator page={clampedPage} totalPages={totalPages} onChange={setPage} />
        </div>
        </>
        )
      })()}

      {editing && (
        <CreateActivityModal
          initialActivity={editing as any}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}
