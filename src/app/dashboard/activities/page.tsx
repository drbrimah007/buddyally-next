'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import CreateActivityModal from '@/components/CreateActivityModal'
import ActivityDetailModal from '@/components/ActivityDetailModal'
import Paginator from '@/components/Paginator'
import { toast } from '@/components/ToastProvider'

// 3 cards per row × 10 rows = 30 per page.
const ACT_PER_ROW = 3
const ACT_ROWS_PER_PAGE = 10
const ACT_PAGE_SIZE = ACT_PER_ROW * ACT_ROWS_PER_PAGE

export default function MyActivitiesPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'created' | 'joined'>('created')
  const [showCreate, setShowCreate] = useState(false)
  const [editActivity, setEditActivity] = useState<any | null>(null)
  const [viewActivityId, setViewActivityId] = useState<string | null>(null)
  const [created, setCreated] = useState<any[]>([])
  const [joined, setJoined] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // Each tab keeps its own page cursor so switching tabs doesn't lose position.
  const [createdPage, setCreatedPage] = useState(0)
  const [joinedPage, setJoinedPage] = useState(0)
  // Reset to first page whenever the tab changes (familiar UX).
  useEffect(() => { setCreatedPage(0); setJoinedPage(0) }, [tab])

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const [{ data: mine }, { data: parts }] = await Promise.all([
      supabase.from('activities').select('*, participants:activity_participants(user_id)').eq('created_by', user.id).order('created_at', { ascending: false }),
      supabase.from('activity_participants').select('activity_id, activity:activities(*, host:profiles!created_by(id, first_name, last_name))').eq('user_id', user.id),
    ])
    setCreated(mine || [])
    setJoined((parts || []).map((p: any) => p.activity).filter(Boolean))
    setLoading(false)
  }

  async function cancelActivity(id: string) {
    if (!confirm('Cancel this activity? Participants will see it marked Cancelled.')) return
    const { error } = await supabase.from('activities').update({ status: 'cancelled' }).eq('id', id)
    if (error) { toast(error.message || 'Could not cancel activity.', 'error'); return }
    toast('Activity cancelled', 'success')
    loadData()
  }

  async function reactivateActivity(id: string) {
    // DB default for activities.status is 'open' — reactivating must restore that value
    // so the activity returns to the Explore feed (which filters by status='open').
    const { error } = await supabase.from('activities').update({ status: 'open' }).eq('id', id)
    if (error) { toast(error.message || 'Could not reactivate activity.', 'error'); return }
    toast('Activity reactivated', 'success')
    loadData()
  }

  async function deleteActivity(id: string) {
    if (!confirm('Delete this activity permanently? This cannot be undone.')) return
    const { error } = await supabase.from('activities').delete().eq('id', id)
    if (error) { toast(error.message || 'Could not delete activity.', 'error'); return }
    toast('Activity deleted', 'success')
    loadData()
  }

  return (
    <div>
      {/* 3 per row on desktop, 2 on medium, 1 on phones. Pagination is 10 rows = 30/page. */}
      <style dangerouslySetInnerHTML={{ __html: `
        .act-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:16px}
        @media(max-width:900px){.act-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:620px){.act-grid{grid-template-columns:1fr}}
      `}} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>My Activities</h2>
        <button onClick={() => setShowCreate(true)} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ New Activity</button>
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', marginBottom: 16 }}>
        <button onClick={() => setTab('created')} style={{ padding: '8px 16px', fontSize: 14, fontWeight: 600, borderBottom: tab === 'created' ? '2px solid #3293CB' : '2px solid transparent', marginBottom: -2, color: tab === 'created' ? '#3293CB' : '#4B5563', background: 'none', border: 'none', cursor: 'pointer' }}>
          Created ({created.length})
        </button>
        <button onClick={() => setTab('joined')} style={{ padding: '8px 16px', fontSize: 14, fontWeight: 600, borderBottom: tab === 'joined' ? '2px solid #3293CB' : '2px solid transparent', marginBottom: -2, color: tab === 'joined' ? '#3293CB' : '#4B5563', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Joined {joined.length > 0 && <span style={{ background: '#3293CB', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 20 }}>{joined.length}</span>}
        </button>
      </div>

      {loading ? (
        <div>
          {[1, 2].map(i => (
            <div key={i} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 14 }}>
              <div style={{ height: 20, background: '#f3f4f6', borderRadius: 8, width: '50%', marginBottom: 12 }} />
              <div style={{ height: 16, background: '#f9fafb', borderRadius: 8, width: '30%' }} />
            </div>
          ))}
        </div>
      ) : tab === 'created' ? (
        created.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 40, textAlign: 'center' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🎯</p>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>No activities yet</p>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>Create your first activity to get started.</p>
            <button onClick={() => setShowCreate(true)} style={{ padding: '12px 24px', borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Create Activity</button>
          </div>
        ) : (() => {
          const totalPages = Math.max(1, Math.ceil(created.length / ACT_PAGE_SIZE))
          const page = Math.min(createdPage, totalPages - 1)
          const pageItems = created.slice(page * ACT_PAGE_SIZE, (page + 1) * ACT_PAGE_SIZE)
          return (
          <div>
            <div className="act-grid">
            {pageItems.map(a => {
              const isCancelled = a.status === 'cancelled'
              return (
                <div key={a.id} onClick={() => setViewActivityId(a.id)} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, cursor: 'pointer', opacity: isCancelled ? 0.75 : 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 4, textDecoration: isCancelled ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</h3>
                      <p style={{ fontSize: 13, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.location_display || a.location_text}{a.date ? ` • ${new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</p>
                    </div>
                    {isCancelled ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#991B1B', background: '#FEE2E2', padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>Cancelled</span>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', background: '#F0FDF4', padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                        {a.max_participants == null || a.max_participants === 0
                          ? `${a.participants?.length || 0} · Open`
                          : `${a.participants?.length || 0}/${a.max_participants}`}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {!isCancelled && (
                      <>
                        <button onClick={e => { e.stopPropagation(); setEditActivity(a) }} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                        <button onClick={e => { e.stopPropagation(); cancelActivity(a.id) }} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                      </>
                    )}
                    {isCancelled && (
                      <button onClick={e => { e.stopPropagation(); reactivateActivity(a.id) }} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Reactivate</button>
                    )}
                    <button onClick={e => { e.stopPropagation(); deleteActivity(a.id) }} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              )
            })}
            </div>
            <Paginator page={page} totalPages={totalPages} onChange={setCreatedPage} />
          </div>
          )
        })()
      ) : (
        joined.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 40, textAlign: 'center' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>👋</p>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>No joined activities</p>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>Browse and join activities from Explore.</p>
            <Link href="/dashboard" style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 14, background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Explore Activities</Link>
          </div>
        ) : (() => {
          const totalPages = Math.max(1, Math.ceil(joined.length / ACT_PAGE_SIZE))
          const page = Math.min(joinedPage, totalPages - 1)
          const pageItems = joined.slice(page * ACT_PAGE_SIZE, (page + 1) * ACT_PAGE_SIZE)
          return (
          <div>
            <div className="act-grid">
            {pageItems.map((a: any) => (
              <div key={a.id} onClick={() => setViewActivityId(a.id)} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</h3>
                    <p style={{ fontSize: 13, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.location_display || a.location_text}{a.date ? ` • ${new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</p>
                    <p style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>Host: {a.host?.first_name} {a.host?.last_name}</p>
                  </div>
                  <span style={{ background: '#3293CB', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{a.category}</span>
                </div>
                {a.description && <p style={{ fontSize: 13, color: '#4B5563', marginTop: 8, lineHeight: 1.6 }}>{a.description.substring(0, 100)}{a.description.length > 100 ? '...' : ''}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={e => { e.stopPropagation(); const url = a.host?.id ? `/dashboard/messages?to=${a.host.id}&about=${encodeURIComponent(a.title)}` : `/dashboard/messages`; window.location.href = url }} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Message</button>
                  <button onClick={async e => { e.stopPropagation(); if (!confirm('Leave this activity?')) return; const { error } = await supabase.from('activity_participants').delete().eq('activity_id', a.id).eq('user_id', user!.id); if (error) { toast(error.message || 'Could not leave activity.', 'error'); return } toast('Left activity', 'success'); loadData() }} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Leave</button>
                </div>
              </div>
            ))}
            </div>
            <Paginator page={page} totalPages={totalPages} onChange={setJoinedPage} />
          </div>
          )
        })()
      )}
      {showCreate && <CreateActivityModal onClose={() => { setShowCreate(false); loadData() }} />}
      {editActivity && <CreateActivityModal initialActivity={editActivity} onClose={() => setEditActivity(null)} onSaved={() => { setEditActivity(null); loadData() }} />}
      {viewActivityId && <ActivityDetailModal activityId={viewActivityId} onClose={() => { setViewActivityId(null); loadData() }} />}
    </div>
  )
}
