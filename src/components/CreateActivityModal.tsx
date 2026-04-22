'use client'

import { useState, useRef } from 'react'
import { useActivities } from '@/hooks/useActivities'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const CATEGORIES = ['Travel','Local Activities','Sports / Play','Learning','Help / Support','Events','Outdoor','Gaming','Wellness','Ride Share','Dog Walk','Babysit','Party','Pray','Others']
const TIMING_OPTIONS = ['TBA','Anytime','This week','Weekends','Evenings','Daytime','This month','Not Set']
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function CreateActivityModal({ onClose }: { onClose: () => void }) {
  const { createActivity } = useActivities()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '', category: CATEGORIES[0], description: '', location: '', locationMode: 'area',
    timingMode: 'one_time', date: '', time: '', startDate: '', endDate: '', startTime: '', endTime: '',
    availLabel: 'TBA', availNote: '',
    recurFreq: 'weekly', recurTime: '', recurDays: [] as string[],
    maxParticipants: '6', tipEnabled: false, venueNote: '',
  })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [placeResults, setPlaceResults] = useState<any[]>([])
  const [showPlaces, setShowPlaces] = useState(false)
  const [placeSelected, setPlaceSelected] = useState(false)
  const [selectedCoords, setSelectedCoords] = useState<{lat:number,lon:number,state?:string}|null>(null)
  const searchTimeout = useRef<any>(null)

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
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=5`)
        const data = await res.json()
        setPlaceResults(data)
        setShowPlaces(data.length > 0)
      } catch { setPlaceResults([]); setShowPlaces(false) }
    }, 300)
  }

  function selectPlace(place: any) {
    const addr = place.address || {}
    const name = addr.borough || addr.city || addr.town || addr.village || addr.county || place.display_name.split(',')[0]
    const state = addr.state || ''
    const display = state ? `${name}, ${state}` : name
    update('location', form.locationMode === 'precise_place' ? place.display_name.split(',').slice(0, 2).join(',') : display)
    setSelectedCoords({
      lat: parseFloat(place.lat),
      lon: parseFloat(place.lon),
      state: (addr['ISO3166-2-lvl4'] || '').replace('US-', '')
    })
    setPlaceSelected(true)
    setPlaceResults([])
    setShowPlaces(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title) return alert('Please enter a title.')
    if (!user) return alert('Please log in.')
    setLoading(true)

    let coverUrl = null
    if (coverFile) {
      const path = `activities/${user.id}/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('images').upload(path, coverFile, { contentType: coverFile.type })
      if (!error) {
        const { data } = supabase.storage.from('images').getPublicUrl(path)
        coverUrl = data?.publicUrl
      }
    }

    let date = null, time = null, availLabel = null, recurFreq = null
    if (form.timingMode === 'one_time') { date = form.date; time = form.time }
    else if (form.timingMode === 'date_range') { date = form.startDate; time = form.startTime }
    else if (form.timingMode === 'flexible') { availLabel = form.availLabel; }
    else if (form.timingMode === 'recurring') {
      recurFreq = form.recurFreq
      if (form.recurDays.length > 0) recurFreq += ` (${form.recurDays.join(', ')})`
      time = form.recurTime
    }

    // Use selected coords or geocode
    let lat = selectedCoords?.lat || null
    let lng = selectedCoords?.lon || null
    let stateCode = selectedCoords?.state || null

    if (!lat && form.locationMode !== 'remote' && form.locationMode !== 'nationwide' && form.location) {
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(form.location)}&format=json&addressdetails=1&limit=1`)
        const results = await resp.json()
        if (results.length > 0) {
          lat = parseFloat(results[0].lat)
          lng = parseFloat(results[0].lon)
          stateCode = (results[0].address?.['ISO3166-2-lvl4'] || '').replace('US-', '')
        }
      } catch {}
    }

    await createActivity(user.id, {
      title: form.title, description: form.description, category: form.category,
      location_text: form.location, location_display: form.location, location_mode: form.locationMode as any,
      date, time, timing_mode: form.timingMode as any,
      start_date: form.timingMode === 'date_range' ? form.startDate : date,
      end_date: form.timingMode === 'date_range' ? form.endDate : null,
      availability_label: availLabel, recurrence_freq: recurFreq,
      max_participants: parseInt(form.maxParticipants) || 6, tip_enabled: form.tipEnabled,
      location_lat: lat, location_lng: lng, state_code: stateCode,
      cover_image_url: coverUrl,
    } as any)

    setLoading(false)
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', margin: '32px 0' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Create an Activity</h2>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Title *</label>
            <input value={form.title} onChange={e => update('title', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} placeholder="Weekend hiking trip" required />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Category *</label>
            <select value={form.category} onChange={e => update('category', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827', background: '#fff' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Description <span style={{ fontWeight: 400, color: '#9CA3AF' }}>optional</span></label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827', resize: 'none' }} placeholder="What's the plan?" />
          </div>

          {/* Cover image */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Cover image <span style={{ fontWeight: 400, color: '#9CA3AF' }}>optional</span></label>
            {coverPreview && <img src={coverPreview} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12, marginBottom: 8 }} alt="" />}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', border: '1.5px dashed #E5E7EB', borderRadius: 12, cursor: 'pointer', fontSize: 14, color: '#6B7280' }}>
              📷 Upload photo
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCover} />
            </label>
          </div>

          {/* Location with autocomplete */}
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Where does this happen? *</label>
            <select value={form.locationMode} onChange={e => update('locationMode', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827', background: '#fff', marginBottom: 8 }}>
              <option value="area">City or area</option>
              <option value="precise_place">Specific place</option>
              <option value="statewide">Statewide</option>
              <option value="nationwide">Nationwide</option>
              <option value="remote">Remote / online</option>
            </select>
            {form.locationMode !== 'remote' && form.locationMode !== 'nationwide' && (
              <>
                <input value={form.location} onChange={e => searchLocation(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} placeholder="Search for a city or place..." />
                {placeSelected && <p style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>✓ Used for search and distance</p>}
                {showPlaces && placeResults.length > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '0 0 10px 10px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 999, maxHeight: 200, overflowY: 'auto' }}>
                    {placeResults.map((p: any, i: number) => (
                      <div key={i} onClick={() => selectPlace(p)} style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: '#111827' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                        {p.display_name?.substring(0, 60)}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {form.locationMode !== 'remote' && form.locationMode !== 'nationwide' && (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Venue details <span style={{ fontWeight: 400, color: '#9CA3AF' }}>optional</span></label>
                <input value={form.venueNote} onChange={e => update('venueNote', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} placeholder="Meeting point, room number, etc." />
              </div>
            )}
          </div>

          {/* Timing */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>When *</label>
            <select value={form.timingMode} onChange={e => update('timingMode', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827', background: '#fff', marginBottom: 8 }}>
              <option value="one_time">One-time event</option>
              <option value="date_range">Date range</option>
              <option value="flexible">Flexible / no fixed date</option>
              <option value="recurring">Recurring</option>
            </select>
            {form.timingMode === 'one_time' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input type="date" value={form.date} onChange={e => update('date', e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} />
                <input type="time" value={form.time} onChange={e => update('time', e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} />
              </div>
            )}
            {form.timingMode === 'date_range' && (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} placeholder="Start" />
                  <input type="date" value={form.endDate} onChange={e => update('endDate', e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} placeholder="End" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input type="time" value={form.startTime} onChange={e => update('startTime', e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} placeholder="Start time" />
                  <input type="time" value={form.endTime} onChange={e => update('endTime', e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} placeholder="End time" />
                </div>
              </div>
            )}
            {form.timingMode === 'flexible' && (
              <div style={{ display: 'grid', gap: 8 }}>
                <select value={form.availLabel} onChange={e => update('availLabel', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827', background: '#fff' }}>
                  {TIMING_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <input value={form.availNote} onChange={e => update('availNote', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} placeholder="Extra timing details (optional)" />
              </div>
            )}
            {form.timingMode === 'recurring' && (
              <div style={{ display: 'grid', gap: 8 }}>
                <select value={form.recurFreq} onChange={e => update('recurFreq', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827', background: '#fff' }}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DAYS.map(d => (
                    <button key={d} type="button" onClick={() => toggleDay(d)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', ...(form.recurDays.includes(d) ? { background: '#3293CB', color: '#fff', border: '1px solid #3293CB' } : { background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB' }) }}>{d}</button>
                  ))}
                </div>
                <input type="time" value={form.recurTime} onChange={e => update('recurTime', e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} placeholder="Time" />
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Max Participants</label>
            <input type="number" value={form.maxParticipants} onChange={e => update('maxParticipants', e.target.value)} min={2} max={10000} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.tipEnabled} onChange={e => update('tipEnabled', e.target.checked)} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Enable optional tips</span>
          </label>
          {form.tipEnabled && <p style={{ fontSize: 12, color: '#6B7280', marginTop: -8 }}>Tips are never required. This just lets participants leave a voluntary tip.</p>}

          <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>{loading ? 'Creating...' : 'Create Activity'}</button>
            <button type="button" onClick={onClose} style={{ padding: '14px 24px', borderRadius: 14, border: '1px solid #E5E7EB', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
