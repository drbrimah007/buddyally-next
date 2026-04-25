'use client'

// Admin layout — wraps /admin/* routes, gates to is_admin = true.

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'

const ITEMS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/id-verifications', label: 'ID Verifications' },
  { href: '/admin/short-links', label: 'Short Links' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user) router.replace('/login')
    else if (profile && !(profile as any).is_admin) router.replace('/dashboard')
  }, [user, profile, loading, router])

  if (loading || !profile) return <div style={{ padding: 80, textAlign: 'center', color: '#6B7280' }}>Loading…</div>
  if (!(profile as any).is_admin) return null

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      <header style={{ background: '#111827', color: '#fff', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/admin" style={{ color: '#fff', fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>BuddyAlly Admin</Link>
          <nav style={{ display: 'flex', gap: 4 }}>
            {ITEMS.map(i => {
              const active = pathname === i.href || (i.href !== '/admin' && pathname.startsWith(i.href))
              return (
                <Link key={i.href} href={i.href} style={{
                  fontSize: 13, fontWeight: 600, color: active ? '#fff' : '#9CA3AF',
                  padding: '6px 12px', borderRadius: 8,
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  textDecoration: 'none',
                }}>{i.label}</Link>
              )
            })}
          </nav>
        </div>
        <Link href="/dashboard" style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'none' }}>← Back to app</Link>
      </header>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 60px' }}>{children}</main>
    </div>
  )
}
