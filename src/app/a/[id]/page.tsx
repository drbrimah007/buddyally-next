'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

export default function ActivityPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const [activity, setActivity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  useEffect(() => { loadActivity() }, [id])

  async function loadActivity() {
    setLoading(true)
    const { data } = await supabase
      .from('activities')
      .select('*, host:profiles!created_by(id, first_name, last_name, rating_avg, rating_count, avatar_url, city, home_display_name, verified_id), participants:activity_participants(user_id)')
      .eq('id', id)
      .single()
    setActivity(data)
    setLoading(false)
  }

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

        {/* Title + Category */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ display: 'inline-block', background: '#3293CB', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, marginBottom: 8 }}>{activity.category}</span>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>{activity.title}</h1>
        </div>

        {/* Host card */}
        {host && (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#4B5563', overflow: 'hidden', flexShrink: 0 }}>
              {host.avatar_url ? <img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : (host.first_name?.[0] || '?')}
            </div>
            <div>
              <p style={{ fontWeight: 600 }}>{host.first_name} {host.last_name}</p>
              <p style={{ fontSize: 13, color: '#6B7280' }}>{'★'.repeat(Math.round(host.rating_avg || 0))} {host.rating_avg?.toFixed(1) || '0.0'} ({host.rating_count || 0} reviews)</p>
              <p style={{ fontSize: 12, color: '#6B7280' }}>{host.home_display_name || host.city}</p>
            </div>
          </div>
        )}

        {/* Description */}
        {activity.description && (
          <p style={{ color: '#4B5563', lineHeight: 1.6, marginBottom: 24, fontSize: 15 }}>{activity.description}</p>
        )}

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Location', value: activity.location_mode === 'remote' ? 'Remote / Online' : activity.location_display || activity.location_text },
            { label: 'Date & Time', value: timing },
            { label: 'Spots', value: spotsLeft > 0 ? `${spotsLeft} of ${activity.max_participants} left` : 'Full' },
            { label: 'Cost', value: activity.tip_enabled ? 'Free. Tips optional.' : 'Free' },
          ].map(d => (
            <div key={d.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{d.label}</p>
              <p style={{ fontWeight: 600, fontSize: 14 }}>{d.value}</p>
            </div>
          ))}
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
          ) : isOwner ? (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ background: '#3293CB', color: '#fff', fontWeight: 600, padding: '12px 24px', borderRadius: 14, fontSize: 15 }}>Your Activity</span>
              <button onClick={() => { supabase.from('activities').update({ status: 'cancelled' }).eq('id', id).then(() => router.push('/dashboard/activities')) }} style={{ background: '#FEE2E2', color: '#DC2626', fontWeight: 600, padding: '12px 24px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 15 }}>Cancel Activity</button>
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
            <button style={{ background: 'none', border: 'none', color: '#3293CB', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Message Host</button>
            <button onClick={() => { navigator.share?.({ title: activity.title, url: window.location.href }).catch(() => { navigator.clipboard.writeText(window.location.href); alert('Link copied!') }) }} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Share</button>
            <button style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Report</button>
          </div>
        )}

        {/* Safety */}
        <div style={{ border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ background: '#F9FAFB', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🛡</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Safety Protocols</span>
          </div>
          <div style={{ padding: '12px 16px', fontSize: 14, color: '#4B5563', lineHeight: 1.6 }}>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Do a live video call first</li>
              <li>Ask for a photo of their ID</li>
              <li>Let someone know where you are going</li>
              <li>Choose public, well-lit locations</li>
              <li>Never trust a buddy with valuables or anyone&apos;s life</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
