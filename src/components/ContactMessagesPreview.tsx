'use client'

// Slim "Contact Messages" segment rendered above the regular DM inbox.
//
// What it surfaces: incoming messages from your BuddyAlly *contact codes*
// (the QR / short code on a car/pet/package). They live in the
// `connect_messages` table — separate from regular DMs — and are easy to
// miss without a dedicated surface.
//
// Design note: this is a SEGMENT, not a stack — Perry asked to keep it
// short. Showing the latest 3 in compact single-line rows; everything
// else is one tap away under "View all →".
//
// Realtime: subscribes to INSERT events on connect_messages where
// owner_id == user.id, so any incoming contact message immediately
// bubbles to the top without a refresh.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

type CodeMsg = {
  id: string
  message: string | null
  sender_name: string | null
  read: boolean | null
  created_at: string
  code: { title: string | null; code: string | null } | null
}

const PREVIEW_LIMIT = 3

export default function ContactMessagesPreview() {
  const { user } = useAuth()
  const [items, setItems] = useState<CodeMsg[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)

  // Initial load + a re-load any time we're told to refresh (real-time).
  async function load() {
    if (!user) return
    const [recent, unreadCount] = await Promise.all([
      supabase
        .from('connect_messages')
        .select('id, message, sender_name, read, created_at, code:connect_codes(title, code)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(PREVIEW_LIMIT),
      supabase
        .from('connect_messages')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('read', false),
    ])
    setItems((recent.data as any[] | null) || [])
    setUnread(unreadCount.count || 0)
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    let alive = true
    void (async () => {
      await load()
      if (!alive) return
    })()

    // Bubble new contact messages to the top in real time.
    const channel = supabase
      .channel(`contact-msgs:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'connect_messages', filter: `owner_id=eq.${user.id}` },
        () => { void load() },
      )
      .subscribe()

    return () => {
      alive = false
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (loading || items.length === 0) return null

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 14,
        padding: 12,
        marginBottom: 14,
      }}
    >
      {/* Compact header row — single line. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 14 }}>🔗</span>
          <p style={{ fontSize: 12, fontWeight: 800, color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Contact messages
          </p>
          {unread > 0 && (
            <span style={{
              background: '#DC2626', color: '#fff',
              fontSize: 10, fontWeight: 800,
              padding: '1px 7px', borderRadius: 999,
            }}>{unread}</span>
          )}
        </div>
        <Link
          href="/dashboard/codes"
          style={{ fontSize: 11, color: '#3293CB', fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
        >
          View all →
        </Link>
      </div>

      {/* Tight rows — single line each, hard truncation. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((m) => {
          const text = (m.message || 'New contact message').replace(/^\[URGENT\]\s*/, '')
          const isUrgent = (m.message || '').startsWith('[URGENT]')
          const sender = m.sender_name || 'Anonymous'
          const time = relativeTime(new Date(m.created_at))
          return (
            <Link
              key={m.id}
              href="/dashboard/codes"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 8,
                textDecoration: 'none',
                background: m.read ? 'transparent' : '#F8FBFD',
                borderLeft: m.read ? '3px solid transparent' : '3px solid #3293CB',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', flexShrink: 0, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sender}
              </span>
              {isUrgent && (
                <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 9, padding: '1px 5px', borderRadius: 4, fontWeight: 800, flexShrink: 0 }}>
                  URGENT
                </span>
              )}
              <span
                style={{
                  flex: 1, minWidth: 0, fontSize: 12, color: '#475569',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >{text}</span>
              <span style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>{time}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

// "5m", "2h", "yesterday", "Apr 10" — tight time labels for the slim row.
function relativeTime(d: Date): string {
  const s = (Date.now() - d.getTime()) / 1000
  if (s < 60) return 'now'
  if (s < 3600) return Math.round(s / 60) + 'm'
  if (s < 86400) return Math.round(s / 3600) + 'h'
  if (s < 86400 * 2) return 'yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
