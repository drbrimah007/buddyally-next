'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Explore', icon: '🔍' },
  { href: '/dashboard/activities', label: 'Activities', icon: '📅' },
  { href: '/dashboard/groups', label: 'Groups', icon: '👥' },
  { href: '/dashboard/messages', label: 'Messages', icon: '💬' },
  { href: '/dashboard/alerts', label: 'Alerts', icon: '🔔' },
  { href: '/dashboard/codes', label: 'Codes', icon: '🔗' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [loading, user, router])

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🔗</div>
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  )

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 px-4 h-14 flex items-center justify-center">
        <div className="max-w-4xl w-full flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/buddyally-logo-full.png" alt="BuddyAlly" className="h-7" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-600">{profile?.first_name || 'User'}</span>
            <Link href="/dashboard/profile" className="text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
              Profile
            </Link>
            <button onClick={() => signOut().then(() => router.replace('/'))} className="text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-50 safe-bottom">
        <div className="max-w-4xl mx-auto flex justify-evenly py-2">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition ${active ? 'text-[#3293CB] font-semibold' : 'text-gray-400'}`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
