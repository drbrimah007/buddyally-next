// BuddyAlly service worker — minimal offline-ready shell.
// Keeps the app installable; serves the app shell when online, falls back
// to a tiny runtime cache for static assets.

const CACHE = 'buddyally-shell-v1'
const SHELL = ['/', '/manifest.json', '/buddyally-logo.png', '/buddyally-logo-full.png']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const req = event.request
  // Only handle GETs, leave POST/PUT/etc. to the network.
  if (req.method !== 'GET') return
  // Network-first for HTML navigations, cache-first for everything else.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/').then(r => r || caches.match(req)))
    )
    return
  }
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone()
      if (res.ok && (req.url.startsWith(self.location.origin))) {
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {})
      }
      return res
    }).catch(() => hit))
  )
})

// Push notification support (FCM-compatible payload)
self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = {} }
  const title = data.title || data.notification?.title || 'BuddyAlly'
  const body = data.body || data.notification?.body || ''
  const url = data.url || data.data?.url || '/'
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(wins => {
      for (const w of wins) {
        if (w.url.includes(url) && 'focus' in w) return w.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
