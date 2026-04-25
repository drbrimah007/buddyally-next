'use client'

// Public user profile — shown from chat, activities, groups.

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'
import Reviews, { Stars } from '@/components/Reviews'
import FollowButton from '@/components/FollowButton'
import ShareButton from '@/components/ShareButton'
import TrustBadges from '@/components/TrustBadges'

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { success, info, error: err } = useToast()

  const [profile, setProfile] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // Relationship state drives the Link-up button label:
  //   null        → not loaded yet
  //   'none'      → no contact row, no pending request → show "Link up"
  //   'requested' → we've already sent a pending request
  //   'incoming'  → they sent us one; show "Respond"
  //   'contact'   → already active contact; hide link-up
  //   'blocked'   → we blocked them; hide link-up
  const [relation, setRelation] = useState<'none' | 'requested' | 'incoming' | 'contact' | 'blocked' | null>(null)
  const [linkingUp, setLinkingUp] = useState(false)
  const isSelf = user?.id === id

  useEffect(() => { load() }, [id])
  useEffect(() => { if (user && id && !isSelf) loadRelation() }, [user, id, isSelf])

  async function load() {
    setLoading(true)
    const [pRes, aRes] = await Promise.all([
      // profile_public is the privacy-safe view — strips lineage / trust_weight.
      // We pull buddy_verified_at, id_verified_at, and is_invited_member here
      // to drive the TrustBadges component.
      supabase.from('profile_public').select('id, first_name, last_name, bio, avatar_url, city, home_display_name, interests, rating_avg, rating_count, verified_email, verified_phone, verified_selfie, socials, buddy_verified_at, id_verified_at, is_invited_member').eq('id', id).single(),
      supabase.from('activities').select('id, title, category, cover_image_url, location_display, date, status').eq('created_by', id).order('created_at', { ascending: false }).limit(10),
    ])
    setProfile(pRes.data)
    setActivities(aRes.data || [])
    setLoading(false)
  }

  async function loadRelation() {
    if (!user || !id) return
    const [myContact, pendingOut, pendingIn] = await Promise.all([
      supabase.from('user_contacts').select('status').eq('user_id', user.id).eq('contact_user_id', id).maybeSingle(),
      supabase.from('link_requests').select('id').eq('sender_id', user.id).eq('recipient_id', id).eq('status', 'pending').maybeSingle(),
      supabase.from('link_requests').select('id').eq('sender_id', id).eq('recipient_id', user.id).eq('status', 'pending').maybeSingle(),
    ])
    if (myContact.data?.status === 'blocked') { setRelation('blocked'); return }
    if (myContact.data?.status === 'active') { setRelation('contact'); return }
    if (pendingOut.data) { setRelation('requested'); return }
    if (pendingIn.data) { setRelation('incoming'); return }
    setRelation('none')
  }

  async function linkUp() {
    if (!user || !id) return
    setLinkingUp(true)
    const { error } = await supabase.from('link_requests').insert({
      sender_id: user.id,
      recipient_id: id,
      message: '',
      status: 'pending',
    })
    setLinkingUp(false)
    if (error) {
      // Most common cause: RLS block from the other side. Keep the message generic.
      err(error.message.includes('duplicate') ? 'You already have a pending request with this user.' : 'Could not send link-up request.')
      return
    }
    success('Link-up request sent')
    setRelation('requested')
  }

  function sendMessage() {
    if (!user) { err('Please log in'); return }
    // The messages page supports deep-link by id via query param.
    router.push(`/dashboard/messages?to=${id}`)
  }

  async function reportUser() {
    if (!user || !profile) return
    const reason = prompt('Why are you reporting this user? (required)')
    if (!reason || !reason.trim()) return
    await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_type: 'user',
      reported_id: profile.id,
      reason: reason.slice(0, 200),
    })
    success('Report submitted. Our team will review it.')
  }

  async function blockUser() {
    if (!user || !profile) return
    if (!confirm('Block this user? You won\'t see their activities or messages.')) return
    const { data: me } = await supabase.from('profiles').select('blocked_users').eq('id', user.id).single()
    const list: string[] = me?.blocked_users || []
    if (!list.includes(profile.id)) list.push(profile.id)
    await supabase.from('profiles').update({ blocked_users: list }).eq('id', user.id)
    info('User blocked')
  }

  // Share is handled by the ShareButton component in the action row below —
  // it opens a modern panel with a short URL, copy button, and channels.

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#6B7280' }}>Loading…</div>
  if (!profile) return <div style={{ textAlign: 'center', padding: 80, color: '#6B7280' }}>Profile not found</div>

  const name = `${profile.first_name} ${profile.last_name}`.trim() || 'User'
  const verifiedCount = [profile.verified_email, profile.verified_phone, profile.verified_selfie].filter(Boolean).length

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 60px' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#3293CB', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>&larr; Back</button>

      {/* Header card */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#4B5563', overflow: 'hidden', flexShrink: 0 }}>
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, wordBreak: 'break-word' }}>{name}</h1>
            {(profile.home_display_name || profile.city) && <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{profile.home_display_name || profile.city}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <Stars value={Math.round(profile.rating_avg || 0)} size={14} />
              <span style={{ fontSize: 12, color: '#6B7280' }}>{Number(profile.rating_avg || 0).toFixed(1)} · {profile.rating_count || 0} review{profile.rating_count === 1 ? '' : 's'}</span>
            </div>
            {/* TrustBadges — fixed-order pills (Buddy Verified → Buddy
                Line → ID Verified). Only renders earned signals. The
                "Learn how trust works →" micro-link routes to the
                Trust & Safety summary sheet. */}
            <div style={{ marginTop: 8 }}>
              <TrustBadges
                buddyVerifiedAt={profile.buddy_verified_at}
                isInvited={profile.is_invited_member}
                idVerifiedAt={profile.id_verified_at}
                variant="full"
                showLearnMore
              />
            </div>
          </div>
        </div>

        {/* Legacy verification chips (email / phone / selfie) — kept
            because they signal which channels are confirmed. The new
            TrustBadges row above is the public trust layer per spec. */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {profile.verified_email && <Badge>✓ Email</Badge>}
          {profile.verified_phone && <Badge>✓ Phone</Badge>}
          {profile.verified_selfie && <Badge>✓ Selfie</Badge>}
          {verifiedCount === 0 && <span style={{ fontSize: 12, color: '#9CA3AF' }}>Not yet verified</span>}
        </div>

        {profile.bio && <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6, marginBottom: 14 }}>{profile.bio}</p>}

        {profile.interests && profile.interests.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {profile.interests.map((i: string) => (
              <span key={i} style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid #E5E7EB' }}>{i}</span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isSelf && (
            <>
              <button onClick={sendMessage} style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Message</button>
              {/* One-way follow — puts this user's posts/activities in your Feed. */}
              <FollowButton targetUserId={id} />
              {/* Link-up — only when we're not already connected and no request in flight */}
              {relation === 'none' && (
                <button onClick={linkUp} disabled={linkingUp} style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid #3293CB', background: '#fff', color: '#3293CB', fontSize: 13, fontWeight: 600, cursor: linkingUp ? 'wait' : 'pointer', opacity: linkingUp ? 0.6 : 1 }}>
                  {linkingUp ? 'Sending…' : '+ Link up'}
                </button>
              )}
              {relation === 'requested' && (
                <span style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontSize: 13, fontWeight: 600 }}>Request sent</span>
              )}
              {relation === 'incoming' && (
                <Link href="/dashboard/contacts" style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid #3293CB', background: '#EFF6FF', color: '#3293CB', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Respond to request</Link>
              )}
              {relation === 'contact' && (
                <span style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#166534', fontSize: 13, fontWeight: 600 }}>✓ Ally</span>
              )}
              <ShareButton
                url={typeof window !== 'undefined' ? `${window.location.origin}/u/${id}` : `https://buddyally.com/u/${id}`}
                title={`${profile.first_name} on BuddyAlly`}
                text={profile.bio ? String(profile.bio).slice(0, 140) : ''}
                label="Share"
              />
              {/* Report / Block live in a small overflow menu — they should
                  feel like recovery actions, not promoted alongside Message
                  and Follow. (WhatsApp pattern: Block tucked inside the
                  conversation settings menu, not at the top of the chat.) */}
              <ProfileOverflowMenu onReport={reportUser} onBlock={blockUser} />
            </>
          )}
          {isSelf && (
            <Link href="/dashboard/profile" style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Edit Profile</Link>
          )}
        </div>
      </div>

      {/* Activities */}
      {activities.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Hosted Activities ({activities.length})</h3>
          {activities.map(a => (
            <Link key={a.id} href={`/a/${a.id}`} style={{ display: 'flex', gap: 12, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, marginBottom: 8, textDecoration: 'none', alignItems: 'center' }}>
              {a.cover_image_url && <img src={a.cover_image_url} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                <p style={{ fontSize: 12, color: '#6B7280' }}>{a.category}{a.location_display ? ` · ${a.location_display}` : ''}</p>
              </div>
              {a.status && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10, background: a.status === 'open' ? '#DCFCE7' : '#F3F4F6', color: a.status === 'open' ? '#166534' : '#6B7280' }}>{a.status}</span>}
            </Link>
          ))}
        </div>
      )}

      {/* Reviews */}
      <Reviews reviewedId={id} />
    </div>
  )
}

