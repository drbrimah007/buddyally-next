'use client'

// Install BuddyAlly modal — platform-aware visual walkthrough.
//
// Why a modal (not just a button): on iOS Safari there is no install prompt
// API. The user has to tap Share → Add to Home Screen manually, so they need
// step-by-step instructions with the actual icons they'll see. Other modals
// in the app shipped before this one and kept popping up because they
// (a) only checked beforeinstallprompt, (b) didn't recognize iOS standalone,
// and (c) only stored a per-tab flag instead of localStorage. This file
// fixes all three by leaning on PWAProvider's persisted detection.
//
// Three exit paths from the modal:
//   • Native install (Android/Desktop with beforeinstallprompt queued)
//   • "I've installed it" → marks app installed forever (sticks across visits)
//   • "Remind me later"  → snoozes the auto-popup for 30 days
// Plus an X close which is a no-op (the page-load gate prevents re-show
// later in the same session anyway).

import { useState } from 'react'
import { usePWA } from './PWAProvider'

const SNOOZE_KEY = 'ba_install_snoozed_until'

type Platform = 'ios' | 'android' | 'desktop' | 'unknown'

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Macintosh|Windows|Linux/.test(ua)) return 'desktop'
  return 'unknown'
}

export default function InstallAppModal({ onClose }: { onClose: () => void }) {
  const { canInstall, install, markInstalled } = usePWA()
  const [busy, setBusy] = useState(false)
  const platform = detectPlatform()

  async function tryNative() {
    setBusy(true)
    const out = await install()
    setBusy(false)
    if (out === 'accepted') {
      // PWAProvider listens for `appinstalled` and sets the sticky flag.
      onClose()
    }
    // If 'unsupported' or 'dismissed', leave the modal open so the user can
    // follow the manual instructions instead.
  }

  function handleInstalled() {
    markInstalled()
    try { localStorage.removeItem(SNOOZE_KEY) } catch {}
    onClose()
  }

  function handleSnooze() {
    const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    try { localStorage.setItem(SNOOZE_KEY, until) } catch {}
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
        zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 0,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', width: '100%', maxWidth: 540,
          borderTopLeftRadius: 22, borderTopRightRadius: 22,
          padding: '18px 18px max(20px, env(safe-area-inset-bottom))',
          maxHeight: '92vh', overflowY: 'auto',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ width: 38, height: 4, background: '#E5E7EB', borderRadius: 4, margin: '0 auto 14px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/buddyally-logo.png" alt="" style={{ width: 40, height: 40, borderRadius: 10 }} />
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Install BuddyAlly</h3>
              <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>One tap from your home screen — no app store.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={closeBtn}>×</button>
        </div>

        {platform === 'ios' && <IOSSteps />}
        {platform === 'android' && <AndroidSteps canInstall={canInstall} onTryNative={tryNative} busy={busy} />}
        {platform === 'desktop' && <DesktopSteps canInstall={canInstall} onTryNative={tryNative} busy={busy} />}
        {platform === 'unknown' && <GenericSteps />}

        {/* Why install — short, helps motivate following the steps */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, marginTop: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#0652B7', marginBottom: 4 }}>Why install</p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
            <li>Opens fullscreen, no Safari toolbar</li>
            <li>Push notifications for messages and code pings</li>
            <li>Faster cold starts</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={handleInstalled} style={{ ...btn, background: '#3293CB', color: '#fff', flex: 1 }}>
            ✓ I&apos;ve installed it
          </button>
          <button onClick={handleSnooze} style={{ ...btn, background: '#fff', border: '1px solid #E5E7EB', color: '#374151' }}>
            Remind me later
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 10 }}>
          Tap &ldquo;I&apos;ve installed it&rdquo; once you&apos;ve added the icon to your home screen — we won&apos;t ask again.
        </p>
      </div>
    </div>
  )
}

// ─── Platform sections ───────────────────────────────────────────

