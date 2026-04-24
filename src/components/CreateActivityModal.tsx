'use client'

// Doubles as the Create / Edit Activity modal. Pass `initialActivity`
// to open in edit mode.

import { useState, useRef, useEffect } from 'react'
import { useActivities } from '@/hooks/useActivities'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import { searchPlaces as searchPlacesApi, pickPlace, renderPlaceLabel } from '@/lib/geo'
import MapPicker from '@/components/MapPicker'
import { CATEGORIES, tagsForCategory, MAX_TAGS, normalizeLegacyCategory } from '@/lib/categories'
const TIMING_OPTIONS = ['TBA','Anytime','This week','Weekends','Evenings','Daytime','This month','Not Set']
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// Contribution model — intent-first, not price-first. This is what keeps the
// product from reading as a marketplace. Each option carries a user-facing
// label + short helper copy; 'split' and 'gas' optionally invite a freeform
// note (e.g. "$20ish per person"), but we never render a currency input.
type ContributionType = 'free' | 'split' | 'gas' | 'tips' | 'bring' | 'covered'
const CONTRIBUTION_OPTIONS: { value: ContributionType; label: string; helper: string; placeholder?: string }[] = [
  { value: 'free',    label: 'Free',              helper: 'No cost — just show up.' },
  { value: 'split',   label: 'Split cost',        helper: 'Shared expense, figured out together.', placeholder: 'Estimate per person (optional) — e.g. "$15ish"' },
  { value: 'gas',     label: 'Gas help',          helper: 'A little something for the driver. Usually $5–$20 depending on distance.', placeholder: 'Ballpark (optional)' },
  { value: 'tips',    label: 'Tips welcome',      helper: 'Optional appreciation — never required.' },
  { value: 'bring',   label: 'Bring something',   helper: 'Potluck-style — everyone brings a small thing.', placeholder: 'e.g. "snacks, a drink, or a chair"' },
  { value: 'covered', label: 'Covered already',   helper: 'Host is taking care of it.' },
]

type InitialActivity = {
  id: string
  title?: string
  description?: string
  category?: string
  location_text?: string
  location_display?: string
  location_mode?: string
  timing_mode?: string
  date?: string | null
  time?: string | null
  start_date?: string | null
  end_date?: string | null
  availability_label?: string | null
  recurrence_freq?: string | null
  max_participants?: number | null
  tags?: string[] | null
  tip_enabled?: boolean | null
  contribution_type?: string | null
  contribution_note?: string | null
  cover_image_url?: string | null
  location_lat?: number | null
  location_lng?: number | null
  state_code?: string | null
}

type Props = {
  onClose: () => void
  onSaved?: () => void
  initialActivity?: InitialActivity | null
}

