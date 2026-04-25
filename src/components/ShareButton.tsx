'use client'

// Modern share popover. The visible URL is the *short* form
// (buddyally.com/s/aB3xK9), minted lazily the first time a user opens
// the popover for a given destination. Re-opens reuse the same code.
//
// Layout: prominent URL field with a one-tap Copy button, then a row of
// named channels (Copy / WhatsApp / SMS / Email / X), then "More options"
// for the OS share sheet (AirDrop / Telegram / Slack / etc.).
//
// Render mode adapts to viewport so the panel never gets clipped:
//   • mobile (<= 640px) → bottom sheet with backdrop
//   • desktop with room below → popover anchored below the trigger
//   • desktop low on screen → popover anchored ABOVE the trigger
//
// (Previously the popover always opened DOWN, so when the trigger was
// near the bottom of the viewport the panel slid off-screen.)

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getOrMintShortLink } from '@/lib/short-link'

type Props = {
  url: string                  // absolute long URL to share (will be shortened on first open)
  title?: string               // headline (used by native share + as title in fallback)
  text?: string                // short body / description
  label?: string               // optional visible text next to the icon
  className?: string           // optional override for the trigger button
}

type Channel = { label: string; href: string; emoji: string; color: string }

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

export default function ShareButton({ url, title = 'BuddyAlly', text = '', label, className }: Props) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shortUrl, setShortUrl] = useState<string | null>(null)
  const [minting, setMinting] = useState(false)
  const [mode, setMode] = useState<'desktop-down' | 'desktop-up' | 'mobile-sheet'>('desktop-down')
  const popRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  // Outside click + Escape close
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent | TouchEvent) {
      const t = e.target as Node | null
      if (popRef.current?.contains(t!) || triggerRef.current?.contains(t!)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Mint a short URL the first time the popover opens. Cached for the
  // lifetime of this mounted component. Falls back to the long URL on error.
  useEffect(() => {
    if (!open || shortUrl) return
    setMinting(true)
    getOrMintShortLink(url, user?.id).then((s) => {
      setShortUrl(s)
      setMinting(false)
    }).catch(() => {
      setShortUrl(url)
      setMinting(false)
    })
  }, [open, shortUrl, url, user?.id])

  // Pick render mode each open + on resize. Mobile width → bottom sheet.
  // Desktop with < 360px below the trigger → flip up. Otherwise → down.
  useEffect(() => {
    if (!open) return
    function compute() {
      if (typeof window === 'undefined') return
      if (window.matchMedia('(max-width: 640px)').matches) {
        setMode('mobile-sheet')
        return
      }
      const trig = triggerRef.current
      if (!trig) { setMode('desktop-down'); return }
      const rect = trig.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setMode(spaceBelow < 360 ? 'desktop-up' : 'desktop-down')
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [open])

  const effectiveUrl = shortUrl || url
  const displayUrl = effectiveUrl.replace(/^https?:\/\//, '')

  function trigger(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    setOpen((o) => !o)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(effectiveUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  async function nativeShare() {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text, url: effectiveUrl })
        setOpen(false)
      } catch { /* cancelled */ }
    }
  }

  const enc = encodeURIComponent
  const shareText = text ? `${title} — ${text}\n${effectiveUrl}` : `${title}\n${effectiveUrl}`
  const channels: Channel[] = [
    { label: 'WhatsApp', emoji: '🟢', color: '#25D366', href: `https://wa.me/?text=${enc(shareText)}` },
    { label: 'SMS',      emoji: '💬', color: '#3293CB', href: `sms:?&body=${enc(shareText)}` },
    { label: 'Email',    emoji: '✉️', color: '#475569', href: `mailto:?subject=${enc(title)}&body=${enc(shareText)}` },
    { label: 'X',        emoji: '𝕏',  color: '#0F172A', href: `https://twitter.com/intent/tweet?text=${enc(text || title)}&url=${enc(effectiveUrl)}` },
  ]

  const panelProps = { minting, displayUrl, effectiveUrl, copied, copy, channels, setOpen, nativeShare }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={trigger}
        title="Share"
        aria-label="Share"
        className={className}
        style={
          className
            ? undefined
            : {
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: label ? '6px 12px' : 0,
                width: label ? 'auto' : 32, height: 32,
                justifyContent: 'center',
                borderRadius: 999,
                background: '#F1F5F9', color: '#3293CB',
                border: '1px solid #E2E8F0',
                fontSize: 12, fontWeight: 700,
                cursor: 'pointer',
              }
        }
      >
        <ShareIcon />
        {label && <span>{label}</span>}
      </button>

      {open && mode === 'mobile-sheet' && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 240,
            background: 'rgba(15,23,42,0.55)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            ref={popRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 540, background: '#fff',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              padding: '14px 14px max(18px, env(safe-area-inset-bottom))',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.18)',
              maxHeight: '85vh', overflowY: 'auto',
            }}
          >
            <div style={{ width: 36, height: 4, background: '#E5E7EB', borderRadius: 4, margin: '0 auto 12px' }} />
            <PanelContents {...panelProps} />
          </div>
        </div>
      )}

      {open && mode !== 'mobile-sheet' && (
        <div
          ref={popRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            ...(mode === 'desktop-up'
              ? { bottom: 'calc(100% + 8px)' }
              : { top: 'calc(100% + 8px)' }),
            right: 0, zIndex: 60,
            width: 320, background: '#fff',
            border: '1px solid #E5E7EB', borderRadius: 16,
            boxShadow: '0 16px 40px rgba(15,23,42,0.18)',
            padding: 14,
          }}
        >
          <PanelContents {...panelProps} />
        </div>
      )}
    </div>
  )
}

// Shared panel body — identical content for both render modes.
function PanelContents({
  minting, displayUrl, effectiveUrl, copied, copy, channels, setOpen, nativeShare,
}: {
  minting: boolean
  displayUrl: string
  effectiveUrl: string
  copied: boolean
  copy: () => void
  channels: Channel[]
  setOpen: (v: boolean) => void
  nativeShare: () => void
}) {
  return (
    <>
      <p style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Share link</p>
      <div style={{
        display: 'flex', alignItems: 'stretch',
        background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div
          style={{
            flex: 1, minWidth: 0, padding: '10px 12px',
            fontSize: 13, fontWeight: 600, color: '#0F172A',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center',
          }}
          title={effectiveUrl}
        >
          {minting ? <span style={{ color: '#94A3B8' }}>Generating short link…</span> : displayUrl}
        </div>
        <button
          type="button"
          onClick={copy}
          disabled={minting}
          style={{
            padding: '0 14px', borderLeft: '1px solid #E2E8F0', border: 'none',
            background: copied ? '#059669' : '#3293CB', color: '#fff',
            fontWeight: 800, fontSize: 12, cursor: minting ? 'wait' : 'pointer',
            minWidth: 72,
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <p style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 8px' }}>Send via</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {channels.map((c) => (
          <a
            key={c.label}
            href={c.href}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '10px 4px', borderRadius: 12,
              background: '#F8FAFC', border: '1px solid #E2E8F0',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1, color: c.color }}>{c.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{c.label}</span>
          </a>
        ))}
      </div>

      {typeof navigator !== 'undefined' && (navigator as any).share && (
        <button
          type="button"
          onClick={nativeShare}
          style={{
            marginTop: 10, width: '100%', padding: '10px 12px',
            borderRadius: 10, border: '1px solid #E2E8F0',
            background: '#fff', color: '#374151',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          ⋯ More options (AirDrop, Telegram…)
        </button>
      )}
    </>
  )
}
