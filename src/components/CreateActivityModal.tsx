'use client'

// Doubles as the Create / Edit Activity modal. Pass `initialActivity`
// to open in edit mode.

import { useState, useRef, useEffect } from 'react'
import { useActivities } from '@/hooks/useActivities'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import { searchPlaces as searchPlacesApi, pickPlace, renderPlaceLabel } from '@/lib/geo'

const CATEGORIES = ['Travel','Local Activities','Sports / Play','Learning','Help / Support','Events','Outdoor','Gaming','Wellness','Ride Share','Dog Walk','Babysit','Party','Pray','Others']
const TIMING_OPTIONS = ['TBA','Anytime','This week','Weekends','Evenings','Daytime','This month','Not Set']
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

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
  tip_enabled?: boolean | null
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
      category: a.category || CATEGORIES[0],
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
      tipEnabled: !!a.tip_enabled,
      venueNote: '',
    }
  }

  const blankForm = {
    title: '', category: CATEGORIES[0], description: '', location: '', locationMode: 'area',
    timingMode: 'one_time', date: '', time: '', startDate: '', endDate: '', startTime: '', endTime: '',
    availLabel: 'TBA', availNote: '',
    recurFreq: 'weekly', recurTime: '', recurDays: [] as string[],
    maxParticipants: '6', tipEnabled: false, venueNote: '',
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
      max_participants: parseInt(form.maxParticipants) || 6, tip_enabled: form.tipEnabled,
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
            <select value={form.category} onChange={e => update('category', e.target.value)} style={selectStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
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

          {/* Location with autocomplete */}
          <div style={sectionCard}>
            <label style={labelStyle}>Where does this happen? *</label>
            <select value={form.locationMode} onChange={e => update('locationMode', e.target.value)} style={{ ...selectStyle, marginBottom: 8 }}>
              <option value="area">City or area</option>
              <option value="precise_place">Specific place</option>
              <option value="statewide">Statewide</option>
              <option value="nationwide">Nationwide</option>
              <option value="remote">Remote / online</option>
            </select>
            {form.locationMode !== 'remote' && form.locationMode !== 'nationwide' && (
              <>
                {/* Wrap the search input + dropdown in a relative container so
                    the autocomplete menu positions correctly regardless of
                    whether the venue details block is below it. */}
                <div style={{ position: 'relative' }}>
                  <input value={form.location} onChange={e => searchLocation(e.target.value)} style={inputStyle} placeholder="Search for a city or place..." />
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
                {placeSelected && <p style={{ fontSize: 12, color: '#059669', marginTop: 6, fontWeight: 600 }}>✓ Used for search and distance</p>}
                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>Venue details <span style={{ fontWeight: 500, color: '#9CA3AF', textTransform: 'none', letterSpacing: 0 }}>optional</span></label>
                  <input value={form.venueNote} onChange={e => update('venueNote', e.target.value)} style={inputStyle} placeholder="Meeting point, room number, etc." />
                </div>
              </>
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

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 14px', background: '#F9FAFB', borderRadius: 12, border: '1px solid #F1F5F9' }}>
            <input type="checkbox" checked={form.tipEnabled} onChange={e => update('tipEnabled', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#3293CB' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Enable optional tips</span>
          </label>
          {form.tipEnabled && <p style={{ fontSize: 12, color: '#6B7280', marginTop: -8 }}>Tips are never required. This just lets participants leave a voluntary tip.</p>}

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
