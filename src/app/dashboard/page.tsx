'use client'

import { useState } from 'react'
import { useActivities } from '@/hooks/useActivities'
import { useAuth } from '@/hooks/useAuth'

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => d * Math.PI / 180
  const R = 3958.8
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function formatDistance(miles: number) {
  if (miles < 0.3) return Math.round(miles * 5280) + ' ft away'
  if (miles < 1) return (Math.round(miles * 10) / 10) + ' mi away'
  return Math.round(miles) + ' mi away'
}

function formatTiming(a: any) {
  if (a.timing_mode === 'flexible') return a.availability_label || 'Flexible'
  if (a.timing_mode === 'recurring') return a.recurrence_freq || 'Recurring'
  if (a.date) {
    const d = new Date(a.date)
    const month = d.toLocaleString('default', { month: 'short' })
    const day = d.getDate()
    return `${month} ${day}${a.time ? ' at ' + a.time : ''}`
  }
  return 'TBA'
}

export default function ExplorePage() {
  const { activities, loading } = useActivities()
  const { profile } = useAuth()
  const [radius, setRadius] = useState(5)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [showAll, setShowAll] = useState(false)

  const userInterests = profile?.interests || []
  const categories = showAll || userInterests.length === 0
    ? ['Travel', 'Local Activities', 'Sports / Play', 'Learning', 'Help / Support', 'Events', 'Outdoor', 'Gaming', 'Wellness', 'Ride Share', 'Dog Walk', 'Babysit', 'Party', 'Pray', 'Others']
    : userInterests

  // Filter activities
  const filtered = activities.filter(a => {
    // Category
    if (category !== 'all' && a.category !== category) return false
    if (category === 'all' && !showAll && userInterests.length > 0 && !userInterests.includes(a.category)) return false
    // Search
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
    // Status
    if (a.status === 'cancelled') return false
    return true
  })

  // Calculate distance and sort
  const withDistance = filtered.map(a => {
    let dist: number | null = null
    if (profile?.home_lat && profile?.home_lng && a.location_lat && a.location_lng) {
      dist = haversineMiles(profile.home_lat, profile.home_lng, a.location_lat, a.location_lng)
    }
    return { ...a, _dist: dist }
  }).sort((a, b) => {
    if (a._dist != null && b._dist != null) return a._dist - b._dist
    if (a._dist != null) return -1
    return 0
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold">Explore Activities</h1>
        <button className="bg-[#3293CB] text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-[#2678A8] transition">
          + New Activity
        </button>
      </div>

      {/* Location + radius */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white flex-1 max-w-xs">
          <span className="text-sm">📍</span>
          <span className="text-sm font-medium text-gray-700 truncate">
            {profile?.home_display_name || profile?.city || 'Set location'}
          </span>
        </div>
        <select
          value={radius}
          onChange={e => setRadius(parseFloat(e.target.value))}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"
        >
          <option value={0.3}>2 blocks</option>
          <option value={0.5}>5 min walk</option>
          <option value={1}>1 mi</option>
          <option value={3}>3 mi</option>
          <option value={5}>5 mi</option>
          <option value={10}>10 mi</option>
          <option value={25}>25 mi</option>
          <option value={50}>50 mi</option>
          <option value={100}>Statewide</option>
          <option value={0}>Nationwide</option>
        </select>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button
          onClick={() => { setCategory('all'); setShowAll(false) }}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${category === 'all' && !showAll ? 'bg-[#3293CB] text-white' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
        >
          For You
        </button>
        <button
          onClick={() => { setCategory('all'); setShowAll(true) }}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${category === 'all' && showAll ? 'bg-[#3293CB] text-white' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setShowAll(false) }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${category === cat ? 'bg-[#3293CB] text-white' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search activities..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-6 bg-white"
      />

      {/* Activity cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
              <div className="h-16 bg-gray-100 rounded mb-3" />
              <div className="flex gap-2">
                <div className="h-7 bg-gray-100 rounded-full w-20" />
                <div className="h-7 bg-gray-100 rounded-full w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : withDistance.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-3xl mb-3">🌍</p>
          <p className="font-semibold mb-2">No activities found</p>
          <p className="text-sm text-gray-500">Be the first to create one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {withDistance.map(a => {
            const host = a.host as any
            const spotsLeft = a.max_participants - (a.participants?.length || 0)
            return (
              <div key={a.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition cursor-pointer">
                {a.cover_image_url && (
                  <img src={a.cover_image_url} alt="" className="w-full h-40 object-cover" />
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-bold text-base">{a.title}</h3>
                      <p className="text-sm text-gray-500">
                        {a.location_mode === 'remote' ? 'Remote / Online' : a.location_display || a.location_text}
                        {a._dist != null && ` • ${formatDistance(a._dist)}`}
                        {' • '}{formatTiming(a)}
                      </p>
                    </div>
                    <span className="bg-[#3293CB] text-white text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                      {a.category}
                    </span>
                  </div>
                  {a.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{a.description}</p>
                  )}
                  <div className="flex gap-2 flex-wrap mb-3">
                    <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-200">
                      {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left` : 'Full'}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${a.tip_enabled ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>
                      {a.tip_enabled ? 'Tips optional' : 'Free'}
                    </span>
                  </div>
                  {host && (
                    <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                        {host.avatar_url ? <img src={host.avatar_url} className="w-full h-full rounded-full object-cover" /> : (host.first_name?.[0] || '?')}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{host.first_name} {host.last_name?.[0] || ''}</p>
                        <p className="text-xs text-gray-400">{'★'.repeat(Math.round(host.rating_avg || 0))} {host.rating_avg?.toFixed(1) || '0.0'} ({host.rating_count || 0})</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
