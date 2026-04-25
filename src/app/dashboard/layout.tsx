'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SafetyFooter from '@/components/SafetyFooter'

// NAV — restored to the 7 thumb anchors (Codes pinned last on the right
// so the chain icon is exactly where the user's right thumb expects it),
// plus a center "+" create dial spliced in visually between Activities and
// Groups. Alerts lives in the top header bell. Everything else (Saved
// Searches, Profile, Settings) is reachable from the Profile page.
const NAV_ITEMS = [
  { href: '/dashboard',           label: 'Explore',    badgeKey: null,       icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
  { href: '/dashboard/feed',      label: 'Feed',       badgeKey: null,       icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="14" y2="18"/></svg> },
  { href: '/dashboard/activities', label: 'Activities', badgeKey: null,       icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  // Center "+" is spliced in here — between Activities (3) and Groups (4) —
  // sitting at the visual midpoint of the 7-item row.
  { href: '/dashboard/groups',    label: 'Groups',     badgeKey: null,       icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href: '/dashboard/messages',  label: 'Messages',   badgeKey: 'messages', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { href: '/dashboard/contacts',  label: 'Allies',     badgeKey: 'contacts', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg> },
  // Codes pinned LAST → chain icon lives at the right edge by user request.
  { href: '/dashboard/codes',     label: 'Codes',      badgeKey: 'codes',    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [badges, setBadges] = useState<Record<string, number>>({ messages: 0, alerts: 0, codes: 0, contacts: 0 })

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [loading, user, router])

  // Load unread badge counts.
  //
  // We poll every 30s (cheap) AND re-poll on every pathname change. The
  // pathname trigger is what makes badges *clear* the instant you open
  // Messages / Codes / Alerts — those pages mark rows read on mount, so a
  // fresh count immediately after navigation reflects that.
  const loadBadges = useCallback(async () => {
    if (!user) return
    try {
      const [msgResult, alertResult, codeResult, contactReqResult] = await Promise.allSettled([
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('recipient_id', user.id).eq('read', false).is('activity_id', null).is('group_id', null),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
        supabase.from('connect_messages').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).eq('read', false),
        // Contacts badge = pending incoming link-up requests
        supabase.from('link_requests').select('id', { count: 'exact', head: true }).eq('recipient_id', user.id).eq('status', 'pending'),
      ])
      setBadges({
        messages: msgResult.status === 'fulfilled' ? (msgResult.value.count || 0) : 0,
        alerts: alertResult.status === 'fulfilled' ? (alertResult.value.count || 0) : 0,
        codes: codeResult.status === 'fulfilled' ? (codeResult.value.count || 0) : 0,
        contacts: contactReqResult.status === 'fulfilled' ? (contactReqResult.value.count || 0) : 0,
      })
    } catch {}
  }, [user])

  useEffect(() => {
    if (!user) return
    loadBadges()
    const interval = setInterval(loadBadges, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [user, loadBadges])

  // Re-poll on every pathname change so the badge clears immediately when
  // the user opens Messages / Codes / Alerts (those pages mark-as-read on mount).
  // Small 600ms delay so the markRead writes have landed before we re-count.
  useEffect(() => {
    if (!user) return
    const t = setTimeout(loadBadges, 600)
    return () => clearTimeout(t)
  }, [pathname, user, loadBadges])

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
    <div style={{ minHeight: '100vh', background: '#fff', paddingBottom: 110 }}>
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

      {/* Bottom nav — 7 anchor links. The center "+" FAB is rendered as a
          *sibling* below this nav (not as a child) so its top half can sit
          ABOVE the nav border without being clipped by overflow-x:auto. */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid #E5E7EB', zIndex: 100,
        display: 'flex', justifyContent: 'space-between', padding: '4px 4px',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100vw',
      }}>
        {NAV_ITEMS.map((item, idx) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const badgeCount = item.badgeKey ? badges[item.badgeKey] || 0 : 0
          // Reserve a transparent placeholder cell in the row at the
          // splice point (between Activities idx 2 and Groups idx 3) so
          // the absolutely-positioned FAB above sits over empty space and
          // doesn't overlap a nav label. Width matches the FAB (44 + ring).
          const reservePlusSlot = idx === 3
          return (
            <Fragment key={item.href}>
              {reservePlusSlot && (
                <span aria-hidden="true" style={{ width: 46, flexShrink: 0 }} />
              )}
              <Link
                href={item.href}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  fontSize: 9, fontWeight: active ? 600 : 500,
                  color: active ? '#3293CB' : '#6B7280',
                  padding: '6px 4px', borderRadius: 10,
                  textDecoration: 'none', border: 'none', background: 'none',
                  cursor: 'pointer', transition: 'all 0.15s',
                  position: 'relative', flexShrink: 0, minWidth: 40,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
                {item.label}
                {badgeCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 0, right: 2,
                    background: '#DC2626', color: '#fff',
                    fontSize: 9, fontWeight: 700, minWidth: 14, height: 14,
                    borderRadius: 7, lineHeight: '14px', textAlign: 'center',
                    padding: '0 3px',
                  }}>{badgeCount > 9 ? '9+' : badgeCount}</span>
                )}
              </Link>
            </Fragment>
          )
        })}
      </nav>

      {/* Center "+" dial — direct link to Create Activity. No sheet, no
          modal, no menu: tap goes straight to the Activity form on the
          dashboard. Rendered OUTSIDE the nav so the top half of the circle
          sits above the nav's border instead of being clipped by
          overflow-x:auto. Positioned to align with the reserved slot in
          the row above. */}
      <Link
        href="/dashboard?create=1"
        aria-label="Create Activity"
        style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 44, height: 44,
          borderRadius: '50%', border: '2.5px solid #fff',
          background: '#3293CB', color: '#fff',
          boxShadow: '0 8px 20px -6px rgba(50,147,203,0.65)',
          zIndex: 110,
          textDecoration: 'none',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </Link>

      {/* Persistent Safety + Report strip — sits just above the bottom
          nav and is reachable from any dashboard page. Replaces the
          per-page SafetyBanner so it's never duplicated and never missed. */}
      <SafetyFooter />
    </div>
  )
}

