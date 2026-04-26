'use client'

// Notification Settings — v2 restoration of the v1 notifications-settings
// surface. Two layers:
//
//   1. *Per-account* master switches (push, email) stored on the profile.
//      The notify API already honors per-code push_enabled/email_enabled;
//      these masters AND-gate everything (a hard "do not disturb" lever).
//
//   2. *Browser push permission* — even with the master toggle on, the
//      browser must grant Notification permission and a Firebase Cloud
//      Messaging token must be registered. This surface walks the user
//      through that, shows current state, and lets them re-request.
//
// FCM token registration runs only when both NEXT_PUBLIC_FIREBASE_* config
// is present AND firebase web SDK is installed; otherwise we explain what
// the admin needs to wire up. (Server-side push is also a no-op until
// FIREBASE_SERVICE_ACCOUNT_JSON + the firebase-admin npm dep are installed.)

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'
import { supabase } from '@/lib/supabase'
import { enablePush } from '@/lib/firebase-client'

type PermState = 'unknown' | 'default' | 'granted' | 'denied' | 'unsupported'

// Detect iOS so we can show OS-appropriate guidance. iOS PWAs don't have
// per-site browser settings — re-enabling lives under iOS Settings →
// Notifications → BuddyAlly. Desktop browsers point to the lock-icon
// site settings flow instead.
function detectIsIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPad on iPadOS 13+ identifies as Mac with touch — catch it explicitly.
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)
}