function Badge({ children, color = '#065F46', bg = '#ECFDF5' }: { children: React.ReactNode; color?: string; bg?: string }) {
  return <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.04)' }}>{children}</span>
}

// Small ⋯ menu next to the action row. Houses Report and Block — actions
// people will only ever need in a bad situation, and shouldn't sit at the
// same visual weight as Message / Follow / Link up. Mirrors the WhatsApp
// pattern (settings ⋯ at the top right of a chat).
function ProfileOverflowMenu({ onReport, onBlock }: { onReport: () => void; onBlock: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More"
        title="More"
        style={{
          width: 36, height: 36, padding: 0, borderRadius: 999,
          border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280',
          fontSize: 16, fontWeight: 700, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          letterSpacing: '0.1em',
        }}
      >⋯</button>
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 60,
            background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
            boxShadow: '0 12px 28px rgba(15,23,42,0.12)',
            minWidth: 160, padding: 4,
          }}
        >
          <button
            type="button"
            onClick={() => { setOpen(false); onReport() }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 12px', borderRadius: 8, border: 'none',
              background: 'transparent', color: '#DC2626',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >🚩 Report</button>
          <button
            type="button"
            onClick={() => { setOpen(false); onBlock() }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 12px', borderRadius: 8, border: 'none',
              background: 'transparent', color: '#374151',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >🚫 Block</button>
        </div>
      )}
    </div>
  )
}
