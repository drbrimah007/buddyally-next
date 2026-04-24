'use client'

// ExploreMap — read-only Leaflet map showing real activity pins at each
// activity's saved location_lat/location_lng. Clicking a pin calls onPinClick
// with the activity id, which drives the noticeboard + scroll behaviour.
//
// Reuses the CDN-loaded Leaflet from MapPicker (shared window.L global) so
// having both on the same page costs one library load total.

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    L: any
    __leafletLoading?: Promise<void>
  }
}

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  if (window.L) return Promise.resolve(window.L)
  if (window.__leafletLoading) return window.__leafletLoading.then(() => window.L)
  window.__leafletLoading = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'; link.href = LEAFLET_CSS
      document.head.appendChild(link)
    }
    if (document.querySelector(`script[src="${LEAFLET_JS}"]`)) {
      const check = () => (window.L ? resolve() : setTimeout(check, 40))
      check(); return
    }
    const s = document.createElement('script')
    s.src = LEAFLET_JS; s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Leaflet'))
    document.head.appendChild(s)
  })
  return window.__leafletLoading.then(() => window.L)
}

export type ExploreMapItem = {
  id: string
  title: string
  category?: string
  location_lat: number
  location_lng: number
}

type Props = {
  items: ExploreMapItem[]
  center?: { lat: number; lng: number } | null
  activeId?: string | null
  height?: number
  onPinClick?: (id: string) => void
}

function colorFor(category?: string): string {
  const c = (category || '').toLowerCase()
  if (c.includes('ride') || c.includes('travel')) return '#3293CB'
  if (c.includes('event') || c.includes('party')) return '#EF4444'
  if (c.includes('help') || c.includes('support') || c.includes('dog') || c.includes('baby')) return '#22C55E'
  if (c.includes('learning') || c.includes('gaming') || c.includes('sports')) return '#8B5CF6'
  return '#64748B'
}

export default function ExploreMap({ items, center, activeId, height = 230, onPinClick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())

  // Init map once
  useEffect(() => {
    let disposed = false
    loadLeaflet().then((L) => {
      if (disposed || !containerRef.current) return
      const startLat = center?.lat ?? (items[0]?.location_lat ?? 40.7128)
      const startLng = center?.lng ?? (items[0]?.location_lng ?? -74.006)
      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false, // don't hijack page scroll inside Explore
      }).setView([startLat, startLng], 11)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map)
      L.control.zoom({ position: 'topright' }).addTo(map)
      L.control.attribution({ position: 'bottomright', prefix: false }).addAttribution('© OSM').addTo(map)
      mapRef.current = map
    }).catch(() => {})
    return () => { disposed = true; mapRef.current?.remove?.(); mapRef.current = null; markersRef.current.clear() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-center when the user changes city
  useEffect(() => {
    if (!mapRef.current || !window.L || !center) return
    mapRef.current.setView([center.lat, center.lng], Math.max(mapRef.current.getZoom(), 10), { animate: true })
  }, [center?.lat, center?.lng])

  // Sync markers to items
  useEffect(() => {
    const map = mapRef.current
    if (!map || !window.L) return
    const L = window.L

    const liveIds = new Set<string>()
    for (const a of items) {
      liveIds.add(a.id)
      const color = colorFor(a.category)
      const existing = markersRef.current.get(a.id)
      const html = `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 2px ${color}33, 0 1px 2px rgba(0,0,0,0.15);"></div>`
      const icon = L.divIcon({ html, iconSize: [14, 14], iconAnchor: [7, 7], className: '' })
      if (existing) {
        existing.setLatLng([a.location_lat, a.location_lng])
        existing.setIcon(icon)
      } else {
        const m = L.marker([a.location_lat, a.location_lng], { icon, title: a.title }).addTo(map)
        m.on('click', () => onPinClick?.(a.id))
        markersRef.current.set(a.id, m)
      }
    }
    // Remove stale markers
    for (const [id, marker] of markersRef.current.entries()) {
      if (!liveIds.has(id)) { map.removeLayer(marker); markersRef.current.delete(id) }
    }

    // Auto-fit to bounds when we have items but no explicit center
    if (!center && items.length > 1) {
      const bounds = L.latLngBounds(items.map(a => [a.location_lat, a.location_lng]))
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 })
    }
  }, [items, center, onPinClick])

  // Highlight active pin
  useEffect(() => {
    if (!activeId || !window.L) return
    const m = markersRef.current.get(activeId)
    if (m && mapRef.current) {
      mapRef.current.setView(m.getLatLng(), Math.max(mapRef.current.getZoom(), 13), { animate: true })
      m.openPopup?.()
    }
  }, [activeId])

  return (
    <div
      ref={containerRef}
      style={{
        height, width: '100%',
        borderRadius: 28, overflow: 'hidden',
        background: '#e8eaed',
      }}
    />
  )
}
