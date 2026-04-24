'use client'

// MapPicker — click/drag a real pin on an OSM map and get back
// { lat, lng, display, stateCode }.
//
// No npm dependency: Leaflet is loaded from unpkg on first mount, cached on
// the window for subsequent uses so multiple pickers share one init.
//
// Reverse-geocode on each placement uses the same Nominatim helper the rest
// of the app uses (@/lib/geo). If the reverse lookup fails we still return
// the raw lat/lng so the pin is always a useful result.

import { useEffect, useRef, useState } from 'react'
import { reverseGeocode, pickPlace } from '@/lib/geo'
import type { PlacePick } from '@/lib/geo'

declare global {
  interface Window {
    L: any
    __leafletLoading?: Promise<void>
  }
}

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

// Lazy-load Leaflet once per page. Returns a promise that resolves to window.L.
function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  if (window.L) return Promise.resolve(window.L)
  if (window.__leafletLoading) return window.__leafletLoading.then(() => window.L)
  window.__leafletLoading = new Promise<void>((resolve, reject) => {
    // CSS
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = LEAFLET_CSS
      document.head.appendChild(link)
    }
    // JS
    if (document.querySelector(`script[src="${LEAFLET_JS}"]`)) {
      const check = () => (window.L ? resolve() : setTimeout(check, 40))
      check()
      return
    }
    const s = document.createElement('script')
    s.src = LEAFLET_JS
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Leaflet'))
    document.head.appendChild(s)
  })
  return window.__leafletLoading.then(() => window.L)
}

type Props = {
  // Current pin (if any). If null, the map opens at `defaultCenter`.
  lat?: number | null
  lng?: number | null
  defaultCenter?: { lat: number; lng: number }  // fallback when no pin yet
  height?: number                                // pixels; default 320
  onPick: (place: PlacePick & { raw?: any }) => void
}

export default function MapPicker({ lat, lng, defaultCenter, height = 320, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)

  // Initialize the map once Leaflet is available.
  useEffect(() => {
    let disposed = false
    loadLeaflet().then((L) => {
      if (disposed || !containerRef.current) return
      const startLat = lat ?? defaultCenter?.lat ?? 40.7128
      const startLng = lng ?? defaultCenter?.lng ?? -74.006
      const map = L.map(containerRef.current, { zoomControl: true }).setView([startLat, startLng], lat != null ? 14 : 11)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map)

      // Initial marker if we already have a pin
      if (lat != null && lng != null) {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
        wireDragEnd(L, markerRef.current)
      }

      // Click to drop / move pin
      map.on('click', (e: any) => {
        placePin(L, map, e.latlng.lat, e.latlng.lng)
      })

      mapRef.current = map
      setReady(true)
    }).catch(() => {
      // Silent fail — user can still use the text search
    })
    return () => { disposed = true; mapRef.current?.remove?.(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // If the parent updates lat/lng externally (e.g. user picked a city in the
  // text search), re-center the map and move the pin.
  useEffect(() => {
    if (!ready || !mapRef.current || !window.L) return
    if (lat == null || lng == null) return
    const L = window.L
    placePin(L, mapRef.current, lat, lng, { skipReverseGeocode: true })
    mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 13))
  }, [ready, lat, lng])

  function wireDragEnd(L: any, marker: any) {
    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng()
      pushPick(lat, lng)
    })
  }

  function placePin(L: any, map: any, la: number, ln: number, opts?: { skipReverseGeocode?: boolean }) {
    if (!markerRef.current) {
      markerRef.current = L.marker([la, ln], { draggable: true }).addTo(map)
      wireDragEnd(L, markerRef.current)
    } else {
      markerRef.current.setLatLng([la, ln])
    }
    if (!opts?.skipReverseGeocode) pushPick(la, ln)
  }

  async function pushPick(la: number, ln: number) {
    setBusy(true)
    try {
      const place = await reverseGeocode(la, ln)
      if (place) {
        const picked = pickPlace(place)
        // Override lat/lng with the actual clicked point so users see their
        // exact tap persist (reverseGeocode sometimes snaps to a city centroid).
        onPick({ ...picked, lat: la, lng: ln, raw: place })
      } else {
        onPick({
          name: 'Dropped pin',
          state: '',
          stateCode: '',
          countryCode: '',
          display: `${la.toFixed(4)}, ${ln.toFixed(4)}`,
          lat: la, lng: ln,
        })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        style={{
          height, width: '100%', borderRadius: 12, overflow: 'hidden',
          border: '1px solid #E5E7EB', background: '#F3F4F6',
        }}
      />
      {/* Resolving label */}
      {busy && (
        <div style={{
          position: 'absolute', bottom: 8, left: 8, zIndex: 1000,
          background: 'rgba(255,255,255,0.92)', padding: '4px 10px',
          borderRadius: 999, fontSize: 12, fontWeight: 600, color: '#4B5563',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          Reading address…
        </div>
      )}
      {/* Tip */}
      <div style={{
        position: 'absolute', top: 8, left: 8, zIndex: 1000,
        background: 'rgba(255,255,255,0.92)', padding: '4px 10px',
        borderRadius: 999, fontSize: 11, fontWeight: 600, color: '#6B7280',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', pointerEvents: 'none',
      }}>
        Click the map or drag the pin
      </div>
    </div>
  )
}
