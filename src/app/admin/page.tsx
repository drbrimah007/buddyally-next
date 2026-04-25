'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminOverview() {
  const [stats, setStats] = useState({
    users: 0, activities: 0, openReports: 0, todayMessages: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const [u, a, r, m] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('activities').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    ])
    setStats({
      users: u.count || 0,
      activities: a.count || 0,
      openReports: r.count || 0,
      todayMessages: m.count || 0,
    })
    setLoading(false)
  }

  const tiles = [
    { label: 'Total Users', value: stats.users, href: '/admin/users' },
    { label: 'Activities', value: stats.activities },
    { label: 'Open Reports', value: stats.openReports, href: '/admin/reports', danger: stats.openReports > 0 },
    { label: 'Messages (today)', value: stats.todayMessages },
  ]

  if (loading) return <p style={{ color: '#6B7280' }}>Loading…</p>

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Overview</h1>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {tiles.map(t => {
          const body = (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.label}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: t.danger ? '#DC2626' : '#111827', marginTop: 6 }}>{t.value}</p>
            </div>
          )
          return t.href
            ? <Link key={t.label} href={t.href} style={{ textDecoration: 'none' }}>{body}</Link>
            : <div key={t.label}>{body}</div>
        })}
      </div>

      <IngestPanel />
    </div>
  )
}

// On-demand trigger for the Ticketmaster Atlanta-events ingest. Saves
// you waiting for the daily cron when verifying the pipeline. Sends
// Authorization: Bearer ${CRON_SECRET} via the prompt below — the
// browser never has access to the env, so the admin types it in once.
function IngestPanel() {
  const [secret, setSecret] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string>('')

  async function run() {
    if (!secret) { setResult('Paste the CRON_SECRET first.'); return }
    setRunning(true); setResult('')
    try {
      const res = await fetch('/api/ingest/atlanta-events', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${secret}` },
      })
      const json = await res.json().catch(() => ({}))
      setResult(JSON.stringify(json, null, 2))
    } catch (e: any) {
      setResult('Error: ' + (e?.message || String(e)))
    } finally {
      setRunning(false)
    }
  }

  return (
    <section style={{ marginTop: 28, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Atlanta event ingest</h2>
      <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6, lineHeight: 1.6 }}>
        Pulls real upcoming Atlanta events from Ticketmaster's Discovery API and posts them
        as activities authored by the right Founding Publisher (sports → Sunday Social ATL,
        music/arts → Black Atlanta Culture, the rest → ATL Social Pulse). Runs daily via
        Vercel cron at 12:00 UTC; this button is for on-demand verification.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="CRON_SECRET"
          style={{ flex: 1, minWidth: 180, padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13 }}
        />
        <button
          onClick={run}
          disabled={running}
          style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 13, cursor: running ? 'wait' : 'pointer' }}
        >
          {running ? 'Running…' : 'Run ingest now'}
        </button>
      </div>
      {result && (
        <pre style={{ marginTop: 12, padding: 12, background: '#0F172A', color: '#E2E8F0', borderRadius: 10, fontSize: 12, overflow: 'auto', maxHeight: 320 }}>
          {result}
        </pre>
      )}
      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 10 }}>
        Required env in Vercel: <code>TICKETMASTER_API_KEY</code>, <code>CRON_SECRET</code>,
        <code> SUPABASE_SERVICE_ROLE_KEY</code>. Without TICKETMASTER_API_KEY the route
        returns a no-op (safe to deploy without it).
      </p>
    </section>
  )
}
