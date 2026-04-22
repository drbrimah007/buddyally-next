'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'

type U = {
  id: string
  first_name: string
  last_name: string
  email: string
  city: string
  avatar_url: string
  is_admin: boolean
  verified_email: boolean
  verified_phone: boolean
  verified_selfie: boolean
  rating_avg: number
  rating_count: number
  badges: string[]
  created_at: string
}

export default function AdminUsersPage() {
  const { success } = useToast()
  const [users, setUsers] = useState<U[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [q])

  async function load() {
    setLoading(true)
    let query = supabase.from('profiles').select('id, first_name, last_name, email, city, avatar_url, is_admin, verified_email, verified_phone, verified_selfie, rating_avg, rating_count, badges, created_at').order('created_at', { ascending: false }).limit(200)
    if (q.trim()) {
      const s = `%${q.trim()}%`
      query = query.or(`first_name.ilike.${s},last_name.ilike.${s},email.ilike.${s}`)
    }
    const { data } = await query
    setUsers((data as any) || [])
    setLoading(false)
  }

  async function toggleAdmin(u: U) {
    if (!confirm(u.is_admin ? 'Revoke admin from this user?' : 'Grant admin to this user?')) return
    await supabase.from('profiles').update({ is_admin: !u.is_admin }).eq('id', u.id)
    success(u.is_admin ? 'Admin revoked' : 'Admin granted')
    load()
  }

  async function toggleBan(u: U) {
    const banned = (u.badges || []).includes('banned')
    if (!confirm(banned ? 'Unban this user?' : 'Ban this user? They lose app access until unbanned.')) return
    const next = banned ? (u.badges || []).filter(b => b !== 'banned') : [...(u.badges || []), 'banned']
    await supabase.from('profiles').update({ badges: next }).eq('id', u.id)
    success(banned ? 'User unbanned' : 'User banned')
    load()
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Users</h1>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or email" style={{ width: '100%', maxWidth: 400, padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827', marginBottom: 16 }} />

      {loading ? (
        <p style={{ color: '#6B7280' }}>Loading…</p>
      ) : users.length === 0 ? (
        <p style={{ color: '#6B7280' }}>No users found.</p>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
          {users.map((u, idx) => {
            const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || '—'
            const banned = (u.badges || []).includes('banned')
            return (
              <div key={u.id} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, borderTop: idx > 0 ? '1px solid #F3F4F6' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#4B5563', overflow: 'hidden', flexShrink: 0 }}>
                  {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name[0] || '?')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                    <Link href={`/u/${u.id}`} style={{ color: '#111827', textDecoration: 'none' }}>{name}</Link>
                    {u.is_admin && <span style={{ background: '#3293CB', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8, marginLeft: 8 }}>ADMIN</span>}
                    {u.verified_selfie && <span style={{ background: '#DCFCE7', color: '#166534', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8, marginLeft: 6 }}>SELFIE ✓</span>}
                    {banned && <span style={{ background: '#FEE2E2', color: '#991B1B', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8, marginLeft: 6 }}>BANNED</span>}
                  </p>
                  <p style={{ fontSize: 12, color: '#6B7280' }}>{u.email} · joined {new Date(u.created_at).toLocaleDateString()}</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => toggleAdmin(u)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{u.is_admin ? 'Revoke admin' : 'Make admin'}</button>
                  <button onClick={() => toggleBan(u)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: banned ? '#DCFCE7' : '#FEE2E2', color: banned ? '#166534' : '#991B1B', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{banned ? 'Unban' : 'Ban'}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
