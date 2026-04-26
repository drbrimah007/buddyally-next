'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from '@/components/ToastProvider'
import CreateActivityModal from '@/components/CreateActivityModal'
import { contributionBadge } from '@/lib/contribution'
import ShareButton from '@/components/ShareButton'
import SafetyBanner from '@/components/SafetyBanner'

export default function ActivityPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const router = useRouter()
  // Admins (is_admin or 'admin' / 'moderator' badge) get edit/delete on
  // ANY activity — not just their own — so Founding Publisher / ingested
  // events can be curated without going through /admin/activities. RLS
  // already permits this server-side; this just unlocks the buttons.
  const isAdmin = !!(profile && ((profile as any).is_admin === true
    || (Array.isArray((profile as any).badges) && (profile as any).badges.some((b: string) => b === 'admin' || b === 'moderator'))))
  const [activity, setActivity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [tab, setTab] = useState<'details' | 'chat'>('details')
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatMsg, setChatMsg] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => { loadActivity() }, [id])

  async function loadActivity() {
    setLoading(true)
    const { data } = await supabase
      .from('activities')
      .select('*, host:profiles!created_by(id, first_name, last_name, rating_avg, rating_count, avatar_url, city, home_display_name, verified_selfie), participants:activity_participants(user_id)')
      .eq('id', id)
      .single()
    setActivity(data)
    setLoading(false)
  }

  async function loadChat() {
    setChatLoading(true)
    const { data } = await supabase.from('messages')
      .select('*, sender:profiles!sender_id(first_name, last_name, avatar_url)')
      .eq('activity_id', id)
      .order('created_at', { ascending: true })
      .limit(100)
    setChatMessages(data || [])
    setChatLoading(false)
  }

  async function sendChat() {
    if (!chatMsg.trim() || !user) return
    await supabase.from('messages').insert({ sender_id: user.id, activity_id: id, content: chatMsg.trim() })
    setChatMsg('')
    loadChat()
  }

  useEffect(() => {
    if (tab === 'chat' && user) loadChat()
  }, [tab])

  async function joinActivity() {
    if (!user) { router.push('/signup'); return }
    setJoining(true)
    await supabase.from('activity_participants').insert({ activity_id: id, user_id: user.id })
    await loadActivity()
    setJoining(false)
  }

  async function leaveActivity() {
    if (!user) return
    setJoining(true)
    await supabase.from('activity_participants').delete().eq('activity_id', id).eq('user_id', user.id)
    await loadActivity()
    setJoining(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src="/buddyally-logo.png" alt="" style={{ height: 56, width: 56, opacity: 0.5 }} />
    </div>
  )

  if (!activity) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 40, marginBottom: 16 }}>🔍</p>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Activity not found</h1>
        <Link href="/" style={{ color: '#3293CB', fontWeight: 600 }}>Go to BuddyAlly</Link>
      </div>
    </div>
  )

  const host = activity.host as any
  const participants = activity.participants || []
  // Null / 0 cap = "Open" (no limit). Otherwise compute spots left.
  const unlimited = activity.max_participants == null || activity.max_participants === 0
  const spotsLeft = unlimited ? Infinity : activity.max_participants - participants.length
  const isOwner = user && activity.created_by === user.id
  // canEdit unlocks the Edit/Cancel UI in the action row. Owners always
  // qualify; admins also qualify (mod-curation path).
  const canEdit = !!(isOwner || isAdmin)
  const isJoined = user && participants.some((p: any) => p.user_id === user.id)
  const timing = activity.timing_mode === 'flexible'
    ? activity.availability_label || 'Flexible'
    : activity.timing_mode === 'recurring'
    ? activity.recurrence_freq || 'Recurring'
    : activity.date
    ? new Date(activity.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + (activity.time ? ' at ' + activity.time : '')
    : 'TBA'

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      {/* Nav */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 680, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href={user ? '/dashboard' : '/'} style={{ textDecoration: 'none' }}>
            <img src="/buddyally-logo-full.png" alt="BuddyAlly" style={{ height: 26 }} />
          </Link>
          {user ? (
            <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 600, color: '#3293CB', textDecoration: 'none' }}>&larr; Back to Explore</Link>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', border: '1px solid #E5E7EB', borderRadius: 10, padding: '6px 14px', textDecoration: 'none' }}>Log In</Link>
              <Link href="/signup" style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: '#3293CB', borderRadius: 10, padding: '6px 14px', textDecoration: 'none' }}>Sign Up</Link>
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        {/* Cover image */}
        {activity.cover_image_url && (
          <img src={activity.cover_image_url} alt="" style={{ width: '100%', borderRadius: 16, marginBottom: 24, objectFit: 'contain', background: '#f3f4f6' }} />
        )}

        {/* Title + Category + Share (always visible — public preview can be shared) */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ display: 'inline-block', background: '#3293CB', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>{activity.category}</span>
            <ShareButton
              url={typeof window !== 'undefined' ? window.location.href : `https://buddyally.com/a/${activity.id}`}
              title={`${activity.title} — BuddyAlly`}
              text={activity.description ? activity.description.slice(0, 140) : 'Join me on BuddyAlly'}
            />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{activity.title}</h1>
        </div>

        {/* Logged-out poster — built to be SHAREABLE. Social proof front
            and center: host face, headcount, location, time. Then the gate.
            People share what looks alive, not what looks like a paywall. */}
        {!user && (() => {
          const goingCount = activity.participants?.length || 0
          // Null / 0 cap = "Open" (no limit). Otherwise compute spots left.
          const unlimitedHere = activity.max_participants == null || activity.max_participants === 0
          const spotsLeft = unlimitedHere ? Infinity : (activity.max_participants ?? 0) - goingCount
          const when = activity.date ? new Date(activity.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : (activity.availability_label || 'Flexible')
          const hostName = host ? `${host.first_name || ''} ${host.last_name?.[0] || ''}`.trim() : 'Someone'
          const hostInitial = (host?.first_name?.[0] || '?').toUpperCase()
          return (
            <div style={{
              background: 'linear-gradient(180deg, #EFF6FF 0%, #fff 100%)',
              border: '1px solid #DBEAFE', borderRadius: 20,
              padding: 24, marginBottom: 16,
              boxShadow: '0 8px 24px -8px rgba(50,147,203,0.18)',
            }}>
              {/* Host strip — face + name = humans show up for humans, not for cards. */}
              {host && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  {host.avatar_url ? (
                    <img src={host.avatar_url} alt={`${hostName}'s avatar`} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#3293CB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, border: '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                      {hostInitial}
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hosted by</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginTop: 2 }}>{hostName}</p>
                  </div>
                </div>
              )}

              {/* Quick facts row — when, where, how many */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                <span style={{ background: '#fff', color: '#111827', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: '1px solid #DBEAFE' }}>
                  📅 {when}
                </span>
                {(activity.location_display || activity.location_text) && activity.location_mode !== 'remote' && (
                  <span style={{ background: '#fff', color: '#111827', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: '1px solid #DBEAFE' }}>
                    📍 {activity.location_display || activity.location_text}
                  </span>
                )}
                {activity.location_mode === 'remote' && (
                  <span style={{ background: '#fff', color: '#111827', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: '1px solid #DBEAFE' }}>
                    🌐 Remote
                  </span>
                )}
                {/* Live social proof — "X going" reads as momentum, not "Y spots left" framing as scarcity. */}
                {goingCount > 0 ? (
                  <span style={{ background: '#059669', color: '#fff', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                    ✓ {goingCount} {goingCount === 1 ? 'person' : 'people'} going
                  </span>
                ) : spotsLeft > 0 ? (
                  <span style={{ background: '#3293CB', color: '#fff', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                    Be the first to join
                  </span>
                ) : null}
              </div>

              {/* Description teaser */}
              {activity.description && (
                <p style={{ color: '#374151', lineHeight: 1.7, fontSize: 15, marginBottom: 16 }}>
                  {activity.description.length > 200 ? activity.description.slice(0, 197) + '…' : activity.description}
                </p>
              )}

              {/* CTA */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <Link
                  href={`/signup?next=/a/${activity.id}`}
                  style={{ padding: '14px 24px', borderRadius: 14, background: '#3293CB', color: '#fff', fontSize: 15, fontWeight: 800, textDecoration: 'none', boxShadow: '0 8px 18px -4px rgba(50,147,203,0.55)' }}
                >
                  Join free →
                </Link>
                <Link
                  href={`/login?next=/a/${activity.id}`}
                  style={{ padding: '14px 24px', borderRadius: 14, background: '#fff', color: '#0652B7', fontSize: 15, fontWeight: 700, textDecoration: 'none', border: '1.5px solid #DBEAFE' }}
                >
                  Log in
                </Link>
                <p style={{ fontSize: 12, color: '#6B7280', marginLeft: 'auto' }}>
                  Free · 30 sec
                </p>
              </div>
            </div>
          )
        })()}

        {/* Details / Chat tabs */}
        {user && (isJoined || isOwner) && (
          <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', marginBottom: 16 }}>
            <button onClick={() => setTab('details')} style={{ padding: '8px 16px', fontSize: 14, fontWeight: 600, borderBottom: tab === 'details' ? '2px solid #3293CB' : '2px solid transparent', marginBottom: -2, color: tab === 'details' ? '#3293CB' : '#4B5563', background: 'none', border: 'none', cursor: 'pointer' }}>Details</button>
            <button onClick={() => setTab('chat')} style={{ padding: '8px 16px', fontSize: 14, fontWeight: 600, borderBottom: tab === 'chat' ? '2px solid #3293CB' : '2px solid transparent', marginBottom: -2, color: tab === 'chat' ? '#3293CB' : '#4B5563', background: 'none', border: 'none', cursor: 'pointer' }}>Chat</button>
          </div>
        )}

        {/* Chat tab */}
        {tab === 'chat' && user && (
          <div>
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, marginBottom: 16, minHeight: 300, maxHeight: 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {chatLoading ? (
                <p style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>Loading chat...</p>
              ) : chatMessages.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>No messages yet. Start the conversation!</p>
              ) : chatMessages.map((m, i) => {
                const isMine = m.sender_id === user.id
                const sender = m.sender as any
                return (
                  <div key={i} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                    {!isMine && <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, color: '#4B5563' }}>{sender?.first_name || 'User'}</p>}
                    <div style={{ padding: '10px 14px', borderRadius: 16, fontSize: 14, lineHeight: 1.5, ...(isMine ? { background: '#3293CB', color: '#fff' } : { background: '#F9FAFB', color: '#111827' }) }}>
                      {m.content}
                      <p style={{ fontSize: 10, opacity: 0.7, marginTop: 3 }}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} style={{ flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#111827' }} placeholder="Type a message..." />
              <button onClick={sendChat} style={{ padding: '0 24px', borderRadius: 12, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Send</button>
            </div>
          </div>
        )}

        {/* Details tab content — gated to logged-in users only. */}
        {tab === 'details' && user && <>
        {/* Host card — full card is a link to the host's public profile.
            Without this you couldn't dig into who the host is before
            joining their activity, which is the central trust action. */}
        {host && (
          <Link
            href={`/u/${host.id}`}
            style={{
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16,
              padding: 16, marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 16,
              textDecoration: 'none', color: 'inherit',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E5E7EB' }}
          >
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#4B5563', overflow: 'hidden', flexShrink: 0 }}>
              {host.avatar_url ? <img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" /> : (host.first_name?.[0] || '?')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, color: '#111827', margin: 0 }}>{host.first_name} {host.last_name}</p>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '2px 0 0' }}>{'★'.repeat(Math.round(host.rating_avg || 0))} {host.rating_avg?.toFixed(1) || '0.0'} ({host.rating_count || 0} reviews)</p>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{host.home_display_name || host.city}</p>
            </div>
            <span style={{ fontSize: 13, color: '#3293CB', fontWeight: 700, flexShrink: 0 }}>View profile →</span>
          </Link>
        )}

        {/* Description */}
        {activity.description && (
          <p style={{ color: '#4B5563', lineHeight: 1.6, marginBottom: 24, fontSize: 15 }}>{activity.description}</p>
        )}

        {/* Details grid — Location / Date & Time / Spots use label+value.
            Contribution is intentionally JUST the badge (no "Cost" label)
            so it reads as a coordination signal, not a priced field. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Location', value: activity.location_mode === 'remote' ? 'Remote / Online' : activity.location_display || activity.location_text },
            { label: 'Date & Time', value: timing },
            { label: 'Spots', value: unlimited ? 'Open' : (spotsLeft > 0 ? `${spotsLeft} of ${activity.max_participants} left` : 'Full') },
          ].map(d => (
            <div key={d.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{d.label}</p>
              <p style={{ fontWeight: 600, fontSize: 14 }}>{d.value}</p>
            </div>
          ))}
          {(() => {
            const b = contributionBadge(activity.contribution_type, activity.tip_enabled)
            return (
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: b.bg, color: b.fg, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {b.label}
                </span>
                {activity.contribution_note && (
                  <p style={{ fontSize: 12, color: '#6B7280' }}>{activity.contribution_note}</p>
                )}
              </div>
            )
          })()}
        </div>

        {/* Participants */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Participants ({participants.length})</p>
          {participants.length === 0 ? (
            <p style={{ fontSize: 14, color: '#6B7280' }}>No one has joined yet. Be the first!</p>
          ) : (
            <p style={{ fontSize: 14, color: '#4B5563' }}>{participants.length} people have joined this activity.</p>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 16 }}>
          {!user ? (
            <>
              <p style={{ fontWeight: 600, marginBottom: 12 }}>Want to join this activity?</p>
              <Link href="/signup" style={{ display: 'inline-block', background: '#3293CB', color: '#fff', fontWeight: 700, padding: '12px 32px', borderRadius: 14, textDecoration: 'none', fontSize: 15 }}>Sign Up to Join</Link>
            </>
          ) : canEdit ? (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
              {isOwner ? (
                <button
                  onClick={() => router.push('/dashboard/activities')}
                  style={{ background: '#3293CB', color: '#fff', fontWeight: 700, padding: '12px 24px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 15, boxShadow: '0 4px 12px rgba(50,147,203,0.25)' }}
                >
                  Manage My Activities
                </button>
              ) : (
                <>
                  {/* Visible badge so admins know they're acting in mod
                      capacity, not as the owner. */}
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '6px 10px', borderRadius: 999, background: '#FEF3C7', color: '#92400E' }}>👮 Admin tools</span>
                  <button
                    onClick={() => router.push('/admin/activities')}
                    style={{ background: '#3293CB', color: '#fff', fontWeight: 700, padding: '12px 24px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 15, boxShadow: '0 4px 12px rgba(50,147,203,0.25)' }}
                  >
                    All Activities (Admin)
                  </button>
                </>
              )}
              <button onClick={() => setEditOpen(true)} style={{ background: '#fff', color: '#111827', fontWeight: 600, padding: '12px 24px', borderRadius: 14, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 15 }}>Edit</button>
              <button onClick={async () => {
                const verb = isOwner ? 'Cancel' : 'Cancel (admin)'
                if (!confirm(`${verb} this activity? Participants will see it marked Cancelled.`)) return
                const { error } = await supabase.from('activities').update({ status: 'cancelled' }).eq('id', id)
                if (error) { toast(error.message || 'Could not cancel activity.', 'error'); return }
                toast('Activity cancelled', 'success')
                router.push(isOwner ? '/dashboard/activities' : '/admin/activities')
              }} style={{ background: '#FEE2E2', color: '#DC2626', fontWeight: 600, padding: '12px 24px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 15 }}>Cancel Activity</button>
              {isAdmin && !isOwner && (
                <button
                  onClick={async () => {
                    if (!confirm('DELETE this activity? Cannot be undone. (Admin action)')) return
                    const { error } = await supabase.from('activities').delete().eq('id', id)
                    if (error) { toast(error.message || 'Delete failed.', 'error'); return }
                    toast('Activity deleted', 'success')
                    router.push('/admin/activities')
                  }}
                  style={{ background: '#fff', color: '#DC2626', fontWeight: 600, padding: '12px 24px', borderRadius: 14, border: '1px solid #FECACA', cursor: 'pointer', fontSize: 15 }}
                >
                  Delete (Admin)
                </button>
              )}
            </div>
          ) : isJoined ? (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ background: '#059669', color: '#fff', fontWeight: 600, padding: '12px 24px', borderRadius: 14, fontSize: 15 }}>You&apos;re In!</span>
              <button onClick={leaveActivity} disabled={joining} style={{ background: '#fff', color: '#DC2626', fontWeight: 600, padding: '12px 24px', borderRadius: 14, border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 15 }}>{joining ? 'Leaving...' : 'Leave'}</button>
            </div>
          ) : spotsLeft > 0 ? (
            <button onClick={joinActivity} disabled={joining} style={{ background: '#3293CB', color: '#fff', fontWeight: 700, padding: '14px 40px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 16, boxShadow: '0 4px 12px rgba(50,147,203,0.25)' }}>{joining ? 'Joining...' : 'Join This Activity'}</button>
          ) : (
            <span style={{ background: '#F3F4F6', color: '#6B7280', fontWeight: 600, padding: '12px 24px', borderRadius: 14, fontSize: 15 }}>Activity is Full</span>
          )}
        </div>

        {/* Action links */}
        {user && !isOwner && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
            <button onClick={() => {
              if (!user || !host) return
              router.push(`/dashboard/messages?to=${host.id}&about=${encodeURIComponent(activity.title)}`)
            }} style={{ background: 'none', border: 'none', color: '#3293CB', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Message Host</button>
            {/* Use the rich ShareButton popover (Copy Link / WhatsApp /
                SMS / Email / X / native fallback) instead of the OS sheet. */}
            <ShareButton
              url={typeof window !== 'undefined' ? window.location.href : `https://buddyally.com/a/${id}`}
              title={`${activity.title} — BuddyAlly`}
              text={activity.description ? String(activity.description).slice(0, 140) : 'Join me on BuddyAlly'}
              label="Share"
            />
            <button onClick={async () => {
              if (!confirm('Report this activity for inappropriate content?')) return
              const { error } = await supabase.from('reports').insert({ reporter_id: user!.id, reported_type: 'activity', reported_id: id, reason: 'inappropriate' })
              if (error) { toast(error.message || 'Could not submit report.', 'error'); return }
              toast('Report submitted. Thank you.', 'success')
            }} style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Report</button>
          </div>
        )}

        {/* Safety — collapsed by default. Single shared SafetyBanner
            component so this surface gets the full canonical checklist
            (live video, screenshot, ID photo, tell-a-friend, public
            locations, never-trust-valuables) AND the trust-badges
            explainer underneath. Was previously an inline old/abridged
            list that was forced-open. */}
        <SafetyBanner />
        </>}
      </main>

      {editOpen && activity && (
        <CreateActivityModal
          initialActivity={activity}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); loadActivity() }}
        />
      )}
    </div>
  )
}
