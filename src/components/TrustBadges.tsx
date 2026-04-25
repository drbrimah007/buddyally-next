'use client'

// TrustBadges — site-wide trust layer pills.
//
// Three earnable signals, fixed visual order:
//   1. ✔ Buddy Verified  — selfie liveness pass
//   2. ◎ Buddy Line      — joined through a trusted invite path
//   3. 🛡 ID Verified     — third-party KYC pass
//
// Order is intentional (verification → network trust → identity assurance).
// Never re-sort by earning order or alphabetically — see /trust-and-safety
// section for the full naming/copy contract.
//
// Two variants:
//   • "full" — pill with icon + label. For profile headers, summary sheets.
//   • "compact" — icon-only. For activity/member cards and DM headers.
//
// Interaction:
//   • Hover (desktop) on any pill → native title tooltip with the exact
//     spec copy ("Email, phone, and selfie liveness all confirmed.",
//     "Joined through a trusted invite path.", etc).
//   • Tap on a pill (mobile or click on desktop) → opens the Trust & Safety
//     Summary bottom sheet. We intentionally collapse single-badge sheet
//     and multi-badge sheet into one component — fewer touch-target
//     ambiguities, identical content shape.
//   • Optional "Learn how trust works →" micro-link at the end of the row
//     when `showLearnMore` is set — also opens the summary sheet.
//
// CRITICAL privacy:
//   • Never render the inviter, root, or chain depth. The `Buddy Line`
//     tooltip is fixed-string — no [N]-link template, no depth exposure.
//   • All fields the badges depend on come from `profile_public` view,
//     which strips lineage / trust_weight / invite_code_id at the DB layer.

import { useState } from 'react'
import Link from 'next/link'

export type TrustBadgesProps = {
  buddyVerifiedAt?: string | null
  isInvited?: boolean | null         // = true if invited_by_user_id IS NOT NULL
  idVerifiedAt?: string | null
  /** "full" = icon + label pill. "compact" = icon-only chip. */
  variant?: 'full' | 'compact'
  /** Render the small "Learn how trust works →" micro-link after the row. */
  showLearnMore?: boolean
  /** Optional className passthrough for the wrapping row. */
  className?: string
  /** Override the row gap (default 6). */
  gap?: number
}

type Earned = {
  key: 'verified' | 'line' | 'id'
  label: string
  iconText: string             // placeholder rendering of the icon
  tooltip: string
  bg: string
  fg: string
}

export default function TrustBadges({
  buddyVerifiedAt, isInvited, idVerifiedAt,
  variant = 'compact', showLearnMore = false, className, gap = 6,
}: TrustBadgesProps) {
  const [open, setOpen] = useState(false)

  // Compute earned badges in fixed order. Drop anything not earned —
  // unverified accounts wear no badge at all (spec §10).
  const earned: Earned[] = []
  if (buddyVerifiedAt) {
    earned.push({
      key: 'verified',
      label: 'Buddy Verified',
      iconText: '✔',
      tooltip: 'Email, phone (SMS or WhatsApp), and selfie liveness all confirmed.',
      bg: '#ECFDF5', fg: '#065F46',
    })
  }
  if (isInvited) {
    earned.push({
      key: 'line',
      label: 'Buddy Line',
      // Placeholder for the custom linked-nodes glyph. Designer will
      // replace with the SVG mark before broad launch.
      iconText: '◎',
      tooltip: 'Joined through a trusted invite path.',
      bg: '#EFF6FF', fg: '#0652B7',
    })
  }
  if (idVerifiedAt) {
    earned.push({
      key: 'id',
      label: 'ID Verified',
      iconText: '🛡',
      tooltip: 'Identity confirmed through secure ID verification.',
      bg: '#FEF3C7', fg: '#92400E',
    })
  }

  if (earned.length === 0) return null

  return (
    <>
      <div
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap,
          flexWrap: 'wrap',
        }}
      >
        {earned.map((b) => (
          <button
            key={b.key}
            type="button"
            title={b.tooltip}
            aria-label={`${b.label}: ${b.tooltip}`}
            onClick={(e) => { e.stopPropagation(); setOpen(true) }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: variant === 'full' ? '4px 9px' : '3px 6px',
              borderRadius: 999,
              background: b.bg, color: b.fg,
              fontSize: variant === 'full' ? 11 : 11,
              fontWeight: 800,
              border: '1px solid rgba(15,23,42,0.04)',
              cursor: 'pointer',
              lineHeight: 1.2,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: variant === 'full' ? 12 : 12 }}>
              {b.iconText}
            </span>
            {variant === 'full' && <span>{b.label}</span>}
          </button>
        ))}

        {showLearnMore && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen(true) }}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 11, fontWeight: 700, color: '#3293CB',
              cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            Learn how trust works →
          </button>
        )}
      </div>

      {open && (
        <TrustSummarySheet
          earned={earned}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── Unified Trust & Safety Summary sheet ─────────────────────────
// Renders a bottom sheet listing every badge the user has earned (in
// fixed order) with its description, plus a Learn more link to the
// dedicated /trust-and-safety section. Single component handles both
// single-badge and multi-badge cases per spec — fewer interaction modes,
// fewer surprises for mobile users.
function TrustSummarySheet({ earned, onClose }: { earned: Earned[]; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
        zIndex: 240, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', width: '100%', maxWidth: 520,
          borderTopLeftRadius: 22, borderTopRightRadius: 22,
          padding: '18px 18px max(20px, env(safe-area-inset-bottom))',
          maxHeight: '85vh', overflowY: 'auto',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ width: 38, height: 4, background: '#E5E7EB', borderRadius: 4, margin: '0 auto 14px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#111827' }}>Trust &amp; Safety</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', fontSize: 22, color: '#6B7280', cursor: 'pointer', padding: 0, lineHeight: 1 }}
          >×</button>
        </div>
        <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 14px' }}>What this person has on file.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {earned.map((b) => (
            <div
              key={b.key}
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: 12, background: '#F8FAFC',
                border: '1px solid #E2E8F0', borderRadius: 12,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  width: 32, height: 32, borderRadius: 10,
                  background: b.bg, color: b.fg,
                  display: 'grid', placeItems: 'center',
                  fontSize: 16, fontWeight: 800,
                }}
              >{b.iconText}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: 0 }}>{b.label}</p>
                <p style={{ fontSize: 12, color: '#475569', margin: '2px 0 0', lineHeight: 1.5 }}>{b.tooltip}</p>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/trust-and-safety"
          onClick={onClose}
          style={{
            display: 'block', textAlign: 'center',
            marginTop: 14, padding: '11px 16px',
            borderRadius: 12, background: '#3293CB', color: '#fff',
            fontWeight: 700, fontSize: 13, textDecoration: 'none',
          }}
        >
          Learn more about Trust &amp; Safety →
        </Link>
      </div>
    </div>
  )
}
