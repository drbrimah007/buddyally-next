'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// NAV — 4 anchor pages + a center "+" that opens a quick-action sheet.
// (Activities, Groups, Codes are still routes — reachable from the + sheet
// or via the header / their own surfaces — they just don't earn a dedicated
// thumb-zone slot. 80% of taps land on Explore / Feed / Messages / Allies.)
const NAV_ITEMS = [
  { href: '/dashboard',          label: 'Explore',  badgeKey: null,       icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
  { href: '/dashboard/feed',     label: 'Feed',     badgeKey: null,       icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="14" y2="18"/></svg> },
  // Center plus is rendered separately (NavPlusButton) — splices in here visually.
  { href: '/dashboard/messages', label: 'Messages', badgeKey: 'messages', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { href: '/dashboard/contacts', label: 'Allies',   badgeKey: 'contacts', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg> },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [badges, setBadges] = useState<Record<string, number>>({ messages: 0, alerts: 0, codes: 0, contacts: 0 })
  // Center-nav "+" sheet state — opens a quick-action menu (New Activity,
  // New Post, New Code, Activities/Groups/Codes shortcuts).
  const [plusOpen, setPlusOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [loading, user, router])

  // Load unread badge counts
  useEffect(() => {
    if (!user) return
    async function loadBadges() {
      try {
        const [msgResult, alertResult, codeResult, contactReqResult] = await Promise.allSettled([
          supabase.from('messages').select('id', { count: 'exact', head: true }).eq('recipient_id', user!.id).eq('read', false).is('activity_id', null).is('group_id', null),
          supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user!.id).eq('read', false),
          supabase.from('connect_messages').select('id', { count: 'exact', head: true }).eq('owner_id', user!.id).eq('read', false),
          // Contacts badge = pending incoming link-up requests
          supabase.from('link_requests').select('id', { count: 'exact', head: true }).eq('recipient_id', user!.id).eq('status', 'pending'),
        ])
        setBadges({
          messages: msgResult.status === 'fulfilled' ? (msgResult.value.count || 0) : 0,
          alerts: alertResult.status === 'fulfilled' ? (alertResult.value.count || 0) : 0,
          codes: codeResult.status === 'fulfilled' ? (codeResult.value.count || 0) : 0,
          contacts: contactReqResult.status === 'fulfilled' ? (contactReqResult.value.count || 0) : 0,
        })
      } catch {}
    }
    loadBadges()
    const interval = setInterval(loadBadges, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [user])

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <img src="/buddyally-logo.png" alt="BuddyAlly" style={{ height: 56, width: 56, marginBottom: 16, opacity: 0.6 }} />
        <p style={{ color: '#4B5563' }}>Loading...</p>
      </div>
    </div>
  )

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: '#fff', paddingBottom: 80 }}>
      {/* Top bar */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 90,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #E5E7EB', padding: '0 16px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ maxWidth: 900, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/buddyally-logo-full.png" alt="BuddyAlly" style={{ height: 26, width: 'auto' }} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4B5563' }}>{profile?.first_name || 'User'}</span>
            <Link href="/dashboard/profile" style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 12, padding: '5px 10px', borderRadius: 8,
              border: '1px solid #E5E7EB', background: '#fff', color: '#111827',
              fontWeight: 600, textDecoration: 'none'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Profile
            </Link>
            <Link href="/dashboard/alerts" style={{
              display: 'inline-flex', alignItems: 'center', position: 'relative',
              fontSize: 12, padding: '5px 10px', borderRadius: 8,
              border: '1px solid #E5E7EB', background: '#fff', color: '#111827',
              fontWeight: 600, textDecoration: 'none'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {badges.alerts > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: '#DC2626', color: '#fff', fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, lineHeight: '16px', textAlign: 'center', padding: '0 3px' }}>{badges.alerts}</span>}
            </Link>
            <button onClick={() => signOut().then(() => router.replace('/'))} style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: 12, padding: '5px 10px', borderRadius: 8,
              border: '1px solid #E5E7EB', background: '#fff', color: '#111827',
              fontWeight: 600, cursor: 'pointer'
            }}>Log Out</button>
          </div>
        </div>
      </header>

      {/* Content. Most dashboard pages (Feed, Messages, Groups, Contacts,
          Codes, Saved Searches) read best at a comfortable 680px column.
          Explore (`/dashboard`) is a two-panel layout and needs the full
          viewport — it self-constrains inside `page.tsx`. So we switch the
          max-width based on the path. */}
      <main
        style={{
          maxWidth: pathname === '/dashboard' ? 'none' : 680,
          margin: '0 auto',
          padding: '68px 16px 100px',
        }}
      >
        {children}
      </main>

      {/* Bottom nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid #E5E7EB', zIndex: 100,
        display: 'flex', justifyContent: 'space-evenly', padding: '6px 0',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100vw',
      }}>
        {NAV_ITEMS.map((item, idx) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const badgeCount = item.badgeKey ? badges[item.badgeKey] || 0 : 0
          // Splice the center "+" between Feed (idx 1) and Messages (idx 2)
          // — sits in the thumb's natural primary tap zone.
          const renderPlusBefore = idx === 2
          return (
            <>
              {renderPlusBefore && (
                <button
                  key="__plus"
                  type="button"
                  onClick={() => setPlusOpen(true)}
                  aria-label="Quick actions"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 52, height: 52, marginTop: -16,
                    borderRadius: '50%', border: 'none',
                    background: '#3293CB', color: '#fff',
                    boxShadow: '0 8px 18px -4px rgba(50,147,203,0.55)',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              )}
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  fontSize: 10, fontWeight: active ? 600 : 500,
                  color: active ? '#3293CB' : '#6B7280',
                  padding: '6px 8px', borderRadius: 12,
                  textDecoration: 'none', border: 'none', background: 'none',
                  cursor: 'pointer', transition: 'all 0.15s',
                  position: 'relative', flexShrink: 0,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
                {item.label}
                {badgeCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: 4,
                    background: '#DC2626', color: '#fff',
                    fontSize: 9, fontWeight: 700, minWidth: 16, height: 16,
                    borderRadius: 8, lineHeight: '16px', textAlign: 'center',
                    padding: '0 3px',
                  }}>{badgeCount}</span>
                )}
              </Link>
            </>
          )
        })}
      </nav>

      {/* + action sheet — opens from the center FAB. Holds the create
          actions plus the secondary destinations (Activities, Groups, Codes,
          Saved Searches, Alerts) so the bottom nav stays at 4 anchors. */}
      {plusOpen && (
        <div
          onClick={() => setPlusOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', width: '100%', maxWidth: 540,
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: '20px 16px max(20px, env(safe-area-inset-bottom))',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ width: 40, height: 4, background: '#E5E7EB', borderRadius: 4, margin: '0 auto 16px' }} />
            <p style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Create</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <Link href="/dashboard?create=1" onClick={() => setPlusOpen(false)} style={plusBtn('#EFF6FF', '#0652B7')}>
                <span style={{ fontSize: 22 }}>📅</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Activity</span>
              </Link>
              <Link href="/dashboard/feed?compose=1" onClick={() => setPlusOpen(false)} style={plusBtn('#FEF3C7', '#92400E')}>
                <span style={{ fontSize: 22 }}>✏️</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Post</span>
              </Link>
              <Link href="/dashboard/codes?create=1" onClick={() => setPlusOpen(false)} style={plusBtn('#F0FDF4', '#166534')}>
                <span style={{ fontSize: 22 }}>🔗</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Code</span>
              </Link>
            </div>

            <p style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>More</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <Link href="/dashboard/activities" onClick={() => setPlusOpen(false)} style={plusBtn('#F3F4F6', '#374151')}><span style={{ fontSize: 18 }}>🗂</span><span style={{ fontSize: 12, fontWeight: 700 }}>Activities</span></Link>
              <Link href="/dashboard/groups" onClick={() => setPlusOpen(false)} style={plusBtn('#F3F4F6', '#374151')}><span style={{ fontSize: 18 }}>👥</span><span style={{ fontSize: 12, fontWeight: 700 }}>Groups</span></Link>
              <Link href="/dashboard/codes" onClick={() => setPlusOpen(false)} style={plusBtn('#F3F4F6', '#374151')}><span style={{ fontSize: 18 }}>🔗</span><span style={{ fontSize: 12, fontWeight: 700 }}>Codes</span></Link>
              <Link href="/dashboard/saved-searches" onClick={() => setPlusOpen(false)} style={plusBtn('#F3F4F6', '#374151')}><span style={{ fontSize: 18 }}>🔍</span><span style={{ fontSize: 12, fontWeight: 700 }}>Saved</span></Link>
              <Link href="/dashboard/alerts" onClick={() => setPlusOpen(false)} style={plusBtn('#F3F4F6', '#374151')}><span style={{ fontSize: 18 }}>🔔</span><span style={{ fontSize: 12, fontWeight: 700 }}>Alerts</span></Link>
              <Link href="/dashboard/profile" onClick={() => setPlusOpen(false)} style={plusBtn('#F3F4F6', '#374151')}><span style={{ fontSize: 18 }}>👤</span><span style={{ fontSize: 12, fontWeight: 700 }}>Profile</span></Link>
            </div>

            <button
              onClick={() => setPlusOpen(false)}
              style={{ marginTop: 16, width: '100%', padding: 14, borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Compact action-tile style for the Plus action sheet.
function plusBtn(bg: string, fg: string): React.CSSProperties {
  return {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '14px 6px', borderRadius: 14, background: bg, color: fg,
    textDecoration: 'none', minHeight: 76,
  }
}