export default function CreateActivityModal({ onClose, onSaved, initialActivity }: Props) {
  const isEdit = !!initialActivity
  const { createActivity, updateActivity } = useActivities()
  const { user } = useAuth()
  const { error: toastError, success } = useToast()
  const [loading, setLoading] = useState(false)

  // If editing and recurrence_freq has "(Mon, Tue)" style appended, strip the
  // days off and pre-select them in the day picker.
  function parseInitial(): typeof blankForm {
    if (!initialActivity) return blankForm
    const a = initialActivity
    let recurFreq = a.recurrence_freq || 'weekly'
    let recurDays: string[] = []
    const m = recurFreq.match(/^(\w+)\s*\(([^)]+)\)\s*$/)
    if (m) {
      recurFreq = m[1]
      recurDays = m[2].split(',').map(s => s.trim()).filter(Boolean)
    }
    return {
      title: a.title || '',
      category: normalizeLegacyCategory(a.category) || CATEGORIES[0],
      description: a.description || '',
      location: a.location_display || a.location_text || '',
      locationMode: a.location_mode || 'area',
      timingMode: a.timing_mode || 'one_time',
      date: a.date || '',
      time: a.time || '',
      startDate: a.start_date || '',
      endDate: a.end_date || '',
      startTime: '',
      endTime: '',
      availLabel: a.availability_label || 'TBA',
      availNote: '',
      recurFreq,
      recurTime: '',
      recurDays,
      maxParticipants: String(a.max_participants ?? 6),
      contributionType: (a.contribution_type as ContributionType) || (a.tip_enabled ? 'tips' : 'free'),
      contributionNote: a.contribution_note || '',
      tags: (a.tags || []) as string[],
      venueNote: '',
    }
  }

  const blankForm = {
    title: '', category: CATEGORIES[0] as string, description: '', location: '', locationMode: 'area',
    timingMode: 'one_time', date: '', time: '', startDate: '', endDate: '', startTime: '', endTime: '',
    availLabel: 'TBA', availNote: '',
    recurFreq: 'weekly', recurTime: '', recurDays: [] as string[],
    maxParticipants: '6',
    contributionType: 'free' as ContributionType,
    contributionNote: '',
    tags: [] as string[],
    venueNote: '',
  }

  const [form, setForm] = useState(isEdit ? parseInitial() : blankForm)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState(initialActivity?.cover_image_url || '')
  const [placeResults, setPlaceResults] = useState<any[]>([])
  const [showPlaces, setShowPlaces] = useState(false)
  const [placeSelected, setPlaceSelected] = useState(isEdit) // existing location is valid
  const [selectedCoords, setSelectedCoords] = useState<{lat:number,lon:number,state?:string}|null>(
    isEdit && initialActivity?.location_lat != null && initialActivity?.location_lng != null
      ? { lat: initialActivity.location_lat, lon: initialActivity.location_lng, state: initialActivity.state_code || undefined }
      : null
  )
  const searchTimeout = useRef<any>(null)

  // Defensive: if initialActivity changes (modal reused), resync state.
  useEffect(() => {
    if (isEdit) setForm(parseInitial())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialActivity?.id])

  function update(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleDay(day: string) {
    setForm(prev => ({
      ...prev,
      recurDays: prev.recurDays.includes(day)
        ? prev.recurDays.filter(d => d !== day)
        : [...prev.recurDays, day]
    }))
  }

  function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  function searchLocation(val: string) {
    update('location', val)
    setPlaceSelected(false)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!val || val.length < 2) { setPlaceResults([]); setShowPlaces(false); return }
    searchTimeout.current = setTimeout(async () => {
      const data = await searchPlacesApi(val, 5)
      setPlaceResults(data)
      setShowPlaces(data.length > 0)
    }, 300)
  }

  function selectPlace(place: any) {
    const pick = pickPlace(place)
    // Precise-place mode wants a richer label (street + locality),
    // every other mode just wants "Queens, New York".
    const precise = (place.display_name || '').split(',').slice(0, 2).join(',').trim()
    update('location', form.locationMode === 'precise_place' ? precise : pick.display)
    setSelectedCoords({ lat: pick.lat, lon: pick.lng, state: pick.stateCode })
    setPlaceSelected(true)
    setPlaceResults([])
    setShowPlaces(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title) { toastError('Please enter a title.'); return }
    if (!user) { toastError('Please log in.'); return }
    if (form.locationMode !== 'remote' && form.locationMode !== 'nationwide' && !form.location) {
      toastError('Please enter a location.'); return
    }
    setLoading(true)

    // Upload new cover if user picked one; otherwise keep existing (edit mode).
    let coverUrl: string | null = initialActivity?.cover_image_url || null
    if (coverFile) {
      const path = `activities/${user.id}/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('images').upload(path, coverFile, { contentType: coverFile.type })
      if (!error) {
        const { data } = supabase.storage.from('images').getPublicUrl(path)
        coverUrl = data?.publicUrl || coverUrl
      }
    }

    let date: string | null = null, time: string | null = null, availLabel: string | null = null, recurFreq: string | null = null
    if (form.timingMode === 'one_time') { date = form.date || null; time = form.time || null }
    else if (form.timingMode === 'date_range') { date = form.startDate || null; time = form.startTime || null }
    else if (form.timingMode === 'flexible') { availLabel = form.availLabel; time = form.availLabel }
    else if (form.timingMode === 'recurring') {
      recurFreq = form.recurFreq
      if (form.recurDays.length > 0) recurFreq += ` (${form.recurDays.join(', ')})`
      time = form.recurTime || recurFreq
    }

    let lat = selectedCoords?.lat || null
    let lng = selectedCoords?.lon || null
    let stateCode = selectedCoords?.state || null

    if (!lat && form.locationMode !== 'remote' && form.locationMode !== 'nationwide' && form.location) {
      const results = await searchPlacesApi(form.location, 1)
      if (results.length > 0) {
        const pick = pickPlace(results[0])
        lat = pick.lat
        lng = pick.lng
        stateCode = pick.stateCode || null
      }
    }

    const payload: any = {
      title: form.title, description: form.description, category: form.category,
      location_text: form.location, location_display: form.location, location_mode: form.locationMode,
      date, time, timing_mode: form.timingMode,
      start_date: form.timingMode === 'date_range' ? form.startDate : date,
      end_date: form.timingMode === 'date_range' ? form.endDate : null,
      availability_label: availLabel, recurrence_freq: recurFreq,
      max_participants: parseInt(form.maxParticipants) || 6,
      // `tip_enabled` kept for backward-compat readers (card pills etc). New
      // intent-based fields carry the real meaning.
      tip_enabled: form.contributionType === 'tips',
      contribution_type: form.contributionType,
      contribution_note: form.contributionNote?.trim() || null,
      tags: (form.tags || []).slice(0, MAX_TAGS),
      location_lat: lat, location_lng: lng, state_code: stateCode,
      cover_image_url: coverUrl,
    }

    if (isEdit && initialActivity) {
      const { error } = await updateActivity(initialActivity.id, payload)
      setLoading(false)
      if (error) { toastError('Failed to save: ' + error); return }
      success('Activity updated')
    } else {
      const { error } = await createActivity(user.id, payload)
      setLoading(false)
      if (error) { toastError('Failed to create: ' + error); return }
      success('Activity created')
    }

    onSaved?.()
    onClose()
  }

  // Shared select style — centers the currently-selected value on mobile
  // (native dropdowns inherit text-align), for a cleaner professional look.
  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: '1.5px solid #E5E7EB',
    borderRadius: 12,
    fontSize: 14,
    color: '#111827',
    background: '#fff',
    textAlign: 'center',
    textAlignLast: 'center' as any,
    appearance: 'none',
    backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'><path fill=\'%236B7280\' d=\'M6 8L2 4h8z\'/></svg>")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    paddingRight: 36,
  }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }
  const sectionCard: React.CSSProperties = { background: '#F9FAFB', borderRadius: 14, padding: 14, border: '1px solid #F1F5F9' }
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.3, display: 'block', marginBottom: 8 }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 'clamp(20px, 4vw, 32px)', maxWidth: 560, width: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', margin: '24px 0' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: '#111827' }}>{isEdit ? 'Edit Activity' : 'Create an Activity'}</h2>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>{isEdit ? 'Update the details for your activity.' : 'Share something you want to do — others can join.'}</p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={labelStyle}>Title *</label>
            <input value={form.title} onChange={e => update('title', e.target.value)} style={inputStyle} placeholder="Weekend hiking trip" required />
          </div>

          <div>
            <label style={labelStyle}>Category *</label>
            <select value={form.category} onChange={e => {
              update('category', e.target.value)
              // Clear tags when category changes — old tags don't belong
              // to the new category's palette.
              update('tags', [])
            }} style={selectStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Tags — pick up to 3 from the category's palette. Powers
              For You matching (interests ∩ activity tags) and the
              secondary tag-filter row on Explore. */}
          <div>
            <label style={labelStyle}>
              Tags <span style={{ fontWeight: 500, color: '#9CA3AF', textTransform: 'none', letterSpacing: 0 }}>pick up to {MAX_TAGS}</span>
            </label>
            <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 8px', lineHeight: 1.5 }}>
              Help the right people find this. Tags are how someone searching for "{tagsForCategory(form.category)[0] || form.category}" lands on your activity.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tagsForCategory(form.category).map(tag => {
                const selected = (form.tags || []).includes(tag)
                const atLimit = (form.tags || []).length >= MAX_TAGS
                const disabled = !selected && atLimit
                return (
                  <button
                    key={tag}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      const cur = form.tags || []
                      const next = selected ? cur.filter(t => t !== tag) : [...cur, tag]
                      update('tags', next)
                    }}
                    style={{
                      padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      ...(selected
                        ? { background: '#3293CB', color: '#fff', border: '1px solid #3293CB' }
                        : { background: '#F3F4F6', color: disabled ? '#9CA3AF' : '#374151', border: '1px solid #E5E7EB', opacity: disabled ? 0.6 : 1 }),
                    }}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
            {(form.tags || []).length >= MAX_TAGS && (
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>Max {MAX_TAGS} tags reached. Tap a selected one to swap.</p>
            )}
          </div>

          <div>
            <label style={labelStyle}>Description <span style={{ fontWeight: 500, color: '#9CA3AF', textTransform: 'none', letterSpacing: 0 }}>optional</span></label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} placeholder="What's the plan? Who should join?" />
          </div>

          {/* Cover image */}
          <div>
            <label style={labelStyle}>Cover image <span style={{ fontWeight: 500, color: '#9CA3AF', textTransform: 'none', letterSpacing: 0 }}>optional</span></label>
            {coverPreview && <img src={coverPreview} style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 12, marginBottom: 8, background: '#F3F4F6' }} alt="" />}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', border: '1.5px dashed #CBD5E1', borderRadius: 12, cursor: 'pointer', fontSize: 14, color: '#3293CB', fontWeight: 600, background: '#F0F9FF' }}>
              📷 {coverPreview ? 'Replace photo' : 'Upload photo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCover} />
            </label>
          </div>

          {/* ── 📍 Where does this happen? ────────────────────────────
              Mode buttons are radio-style pills (Local/Statewide/Nationwide
              /Remote) — clearer than a dropdown. Map only shows for Local;
              other modes don't need a pin. */}
          <div style={sectionCard}>
            <label style={{ ...labelStyle, fontSize: 14, marginBottom: 4 }}>📍 Where does this happen? *</label>
            <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 12px', lineHeight: 1.5 }}>
              Pick a scope. For local activities, drop a pin so people nearby can find this.
            </p>

            {/* Mode pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {[
                { value: 'area',       label: 'Local / Nearby' },
                { value: 'statewide',  label: 'Statewide' },
                { value: 'nationwide', label: 'Nationwide' },
                { value: 'remote',     label: 'Remote / Online' },
              ].map(m => {
                const selected = form.locationMode === m.value
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => update('locationMode', m.value)}
                    style={{
                      padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                      fontSize: 13, fontWeight: 700, lineHeight: 1.2,
                      ...(selected
                        ? { background: '#EFF6FF', border: '2px solid #3293CB', color: '#0652B7' }
                        : { background: '#fff', border: '1px solid #E5E7EB', color: '#111827' }),
                    }}
                  >
                    {m.label}
                    {m.hint && <span style={{ display: 'block', fontSize: 10, fontWeight: 600, color: selected ? '#3293CB' : '#9CA3AF', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.hint}</span>}
                  </button>
                )
              })}
            </div>

            {/* Local / Nearby — full search + map picker */}
            {form.locationMode === 'area' && (
              <>
                <label style={labelStyle}>Search a place</label>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <input value={form.location} onChange={e => searchLocation(e.target.value)} style={inputStyle} placeholder="City, neighborhood, or venue…" />
                  {showPlaces && placeResults.length > 0 && (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 10px 25px -3px rgba(0,0,0,0.15)', zIndex: 999, maxHeight: 200, overflowY: 'auto' }}>
                      {placeResults.map((p: any, i: number) => {
                        const lbl = renderPlaceLabel(p)
                        return (
                          <div key={i} onClick={() => selectPlace(p)} style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: '#111827' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                            <div style={{ fontWeight: 600 }}>{lbl.primary}</div>
                            {lbl.secondary && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{lbl.secondary}</div>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Map is OPTIONAL — collapsed by default. The city search
                    above already gives us coords. The map is for users who
                    want to fine-tune to a specific spot (a park entrance, a
                    venue side door). Most users skip it. */}
                <details style={{ marginTop: 4 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#3293CB', padding: '8px 0', listStyle: 'none' }}>
                    📍 Refine on map <span style={{ fontWeight: 500, color: '#9CA3AF' }}>· optional</span>
                  </summary>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 8px', lineHeight: 1.5 }}>
                    Tap or drag the pin if you want a more exact spot than the search picked. Skip this if the city/area is enough.
                  </p>
                  <MapPicker
                    lat={selectedCoords?.lat ?? null}
                    lng={selectedCoords?.lon ?? null}
                    defaultCenter={{ lat: 40.7128, lng: -74.006 }}
                    onPick={(place) => {
                      setSelectedCoords({ lat: place.lat, lon: place.lng, state: place.stateCode || undefined })
                      setPlaceSelected(true)
                      if (!form.location) update('location', place.display)
                    }}
                  />
                </details>

                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Venue details <span style={{ fontWeight: 500, color: '#9CA3AF', textTransform: 'none', letterSpacing: 0 }}>optional</span></label>
                  <input value={form.venueNote} onChange={e => update('venueNote', e.target.value)} style={inputStyle} placeholder="Meeting point, room number, etc." />
                </div>
              </>
            )}

            {/* Statewide — pick which state, no pin needed */}
            {form.locationMode === 'statewide' && (
              <>
                <label style={labelStyle}>Which state?</label>
                <div style={{ position: 'relative' }}>
                  <input value={form.location} onChange={e => searchLocation(e.target.value)} style={inputStyle} placeholder="Search a state or major city in it…" />
                  {showPlaces && placeResults.length > 0 && (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 10px 25px -3px rgba(0,0,0,0.15)', zIndex: 999, maxHeight: 200, overflowY: 'auto' }}>
                      {placeResults.map((p: any, i: number) => {
                        const lbl = renderPlaceLabel(p)
                        return (
                          <div key={i} onClick={() => selectPlace(p)} style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: '#111827' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                            <div style={{ fontWeight: 600 }}>{lbl.primary}</div>
                            {lbl.secondary && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{lbl.secondary}</div>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8, lineHeight: 1.5 }}>
                  This activity covers the whole state. People in that state will see it without distance.
                </p>
              </>
            )}

            {/* Nationwide — pick which country, no pin needed */}
            {form.locationMode === 'nationwide' && (
              <>
                <label style={labelStyle}>Which country?</label>
                <div style={{ position: 'relative' }}>
                  <input value={form.location} onChange={e => searchLocation(e.target.value)} style={inputStyle} placeholder="Search a country…" />
                  {showPlaces && placeResults.length > 0 && (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 10px 25px -3px rgba(0,0,0,0.15)', zIndex: 999, maxHeight: 200, overflowY: 'auto' }}>
                      {placeResults.map((p: any, i: number) => {
                        const lbl = renderPlaceLabel(p)
                        return (
                          <div key={i} onClick={() => selectPlace(p)} style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: '#111827' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                            <div style={{ fontWeight: 600 }}>{lbl.primary}</div>
                            {lbl.secondary && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{lbl.secondary}</div>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8, lineHeight: 1.5 }}>
                  This activity is open to anyone in that country. No pin needed.
                </p>
              </>
            )}

            {/* Remote — no map, no place needed */}
            {form.locationMode === 'remote' && (
              <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: 14 }}>
                <p style={{ fontSize: 13, color: '#374151', fontWeight: 600, marginBottom: 4 }}>🌐 Remote / Online</p>
                <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
                  This activity happens online — no physical location needed. People anywhere can join.
                </p>
              </div>
            )}
          </div>

          {/* Timing */}
          <div style={sectionCard}>
            <label style={labelStyle}>When *</label>
            <select value={form.timingMode} onChange={e => update('timingMode', e.target.value)} style={{ ...selectStyle, marginBottom: 8 }}>
              <option value="one_time">One-time event</option>
              <option value="date_range">Date range</option>
              <option value="flexible">Flexible / no fixed date</option>
              <option value="recurring">Recurring</option>
            </select>
            {form.timingMode === 'one_time' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input type="date" value={form.date} onChange={e => update('date', e.target.value)} style={inputStyle} />
                <input type="time" value={form.time} onChange={e => update('time', e.target.value)} style={inputStyle} />
              </div>
            )}
            {form.timingMode === 'date_range' && (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} style={inputStyle} placeholder="Start" />
                  <input type="date" value={form.endDate} onChange={e => update('endDate', e.target.value)} style={inputStyle} placeholder="End" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input type="time" value={form.startTime} onChange={e => update('startTime', e.target.value)} style={inputStyle} placeholder="Start time" />
                  <input type="time" value={form.endTime} onChange={e => update('endTime', e.target.value)} style={inputStyle} placeholder="End time" />
                </div>
              </div>
            )}
            {form.timingMode === 'flexible' && (
              <div style={{ display: 'grid', gap: 8 }}>
                <select value={form.availLabel} onChange={e => update('availLabel', e.target.value)} style={selectStyle}>
                  {TIMING_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <input value={form.availNote} onChange={e => update('availNote', e.target.value)} style={inputStyle} placeholder="Extra timing details (optional)" />
              </div>
            )}
            {form.timingMode === 'recurring' && (
              <div style={{ display: 'grid', gap: 8 }}>
                <select value={form.recurFreq} onChange={e => update('recurFreq', e.target.value)} style={selectStyle}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {DAYS.map(d => (
                    <button key={d} type="button" onClick={() => toggleDay(d)} style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', minWidth: 56, ...(form.recurDays.includes(d) ? { background: '#3293CB', color: '#fff', border: '1px solid #3293CB' } : { background: '#fff', color: '#4B5563', border: '1px solid #E5E7EB' }) }}>{d}</button>
                  ))}
                </div>
                <input type="time" value={form.recurTime} onChange={e => update('recurTime', e.target.value)} style={inputStyle} placeholder="Time" />
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Max Participants</label>
            <input type="number" value={form.maxParticipants} onChange={e => update('maxParticipants', e.target.value)} min={2} max={10000} style={{ ...inputStyle, textAlign: 'center' }} />
          </div>

          {/* Cost & Contribution — intent-first, not price-first. Frames the
              activity as shared effort, not a transaction. See CONTRIBUTION_OPTIONS. */}
          <div>
            <label style={labelStyle}>Cost &amp; Contribution</label>
            <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 10px', lineHeight: 1.5 }}>
              This isn&rsquo;t a marketplace &mdash; just a way to coordinate shared costs or appreciation.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              {CONTRIBUTION_OPTIONS.map(opt => {
                const selected = form.contributionType === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      update('contributionType', opt.value)
                      // Clear note if we're moving to an option that doesn't use one.
                      if (!opt.placeholder) update('contributionNote', '')
                    }}
                    style={{
                      padding: '10px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      fontSize: 13, fontWeight: 700,
                      ...(selected
                        ? { background: '#EFF6FF', border: '2px solid #3293CB', color: '#0652B7' }
                        : { background: '#fff', border: '1px solid #E5E7EB', color: '#111827' }),
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            {/* Helper + optional note — drive both off the selected option so
                the copy stays in sync with the picker. */}
            {(() => {
              const opt = CONTRIBUTION_OPTIONS.find(o => o.value === form.contributionType) || CONTRIBUTION_OPTIONS[0]
              return (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 12, color: '#4B5563', margin: 0, lineHeight: 1.5 }}>{opt.helper}</p>
                  {opt.placeholder && (
                    <input
                      type="text"
                      value={form.contributionNote}
                      onChange={e => update('contributionNote', e.target.value)}
                      placeholder={opt.placeholder}
                      maxLength={120}
                      style={{ ...inputStyle, marginTop: 8 }}
                    />
                  )}
                </div>
              )
            })()}
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 8, flexWrap: 'wrap' }}>
            <button type="submit" disabled={loading} style={{ flex: 1, minWidth: 180, padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: loading ? 0.6 : 1, boxShadow: '0 4px 12px rgba(50,147,203,0.25)' }}>
              {loading ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Activity')}
            </button>
            <button type="button" onClick={onClose} style={{ padding: '14px 24px', borderRadius: 14, border: '1px solid #E5E7EB', background: '#fff', fontWeight: 600, cursor: 'pointer', color: '#4B5563' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
