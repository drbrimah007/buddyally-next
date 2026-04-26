// FCM background service worker.
//
// The Firebase web SDK requires a SW at /firebase-messaging-sw.js to deliver
// push notifications when the app tab is closed/backgrounded.
//
// IMPORTANT: this file is checked into the public repo, so it carries NO
// hardcoded Firebase config. The page registers it with a query string
// containing the public web-app config:
//
//   navigator.serviceWorker.register(
//     '/firebase-messaging-sw.js?apiKey=…&authDomain=…&projectId=…' +
//     '&storageBucket=…&messagingSenderId=…&appId=…'
//   )
//
// Those values are read from NEXT_PUBLIC_FIREBASE_* env vars on the page
// side (see src/lib/firebase-client.ts). Firebase web apiKeys are public-
// by-design (every Firebase JS app embeds them), but we keep them out of
// the repo so GitHub's secret scanner doesn't flag commits.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

const params = new URL(self.location.href).searchParams
const config = {
  apiKey:            params.get('apiKey')            || '',
  authDomain:        params.get('authDomain')        || '',
  projectId:         params.get('projectId')         || '',
  storageBucket:     params.get('storageBucket')     || '',
  messagingSenderId: params.get('messagingSenderId') || '',
  appId:             params.get('appId')             || '',
}

if (config.apiKey && config.projectId && config.appId) {
  firebase.initializeApp(config)
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

    // Server ships an unread total in data.badge — apply it to the home
    // screen icon. Web App Badging API works in iOS 16.4+ PWAs and modern
    // Chromium/Safari. Wrapped in try because some SW contexts don't
    // expose navigator.setAppBadge until permission is fully ready.
    const badgeCount = parseInt(data.badge || '0', 10)
    if (!Number.isNaN(badgeCount) && 'setAppBadge' in self.navigator) {
      try {
        if (badgeCount > 0) self.navigator.setAppBadge(badgeCount)
        else self.navigator.clearAppBadge && self.navigator.clearAppBadge()
      } catch (e) { /* swallow — badge is non-critical */ }
    }

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
} else {
  // No config supplied — this SW will exist but won't fire notifications.
  // Acceptable: the rest of the app keeps working; push just stays off
  // until env vars are wired up and the registration URL gets the params.
  console.warn('[firebase-messaging-sw] Firebase config missing in registration query; push disabled.')
}

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
