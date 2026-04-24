'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'

// Short-text post composer. Posts go into the `posts` table and appear in the
// Feed of anyone who follows the author (visibility='public' or 'followers')
// or is an active Ally (visibility='allies').
export default function PostComposer({ onPosted }: { onPosted?: () => void }) {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'allies'>('public')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  if (!user) return null
  const remaining = 2000 - body.length

  async function submit() {
    const text = body.trim()
    if (!text || busy) return
    setBusy(true)
    try {
      const { error } = await supabase.from('posts').insert({
        user_id: user!.id,
        body: text,
        visibility,
      })
      if (error) throw error
      success('Posted')
      setBody('')
      setOpen(false)
      onPosted?.()
    } catch (e: any) {
      toastError(e?.message || 'Could not post')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%', marginBottom: 12, padding: '14px 16px',
          borderRadius: 16, border: '1px solid #E5E7EB', background: '#fff',
          color: '#6B7280', fontSize: 14, textAlign: 'left', cursor: 'pointer',
        }}
      >
        Share something with the people who follow you…
      </button>
    )
  }

  return (
    <div style={{ marginBottom: 12, padding: 14, borderRadius: 16, border: '1px solid #E5E7EB', background: '#fff' }}>
      <textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 2000))}
        placeholder="What's going on?"
        rows={4}
        style={{
          width: '100%', border: 'none', outline: 'none', resize: 'vertical',
          fontSize: 15, lineHeight: 1.5, fontFamily: 'inherit', color: '#111827',
          background: 'transparent',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as any)}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, fontWeight: 600, background: '#F9FAFB' }}
        >
          <option value="public">Public · anyone can see</option>
          <option value="followers">Followers only</option>
          <option value="allies">Allies only</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: remaining < 100 ? '#DC2626' : '#9CA3AF' }}>{remaining}</span>
          <button
            onClick={() => { setOpen(false); setBody('') }}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || body.trim().length === 0}
            style={{
              padding: '8px 14px', borderRadius: 10, border: 'none',
              background: body.trim().length ? '#3293CB' : '#9CA3AF',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: busy || !body.trim().length ? 'default' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
