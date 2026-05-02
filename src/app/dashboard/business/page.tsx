'use client'

// Business module — owner editor (Stage 1).
//
// Stage 1 = minimum lovable editor: create, name/slug/tagline/bio,
// template + color preset, draft↔published toggle, link to public page.
//
// Stage 2 will add: section drag-and-drop, live preview iframe, ware
// management (separate /dashboard/business/wares/page.tsx), image
// uploads.
//
// This page is feature-flagged via NEXT_PUBLIC_FEATURE_BUSINESS=1. The
// /dashboard sidebar link is also gated; without the flag the route is
// reachable by direct URL but not advertised anywhere.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'
import {
  BUSINESS_FEATURE_ENABLED,
  BUSINESS_CATEGORIES,
  COLOR_PRESETS,
  DEFAULT_THEME,
  MAX_CATEGORIES,
  validateSlug,
  slugErrorMessage,
  businessUrl,
  type BusinessTheme,
  type BusinessTemplate,
  type ColorPreset,
  type SectionConfig,
} from '@/lib/business'
import { searchPlaces as searchPlacesApi, pickPlace, renderPlaceLabel } from '@/lib/geo'

const TEMPLATES: { id: BusinessTemplate; label: string; vibe: string }[] = [
  { id: 'marketplace-bold', label: 'Marketplace Bold', vibe: 'Dark, large product grid' },
  { id: 'editorial',        label: 'Editorial',        vibe: 'Light, magazine typography' },
  { id: 'minimal',          label: 'Minimal',          vibe: 'White space, single column' },
  { id: 'portfolio',        label: 'Portfolio',        vibe: 'Image-led, designer-style' },
  { id: 'service-pro',      label: 'Service Pro',      vibe: 'Buttons + service cards' },
  { id: 'local-spot',       label: 'Local Spot',       vibe: 'Warm street energy' },
]

const PRESET_LABELS: Record<Exclude<ColorPreset, 'custom'>, string> = {
  'brand-ally':   'Brand Ally',
  'lagos-sunset': 'Lagos Sunset',
  'atlanta-cool': 'Atlanta Cool',
  'deep-forest':  'Deep Forest',
  'pastel-peach': 'Pastel Peach',
  'mono-white':   'Mono White',
  'mono-black':   'Mono Black',
  'royal-plum':   'Royal Plum',
  'sand-beige':   'Sand Beige',
}

type Biz = {
  id: string
  slug: string
  name: string
  tagline: string
  bio: string
  categories: string[]
  home_display_name: string
  home_lat: number | null
  home_lng: number | null
  home_country_code: string
  home_state_code: string
  status: 'draft' | 'published' | 'suspended'
  theme: BusinessTheme
  allow_indexing: boolean
}

