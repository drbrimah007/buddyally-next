'use client'

// Saved Searches — user-named activity filters they want to "follow".
// Matches appear in /dashboard/feed. Each search has a notify_new toggle
// that opts into push/email notifications when a new matching activity is
// posted (delivery wired via existing /api/notify in a follow-up pass).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'

type SavedSearch = {
  id: string
  user_id: string
  name: string
  filter_json: Record<string, any>
  notify_new: boolean
  last_seen_at: string | null
  created_at: string
}

function describeFilter(f: Record<string, any>): string {
  const bits: string[] = []
  if (f.q) bits.push(`"${f.q}"`)
  if (f.category && f.category !== 'all') bits.push(f.category)
  if (f.city) bits.push(`in ${f.city}`)
  if (f.radius_mi) bits.push(`${f.radius_mi}mi`)
  if (f.free_only) bits.push('free only')
  return bits.length ? bits.join(' · ') : 'any activity'
}

export default function SavedSearchesPage() {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const router = useRouter()
  const [items, setItems] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    void load()
  }, [user])

  async function load() {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) toastError(error.message || 'Could not load saved searches')
    setItems((data as any as SavedSearch[]) || [])
    setLoading(false)
  }

  async function toggleNotify(s: SavedSearch) {
    const { error } = await supabase
      .from('saved_searches')
      .update({ notify_new: !s.notify_new })
      .eq('id', s.id)
    if (error) return toastError(error.message || 'Could not update')
    success(s.notify_new ? 'Notifications off' : 'Notifications on')
    void load()
  }

  async function remove(s: SavedSearch) {
    if (!confirm(`Delete saved search "${s.name}"?`)) return
    const { error } = await supabase.from('saved_searches').delete().eq('id', s.id)
    if (error) return toastError(error.message || 'Could not delete')
    success('Deleted')
    void load()
  }

  function runSearch(s: SavedSearch) {
    // Route to the explore page with filter params populated
    const q = new URLSearchParams()
    if (s.filter_json.q) q.set('q', s.filter_json.q)
    if (s.filter_json.category) q.set('category', s.filter_json.category)
    if (s.filter_json.city) q.set('city', s.filter_json.city)
    if (s.filter_json.radius_mi) q.set('radius', String(s.filter_json.radius_mi))
    if (s.filter_json.free_only) q.set('free', '1')
    if (Array.isArray(s.filter_json.tags) && s.filter_json.tags.length > 0) {
      // Multi-value param: ?tags=a&tags=b
      for (const t of s.filter_json.tags) q.append('tags', t)
    }
    router.push(`/dashboard?${q.toString()}`)
  }

  if (!user) return null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Saved Searches</h2>
        <Link
          href="/dashboard"
          style={{ padding: '8px 14px', borderRadius: 10, background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
        >
          New search
        </Link>
      </div>

      <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
        Save an activity filter to catch new matches. Results show up in your{' '}
        <Link href="/dashboard/feed" style={{ color: '#3293CB', fontWeight: 600 }}>Feed</Link>.
        Toggle notifications to get pinged when a new match is posted.
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🔍</p>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>No saved searches yet</p>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
            Run a search on Explore and tap &ldquo;Save this search&rdquo; to start tracking new matches here.
          </p>
          <Link href="/dashboard" style={{ display: 'inline-block', padding: '10px 16px', borderRadius: 12, background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Go to Explore
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(s => (
            <div key={s.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{s.name}</p>
                  <p style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>{describeFilter(s.filter_json)}</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4B5563', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={s.notify_new}
                    onChange={() => toggleNotify(s)}
                    style={{ cursor: 'pointer' }}
                  />
                  Notify me
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => runSearch(s)}
                  style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #3293CB', background: '#EFF6FF', color: '#3293CB', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Run now
                </button>
                <button
                  onClick={() => remove(s)}
                  style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #FECACA', background: '#fff', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
