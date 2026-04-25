// Firebase Web SDK init — used only in the browser. The apiKey + IDs are
// not secrets (they're embedded in every served Firebase web page); access
// is gated by Firebase Auth + the apiKey's domain restriction in the
// console. The one piece that is *required* and not in this file is the
// VAPID key: it must come from NEXT_PUBLIC_FIREBASE_VAPID_KEY because it's
// per-deployment and not in the v1 config dump.
//
// Config below mirrors v1's `firebase-messaging-sw.js` so the web app talks
// to the same buddy-526fc Firebase project that already has FCM enabled.

// @ts-ignore -- resolved once `npm i firebase` lands. The package.json
//               already declares the dep; Vercel's clean install picks
//               up the real types. Local sandbox has a half-installed
//               copy missing the package.json entry points.
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
// @ts-ignore -- same as above
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging'

const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCQ6dzEiXFHoZXcYOSxqTjWFZhdWAZzZ2A',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'buddy-526fc.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'buddy-526fc',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'buddy-526fc.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '371416575771',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:371416575771:web:029223400e8a136e33edbe',
}

// VAPID key for web push. Generate one in Firebase Console → Project
// Settings → Cloud Messaging → Web Configuration → Web Push certificates
// → Generate key pair. Without it, getToken() throws.
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || ''

let _app: FirebaseApp | null = null
let _messaging: Messaging | null = null

function getOrInitApp(): FirebaseApp {
  if (_app) return _app
  _app = getApps()[0] || initializeApp(FIREBASE_CONFIG)
  return _app
}

// Returns null when the runtime can't do FCM (e.g. SSR, Safari without
// service workers, or an old browser). All callers should treat null as
// "push unavailable here, no error to bubble up".
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null
  try {
    const ok = await isSupported()
    if (!ok) return null
    if (_messaging) return _messaging
    _messaging = getMessaging(getOrInitApp())
    return _messaging
  } catch (e) {
    console.warn('[firebase-client] FCM not available:', e)
    return null
  }
}

// Outcome of an enablePush() attempt. Used by the settings page to render
// a clear status pill instead of dumping raw error strings on the user.
export type EnablePushResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'unsupported' | 'permission_denied' | 'no_vapid' | 'sw_failed' | 'token_failed'; detail?: string }

// Full enable-push flow:
//   1. confirm browser support
//   2. confirm VAPID key
//   3. register the FCM service worker
//   4. request Notification permission
//   5. ask FCM for a token
// Returns the token on success — caller is responsible for upserting it
// into the `fcm_tokens` table for the current user.
export async function enablePush(): Promise<EnablePushResult> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'unsupported' }
  }
  if (!VAPID_KEY) {
    return { ok: false, reason: 'no_vapid', detail: 'NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set in this deployment.' }
  }

  // Register the FCM-specific service worker (separate from /sw.js so
  // FCM's hooks don't conflict with the offline shell).
  let registration: ServiceWorkerRegistration
  try {
    registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/firebase-cloud-messaging-push-scope' })
  } catch (e: any) {
    return { ok: false, reason: 'sw_failed', detail: String(e?.message || e) }
  }

  const messaging = await getFirebaseMessaging()
  if (!messaging) return { ok: false, reason: 'unsupported' }

  // Permission *after* SW registration, so the prompt comes with everything in place.
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, reason: 'permission_denied' }

  try {
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (!token) return { ok: false, reason: 'token_failed', detail: 'Empty token returned' }
    return { ok: true, token }
  } catch (e: any) {
    return { ok: false, reason: 'token_failed', detail: String(e?.message || e) }
  }
}

// Foreground handler. The push event handler in the SW only fires when the
// page is in the background. For in-foreground deliveries we need this.
export function onForegroundMessage(cb: (payload: any) => void) {
  void getFirebaseMessaging().then((m) => {
    if (!m) return
    onMessage(m, cb)
  })
}