export default function NotificationSettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { success, error: toastError, info } = useToast()
  const [push, setPush] = useState(true)
  const [email, setEmail] = useState(true)
  const [perm, setPerm] = useState<PermState>('unknown')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  // /api/diag tells us which env vars the deployment can actually see.
  // Used to render a real status block instead of a hardcoded "do this" notice.
  const [envStatus, setEnvStatus] = useState<Record<string, { present: boolean; length: number }> | null>(null)
  // Read once on mount; safe to use everywhere because UA doesn't change.
  const [isIOS, setIsIOS] = useState(false)
  useEffect(() => { setIsIOS(detectIsIOS()) }, [])

  // Hydrate from the profile when it loads. Treat null/undefined as ON
  // (default-allow) — same convention the notify API uses.
  useEffect(() => {
    if (!profile) return
    const p = profile as any
    setPush(p.notify_push_enabled !== false)
    setEmail(p.notify_email_enabled !== false)
  }, [profile])

  // Read browser permission state — and KEEP IT FRESH. iOS Settings can
  // toggle the permission underneath us; without re-polling, the badge
  // shows "Allowed" forever even after the user revoked at the OS level.
  // Strategy:
  //   1. Initial read on mount.
  //   2. Re-read whenever the tab regains focus or visibility (covers the
  //      case where the user switches to Settings, toggles, and comes back).
  //   3. Subscribe to the Permissions API onchange where available (Chrome/
  //      Edge — fires immediately, no polling needed).
  //   4. If we detect permission flipped from granted → anything else, also
  //      purge this user's FCM tokens so push can't try (and fail silently)
  //      to reach a device whose subscription is no longer valid.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) { setPerm('unsupported'); return }

    let lastSeen: PermState = Notification.permission as PermState
    setPerm(lastSeen)

    async function syncFromOs() {
      const next = (Notification.permission as PermState) || 'default'
      if (next !== lastSeen) {
        // If the user revoked at OS level, scrub the dead token from the DB
        // for this device. (Other devices for the same user are unaffected
        // because we only have THIS browser's notion of permission here.)
        if (lastSeen === 'granted' && next !== 'granted' && user) {
          await supabase.from('fcm_tokens').delete().eq('user_id', user.id)
          info('Browser permission was revoked — push token cleared.')
        }
        lastSeen = next
        setPerm(next)
      }
    }

    const onVis = () => { if (document.visibilityState === 'visible') void syncFromOs() }
    const onFocus = () => { void syncFromOs() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onFocus)

    // Permissions API gives us a live event in Chromium-based browsers.
    // Safari/iOS doesn't expose 'notifications' here yet, so the
    // visibilitychange path is the actual fallback for iPhone PWAs.
    let permStatus: PermissionStatus | null = null
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName }).then((status) => {
        permStatus = status
        status.onchange = () => { void syncFromOs() }
      }).catch(() => { /* not supported — visibilitychange covers it */ })
    }

    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
      if (permStatus) permStatus.onchange = null
    }
  }, [user])

  // Fetch env-var presence from /api/diag so the setup status box reflects
  // reality. Boolean presence only — values are never returned.
  useEffect(() => {
    fetch('/api/diag').then(r => r.json()).then(d => {
      if (d?.env_present) setEnvStatus(d.env_present)
    }).catch(() => {})
  }, [])

  async function saveToggles(next: { push?: boolean; email?: boolean }) {
    if (!user) return
    const newPush = next.push ?? push
    const newEmail = next.email ?? email
    const turningPushOff = next.push === false
    setSaving(true)
    setPush(newPush); setEmail(newEmail) // optimistic
    const { error } = await supabase
      .from('profiles')
      .update({ notify_push_enabled: newPush, notify_email_enabled: newEmail })
      .eq('id', user.id)
    if (!error && turningPushOff) {
      // Belt-and-suspenders: turning push OFF should also drop this user's
      // FCM tokens so even a buggy fanout that ignores notify_push_enabled
      // can't reach the device. The user re-registers cleanly when they
      // tap "Enable browser push" again.
      await supabase.from('fcm_tokens').delete().eq('user_id', user.id)
    }
    setSaving(false)
    if (error) {
      toastError('Could not save: ' + error.message + ' (your DB may need notify_* columns added — see ADMIN block below)')
    } else {
      success(turningPushOff ? 'Push turned off — devices unsubscribed' : 'Saved')
      await refreshProfile?.()
    }
  }

  async function requestBrowserPermission() {
    if (!user) return
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toastError('This browser does not support notifications.')
      return
    }
    // Full FCM enable flow: SW register → permission prompt → getToken().
    const result = await enablePush()
    if (result.ok) {
      // Persist the token. Upsert by token so a re-enable on the same
      // browser doesn't insert duplicates. RLS policy must allow users
      // to write their own row.
      // Composite unique constraint in the schema is (user_id, token).
      // Re-enabling on the same device produces the same token → upsert
      // collapses cleanly into the existing row instead of duplicating.
      const { error } = await supabase
        .from('fcm_tokens')
        .upsert(
          { user_id: user.id, token: result.token },
          { onConflict: 'user_id,token' },
        )
      setPerm('granted')
      if (error) {
        toastError('Permission granted but token save failed: ' + error.message)
      } else {
        success('Push enabled — you will now receive notifications.')
      }
    } else {
      // Reflect the underlying state so the badge updates accurately.
      if (typeof Notification !== 'undefined') setPerm(Notification.permission as PermState)
      switch (result.reason) {
        case 'unsupported':
          toastError('This browser does not support web push.')
          break
        case 'permission_denied':
          toastError(isIOS
            ? 'Permission denied. Open iOS Settings → Notifications → BuddyAlly → turn on Allow Notifications, then come back.'
            : 'Permission denied. Click the lock icon in your browser\'s address bar → Site settings → Notifications → Allow.')
          break
        case 'no_vapid':
          toastError('Push not configured: NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing in this deployment.')
          break
        case 'sw_failed':
          toastError('Service worker failed to register: ' + (result.detail || ''))
          break
        case 'token_failed':
          toastError('Could not get a push token: ' + (result.detail || ''))
          break
      }
      info('No change.')
    }
  }

  async function sendTest() {
    if (!user) return
    setTesting(true)
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          type: 'test',
          title: 'BuddyAlly test notification',
          body: 'If you see this, in-app notifications are working.',
        }),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) {
        toastError('Test failed: ' + (out.error || res.statusText))
        return
      }
      // Surface the *actual* push delivery result, not just "API call OK".
      // out.push is set by /api/notify → sendFcm():
      //   'sent'                       → at least one device targeted
      //   'skipped_no_fcm'             → server has no FIREBASE_SERVICE_ACCOUNT_JSON
      //   'skipped_no_tokens'          → no fcm_tokens row for this user
      //   'skipped_disabled_by_owner'  → master push toggle is off
      //   'fcm_error'                  → admin.messaging() threw
      switch (out.push) {
        case 'sent':
          success(`Push: ${out.success || 0} delivered, ${out.failure || 0} failed${out.pruned ? `, ${out.pruned} dead tokens removed` : ''}. In-app bell also lit.`)
          break
        case 'skipped_no_tokens':
          toastError('No devices registered for push. Tap "Enable browser push" first (must be done from each device that should receive notifications).')
          break
        case 'skipped_no_fcm':
          toastError('Server can\'t send push: FIREBASE_SERVICE_ACCOUNT_JSON missing in deployment.')
          break
        case 'skipped_disabled_by_owner':
          toastError('Push is off in your settings — flip the master toggle on first.')
          break
        case 'fcm_error':
          toastError('FCM send failed: ' + (out.detail || 'unknown'))
          break
        default:
          success('Test fired — in-app bell lit. Push status: ' + (out.push || 'unknown'))
      }
    } catch (e: any) {
      toastError('Test failed: ' + e.message)
    } finally {
      setTesting(false)
    }
  }

  if (!user) return null

  // Master push toggle overrides the OS-level permission display. If the
  // user has push turned OFF in their settings, the badge says "off in your
  // settings" regardless of whether the browser still has permission. This
  // matches what actually happens (no push fans out) and avoids the "I
  // turned it off, why does it still say allowed?" confusion.
  const permBadge = (() => {
    if (!push) return { label: 'Push is off in your settings (toggle above)', bg: '#F3F4F6', fg: '#374151' }
    switch (perm) {
      case 'granted':     return { label: '✓ Allowed in this browser',     bg: '#F0FDF4', fg: '#166534' }
      case 'denied':      return { label: '✕ Blocked in this browser',     bg: '#FEF2F2', fg: '#991B1B' }
      case 'default':     return { label: 'Permission not yet requested',  bg: '#FEF3C7', fg: '#92400E' }
      case 'unsupported': return { label: 'Not supported in this browser', bg: '#F3F4F6', fg: '#374151' }
      default:            return { label: 'Checking…',                     bg: '#F3F4F6', fg: '#374151' }
    }
  })()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Link href="/dashboard/profile" style={{ color: '#3293CB', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>← Profile</Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Notification Settings</h1>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
        Control how BuddyAlly reaches you when there's a contact-code message,
        a message from a buddy, or an alert.
      </p>

      {/* Master toggles */}
      <section style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Where we reach you</h3>

        <ToggleRow
          label="Push notifications"
          help="Real-time pings on your phone or browser."
          checked={push}
          onChange={(v) => saveToggles({ push: v })}
          saving={saving}
        />
        <div style={{ height: 1, background: '#F3F4F6', margin: '12px 0' }} />
        <ToggleRow
          label="Email notifications"
          help="Sent to the email on your account."
          checked={email}
          onChange={(v) => saveToggles({ email: v })}
          saving={saving}
        />

        <p style={{ fontSize: 12, color: '#6B7280', marginTop: 12, lineHeight: 1.5 }}>
          These are master switches. Each contact code can also have its own
          push / email toggle on the <Link href="/dashboard/codes" style={{ color: '#3293CB', fontWeight: 700 }}>My Codes</Link> page.
        </p>
      </section>

      {/* Browser permission */}
      <section style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Browser push permission</h3>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 1.5 }}>
          Even with push enabled above, the browser itself must grant
          permission for this site. You only have to do this once per device.
        </p>
        <span style={{
          display: 'inline-block', padding: '6px 12px', borderRadius: 999,
          fontSize: 12, fontWeight: 700, background: permBadge.bg, color: permBadge.fg, marginBottom: 12,
        }}>{permBadge.label}</span>
        <div>
          {/* Button stays clickable when perm === 'granted' — re-tapping
              re-runs the FCM token registration, which is what you want
              if the token was purged (revoke→re-enable cycle, v1 leftover,
              new device, etc.). enablePush() is idempotent: calling it on
              an already-permitted browser just refreshes the token. */}
          <button
            onClick={requestBrowserPermission}
            disabled={!push || perm === 'unsupported' || perm === 'denied'}
            style={{
              padding: '10px 18px', borderRadius: 12, border: 'none',
              background: (!push || perm === 'unsupported' || perm === 'denied') ? '#E5E7EB' : '#3293CB',
              color: (!push || perm === 'unsupported' || perm === 'denied') ? '#9CA3AF' : '#fff',
              fontWeight: 700, fontSize: 13, cursor: (!push || perm === 'unsupported' || perm === 'denied') ? 'default' : 'pointer',
            }}
          >
            {!push ? 'Turn push on first'
              : perm === 'unsupported' ? 'Browser not supported'
              : perm === 'denied' ? 'Blocked — re-enable above'
              : perm === 'granted' ? 'Re-register this device'
              : 'Enable browser push'}
          </button>
        </div>
        {perm === 'denied' && (
          <p style={{ fontSize: 12, color: '#991B1B', marginTop: 10, lineHeight: 1.5 }}>
            {isIOS ? (
              <>
                You blocked notifications previously. Open <b>iOS Settings →
                Notifications → BuddyAlly</b> and turn on <b>Allow
                Notifications</b>, then come back to this page.
              </>
            ) : (
              <>
                You blocked notifications previously. Click the lock icon in
                your browser's address bar → <b>Site settings → Notifications
                → Allow</b>, then refresh.
              </>
            )}
          </p>
        )}
      </section>

      {/* Test send */}
      <section style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Test it</h3>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 1.5 }}>
          Sends an in-app notification to your account so you can verify it
          shows up under the bell (Alerts).
        </p>
        <button
          onClick={sendTest}
          disabled={testing}
          style={{
            padding: '10px 18px', borderRadius: 12, border: 'none',
            background: '#0EA5E9', color: '#fff',
            fontWeight: 700, fontSize: 13, cursor: testing ? 'wait' : 'pointer',
          }}
        >
          {testing ? 'Sending…' : 'Send test notification'}
        </button>
      </section>

      {/* Admin / setup status — driven by /api/diag so it reflects reality
          rather than restating a hardcoded checklist. Only renders for
          admins, and only renders the *missing* requirements. If everything
          is present, the box flips green and disappears for non-admins. */}
      <SetupStatus envStatus={envStatus} isAdmin={(profile as any)?.is_admin === true} />
    </div>
  )
}

