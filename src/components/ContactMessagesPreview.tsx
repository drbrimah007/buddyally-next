'use client'

// v1 parity: a compact "Contact Messages" box rendered above the regular DM
// inbox. It surfaces incoming messages from your BuddyAlly *contact codes*
// (the QR/short code you stick on a car, pet tag, package, etc.) so they
// don't get lost — those messages live in `connect_messages`, not `messages`,
// and are easy to forget without a dedicated surface.
//
// Pulls the 5 most recent connect_messages addressed to the viewer.

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

export default function ContactMessagesPreview() {
  const { user } = useAuth()
  const [items, setItems] = useState<CodeMsg[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let alive = true
    ;(async () => {
      // Recent + unread count fired in parallel.
      const [recent, unreadCount] = await Promise.all([
        supabase
          .from('connect_messages')
          .select('id, message, sender_name, read, created_at, code:connect_codes(title, code)')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('connect_messages')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id)
          .eq('read', false),
      ])
      if (!alive) return
      setItems((recent.data as any[] | null) || [])
      setUnread(unreadCount.count || 0)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [user])

  if (loading || items.length === 0) return null

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🔗</span>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#111827' }}>Contact Messages</h3>
          {unread > 0 && (
            <span
              style={{
                background: '#DC2626',
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              {unread} new
            </span>
          )}
        </div>
        <Link
          href="/dashboard/codes"
          style={{ fontSize: 12, color: '#3293CB', fontWeight: 700, textDecoration: 'none' }}
        >
          View all →
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((m) => {
          const text = (m.message || '').replace(/^\[URGENT\]\s*/, '')
          const isUrgent = (m.message || '').startsWith('[URGENT]')
          const sender = m.sender_name || 'Anonymous'
          const initial = (sender[0] || '?').toUpperCase()
          const time = new Date(m.created_at)
          const timeStr = time.toLocaleDateString() + ' ' + time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          return (
            <Link
              key={m.id}
              href="/dashboard/codes"
              style={{
                textDecoration: 'none',
                display: 'flex',
                gap: 12,
                padding: 12,
                borderRadius: 12,
                border: '1px solid #f3f4f6',
                ...(m.read ? {} : { borderLeft: '3px solid #3293CB', background: '#F8FBFD' }),
              }}
            >
              <div
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#3293CB,#5d92f6)', color: '#fff',
                  display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0,
                }}
              >
                {initial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
                    {sender}
                    {isUrgent && (
                      <span
                        style={{
                          marginLeft: 6,
                          background: '#FEE2E2', color: '#DC2626',
                          fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                        }}
                      >
                        URGENT
                      </span>
                    )}
                  </p>
                  <span style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>{timeStr}</span>
                </div>
                <p
                  style={{
                    fontSize: 13, color: '#4B5563', margin: '2px 0 0',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {text || 'New contact message'}
                </p>
                {m.code?.title && (
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                    via {m.code.title}{m.code.code ? ` · ${m.code.code}` : ''}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
