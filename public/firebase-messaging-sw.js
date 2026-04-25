// FCM background service worker.
//
// The Firebase web SDK requires a SW at /firebase-messaging-sw.js to deliver
// push notifications when the app tab is closed/backgrounded. Kept tiny and
// dependency-free; same buddy-526fc config the rest of the app uses.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyCQ6dzEiXFHoZXcYOSxqTjWFZhdWAZzZ2A',
  authDomain: 'buddy-526fc.firebaseapp.com',
  projectId: 'buddy-526fc',
  storageBucket: 'buddy-526fc.firebasestorage.app',
  messagingSenderId: '371416575771',
  appId: '1:371416575771:web:029223400e8a136e33edbe',
})

const messaging = firebase.messaging()

// Background message → render a system notification. Mirrors v1's behavior
// (urgent gets a longer vibration, contact-code messages deep-link to
// /dashboard/codes).
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {}
  const notif = payload.notification || {}
  const isUrgent = data.priority === 'urgent' || data.urgent === 'true'

  const title = notif.title || data.title || (isUrgent ? 'URGENT — BuddyAlly' : 'BuddyAlly')
  const body = notif.body || data.body || 'You have a new notification'
  const url = data.url || (data.type === 'code_message' ? '/dashboard/codes' : '/dashboard/alerts')

  return self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.code || data.reference_id || 'buddyally-msg',
    renotify: true,
    vibrate: isUrgent ? [200, 100, 200, 100, 200] : [200, 100, 200],
    data: { url },
  })
})

// Tap → focus an existing tab on the deep-link URL, or open a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(url) && 'focus' in w) return w.focus()
      }
      return clients.openWindow(url)
    })
  )
})