function IOSSteps() {
  return (
    <div style={{ marginTop: 6 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
        On your iPhone (Safari):
      </p>
      <Step number={1} title="Tap the Share button">
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
          It&apos;s in the bar at the bottom of Safari (or top on iPad). Looks like:
        </p>
        <span style={iconChip}>
          <ShareIcon />
        </span>
      </Step>

      <Step number={2} title="Scroll and tap “Add to Home Screen”">
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
          You&apos;ll see this row in the share sheet:
        </p>
        <span style={iconChip}>
          <PlusBoxIcon />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginLeft: 8 }}>Add to Home Screen</span>
        </span>
      </Step>

      <Step number={3} title="Tap “Add” in the top-right">
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
          The BuddyAlly icon will appear on your home screen. Open the app from there to get push notifications and fullscreen mode.
        </p>
      </Step>

      <p style={{ fontSize: 12, color: '#92400E', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 10, padding: 10, marginTop: 8, lineHeight: 1.5 }}>
        💡 Must be Safari, not Chrome — iOS only allows installing from Safari.
      </p>
    </div>
  )
}

function AndroidSteps({ canInstall, onTryNative, busy }: { canInstall: boolean; onTryNative: () => void; busy: boolean }) {
  return (
    <div style={{ marginTop: 6 }}>
      {canInstall && (
        <button onClick={onTryNative} disabled={busy} style={{ ...btn, background: '#3293CB', color: '#fff', width: '100%', marginBottom: 12 }}>
          {busy ? 'Opening…' : 'Install now (one tap)'}
        </button>
      )}

      <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
        Or do it manually in Chrome:
      </p>
      <Step number={1} title="Tap the menu (⋮) in the top-right">
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
          The three vertical dots, next to the address bar.
        </p>
      </Step>
      <Step number={2} title="Tap “Install app” or “Add to Home screen”">
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
          Confirm the prompt — the BuddyAlly icon appears on your home screen.
        </p>
      </Step>
    </div>
  )
}

function DesktopSteps({ canInstall, onTryNative, busy }: { canInstall: boolean; onTryNative: () => void; busy: boolean }) {
  return (
    <div style={{ marginTop: 6 }}>
      {canInstall && (
        <button onClick={onTryNative} disabled={busy} style={{ ...btn, background: '#3293CB', color: '#fff', width: '100%', marginBottom: 12 }}>
          {busy ? 'Opening…' : 'Install BuddyAlly'}
        </button>
      )}
      <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
        Look for the install icon (a small monitor with a down-arrow) at the right
        end of the address bar in Chrome or Edge. Click it to add BuddyAlly as a desktop app.
      </p>
    </div>
  )
}

function GenericSteps() {
  return (
    <div style={{ marginTop: 6 }}>
      <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
        Look for an install icon in your browser&apos;s address bar or menu —
        it&apos;s usually called &ldquo;Install app&rdquo; or &ldquo;Add to Home screen&rdquo;.
      </p>
    </div>
  )
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
      <div style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
        background: '#3293CB', color: '#fff',
        display: 'grid', placeItems: 'center',
        fontSize: 13, fontWeight: 800,
      }}>{number}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '4px 0 6px' }}>{title}</p>
        {children}
      </div>
    </div>
  )
}

// ─── SVG icons (mimic Apple's iconography) ────────────────────────

function ShareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3293CB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4" />
      <polyline points="7 9 12 4 17 9" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  )
}

function PlusBoxIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3293CB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

// ─── Styles ───────────────────────────────────────────────────────

const btn: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 12, border: 'none',
  fontWeight: 700, fontSize: 14, cursor: 'pointer',
}
const closeBtn: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 24, cursor: 'pointer',
  color: '#9CA3AF', padding: 0, lineHeight: 1, width: 28, height: 28,
}
const iconChip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  background: '#F1F5F9', border: '1px solid #E2E8F0',
  borderRadius: 10, padding: '6px 10px', marginTop: 8,
}
