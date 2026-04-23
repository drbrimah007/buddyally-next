'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ToastProvider'
import CreateActivityModal from '@/components/CreateActivityModal'

export default function ActivityDetailModal({ activityId, onClose }: { activityId: string; onClose: () => void }) {
  const { user } = useAuth()
  const router = useRouter()
  const [activity, setActivity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [tab, setTab] = useState<'details' | 'chat'>('details')
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatMsg, setChatMsg] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => { loadActivity() }, [activityId])

  async function loadActivity() {
    setLoading(true)
    const { data } = await supabase
      .from('activities')
      .select('*, host:profiles!created_by(id, first_name, last_name, rating_avg, rating_count, avatar_url, city, home_display_name, verified_selfie), participants:activity_participants(user_id)')
      .eq('id', activityId)
      .single()
    setActivity(data)
    setLoading(false)
  }

  async function loadChat() {
    const { data } = await supabase.from('messages')
      .select('*, sender:profiles!sender_id(first_name, last_name)')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true }).limit(100)
    setChatMessages(data || [])
  }

  async function sendChat() {
    if (!chatMsg.trim() || !user) return
    await supabase.from('messages').insert({ sender_id: user.id, activity_id: activityId, content: chatMsg.trim() })
    setChatMsg('')
    loadChat()
  }

  useEffect(() => { if (tab === 'chat' && user) loadChat() }, [tab])

  async function joinActivity() {
    if (!user) return
    setJoining(true)
    await supabase.from('activity_participants').insert({ activity_id: activityId, user_id: user.id })
    await loadActivity()
    setJoining(false)
  }

  async function leaveActivity() {
    if (!user || !confirm('Leave this activity?')) return
    setJoining(true)
    await supabase.from('activity_participants').delete().eq('activity_id', activityId).eq('user_id', user.id)
    await loadActivity()
    setJoining(false)
  }

  if (loading) return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 520, textAlign: 'center' }}>
        <p style={{ color: '#6B7280' }}>Loading...</p>
      </div>
    </div>
  )

  if (!activity) return null

  const host = activity.host as any
  const participants = activity.participants || []
  const spotsLeft = activity.max_participants - participants.length
  const isOwner = user && activity.created_by === user.id
  const isJoined = user && participants.some((p: any) => p.user_id === user.id)
  const timing = activity.timing_mode === 'flexible'
    ? activity.availability_label || 'Flexible'
    : activity.timing_mode === 'recurring'
    ? activity.recurrence_freq || 'Recurring'
    : activity.date
    ? new Date(activity.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + (activity.time ? ' at ' + activity.time : '')
    : 'TBA'

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 0, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', margin: '32px 0' }}>

        {/* Cover image — preserves natural proportions, contained within a bounded area */}
        {activity.cover_image_url && (
          <div style={{ width: '100%', maxHeight: 320, background: '#F3F4F6', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img
              src={activity.cover_image_url}
              alt=""
              style={{ maxWidth: '100%', maxHeight: 320, width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
            />
          </div>
        )}

        <div style={{ padding: 24 }}>
          {/* Close button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <span style={{ display: 'inline-block', background: '#3293CB', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, marginBottom: 8 }}>{activity.category}</span>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{activity.title}</h2>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6B7280', padding: 0, lineHeight: 1 }}>&times;</button>
          </div>

          {/* Tabs */}
          {user && (isJoined || isOwner) && (
            <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', marginBottom: 16 }}>
              <button onClick={() => setTab('details')} style={{ padding: '8px 16px', fontSize: 14, fontWeight: 600, borderBottom: tab === 'details' ? '2px solid #3293CB' : '2px solid transparent', marginBottom: -2, color: tab === 'details' ? '#3293CB' : '#4B5563', background: 'none', border: 'none', cursor: 'pointer' }}>Details</button>
              <button onClick={() => setTab('chat')} style={{ padding: '8px 16px', fontSize: 14, fontWeight: 600, borderBottom: tab === 'chat' ? '2px solid #3293CB' : '2px solid transparent', marginBottom: -2, color: tab === 'chat' ? '#3293CB' : '#4B5563', background: 'none', border: 'none', cursor: 'pointer' }}>Chat</button>
            </div>
          )}

          {/* Chat tab */}
          {tab === 'chat' && user && (
            <div>
              <div style={{ minHeight: 200, maxHeight: 350, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, background: '#F9FAFB', borderRadius: 12, padding: 12 }}>
                {chatMessages.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>No messages yet</p>
                ) : chatMessages.map((m, i) => {
                  const isMine = m.sender_id === user.id
                  const sender = m.sender as any
                  return (
                    <div key={i} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                      {!isMine && <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, color: '#4B5563' }}>{sender?.first_name || 'User'}</p>}
                      <div style={{ padding: '10px 14px', borderRadius: 16, fontSize: 14, lineHeight: 1.5, ...(isMine ? { background: '#3293CB', color: '#fff' } : { background: '#fff', color: '#111827' }) }}>
                        {m.content}
                        <p style={{ fontSize: 10, opacity: 0.7, marginTop: 3 }}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} style={{ flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#111827' }} placeholder="Type a message..." />
                <button onClick={sendChat} style={{ padding: '0 20px', borderRadius: 12, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Send</button>
              </div>
            </div>
          )}

          {/* Details tab */}
          {tab === 'details' && (
            <>
              {/* Host card */}
              {host && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: 14, background: '#F9FAFB', borderRadius: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#3293CB', overflow: 'hidden', flexShrink: 0 }}>
                    {host.avatar_url ? <img src={host.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : (host.first_name?.[0] || '?')}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{host.first_name} {host.last_name}</p>
                    <p style={{ fontSize: 12, color: '#6B7280' }}><span style={{ color: '#F59E0B' }}>{'★'.repeat(Math.round(host.rating_avg || 0))}</span><span style={{ color: '#E2E8F0' }}>{'★'.repeat(5 - Math.round(host.rating_avg || 0))}</span> {host.rating_avg?.toFixed(1) || '0.0'} ({host.rating_count || 0})</p>
                    <p style={{ fontSize: 12, color: '#6B7280' }}>{host.home_display_name || host.city}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              {activity.description && (
                <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.7, marginBottom: 16 }}>{activity.description}</p>
              )}

              {/* Safety Protocols — collapsible, closed by default, exact old site text */}
              <details style={{ borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden', marginBottom: 16 }}>
                <summary style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', cursor: 'pointer', background: '#F9FAFB', fontSize: 14, fontWeight: 700, color: '#111827', listStyle: 'none' }}>
                  <span>🛡</span> Safety Protocols <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6B7280' }}>&#x25BC;</span>
                </summary>
                <div style={{ padding: 16, fontSize: 13, color: '#4B5563', lineHeight: 1.7 }}>
                  <p style={{ marginBottom: 10, fontWeight: 600, color: '#111827' }}>Before using shared rides, package assistance, or other buddy-based help:</p>
                  <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
                    <li>Do a live video call first</li>
                    <li>Capture a screenshot of the person during the call</li>
                    <li>Ask for a photo of their ID</li>
                    <li>Let a friend or family member know where you are going and who you are meeting</li>
                    <li>Choose public, well-lit meeting locations</li>
                    <li>Never trust a buddy with valuables, sensitive property, or anyone&apos;s life</li>
                  </ul>
                  <p style={{ fontSize: 12, color: '#6B7280', borderTop: '1px solid #E5E7EB', paddingTop: 10 }}>These measures do not guarantee safety, but they may help protect you. If something feels wrong, cancel the interaction.</p>
                </div>
              </details>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }}>Location</p>
                  <p style={{ fontWeight: 600, fontSize: 13 }}>{activity.location_mode === 'remote' ? 'Remote / Online' : activity.location_display || activity.location_text}</p>
                </div>
                <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }}>When</p>
                  <p style={{ fontWeight: 600, fontSize: 13 }}>{timing}</p>
                </div>
                <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }}>Spots</p>
                  <p style={{ fontWeight: 600, fontSize: 13 }}>{spotsLeft > 0 ? `${spotsLeft} of ${activity.max_participants} left` : 'Full'}</p>
                </div>
                <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }}>Cost</p>
                  <p style={{ fontWeight: 600, fontSize: 13 }}>{activity.tip_enabled ? 'Free. Tips optional.' : 'Free'}</p>
                </div>
              </div>

              {/* Participants */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', marginBottom: 8 }}>{participants.length} participant{participants.length !== 1 ? 's' : ''}</p>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                {isOwner ? (
                  <>
                    <button
                      onClick={() => { onClose(); router.push('/dashboard/activities') }}
                      style={{ background: '#3293CB', color: '#fff', fontWeight: 700, padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, boxShadow: '0 4px 12px rgba(50,147,203,0.25)', flex: 1, minWidth: 140 }}
                    >
                      Manage My Activities
                    </button>
                    <button onClick={() => setEditOpen(true)} style={{ background: '#fff', color: '#111827', fontWeight: 600, padding: '12px 20px', borderRadius: 12, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 14 }}>Edit</button>
                    <button onClick={async () => {
                      if (!confirm('Cancel this activity? Participants will see it marked Cancelled.')) return
                      const { error } = await supabase.from('activities').update({ status: 'cancelled' }).eq('id', activityId)
                      if (error) { toast(error.message || 'Could not cancel activity.', 'error'); return }
                      toast('Activity cancelled', 'success')
                      onClose()
                    }} style={{ background: '#FEE2E2', color: '#DC2626', fontWeight: 600, padding: '12px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                  </>
                ) : isJoined ? (
                  <>
                    <span style={{ background: '#059669', color: '#fff', fontWeight: 600, padding: '10px 20px', borderRadius: 12, fontSize: 14 }}>Joined ✓</span>
                    <button onClick={leaveActivity} disabled={joining} style={{ background: '#fff', color: '#DC2626', fontWeight: 600, padding: '10px 20px', borderRadius: 12, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 14 }}>{joining ? '...' : 'Leave'}</button>
                  </>
                ) : spotsLeft > 0 ? (
                  <button onClick={joinActivity} disabled={joining} style={{ background: '#3293CB', color: '#fff', fontWeight: 700, padding: '12px 32px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15, boxShadow: '0 4px 12px rgba(50,147,203,0.25)', flex: 1 }}>{joining ? 'Joining...' : 'Join This Activity'}</button>
                ) : (
                  <span style={{ background: '#F3F4F6', color: '#6B7280', fontWeight: 600, padding: '10px 20px', borderRadius: 12, fontSize: 14 }}>Full</span>
                )}
              </div>

              {/* Action links */}
              {user && !isOwner && (
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
                  <button onClick={async () => {
                    if (!user || !host) return
                    await supabase.from('messages').insert({ sender_id: user.id, recipient_id: host.id, content: `Hi! I'm interested in your activity "${activity.title}"` })
                    onClose()
                    router.push('/dashboard/messages')
                  }} style={{ background: 'none', border: 'none', color: '#3293CB', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Message Host</button>
                  <button onClick={() => { navigator.share?.({ title: activity.title, url: `https://buddyally.com/a/${activityId}` }).catch(() => { navigator.clipboard.writeText(`https://buddyally.com/a/${activityId}`); toast('Link copied', 'info') }) }} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Share</button>
                  <button onClick={() => { if (confirm('Report this activity?')) { supabase.from('reports').insert({ reporter_id: user!.id, reported_type: 'activity', reported_id: activityId, reason: 'inappropriate' }).then(() => toast('Report submitted', 'success')) } }} style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Report</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {editOpen && (
        <CreateActivityModal
          initialActivity={activity}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); loadActivity() }}
        />
      )}
    </div>
  )
}
