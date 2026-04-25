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

type PermState = 'unknown' | 'default' | 'granted' | 'denied' | 'unsupported'

export default function NotificationSettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { success, error: toastError, info } = useToast()
  const [push, setPush] = useState(true)
  const [email, setEmail] = useState(true)
  const [perm, setPerm] = useState<PermState>('unknown')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  // Hydrate from the profile when it loads. Treat null/undefined as ON
  // (default-allow) — same convention the notify API uses.
  useEffect(() => {
    if (!profile) return
    const p = profile as any
    setPush(p.notify_push_enabled !== false)
    setEmail(p.notify_email_enabled !== false)
  }, [profile])

  // Read browser permission state once on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) { setPerm('unsupported'); return }
    setPerm(Notification.permission as PermState)
  }, [])

  async function saveToggles(next: { push?: boolean; email?: boolean }) {
    if (!user) return
    const newPush = next.push ?? push
    const newEmail = next.email ?? email
    setSaving(true)
    setPush(newPush); setEmail(newEmail) // optimistic
    const { error } = await supabase
      .from('profiles')
      .update({ notify_push_enabled: newPush, notify_email_enabled: newEmail })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      toastError('Could not save: ' + error.message + ' (your DB may need notify_* columns added — see ADMIN block below)')
    } else {
      success('Saved')
      await refreshProfile?.()
    }
  }

  async function requestBrowserPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toastError('This browser does not support notifications.')
      return
    }
    const result = await Notification.requestPermission()
    setPerm(result as PermState)
    if (result === 'granted') {
      success('Permission granted. You will now receive push notifications when configured.')
      // TODO once firebase web SDK is installed: getMessaging() →
      // getToken() → upsert into fcm_tokens(user_id, token).
    } else if (result === 'denied') {
      toastError('Permission denied. Re-enable from your browser site settings.')
    } else {
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
      if (res.ok) {
        success('Test sent — check the bell icon (Alerts).')
      } else {
        toastError('Test failed: ' + (out.error || res.statusText))
      }
    } catch (e: any) {
      toastError('Test failed: ' + e.message)
    } finally {
      setTesting(false)
    }
  }

  if (!user) return null

  const permBadge = (() => {
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
          <button
            onClick={requestBrowserPermission}
            disabled={perm === 'unsupported' || perm === 'granted'}
            style={{
              padding: '10px 18px', borderRadius: 12, border: 'none',
              background: (perm === 'unsupported' || perm === 'granted') ? '#E5E7EB' : '#3293CB',
              color: (perm === 'unsupported' || perm === 'granted') ? '#9CA3AF' : '#fff',
              fontWeight: 700, fontSize: 13, cursor: (perm === 'unsupported' || perm === 'granted') ? 'default' : 'pointer',
            }}
          >
            {perm === 'granted' ? 'Already allowed' : perm === 'unsupported' ? 'Browser not supported' : 'Enable browser push'}
          </button>
        </div>
        {perm === 'denied' && (
          <p style={{ fontSize: 12, color: '#991B1B', marginTop: 10, lineHeight: 1.5 }}>
            You blocked notifications previously. Click the lock icon in your
            browser's address bar → Site settings → Notifications → Allow,
            then refresh.
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

      {/* Admin / setup status */}
      <section style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 16, padding: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 6, color: '#92400E' }}>Admin · Push delivery checklist</h3>
        <p style={{ fontSize: 12, color: '#78350F', marginBottom: 8, lineHeight: 1.6 }}>
          For real push delivery (and per-account toggles to persist), the
          following must be in place:
        </p>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#78350F', lineHeight: 1.7 }}>
          <li><b>DB columns</b>: <code>profiles.notify_push_enabled boolean default true</code> and <code>profiles.notify_email_enabled boolean default true</code></li>
          <li><b>FCM tokens table</b>: <code>fcm_tokens (user_id uuid, token text, created_at timestamptz)</code></li>
          <li><b>Server env</b>: <code>FIREBASE_SERVICE_ACCOUNT_JSON</code>, <code>RESEND_API_KEY</code> (for email)</li>
          <li><b>Server dep</b>: <code>npm i firebase-admin</code> (currently missing — build log warns about it)</li>
          <li><b>Client env</b>: <code>NEXT_PUBLIC_FIREBASE_*</code> (apiKey, authDomain, projectId, messagingSenderId, appId, vapidKey)</li>
          <li><b>Client dep</b>: <code>npm i firebase</code> + <code>/public/firebase-messaging-sw.js</code></li>
        </ul>
      </section>
    </div>
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
