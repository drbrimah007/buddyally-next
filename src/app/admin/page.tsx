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
    </div>
  )
}
