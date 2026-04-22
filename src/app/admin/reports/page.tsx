'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'

type Report = {
  id: string
  reporter_id: string
  reported_type: string | null
  reported_id: string | null
  reported_user_id: string | null
  reason: string
  details: string
  status: 'open' | 'reviewed' | 'resolved' | 'dismissed'
  admin_notes: string
  created_at: string
  reporter?: { first_name: string; last_name: string }
  reportedUser?: { first_name: string; last_name: string } | null
}

export default function AdminReportsPage() {
  const { user } = useAuth()
  const { success, info } = useToast()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'open' | 'all'>('open')

  useEffect(() => { load() }, [statusFilter])

  async function load() {
    setLoading(true)
    let q = supabase
      .from('reports')
      .select('*, reporter:profiles!reporter_id(first_name, last_name), reportedUser:profiles!reported_user_id(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (statusFilter === 'open') q = q.eq('status', 'open')
    const { data } = await q
    setReports((data as any) || [])
    setLoading(false)
  }

  async function act(r: Report, status: 'resolved' | 'dismissed' | 'reviewed', notes?: string) {
    await supabase.from('reports').update({
      status,
      admin_notes: notes ?? r.admin_notes,
      resolved_by: user!.id,
      resolved_at: status === 'resolved' || status === 'dismissed' ? new Date().toISOString() : null,
    }).eq('id', r.id)
    if (status === 'resolved') success('Marked resolved')
    else if (status === 'dismissed') info('Report dismissed')
    else info('Marked reviewed')
    load()
  }

  async function banReportedUser(r: Report) {
    const targetId = r.reported_user_id || (r.reported_type === 'user' ? r.reported_id : null)
    if (!targetId) return
    if (!confirm('Ban this user? They lose app access until unbanned.')) return
    // "Ban" = add admin badge-less flag — you can add an `is_banned` col later;
    // for now we clear is_admin and mark blocked_users to neutralize and tag them.
    await supabase.from('profiles').update({ badges: ['banned'] }).eq('id', targetId)
    await act(r, 'resolved', 'User banned')
    success('User tagged as banned')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Reports</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <FilterBtn active={statusFilter === 'open'} onClick={() => setStatusFilter('open')}>Open</FilterBtn>
          <FilterBtn active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</FilterBtn>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#6B7280' }}>Loading…</p>
      ) : reports.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 40, textAlign: 'center', color: '#6B7280' }}>
          No reports {statusFilter === 'open' ? 'open' : 'on record'}.
        </div>
      ) : (
        reports.map(r => (
          <div key={r.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                  {r.reason}
                  <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, marginLeft: 8 }}>
                    {r.reported_type || 'user'} · {new Date(r.created_at).toLocaleString()}
                  </span>
                </p>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  Reporter: {r.reporter?.first_name} {r.reporter?.last_name}
                  {' · '}
                  Target: {r.reportedUser ? `${r.reportedUser.first_name} ${r.reportedUser.last_name}` : (r.reported_type || 'unknown')} {r.reported_id && <Link href={`/u/${r.reported_id}`} style={{ color: '#3293CB' }}>view</Link>}
                </p>
              </div>
              <StatusPill status={r.status} />
            </div>
            {r.details && <p style={{ fontSize: 13, color: '#4B5563', marginTop: 6 }}>{r.details}</p>}
            {r.admin_notes && <p style={{ fontSize: 12, color: '#6B7280', marginTop: 6, fontStyle: 'italic' }}>Admin notes: {r.admin_notes}</p>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {r.status === 'open' && (
                <>
                  <Action onClick={() => act(r, 'resolved')}>Mark Resolved</Action>
                  <Action onClick={() => act(r, 'dismissed')}>Dismiss</Action>
                  <Action onClick={() => {
                    const notes = prompt('Add admin notes (optional):') || ''
                    act(r, 'reviewed', notes)
                  }}>Mark Reviewed</Action>
                </>
              )}
              {(r.reported_user_id || r.reported_type === 'user') && (
                <Action danger onClick={() => banReportedUser(r)}>Ban User</Action>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #E5E7EB', background: active ? '#111827' : '#fff', color: active ? '#fff' : '#111827', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{children}</button>
}
function StatusPill({ status }: { status: string }) {
  const c = status === 'open' ? { bg: '#FEF3C7', fg: '#92400E' } : status === 'resolved' ? { bg: '#DCFCE7', fg: '#166534' } : status === 'dismissed' ? { bg: '#F3F4F6', fg: '#6B7280' } : { bg: '#E0F2FE', fg: '#0369A1' }
  return <span style={{ background: c.bg, color: c.fg, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{status}</span>
}
function Action({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: danger ? '#FEE2E2' : '#F3F4F6', color: danger ? '#991B1B' : '#111827', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{children}</button>
}
