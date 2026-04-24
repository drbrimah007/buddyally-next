'use client'

// Starter-pack of suggested people to follow. Surfaces in the empty Feed
// so first-time users (zero follows) don't hit a dead end. Picks 5 active
// nearby profiles, lets the viewer follow them in one tap or all at once.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

type Suggested = {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  city: string | null
  rating_avg: number | null
  rating_count: number | null
}

export default function SuggestedFollows({ onFollowed }: { onFollowed?: () => void }) {
  const { user, profile } = useAuth()
  const [people, setPeople] = useState<Suggested[]>([])
  const [followed, setFollowed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => { if (user) void load() }, [user, (profile as any)?.home_country_code])

  async function load() {
    if (!user) return
    setLoading(true)
    // Prefer same-country active hosts. Falls back to any active hosts.
    const country = (profile as any)?.home_country_code
    const q = supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, city, rating_avg, rating_count, home_country_code')
      .neq('id', user.id)
      .order('rating_count', { ascending: false })
      .limit(8)
    const { data } = country ? await q.eq('home_country_code', country) : await q
    setPeople(((data as any[]) || []).slice(0, 5))
    setLoading(false)
  }

  async function follow(id: string) {
    if (!user || busy) return
    setBusy(id)
    try {
      const { error } = await supabase.from('follows').insert({ follower_id: user.id, followed_id: id })
      if (!error) {
        setFollowed(prev => new Set(prev).add(id))
        onFollowed?.()
      }
    } finally { setBusy(null) }
  }

  async function followAll() {
    if (!user || busy) return
    setBusy('all')
    try {
      const toAdd = people.filter(p => !followed.has(p.id))
      if (toAdd.length === 0) return
      const rows = toAdd.map(p => ({ follower_id: user.id, followed_id: p.id }))
      const { error } = await supabase.from('follows').insert(rows)
      if (!error) {
        setFollowed(prev => {
          const next = new Set(prev)
          toAdd.forEach(p => next.add(p.id))
          return next
        })
        onFollowed?.()
      }
    } finally { setBusy(null) }
  }

  if (loading) return null
  if (people.length === 0) return null

  const allFollowed = people.every(p => followed.has(p.id))

  return (
    <section style={{ background: 'linear-gradient(180deg, #EFF6FF 0%, #fff 100%)', border: '1px solid #DBEAFE', borderRadius: 20, padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#0652B7', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Starter pack</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginTop: 2 }}>Follow a few people to fill your Feed</p>
        </div>
        {!allFollowed && (
          <button
            onClick={followAll}
            disabled={busy === 'all'}
            style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 10px -2px rgba(50,147,203,0.4)' }}
          >
            {busy === 'all' ? 'Following…' : 'Follow all'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {people.map(p => {
          const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Someone'
          const initial = (p.first_name?.[0] || '?').toUpperCase()
          const isFollowed = followed.has(p.id)
          return (
            <div key={p.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link href={`/u/${p.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={`${name}'s avatar`} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#3293CB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
                    {initial}
                  </div>
                )}
              </Link>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/u/${p.id}`} style={{ color: '#111827', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name}
                </Link>
                <p style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.city || '—'}{p.rating_count ? ` · ★ ${(p.rating_avg ?? 0).toFixed(1)}` : ''}
                </p>
              </div>
              <button
                onClick={() => follow(p.id)}
                disabled={isFollowed || busy === p.id}
                style={{
                  padding: '6px 12px', borderRadius: 999, border: 'none',
                  background: isFollowed ? '#F0FDF4' : '#3293CB',
                  color: isFollowed ? '#059669' : '#fff',
                  fontSize: 12, fontWeight: 700, cursor: isFollowed ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {isFollowed ? '✓ Following' : 'Follow'}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
