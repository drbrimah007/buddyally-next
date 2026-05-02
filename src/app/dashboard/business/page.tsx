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

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'
import {
  AVAILABILITY_STATES,
  BUSINESS_FEATURE_ENABLED,
  BUSINESS_CATEGORIES,
  BIZALLY_ACCENT,
  COLOR_PRESETS,
  DEFAULT_THEME,
  FONT_PRESETS,
  MAX_CATEGORIES,
  availabilityMeta,
  validateSlug,
  slugErrorMessage,
  businessUrl,
  type AvailabilityState,
  type BusinessTheme,
  type BusinessTemplate,
  type ColorPreset,
  type FontFamily,
  type SectionConfig,
} from '@/lib/business'
import { searchPlaces as searchPlacesApi, pickPlace, renderPlaceLabel } from '@/lib/geo'
import ImageUploader from '@/components/business/ImageUploader'

type PaymentLink = { label: string; url: string; type?: string }
type ContactMethods = {
  whatsapp?: string
  instagram?: string
  email?: string
  phone?: string
  web?: string
}

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
  cover_image_url: string
  logo_url: string
  contact_methods: ContactMethods
  default_payment_links: PaymentLink[]
  categories: string[]
  home_display_name: string
  home_lat: number | null
  home_lng: number | null
  home_country_code: string
  home_state_code: string
  availability_state: AvailabilityState
  status_message: string
  status_expires_at: string | null
  status: 'draft' | 'published' | 'suspended'
  theme: BusinessTheme
  allow_indexing: boolean
}

export default function DashboardBusinessPage() {
  return (
    <Suspense fallback={<p style={{ color: '#6b7280' }}>Loading…</p>}>
      <DashboardBusinessPageInner />
    </Suspense>
  )
}

