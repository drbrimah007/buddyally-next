'use client'

// Tiny, drop-in share button. Uses the native Web Share API when available
// (iOS / Android / Chrome desktop), falls back to a popover with explicit
// channels (copy link, WhatsApp, SMS, Email, X) so desktop browsers without
// navigator.share still get a useful share UI.

import { useEffect, useRef, useState } from 'react'

type Props = {
  url: string                  // absolute URL to share
  title?: string               // headline (used by native share + as title in fallback)
  text?: string                // short body / description
  label?: string               // optional visible text next to the icon
  className?: string           // optional override for the trigger button
}

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
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
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

  async function trigger(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    // Prefer native share when present (iOS / Android / Chrome).
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text, url })
        return
      } catch {
        // user cancelled — fall through silently
      }
    }
    setOpen(o => !o)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  // Channel URLs
  const enc = encodeURIComponent
  const shareText = text ? `${title} — ${text}\n${url}` : `${title}\n${url}`
  const channels: { label: string; href: string; emoji: string }[] = [
    { label: 'WhatsApp', emoji: '🟢', href: `https://wa.me/?text=${enc(shareText)}` },
    { label: 'SMS',      emoji: '💬', href: `sms:?&body=${enc(shareText)}` },
    { label: 'Email',    emoji: '✉️', href: `mailto:?subject=${enc(title)}&body=${enc(shareText)}` },
    { label: 'X',        emoji: '𝕏',  href: `https://twitter.com/intent/tweet?text=${enc(text || title)}&url=${enc(url)}` },
  ]

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
                padding: label ? '6px 10px' : 0,
                width: label ? 'auto' : 30, height: 30,
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

      {open && (
        <div
          ref={popRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 60,
            minWidth: 180, background: '#fff',
            border: '1px solid #E5E7EB', borderRadius: 12,
            boxShadow: '0 12px 28px rgba(15,23,42,0.12)',
            padding: 6, display: 'flex', flexDirection: 'column',
          }}
        >
          <button
            type="button"
            onClick={copy}
            style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: copied ? '#059669' : '#111827' }}
          >
            {copied ? '✓ Link copied' : '🔗 Copy link'}
          </button>
          {channels.map(c => (
            <a
              key={c.label}
              href={c.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#111827', textDecoration: 'none' }}
            >
              <span style={{ marginRight: 8 }}>{c.emoji}</span>{c.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
