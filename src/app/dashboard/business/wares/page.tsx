'use client'

// Business wares (products / services) editor.
//
// CRUD list view; per-row inline editor opens an in-flow card. Image
// upload via the shared ImageUploader. Reordering via ▲▼ buttons —
// keeps the surface area small; can upgrade to drag-handle later.
//
// Owners only — RLS in business_wares.business_wares_owner_all enforces
// that only the owner of the parent business_profile can write.

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'
import { BUSINESS_FEATURE_ENABLED } from '@/lib/business'
import ImageUploader from '@/components/business/ImageUploader'

type WareKind = 'product' | 'link'

type Ware = {
  id: string
  business_id: string
  kind: WareKind
  title: string
  description: string
  image_url: string
  price_text: string
  payment_link: string
  in_stock: boolean
  sort_order: number
}

const EMPTY_DRAFT: Omit<Ware, 'id' | 'business_id' | 'sort_order'> = {
  kind: 'product',
  title: '',
  description: '',
  image_url: '',
  price_text: '',
  payment_link: '',
  in_stock: true,
}

export default function WaresPage() {
  return (
    <Suspense fallback={<p style={{ color: '#6b7280' }}>Loading…</p>}>
      <WaresPageInner />
    </Suspense>
  )
}

function WaresPageInner() {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const searchParams = useSearchParams()
  const requestedBizId = searchParams.get('b')

  const [bizId, setBizId] = useState<string | null>(null)
  const [bizName, setBizName] = useState<string>('')
  const [wares, setWares] = useState<Ware[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      // Pick the requested business by ?b=<id>, OR fall back to the
      // user's most recent business if no param. Verify the user owns
      // it (RLS will reject the query anyway, but UX is nicer).
      let bizQ = supabase
        .from('business_profiles')
        .select('id, name')
        .eq('user_id', user.id)
      if (requestedBizId) bizQ = bizQ.eq('id', requestedBizId)
      const { data: bizList } = await bizQ.order('created_at', { ascending: false }).limit(1)
      const biz = bizList && bizList.length > 0 ? bizList[0] : null
      if (!biz) { setLoading(false); return }
      setBizId(biz.id); setBizName(biz.name)
      const { data: w } = await supabase
        .from('business_wares')
        .select('*')
        .eq('business_id', biz.id)
        .order('sort_order', { ascending: true })
      setWares((w as Ware[]) || [])
      setLoading(false)
    })()
  }, [user, requestedBizId])

  function startNew() {
    setDraft(EMPTY_DRAFT)
    setEditingId('new')
  }
  function startEdit(w: Ware) {
    setDraft({
      kind: w.kind || 'product',
      title: w.title, description: w.description, image_url: w.image_url,
      price_text: w.price_text, payment_link: w.payment_link, in_stock: w.in_stock,
    })
    setEditingId(w.id)
  }
  function cancelEdit() {
    setEditingId(null); setDraft(EMPTY_DRAFT)
  }

  async function save() {
    if (!bizId) { toastError('No business found.'); return }
    if (!draft.title.trim()) { toastError('Title is required.'); return }
    if (draft.kind === 'link' && !draft.payment_link.trim()) {
      toastError('Link wares need a URL.'); return
    }
    setSaving(true)
    if (editingId === 'new') {
      const nextOrder = wares.length === 0 ? 0 : (wares[wares.length - 1].sort_order + 1)
      const { data, error } = await supabase.from('business_wares').insert({
        business_id: bizId,
        sort_order: nextOrder,
        ...draft,
      }).select().single()
      setSaving(false)
      if (error) { toastError('Add failed: ' + error.message); return }
      setWares((prev) => [...prev, data as Ware])
      success('Ware added.')
    } else if (editingId) {
      const { error } = await supabase.from('business_wares').update(draft).eq('id', editingId)
      setSaving(false)
      if (error) { toastError('Save failed: ' + error.message); return }
      setWares((prev) => prev.map((w) => w.id === editingId ? { ...w, ...draft } : w))
      success('Ware saved.')
    }
    cancelEdit()
  }

  async function remove(id: string) {
    if (!confirm('Delete this ware? This cannot be undone.')) return
    const { error } = await supabase.from('business_wares').delete().eq('id', id)
    if (error) { toastError('Delete failed: ' + error.message); return }
    setWares((prev) => prev.filter((w) => w.id !== id))
  }

  async function move(idx: number, delta: -1 | 1) {
    const targetIdx = idx + delta
    if (targetIdx < 0 || targetIdx >= wares.length) return
    const a = wares[idx], b = wares[targetIdx]
    // Swap sort_order values via two updates (cheap, atomic enough for this use)
    const { error: e1 } = await supabase.from('business_wares').update({ sort_order: b.sort_order }).eq('id', a.id)
    const { error: e2 } = await supabase.from('business_wares').update({ sort_order: a.sort_order }).eq('id', b.id)
    if (e1 || e2) { toastError('Reorder failed.'); return }
    setWares((prev) => {
      const next = [...prev]
      const [moved] = next.splice(idx, 1)
      next.splice(targetIdx, 0, moved)
      // Mirror the sort_order swap so future moves work from the displayed order
      moved.sort_order = b.sort_order
      next[idx].sort_order = a.sort_order
      return next
    })
  }

  async function toggleStock(w: Ware) {
    const { error } = await supabase.from('business_wares').update({ in_stock: !w.in_stock }).eq('id', w.id)
    if (error) { toastError('Update failed: ' + error.message); return }
    setWares((prev) => prev.map((x) => x.id === w.id ? { ...x, in_stock: !x.in_stock } : x))
  }

  if (!BUSINESS_FEATURE_ENABLED) {
    return (
      <div style={{ padding: 40, color: '#6b7280' }}>
        Business module is currently disabled. Set <code>NEXT_PUBLIC_FEATURE_BUSINESS=1</code> in your environment.
      </div>
    )
  }
  if (loading) return <p style={{ color: '#6b7280' }}>Loading…</p>
  if (!bizId) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
      <p>You don&apos;t have a business yet.</p>
      <Link href="/dashboard/business" style={{ color: '#3293cb', fontWeight: 700 }}>Create your business →</Link>
    </div>
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 4px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Link href={bizId ? `/dashboard/business?id=${bizId}` : '/dashboard/business'} style={{ color: '#3293cb', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>← Back</Link>
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
        Wares {bizName && <span style={{ color: '#6b7280', fontWeight: 600 }}>· {bizName}</span>}
      </h1>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 22 }}>
        Add the products and services you sell. Each ware shows on your public business page with a
        Buy / Inquire button that links to the payment URL you set (or the business default).
      </p>

      <button onClick={startNew} disabled={editingId !== null} style={{ ...btnPrimary, marginBottom: 16 }}>
        + Add ware
      </button>

      {editingId === 'new' && (
        <DraftCard
          draft={draft} setDraft={setDraft}
          onSave={save} onCancel={cancelEdit} saving={saving}
          submitLabel="Add ware"
        />
      )}

      {wares.length === 0 && editingId !== 'new' ? (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: 40, textAlign: 'center', color: '#6b7280' }}>
          No wares yet. Add your first product or service above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {wares.map((w, i) => (
            <div key={w.id}>
              {editingId === w.id ? (
                <DraftCard
                  draft={draft} setDraft={setDraft}
                  onSave={save} onCancel={cancelEdit} saving={saving}
                  submitLabel="Save changes"
                />
              ) : (
                <article style={{ display: 'flex', gap: 12, padding: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, opacity: (w.kind === 'link' || w.in_stock) ? 1 : 0.55 }}>
                  {/* Thumb */}
                  <div style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 11 }}>
                    {w.image_url ? <img src={w.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (w.kind === 'link' ? '🔗' : 'No img')}
                  </div>
                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
                      {w.kind === 'link' && <span style={{ fontSize: 10, fontWeight: 800, color: '#0652b7', background: '#eff6ff', padding: '1px 6px', borderRadius: 4, marginRight: 6 }}>LINK</span>}
                      {w.title}
                    </p>
                    {w.kind === 'link' && w.payment_link && (
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {w.payment_link.replace(/^https?:\/\//, '')}
                      </p>
                    )}
                    {w.kind !== 'link' && w.price_text && <p style={{ fontSize: 13, color: '#3293cb', fontWeight: 700, margin: '2px 0' }}>{w.price_text}</p>}
                    {w.kind !== 'link' && w.description && <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{w.description}</p>}
                    {w.kind !== 'link' && !w.in_stock && <span style={{ fontSize: 10, fontWeight: 800, color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: 6 }}>OUT OF STOCK</span>}
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => move(i, -1)} disabled={i === 0} style={iconBtn} aria-label="Move up">▲</button>
                      <button onClick={() => move(i, +1)} disabled={i === wares.length - 1} style={iconBtn} aria-label="Move down">▼</button>
                    </div>
                    <button onClick={() => startEdit(w)} style={{ ...iconBtn, width: 'auto', padding: '4px 10px' }}>Edit</button>
                    <button onClick={() => toggleStock(w)} style={{ ...iconBtn, width: 'auto', padding: '4px 10px' }}>
                      {w.in_stock ? 'Mark out' : 'Mark in'}
                    </button>
                    <button onClick={() => remove(w.id)} style={{ ...iconBtn, width: 'auto', padding: '4px 10px', color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}>Delete</button>
                  </div>
                </article>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DraftCard({
  draft, setDraft, onSave, onCancel, saving, submitLabel,
}: {
  draft: Omit<Ware, 'id' | 'business_id' | 'sort_order'>
  setDraft: (d: Omit<Ware, 'id' | 'business_id' | 'sort_order'>) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  submitLabel: string
}) {
  const isLink = draft.kind === 'link'
  return (
    <div style={{ background: '#fff', border: '2px solid #3293cb', borderRadius: 14, padding: 16, marginBottom: 8 }}>
      {/* Kind toggle — Product or Link. Link mode hides fields that
          don't apply (price, description, in-stock) so the form
          collapses to the minimum: title + URL + optional image. */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, padding: 4, background: '#f3f4f6', borderRadius: 10 }}>
        {([
          { id: 'product' as const, label: 'Product / service', emoji: '🛍️', help: 'Image, price, description, Buy button.' },
          { id: 'link' as const,    label: 'Link',              emoji: '🔗', help: 'Just a title + URL. Card opens the link.' },
        ]).map((k) => {
          const active = draft.kind === k.id
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => setDraft({ ...draft, kind: k.id })}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, border: 'none',
                background: active ? '#fff' : 'transparent',
                color: active ? '#111827' : '#6b7280',
                fontSize: 12, fontWeight: 800, cursor: 'pointer',
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                textAlign: 'left',
              }}
            >
              <div>{k.emoji} {k.label}</div>
              <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2, color: active ? '#6b7280' : '#9ca3af' }}>{k.help}</div>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {/* Image — optional in BOTH modes */}
        <ImageUploader
          value={draft.image_url}
          onChange={(url) => setDraft({ ...draft, image_url: url })}
          purpose="ware"
          label={isLink ? 'Image (optional)' : 'Image'}
          square
          squareSize={140}
          squareRounded="md"
        />

        {/* Title — required in both */}
        <Field label="Title *">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={120} style={input} />
        </Field>

        {/* Link mode: URL is the primary field, required */}
        {isLink ? (
          <Field label="Link URL *" hint="Where this card sends visitors when tapped.">
            <input
              value={draft.payment_link}
              onChange={(e) => setDraft({ ...draft, payment_link: e.target.value })}
              placeholder="https://..."
              style={input}
            />
          </Field>
        ) : (
          <>
            <Field label="Price (optional)" hint='e.g. "$20", "₦15,000", "Contact for quote"'>
              <input value={draft.price_text} onChange={(e) => setDraft({ ...draft, price_text: e.target.value })} maxLength={60} style={input} />
            </Field>
            <Field label="Description (optional)">
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={600} rows={3} style={{ ...input, resize: 'vertical' }} />
            </Field>
            <Field label="Payment / order link (optional)" hint="Override the business default for this ware. Leave blank to use the default.">
              <input value={draft.payment_link} onChange={(e) => setDraft({ ...draft, payment_link: e.target.value })} placeholder="https://..." style={input} />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#111827', cursor: 'pointer' }}>
              <input type="checkbox" checked={draft.in_stock} onChange={(e) => setDraft({ ...draft, in_stock: e.target.checked })} />
              In stock (visible on public page)
            </label>
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={onSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button onClick={onCancel} style={btnSecondary}>Cancel</button>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 700, color: '#111827', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

const input: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#111827' }
const btnPrimary: React.CSSProperties = { padding: '10px 16px', borderRadius: 10, border: 'none', background: '#3293cb', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { padding: '10px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#111827', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const iconBtn: React.CSSProperties = { width: 28, height: 24, padding: 0, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }
