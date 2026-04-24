'use client'

// "Save this search" inline button. Drop it next to any activity filter UI
// and pass the current filter shape. Opens a tiny name prompt, persists to
// saved_searches, then offers a link to the /dashboard/saved-searches list.

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'

type Filter = {
  q?: string
  category?: string
  city?: string
  radius_mi?: number
  free_only?: boolean
  date_from?: string
  date_to?: string
  tags?: string[]   // canonical tags (see /src/lib/categories.ts)
}

function suggestName(f: Filter): string {
  const bits: string[] = []
  if (f.q) bits.push(f.q)
  if (f.category) bits.push(f.category)
  if (f.city) bits.push(f.city)
  if (bits.length === 0) return 'All activities'
  return bits.slice(0, 3).join(' · ')
}

export default function SaveSearchButton({ filter }: { filter: Filter }) {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!user) return null

  async function save() {
    const finalName = (name || suggestName(filter)).slice(0, 80).trim()
    if (!finalName) return
    setBusy(true)
    try {
      const { error } = await supabase.from('saved_searches').insert({
        user_id: user!.id,
        name: finalName,
        filter_json: filter,
        notify_new: true,
      })
      if (error) throw error
      success('Saved — we\'ll surface new matches in your Feed')
      setSaved(true)
      setOpen(false)
      setName('')
    } catch (e: any) {
      toastError(e?.message || 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          onClick={() => { setSaved(false); setOpen(true); setName(suggestName(filter)) }}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #3293CB', background: '#EFF6FF', color: '#3293CB', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          title="Save this search to your Feed"
        >
          + Save search
        </button>
        {saved && (
          <Link href="/dashboard/saved-searches" style={{ fontSize: 12, color: '#059669', fontWeight: 600, textDecoration: 'none' }}>
            ✓ View all
          </Link>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 80))}
        onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') setOpen(false) }}
        placeholder="Name this search"
        style={{ height: 36, minWidth: 160, borderRadius: 10, border: '1px solid #3293CB', padding: '0 10px', fontSize: 13, background: '#fff', color: '#111827' }}
      />
      <button
        onClick={save}
        disabled={busy}
        style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontSize: 12, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
      >
        {busy ? 'Saving…' : 'Save'}
      </button>
      <button
        onClick={() => setOpen(false)}
        style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
      >
        Cancel
      </button>
    </div>
  )
}
