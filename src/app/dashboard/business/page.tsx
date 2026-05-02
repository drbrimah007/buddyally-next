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

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'
import {
  BUSINESS_FEATURE_ENABLED,
  COLOR_PRESETS,
  DEFAULT_THEME,
  validateSlug,
  slugErrorMessage,
  businessUrl,
  type BusinessTheme,
  type BusinessTemplate,
  type ColorPreset,
} from '@/lib/business'

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
    status: 'draft',
    theme: DEFAULT_THEME,
    allow_indexing: false,
  })
  const [slugError, setSlugError] = useState<string>('')
  const [saving, setSaving] = useState(false)

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
    if (biz) {
      const { error } = await supabase.from('business_profiles').update({
        slug: form.slug,
        name: form.name,
        tagline: form.tagline,
        bio: form.bio,
        theme: form.theme,
        status: form.status,
      }).eq('id', biz.id)
      setSaving(false)
      if (error) { toastError('Save failed: ' + error.message); return }
      success('Saved.')
      setBiz({ ...biz, ...form, id: biz.id })
    } else {
      const { data, error } = await supabase.from('business_profiles').insert({
        user_id: user.id,
        slug: form.slug,
        name: form.name,
        tagline: form.tagline,
        bio: form.bio,
        theme: form.theme,
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
      <Field label="URL slug *" hint={`Public URL: buddyally.com/b/${form.slug || 'your-slug'}`}>
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
