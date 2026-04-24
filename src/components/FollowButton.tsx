'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'

// One-way follow. Users can follow without any acceptance; this powers the
// Feed (see /dashboard/feed). Separate from the mutual Ally link (user_contacts
// + link_requests) — following someone doesn't unlock DM.
export default function FollowButton({ targetUserId }: { targetUserId: string }) {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const [following, setFollowing] = useState<boolean | null>(null) // null = loading
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user || user.id === targetUserId) { setFollowing(false); return }
    let alive = true
    supabase
      .from('follows')
      .select('id', { head: true, count: 'exact' })
      .eq('follower_id', user.id)
      .eq('followed_id', targetUserId)
      .then(({ count, error }) => {
        if (!alive) return
        if (error) setFollowing(false)
        else setFollowing((count || 0) > 0)
      })
    return () => { alive = false }
  }, [user, targetUserId])

  // Hide when viewing your own profile
  if (!user || user.id === targetUserId) return null

  async function toggle() {
    if (!user || busy) return
    setBusy(true)
    try {
      if (following) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('followed_id', targetUserId)
        if (error) throw error
        setFollowing(false)
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, followed_id: targetUserId })
        if (error) throw error
        setFollowing(true)
        success('Following — their posts will show in your Feed')
      }
    } catch (e: any) {
      toastError(e?.message || 'Could not update follow')
    } finally {
      setBusy(false)
    }
  }

  const label = following === null ? '...' : following ? 'Following' : 'Follow'
  return (
    <button
      onClick={toggle}
      disabled={busy || following === null}
      style={{
        padding: '8px 16px',
        borderRadius: 12,
        border: following ? '1px solid #3293CB' : 'none',
        background: following ? '#EFF6FF' : '#3293CB',
        color: following ? '#3293CB' : '#fff',
        fontSize: 13,
        fontWeight: 600,
        cursor: busy ? 'default' : 'pointer',
        opacity: busy ? 0.6 : 1,
        minWidth: 96,
      }}
    >
      {label}
    </button>
  )
}
