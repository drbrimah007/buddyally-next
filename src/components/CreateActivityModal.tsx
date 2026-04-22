'use client'

import { useState } from 'react'
import { useActivities } from '@/hooks/useActivities'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const CATEGORIES = ['Travel','Local Activities','Sports / Play','Learning','Help / Support','Events','Outdoor','Gaming','Wellness','Ride Share','Dog Walk','Babysit','Party','Pray','Others']
const TIMING_OPTIONS = ['TBA','Anytime','This week','Weekends','Evenings','Daytime','This month','Not Set']

export default function CreateActivityModal({ onClose }: { onClose: () => void }) {
  const { createActivity } = useActivities()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '', category: CATEGORIES[0], description: '', location: '', locationMode: 'area',
    timingMode: 'one_time', date: '', time: '', startDate: '', endDate: '', availLabel: 'TBA',
    recurFreq: 'weekly', maxParticipants: '6', tipEnabled: false,
  })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')

  function update(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
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
    else if (form.timingMode === 'date_range') { date = form.startDate }
    else if (form.timingMode === 'flexible') { availLabel = form.availLabel; time = form.availLabel }
    else if (form.timingMode === 'recurring') { recurFreq = form.recurFreq; time = form.recurFreq }

    // Geocode
    let lat = null, lng = null, stateCode = null
    if (form.locationMode !== 'remote' && form.locationMode !== 'nationwide' && form.location) {
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg my-8" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Create an Activity</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Title *</label>
            <input value={form.title} onChange={e => update('title', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Weekend hiking trip" required />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Category *</label>
            <select value={form.category} onChange={e => update('category', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Description <span className="font-normal text-gray-400">optional</span></label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="What's the plan?" />
          </div>

          {/* Cover image */}
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Cover image <span className="font-normal text-gray-400">optional</span></label>
            {coverPreview && <img src={coverPreview} className="w-full h-36 object-cover rounded-xl mb-2" alt="" />}
            <label className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-xl cursor-pointer text-sm text-gray-500">
              📷 Upload photo
              <input type="file" accept="image/*" className="hidden" onChange={handleCover} />
            </label>
          </div>

          {/* Location */}
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Where does this happen? *</label>
            <select value={form.locationMode} onChange={e => update('locationMode', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-2">
              <option value="area">City or area</option>
              <option value="precise_place">Specific place</option>
              <option value="statewide">Statewide</option>
              <option value="nationwide">Nationwide</option>
              <option value="remote">Remote / online</option>
            </select>
            {form.locationMode !== 'remote' && form.locationMode !== 'nationwide' && (
              <input value={form.location} onChange={e => update('location', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Search for a city or place..." />
            )}
          </div>

          {/* Timing */}
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">When *</label>
            <select value={form.timingMode} onChange={e => update('timingMode', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-2">
              <option value="one_time">One-time event</option>
              <option value="date_range">Date range</option>
              <option value="flexible">Flexible / no fixed date</option>
              <option value="recurring">Recurring</option>
            </select>
            {form.timingMode === 'one_time' && (
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={form.date} onChange={e => update('date', e.target.value)} className="border border-gray-200 rounded-xl px-4 py-3 text-sm" />
                <input type="time" value={form.time} onChange={e => update('time', e.target.value)} className="border border-gray-200 rounded-xl px-4 py-3 text-sm" />
              </div>
            )}
            {form.timingMode === 'date_range' && (
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} className="border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Start" />
                <input type="date" value={form.endDate} onChange={e => update('endDate', e.target.value)} className="border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="End" />
              </div>
            )}
            {form.timingMode === 'flexible' && (
              <select value={form.availLabel} onChange={e => update('availLabel', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm">
                {TIMING_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
            {form.timingMode === 'recurring' && (
              <select value={form.recurFreq} onChange={e => update('recurFreq', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Max Participants</label>
            <input type="number" value={form.maxParticipants} onChange={e => update('maxParticipants', e.target.value)} min="2" max="10000" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.tipEnabled} onChange={e => update('tipEnabled', e.target.checked)} />
            <span className="text-sm font-semibold">Enable optional tips</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="flex-1 bg-[#3293CB] text-white font-bold py-3 rounded-xl disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Activity'}
            </button>
            <button type="button" onClick={onClose} className="border border-gray-200 rounded-xl px-6 py-3 font-semibold">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
