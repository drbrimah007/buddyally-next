// Firebase Web SDK init — used only in the browser.
//
// Note on the "secret": Firebase web apiKeys are PUBLIC by design. Google
// publishes them in every Firebase JS app's bundle; real security comes
// from (a) HTTP referrer restrictions on the key in Google Cloud Console
// and (b) Auth rules + RLS on the data. GitHub's secret scanner doesn't
// know this and flags any AIzaSy... pattern, so we now read the config
// from NEXT_PUBLIC_FIREBASE_* env vars and hold no defaults in source.
//
// Required env vars (set in Vercel → Settings → Environment Variables):
//   NEXT_PUBLIC_FIREBASE_API_KEY
//   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
//   NEXT_PUBLIC_FIREBASE_PROJECT_ID
//   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
//   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
//   NEXT_PUBLIC_FIREBASE_APP_ID
//   NEXT_PUBLIC_FIREBASE_VAPID_KEY  (web push only)
//
// If any are missing, getFirebaseMessaging() returns null and push silently
// degrades to "unavailable" — the rest of the app keeps working.

// @ts-ignore -- resolved once `npm i firebase` lands. The package.json
//               already declares the dep; Vercel's clean install picks
//               up the real types. Local sandbox has a half-installed
//               copy missing the package.json entry points.
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
// @ts-ignore -- same as above
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging'

const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
}

function configIsComplete(): boolean {
  return !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId)
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
  if (!configIsComplete()) {
    // Env vars not set — treat as "FCM not available" so the app keeps
    // working. Settings page surfaces a clearer message to the admin.
    console.warn('[firebase-client] NEXT_PUBLIC_FIREBASE_* env vars are not set; push disabled.')
    return null
  }
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
  // FCM's hooks don't conflict with the offline shell). The Firebase
  // config is passed as a query string because the SW file itself
  // carries no config (kept out of the repo to avoid GitHub secret
  // alerts). See public/firebase-messaging-sw.js.
  const swParams = new URLSearchParams({
    apiKey:            FIREBASE_CONFIG.apiKey,
    authDomain:        FIREBASE_CONFIG.authDomain,
    projectId:         FIREBASE_CONFIG.projectId,
    storageBucket:     FIREBASE_CONFIG.storageBucket,
    messagingSenderId: FIREBASE_CONFIG.messagingSenderId,
    appId:             FIREBASE_CONFIG.appId,
  })
  let registration: ServiceWorkerRegistration
  try {
    registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${swParams.toString()}`,
      { scope: '/firebase-cloud-messaging-push-scope' },
    )
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