function DashboardBusinessPageInner() {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedId = searchParams.get('id')

  const [loading, setLoading] = useState(true)
  const [allMyBusinesses, setAllMyBusinesses] = useState<{ id: string; name: string; status: string }[]>([])
  const [biz, setBiz] = useState<Biz | null>(null)
  const [dirty, setDirty] = useState(false)
  const [form, setForm] = useState<Biz>({
    id: '',
    slug: '',
    name: '',
    tagline: '',
    bio: '',
    cover_image_url: '',
    logo_url: '',
    contact_methods: {},
    default_payment_links: [],
    categories: [],
    home_display_name: '',
    home_lat: null,
    home_lng: null,
    home_country_code: '',
    home_state_code: '',
    availability_state: 'closed' as AvailabilityState,
    status_message: '',
    status_expires_at: null,
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

  // Load all of this user's businesses (for the switcher) plus the
  // currently-selected one. Selected = ?id=<uuid> if present, else
  // the most recent one. ?id=new clears form for create flow.
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data: list } = await supabase
        .from('business_profiles')
        .select('id, name, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setAllMyBusinesses((list as any) || [])

      if (requestedId === 'new') {
        setBiz(null); setLoading(false); return
      }

      const targetId = requestedId || (list && list.length > 0 ? list[0].id : null)
      if (!targetId) { setLoading(false); return }

      const { data } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', targetId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) {
        const loaded: Biz = {
          id: data.id,
          slug: data.slug,
          name: data.name,
          tagline: data.tagline || '',
          bio: data.bio || '',
          cover_image_url: data.cover_image_url || '',
          logo_url: data.logo_url || '',
          contact_methods: (data.contact_methods as ContactMethods) || {},
          default_payment_links: Array.isArray(data.default_payment_links) ? (data.default_payment_links as PaymentLink[]) : [],
          categories: Array.isArray(data.categories) ? data.categories : [],
          home_display_name: data.home_display_name || '',
          home_lat: data.home_lat ?? null,
          home_lng: data.home_lng ?? null,
          home_country_code: data.home_country_code || '',
          home_state_code: data.home_state_code || '',
          availability_state: (data.availability_state as AvailabilityState) || 'closed',
          status_message: data.status_message || '',
          status_expires_at: data.status_expires_at || null,
          status: data.status,
          theme: (data.theme as BusinessTheme) || DEFAULT_THEME,
          allow_indexing: !!data.allow_indexing,
        }
        setBiz(loaded)
        setForm(loaded)
        setDirty(false)
      }
      setLoading(false)
    })()
  }, [user, requestedId])

  function updateField<K extends keyof Biz>(key: K, value: Biz[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setDirty(true)
  }

  // Browser-level beforeunload warning (covers tab close, refresh).
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // Wrapper for the "Manage wares" link — confirms unsaved changes
  // before navigating away.
  function handleNavToWares() {
    if (dirty && !confirm('You have unsaved changes. Save them first, or discard and continue to wares?')) return
    if (biz) router.push(`/dashboard/business/wares?b=${biz.id}`)
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
      cover_image_url: form.cover_image_url,
      logo_url: form.logo_url,
      contact_methods: form.contact_methods,
      default_payment_links: form.default_payment_links,
      categories: form.categories,
      home_display_name: form.home_display_name || null,
      home_lat: form.home_lat,
      home_lng: form.home_lng,
      home_country_code: form.home_country_code || null,
      home_state_code: form.home_state_code || null,
      availability_state: form.availability_state,
      status_message: form.status_message || null,
      status_expires_at: form.status_expires_at,
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
      setDirty(false)
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
        cover_image_url: data.cover_image_url || '',
        logo_url: data.logo_url || '',
        contact_methods: (data.contact_methods as ContactMethods) || {},
        default_payment_links: Array.isArray(data.default_payment_links) ? (data.default_payment_links as PaymentLink[]) : [],
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
      setBiz(loaded); setForm(loaded); setDirty(false)
      // After create, jump URL to ?id=<newId> so the switcher reflects it
      router.replace(`/dashboard/business?id=${loaded.id}`)
      // Refresh switcher list
      const { data: list } = await supabase.from('business_profiles').select('id, name, status').eq('user_id', user.id).order('created_at', { ascending: false })
      setAllMyBusinesses((list as any) || [])
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
        {biz ? 'Edit business page' : 'Create business page'}
      </h1>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 18 }}>
        Set up a public storefront for your wares, services, or work. Payments
        happen on your own channels — BuddyAlly just helps people find you.
      </p>

      {/* Switcher — pick from existing or create another */}
      {allMyBusinesses.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 }}>
          {allMyBusinesses.map((b) => {
            const active = biz?.id === b.id
            return (
              <Link
                key={b.id}
                href={`/dashboard/business?id=${b.id}`}
                onClick={(e) => { if (dirty && !confirm('You have unsaved changes. Discard and switch?')) e.preventDefault() }}
                style={{
                  padding: '6px 12px', borderRadius: 999,
                  border: `1.5px solid ${active ? '#3293cb' : '#e5e7eb'}`,
                  background: active ? '#eff6ff' : '#fff',
                  color: active ? '#0652b7' : '#111827',
                  fontSize: 12, fontWeight: 700, textDecoration: 'none',
                  whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {b.name} <span style={{ fontSize: 10, opacity: 0.6 }}>· {b.status === 'published' ? '●' : '◌'}</span>
              </Link>
            )
          })}
          <Link
            href="/dashboard/business?id=new"
            onClick={(e) => { if (dirty && !confirm('You have unsaved changes. Discard and create new?')) e.preventDefault() }}
            style={{
              padding: '6px 12px', borderRadius: 999,
              border: '1.5px dashed #9ca3af',
              background: '#fff', color: '#374151',
              fontSize: 12, fontWeight: 700, textDecoration: 'none',
            }}
          >
            + New business
          </Link>
        </div>
      )}

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

      {/* QR code — once published, gives owners a one-tap shareable */}
      {biz && biz.status === 'published' && (
        <BusinessQRCard slug={biz.slug} name={biz.name} />
      )}

      {/* LIVE STATUS — heart of Bizally. Owner broadcasts what's
          happening RIGHT NOW. Drives placement in the live feed and
          colors the public page badge. Quick-toggle pills + a free
          message + an optional auto-revert time. */}
      {biz && (
        <LiveStatusBlock
          state={form.availability_state}
          message={form.status_message}
          expiresAt={form.status_expires_at}
          onChange={(patch) => {
            if ('state' in patch) updateField('availability_state', patch.state!)
            if ('message' in patch) updateField('status_message', patch.message ?? '')
            if ('expiresAt' in patch) updateField('status_expires_at', patch.expiresAt ?? null)
          }}
        />
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

      {/* Cover image */}
      <Field label="Cover image" hint="Wide banner shown on your business page header. JPEG/PNG, auto-compressed.">
        <ImageUploader
          value={form.cover_image_url}
          onChange={(url) => updateField('cover_image_url', url)}
          purpose="cover"
          aspect="16/9"
          maxHeight={180}
        />
      </Field>

      {/* Logo */}
      <Field label="Logo" hint="Square icon shown in the header and search results.">
        <ImageUploader
          value={form.logo_url}
          onChange={(url) => updateField('logo_url', url)}
          purpose="logo"
          aspect="1/1"
          maxHeight={120}
        />
      </Field>

      {/* Contact methods — drives the auto-rendered Contact section on
          the public page. Empty fields hide their button. WhatsApp uses
          wa.me/<digits>; we'll strip non-digits at render. */}
      <Field label="Contact methods" hint="Buttons for visitors to reach you. Leave any blank to hide.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <ContactInput
            label="WhatsApp number"
            placeholder="Your WhatsApp number"
            value={form.contact_methods.whatsapp || ''}
            onChange={(v) => updateField('contact_methods', { ...form.contact_methods, whatsapp: v })}
          />
          <ContactInput
            label="Instagram handle"
            placeholder="yinkaflakes"
            value={form.contact_methods.instagram || ''}
            onChange={(v) => updateField('contact_methods', { ...form.contact_methods, instagram: v.replace(/^@/, '') })}
          />
          <ContactInput
            label="Email"
            placeholder="hello@…"
            value={form.contact_methods.email || ''}
            onChange={(v) => updateField('contact_methods', { ...form.contact_methods, email: v })}
          />
          <ContactInput
            label="Phone"
            placeholder="Phone number"
            value={form.contact_methods.phone || ''}
            onChange={(v) => updateField('contact_methods', { ...form.contact_methods, phone: v })}
          />
          <ContactInput
            label="Website"
            placeholder="https://..."
            value={form.contact_methods.web || ''}
            onChange={(v) => updateField('contact_methods', { ...form.contact_methods, web: v })}
          />
        </div>
      </Field>

      {/* Default payment links — inherited by every ware unless that ware
          overrides. List of {label, url}. We don't validate the URL here
          beyond requiring non-empty — sellers may use payment-system
          links we don't know about (Flutterwave, Paystack, Wise, Stripe,
          PayPal, Cash App, even bank-transfer instruction pages). */}
      <Field label="Default payment / order links" hint="Buttons shown on each ware. Add your WhatsApp Pay, Stripe, PayPal — whatever you accept.">
        <PaymentLinksEditor
          links={form.default_payment_links}
          onChange={(next) => updateField('default_payment_links', next)}
        />
      </Field>

      {/* Wares link — separate route. Confirms unsaved changes first. */}
      {biz && (
        <Field label="Wares (products & services)" hint="Add what you sell.">
          <button
            type="button"
            onClick={handleNavToWares}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 12, border: 'none', background: '#3293cb', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Manage wares →
          </button>
        </Field>
      )}

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

      {/* Font picker — affects every text element on the public page */}
      <Field label="Font">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {(Object.keys(FONT_PRESETS) as FontFamily[]).map((f) => {
            const fp = FONT_PRESETS[f]
            const selected = (form.theme.font || 'sans') === f
            return (
              <button
                key={f}
                type="button"
                onClick={() => updateTheme({ font: f })}
                style={{
                  padding: 12, borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${selected ? '#3293cb' : '#e5e7eb'}`,
                  background: selected ? '#eff6ff' : '#fff',
                  textAlign: 'left',
                }}
              >
                <p style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: fp.cssStack, color: '#111827' }}>Aa</p>
                <p style={{ fontSize: 11, fontWeight: 700, color: selected ? '#0652b7' : '#6b7280', margin: '2px 0 0' }}>{fp.label}</p>
              </button>
            )
          })}
        </div>
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

// Live status block — Bizally's defining UI element.
//
// State pills (Open now / Available today / Taking requests / Closed)
// are the primary control. Below that, a free-text message ("Open
// until 5pm", "Taking 2 more orders today") that visitors actually
// read. Optional auto-revert lets sellers say "I'm open for the next
// 2 hours" without remembering to flip back to Closed.
//
// All edits push immediately to parent form state — this block is
// "live" but state still saves through the regular Save button to
// stay consistent with the rest of the editor.
function LiveStatusBlock({
  state, message, expiresAt, onChange,
}: {
  state: AvailabilityState
  message: string
  expiresAt: string | null
  onChange: (patch: { state?: AvailabilityState; message?: string; expiresAt?: string | null }) => void
}) {
  const meta = availabilityMeta(state)
  const live = state !== 'closed'

  function setExpiresInHours(h: number | null) {
    if (h == null) { onChange({ expiresAt: null }); return }
    const d = new Date(Date.now() + h * 3_600_000)
    onChange({ expiresAt: d.toISOString() })
  }

  return (
    <div style={{
      background: live ? `linear-gradient(135deg, ${meta.color}10 0%, ${meta.color}06 100%)` : '#f9fafb',
      border: `2px solid ${live ? meta.color : '#e5e7eb'}`,
      borderRadius: 18,
      padding: 16,
      marginBottom: 22,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>{meta.emoji}</span>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>Live status</h3>
        <span style={{ fontSize: 10, fontWeight: 800, color: meta.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {meta.chip}
        </span>
      </div>

      {/* State pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {AVAILABILITY_STATES.map((s) => {
          const active = s.id === state
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange({ state: s.id })}
              style={{
                padding: '7px 12px', borderRadius: 999,
                border: `1.5px solid ${active ? s.color : '#e5e7eb'}`,
                background: active ? s.color : '#fff',
                color: active ? '#fff' : '#111827',
                fontSize: 12, fontWeight: 800, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <span aria-hidden>{s.emoji}</span> {s.label}
            </button>
          )
        })}
      </div>

      {/* Status message */}
      <input
        value={message}
        onChange={(e) => onChange({ message: e.target.value })}
        placeholder={
          state === 'open' ? 'e.g. "Open until 5pm · Outdoor seating open"' :
          state === 'available_today' ? 'e.g. "3 spots open this afternoon"' :
          state === 'taking_requests' ? 'e.g. "Taking small jobs through Friday"' :
          'Status hidden when closed'
        }
        maxLength={120}
        disabled={!live}
        style={{
          width: '100%', padding: '10px 12px',
          border: '1.5px solid #e5e7eb', borderRadius: 10,
          fontSize: 14, color: '#111827',
          opacity: live ? 1 : 0.5,
          marginBottom: 10,
        }}
      />

      {/* Auto-revert pills */}
      {live && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginRight: 4 }}>Auto-close in:</span>
          {[
            { h: 1, label: '1 hr' },
            { h: 4, label: '4 hrs' },
            { h: 8, label: 'End of day' },
            { h: null, label: 'Never' },
          ].map((opt) => {
            const active = opt.h == null ? !expiresAt : expiresAt && Math.abs(new Date(expiresAt).getTime() - Date.now() - opt.h * 3_600_000) < 60_000
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => setExpiresInHours(opt.h)}
                style={{
                  padding: '4px 10px', borderRadius: 999,
                  border: `1px solid ${active ? '#3293cb' : '#e5e7eb'}`,
                  background: active ? '#eff6ff' : '#fff',
                  color: active ? '#0652b7' : '#374151',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            )
          })}
          {expiresAt && (
            <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>
              → flips to Closed at {new Date(expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Cute QR card — shows a download-able / share-able QR code for the
// public business URL. Uses qrserver.com (zero deps, free, no API key)
// to render a 280×280 PNG. Wrapped in a brand-blue rounded card with
// the slug label and a "Copy URL" / "Save image" pair beneath.
function BusinessQRCard({ slug, name }: { slug: string; name: string }) {
  const url = `https://buddyally.com/${slug}`
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&color=111827&bgcolor=ffffff&data=${encodeURIComponent(url)}`
  const [copied, setCopied] = useState(false)

  function copyUrl() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #eaf6fc 0%, #f0f9ff 100%)',
      border: '1px solid #bfdbfe',
      borderRadius: 18,
      padding: 18,
      marginBottom: 22,
      display: 'flex',
      gap: 16,
      alignItems: 'center',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 14,
        padding: 8,
        boxShadow: '0 4px 14px rgba(50,147,203,0.15)',
        flexShrink: 0,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrSrc} alt={`QR for ${name}`} width={120} height={120} style={{ display: 'block', borderRadius: 8 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: '#197bb8', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>Share your storefront</p>
        <p style={{ fontSize: 18, fontWeight: 900, color: '#0652b7', margin: '4px 0 6px', letterSpacing: '-0.02em' }}>buddyally.com/{slug}</p>
        <p style={{ fontSize: 12, color: '#475569', margin: '0 0 10px', lineHeight: 1.5 }}>
          Print on flyers, paste in your IG bio, drop in WhatsApp status. Anyone scans → lands on your live page.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={copyUrl} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#3293cb', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            {copied ? '✓ Copied' : 'Copy URL'}
          </button>
          <a
            href={qrSrc}
            download={`buddyally-${slug}-qr.png`}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #bfdbfe', background: '#fff', color: '#0652b7', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}
          >
            Download QR
          </a>
        </div>
      </div>
    </div>
  )
}

// One field of the Contact methods block. Plain controlled input — no
// validation here so sellers can enter local-format phone numbers.
function ContactInput({
  label, placeholder, value, onChange,
}: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#111827' }}
      />
    </div>
  )
}

// Editable list of {label, url} payment links. Add/remove rows; rows
// reorder by index (top = primary, used as the ware "Buy" CTA when no
// per-ware override is set).
function PaymentLinksEditor({
  links,
  onChange,
}: {
  links: { label: string; url: string; type?: string }[]
  onChange: (next: { label: string; url: string; type?: string }[]) => void
}) {
  function update(i: number, patch: Partial<{ label: string; url: string }>) {
    onChange(links.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }
  function add() { onChange([...links, { label: '', url: '' }]) }
  function remove(i: number) { onChange(links.filter((_, idx) => idx !== i)) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {links.map((l, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={l.label}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder="Label (e.g. WhatsApp Pay)"
            style={{ flex: '0 0 180px', padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}
          />
          <input
            value={l.url}
            onChange={(e) => update(i, { url: e.target.value })}
            placeholder="https://..."
            style={{ flex: 1, padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >Remove</button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px dashed #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
      >
        + Add payment link
      </button>
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