// Required vars for push to work end-to-end. Email is optional (degrades
// gracefully if missing — see /api/notify).
const REQUIRED_PUSH_KEYS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
] as const
const OPTIONAL_PUSH_KEYS = ['RESEND_API_KEY'] as const

function SetupStatus({ envStatus, isAdmin }: { envStatus: Record<string, { present: boolean; length: number }> | null; isAdmin: boolean }) {
  if (!envStatus) return null
  const missing = REQUIRED_PUSH_KEYS.filter(k => !envStatus[k]?.present)
  const allGood = missing.length === 0

  // Non-admins: hide entirely once setup is complete; show a tiny note while pending.
  if (!isAdmin && allGood) return null

  if (allGood) {
    return (
      <section style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 16, padding: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, color: '#166534' }}>✓ Push fully configured</h3>
        <p style={{ fontSize: 12, color: '#14532D', margin: 0, lineHeight: 1.6 }}>
          All Firebase env vars present in the production deployment. Click "Enable browser push" above and then "Send test notification" to verify end-to-end delivery on this device.
        </p>
      </section>
    )
  }

  return (
    <section style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 16, padding: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 6, color: '#92400E' }}>
        Admin · {missing.length} env var{missing.length === 1 ? '' : 's'} missing
      </h3>
      <p style={{ fontSize: 12, color: '#78350F', marginBottom: 8, lineHeight: 1.6 }}>
        Add the following in Vercel → Project Settings → Environment Variables (scope: Production, Preview, Development), then redeploy:
      </p>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#78350F', lineHeight: 1.7 }}>
        {missing.map(k => <li key={k}><code>{k}</code></li>)}
      </ul>
      {OPTIONAL_PUSH_KEYS.some(k => !envStatus[k]?.present) && (
        <p style={{ fontSize: 11, color: '#92400E', marginTop: 8, lineHeight: 1.6 }}>
          <i>Optional:</i> {OPTIONAL_PUSH_KEYS.filter(k => !envStatus[k]?.present).join(', ')} for email delivery.
        </p>
      )}
    </section>
  )
}

function ToggleRow({
  label, help, checked, onChange, saving,
}: {
  label: string; help: string; checked: boolean; onChange: (v: boolean) => void; saving: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{help}</p>
      </div>
      <button
        type="button"
        onClick={() => !saving && onChange(!checked)}
        aria-pressed={checked}
        style={{
          width: 48, height: 28, borderRadius: 999, border: 'none',
          background: checked ? '#3293CB' : '#D1D5DB',
          position: 'relative', cursor: saving ? 'wait' : 'pointer', flexShrink: 0,
          transition: 'background 0.15s',
        }}
      >
        <span
          style={{
            position: 'absolute', top: 3, left: checked ? 23 : 3,
            width: 22, height: 22, borderRadius: '50%', background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
            transition: 'left 0.15s',
          }}
        />
      </button>
    </div>
  )
}