export default function DashboardBusinessPage() {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()

  const [loading, setLoading] = useState(true)
  const [biz, setBiz] = useState<Biz | null>(null)
  const [form, setForm] = useState<Biz>({
    id: '',
    slug: '',
    name: '',
    tagline: '',
    bio: '',
    categories: [],
    home_display_name: '',
    home_lat: null,
    home_lng: null,
    home_country_code: '',
    home_state_code: '',
    status: 'draft',
    theme: DEFAULT_THEME,
    allow_indexing: false,
  })
  const [slugError, setSlugError] = useState<string>('')
  const [saving, setSaving] = useState(false)
  // Location picker — same UX pattern as the profile edit modal.
  const [locResults, setLocResults] = useState<any[]>([])
  const [showLocResults, setShowLocResults] = useState(false)
  const locBoxRef = useRef<HTMLDivElement>(null)
  const locTimer = useRef<any>(null)
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (locBoxRef.current && !locBoxRef.current.contains(e.target as Node)) setShowLocResults(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])
  function searchLoc(val: string) {
    setForm((f) => ({ ...f, home_display_name: val, home_lat: null, home_lng: null }))
    if (locTimer.current) clearTimeout(locTimer.current)
    if (!val || val.length < 2) { setLocResults([]); setShowLocResults(false); return }
    locTimer.current = setTimeout(async () => {
      const data = await searchPlacesApi(val, 8)
      setLocResults(data); setShowLocResults(data.length > 0)
    }, 300)
  }
  function selectLocPlace(place: any) {
    const pick = pickPlace(place)
    setForm((f) => ({
      ...f,
      home_display_name: pick.display,
      home_lat: pick.lat,
      home_lng: pick.lng,
      home_state_code: pick.stateCode,
      home_country_code: (place?.address?.country_code || '').toLowerCase() || '',
    }))
    setLocResults([]); setShowLocResults(false)
  }
  function toggleCategory(id: string) {
    setForm((f) => {
      const has = f.categories.includes(id)
      if (has) return { ...f, categories: f.categories.filter((c) => c !== id) }
      if (f.categories.length >= MAX_CATEGORIES) return f
      return { ...f, categories: [...f.categories, id] }
    })
  }

  // Load existing business (if any) for this user
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) {
        const loaded: Biz = {
          id: data.id,
          slug: data.slug,
          name: data.name,
          tagline: data.tagline || '',
          bio: data.bio || '',
          categories: Array.isArray(data.categories) ? data.categories : [],
          home_display_name: data.home_display_name || '',
          home_lat: data.home_lat ?? null,
          home_lng: data.home_lng ?? null,
          home_country_code: data.home_country_code || '',
          home_state_code: data.home_state_code || '',
          status: data.status,
          theme: (data.theme as BusinessTheme) || DEFAULT_THEME,
          allow_indexing: !!data.allow_indexing,
        }
        setBiz(loaded)
        setForm(loaded)
      }
      setLoading(false)
    })()
  }, [user])

  function updateField<K extends keyof Biz>(key: K, value: Biz[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function updateTheme(patch: Partial<BusinessTheme>) {
    setForm((f) => ({ ...f, theme: { ...f.theme, ...patch } }))
  }
  function updateColorPreset(preset: ColorPreset) {
    updateTheme({ colors: { ...form.theme.colors, preset } })
  }

  // Slug live-validation (also debounce-checks uniqueness when valid)
  useEffect(() => {
    if (!form.slug) { setSlugError(''); return }
    const err = validateSlug(form.slug)
    if (err) { setSlugError(slugErrorMessage(err)); return }
    // Already mine? skip uniqueness check
    if (biz && biz.slug === form.slug) { setSlugError(''); return }
    let cancelled = false
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('slug', form.slug)
        .maybeSingle()
      if (!cancelled) setSlugError(data ? 'That slug is taken.' : '')
    }, 350)
    return () => { cancelled = true; clearTimeout(t) }
  }, [form.slug, biz])

  async function save() {
    if (!user) return
    if (!form.slug || !form.name) { toastError('Slug and name are required.'); return }
    if (slugError) { toastError(slugError); return }
    setSaving(true)
    const writePayload = {
      slug: form.slug,
      name: form.name,
      tagline: form.tagline,
      bio: form.bio,
      categories: form.categories,
      home_display_name: form.home_display_name || null,
      home_lat: form.home_lat,
      home_lng: form.home_lng,
      home_country_code: form.home_country_code || null,
      home_state_code: form.home_state_code || null,
      theme: form.theme,
    }
    if (biz) {
      const { error } = await supabase.from('business_profiles').update({
        ...writePayload,
        status: form.status,
      }).eq('id', biz.id)
      setSaving(false)
      if (error) { toastError('Save failed: ' + error.message); return }
      success('Saved.')
      setBiz({ ...biz, ...form, id: biz.id })
    } else {
      const { data, error } = await supabase.from('business_profiles').insert({
        user_id: user.id,
        ...writePayload,
        status: 'draft',
      }).select().single()
      setSaving(false)
      if (error) { toastError('Create failed: ' + error.message); return }
      success('Business created.')
      const loaded: Biz = {
        id: data.id,
        slug: data.slug,
        name: data.name,
        tagline: data.tagline || '',
        bio: data.bio || '',
        categories: Array.isArray(data.categories) ? data.categories : [],
        home_display_name: data.home_display_name || '',
        home_lat: data.home_lat ?? null,
        home_lng: data.home_lng ?? null,
        home_country_code: data.home_country_code || '',
        home_state_code: data.home_state_code || '',
        status: data.status,
        theme: (data.theme as BusinessTheme) || DEFAULT_THEME,
        allow_indexing: !!data.allow_indexing,
      }
      setBiz(loaded); setForm(loaded)
    }
  }

  async function togglePublish() {
    if (!biz) return
    const next = biz.status === 'published' ? 'draft' : 'published'
    const { error } = await supabase.from('business_profiles')
      .update({ status: next })
      .eq('id', biz.id)
    if (error) { toastError('Status change failed: ' + error.message); return }
    setBiz({ ...biz, status: next })
    setForm({ ...form, status: next })
    success(next === 'published' ? 'Published.' : 'Reverted to draft.')
  }

  if (!BUSINESS_FEATURE_ENABLED) {
    return (
      <div style={{ padding: 40, color: '#6b7280' }}>
        Business pages are currently disabled. Set <code>NEXT_PUBLIC_FEATURE_BUSINESS=1</code> in your environment to enable.
      </div>
    )
  }
  if (loading) return <p style={{ color: '#6b7280' }}>Loading…</p>

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 4px 80px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
        {biz ? 'Your business page' : 'Create your business page'}
      </h1>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 22 }}>
        Set up a public storefront for your wares, services, or work. Payments
        happen on your own channels (WhatsApp, payment links, etc.) — BuddyAlly
        just helps people find you.
      </p>

      {biz && (
        <div style={pill}>
          <span style={{ ...pillLabel, color: biz.status === 'published' ? '#065f46' : '#92400e', background: biz.status === 'published' ? '#d1fae5' : '#fef3c7' }}>
            {biz.status.toUpperCase()}
          </span>
          {biz.status === 'published' && (
            <Link href={businessUrl(biz.slug)} style={link} target="_blank">View live →</Link>
          )}
          <button onClick={togglePublish} style={{ ...btnSecondary, marginLeft: 'auto' }}>
            {biz.status === 'published' ? 'Revert to draft' : 'Publish'}
          </button>
        </div>
      )}

      {/* Slug */}
      <Field label="URL slug *" hint={`Public URL: buddyally.com/${form.slug || 'your-slug'}`}>
        <input
          value={form.slug}
          onChange={(e) => updateField('slug', e.target.value.toLowerCase())}
          placeholder="yourbiz"
          style={input}
        />
        {slugError && <p style={errText}>{slugError}</p>}
      </Field>

      {/* Name */}
      <Field label="Business name *">
        <input value={form.name} onChange={(e) => updateField('name', e.target.value)} maxLength={80} style={input} />
      </Field>

      {/* Tagline */}
      <Field label="Tagline" hint="One line shown under your business name.">
        <input value={form.tagline} onChange={(e) => updateField('tagline', e.target.value)} maxLength={120} style={input} />
      </Field>

      {/* Bio */}
      <Field label="About" hint="A few sentences about what you do.">
        <textarea value={form.bio} onChange={(e) => updateField('bio', e.target.value)} maxLength={1500} rows={5} style={{ ...input, resize: 'vertical' }} />
      </Field>

      {/* Template */}
      <Field label="Template">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {TEMPLATES.map((t) => {
            const selected = form.theme.template === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => updateTheme({ template: t.id })}
                style={{
                  padding: 14, borderRadius: 12, textAlign: 'left',
                  border: `2px solid ${selected ? '#3293cb' : '#e5e7eb'}`,
                  background: selected ? '#eff6ff' : '#fff',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{t.label}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{t.vibe}</div>
              </button>
            )
          })}
        </div>
      </Field>

      {/* Color preset */}
      <Field label="Color">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {(Object.keys(COLOR_PRESETS) as Array<keyof typeof COLOR_PRESETS>).map((preset) => {
            const c = COLOR_PRESETS[preset]
            const selected = form.theme.colors.preset === preset
            return (
              <button
                key={preset}
                type="button"
                onClick={() => updateColorPreset(preset)}
                style={{
                  padding: 10, borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${selected ? '#111827' : '#e5e7eb'}`,
                  background: '#fff', display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: c.bg, border: '1px solid rgba(0,0,0,0.1)' }} />
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: c.primary, marginLeft: -6, border: '1px solid rgba(0,0,0,0.1)' }} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{PRESET_LABELS[preset]}</span>
              </button>
            )
          })}
        </div>
      </Field>

      {/* Categories — chip selector, max MAX_CATEGORIES picks */}
      <Field label={`Categories (pick up to ${MAX_CATEGORIES})`} hint={`Used by the public directory and "near you" search.`}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {BUSINESS_CATEGORIES.map((c) => {
            const selected = form.categories.includes(c.id)
            const disabled = !selected && form.categories.length >= MAX_CATEGORIES
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.id)}
                disabled={disabled}
                style={{
                  padding: '8px 14px', borderRadius: 999,
                  border: `1.5px solid ${selected ? '#3293cb' : '#e5e7eb'}`,
                  background: selected ? '#eff6ff' : '#fff',
                  color: selected ? '#0652b7' : '#111827',
                  fontSize: 13, fontWeight: 700,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.4 : 1,
                }}
              >
                {c.emoji} {c.label}
              </button>
            )
          })}
        </div>
      </Field>

      {/* Location — same picker pattern as profile edit, must come from list */}
      <Field label="Business location" hint="Pick a real city / area so your business appears in 'near you' searches. Leave blank if you're online-only.">
        <div ref={locBoxRef} style={{ position: 'relative' }}>
          <input
            value={form.home_display_name}
            onChange={(e) => searchLoc(e.target.value)}
            onFocus={() => locResults.length > 0 && setShowLocResults(true)}
            placeholder="Search a city, neighborhood, or borough…"
            style={input}
            autoComplete="off"
          />
          {showLocResults && locResults.length > 0 && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 10px 25px -3px rgba(0,0,0,0.15)', zIndex: 30, maxHeight: 240, overflowY: 'auto' }}>
              {locResults.map((p: any, i: number) => {
                const lbl = renderPlaceLabel(p)
                return (
                  <div
                    key={i}
                    onClick={() => selectLocPlace(p)}
                    style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: '#111827' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                  >
                    <div style={{ fontWeight: 600 }}>{lbl.primary}</div>
                    {lbl.secondary && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{lbl.secondary}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {form.home_lat != null && form.home_lng != null
          ? <p style={{ fontSize: 12, color: '#059669', marginTop: 6, fontWeight: 600 }}>✓ Pinned for distance search.</p>
          : form.home_display_name
            ? <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>Pick a suggestion above to enable &ldquo;near you&rdquo; filtering.</p>
            : null}
      </Field>

      {/* Section builder — drag to reorder, toggle on/off. Native HTML5
          drag (no library) — the dragged section index updates form state
          and the public renderer iterates theme.sections in order. */}
      <Field label="Page sections" hint="Drag the handle to reorder. Toggle to show/hide on your public page.">
        <SectionBuilder
          sections={form.theme.sections}
          onChange={(next) => updateTheme({ sections: next })}
        />
      </Field>

      {/* Save */}
      <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
        <button onClick={save} disabled={saving || !!slugError} style={{ ...btnPrimary, opacity: saving || slugError ? 0.6 : 1 }}>
          {saving ? 'Saving…' : biz ? 'Save changes' : 'Create business page'}
        </button>
        {biz && (
          <Link href={businessUrl(biz.slug)} target="_blank" style={btnSecondary}>
            Preview
          </Link>
        )}
      </div>

      <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 24 }}>
        Stage 1: name, theme, color, status. Coming next: section drag-and-drop, live preview, wares editor, image uploads.
      </p>
    </div>
  )
}

// Section drag-and-drop reorder + on/off toggle.
//
// Uses native HTML5 drag — no library, ~0 KB extra bundle. Each section
// row carries a draggable handle on the left. dragStart records the
// source index; dragOver computes the target index and reorders form
// state on drop. Touch-friendly fallback: also exposes ▲/▼ arrows for
// devices without drag support (mobile mostly).
function SectionBuilder({
  sections,
  onChange,
}: {
  sections: SectionConfig[]
  onChange: (next: SectionConfig[]) => void
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= sections.length || to >= sections.length) return
    const next = [...sections]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }
  function toggle(idx: number) {
    const next = sections.map((s, i) => (i === idx ? { ...s, on: !s.on } : s))
    onChange(next)
  }
  function move(idx: number, delta: -1 | 1) {
    reorder(idx, idx + delta)
  }

  const labels: Record<string, { label: string; help: string }> = {
    hero:         { label: 'Hero',         help: 'Logo, business name, tagline.' },
    wares:        { label: 'Wares grid',   help: 'Your products/services.' },
    about:        { label: 'About',        help: 'Long-form bio.' },
    contact:      { label: 'Contact',      help: 'WhatsApp, IG, email buttons.' },
    testimonials: { label: 'Testimonials', help: 'Customer reviews. (Coming soon.)' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {sections.map((s, i) => {
        const meta = labels[s.id] || { label: s.id, help: '' }
        const isDragOver = dragIdx !== null && dragIdx !== i
        return (
          <div
            key={s.id}
            draggable
            onDragStart={(e) => {
              setDragIdx(i)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
            onDrop={(e) => {
              e.preventDefault()
              if (dragIdx !== null) reorder(dragIdx, i)
              setDragIdx(null)
            }}
            onDragEnd={() => setDragIdx(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', background: '#fff',
              border: `1.5px solid ${isDragOver ? '#3293cb' : '#e5e7eb'}`,
              borderRadius: 12,
              opacity: dragIdx === i ? 0.4 : 1,
              cursor: 'grab',
            }}
          >
            {/* Drag handle */}
            <span aria-hidden style={{ color: '#9ca3af', fontSize: 18, lineHeight: 1, cursor: 'grab', userSelect: 'none' }}>⠿</span>

            {/* Label */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{meta.label}</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{meta.help}</p>
            </div>

            {/* Mobile-friendly up/down (drag is desktop-mostly) */}
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} style={arrowBtn} aria-label="Move up">▲</button>
            <button type="button" onClick={() => move(i, +1)} disabled={i === sections.length - 1} style={arrowBtn} aria-label="Move down">▼</button>

            {/* On/off toggle */}
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-pressed={s.on}
              style={{
                width: 40, height: 22, borderRadius: 999, border: 'none',
                background: s.on ? '#3293cb' : '#d1d5db',
                position: 'relative', cursor: 'pointer', flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: s.on ? 20 : 2,
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s',
              }} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

const arrowBtn: React.CSSProperties = {
  width: 24, height: 24, padding: 0, borderRadius: 6,
  border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280',
  fontSize: 9, cursor: 'pointer', flexShrink: 0,
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 18 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: '#111827', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

const input: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: '#111827' }
const errText: React.CSSProperties = { fontSize: 12, color: '#dc2626', marginTop: 4 }
const link: React.CSSProperties = { color: '#3293cb', fontWeight: 700, fontSize: 13, textDecoration: 'none' }
const btnPrimary: React.CSSProperties = { padding: '12px 20px', borderRadius: 10, border: 'none', background: '#3293cb', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { padding: '10px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#111827', fontWeight: 700, fontSize: 13, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }
const pill: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 22 }
const pillLabel: React.CSSProperties = { fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, letterSpacing: '0.06em' }
