'use client'

// Collapsible Safety Protocols card — mirrors v1's safetyBanner(). Shown
// at the bottom of Explore, Messages, and Groups.
//
// Two sections inside the disclosure:
//   1. The original safety checklist (live video, screenshot, ID photo …)
//   2. Trust badge explainer — what the three pills mean. Per Perry, the
//      same explainer block ships wherever the Safety Protocols card lives,
//      so users always have a definition handy on the page they're already
//      on. The full guide remains at /trust-and-safety.

import Link from 'next/link'

export default function SafetyBanner() {
  return (
    <details style={{ marginTop: 24, border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
      <summary style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', background: '#F9FAFB', listStyle: 'none' }}>
        <span style={{ fontSize: 18 }}>🛡</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', flex: 1 }}>Safety Protocols</span>
        <span style={{ fontSize: 12, color: '#6B7280' }}>▼</span>
      </summary>
      <div style={{ padding: 16, fontSize: 13, color: '#4B5563', lineHeight: 1.7 }}>
        <p style={{ marginBottom: 10, fontWeight: 600, color: '#111827' }}>Before using shared rides, package assistance, or other buddy-based help:</p>
        <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
          <li>Do a live video call first</li>
          <li>Capture a screenshot of the person during the call</li>
          <li>Ask for a photo of their ID</li>
          <li>Let a friend or family member know where you are going and who you are meeting</li>
          <li>Choose public, well-lit meeting locations</li>
          <li>Never trust a buddy with valuables, sensitive property, or anyone&apos;s life</li>
        </ul>
        <p style={{ fontSize: 12, color: '#6B7280', borderTop: '1px solid #E5E7EB', paddingTop: 10, marginBottom: 16 }}>
          These measures do not guarantee safety, but they may help protect you. If something feels wrong, cancel the interaction.
        </p>

        {/* ─── Trust badge explainer — same block on every Safety surface ─── */}
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 6 }}>How the trust badges work</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
            Three earnable signals you may see on profiles, activity cards, and chat headers. Order is fixed everywhere on BuddyAlly: verification → network trust → identity assurance.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <BadgeRow
              icon="✔"
              iconBg="#ECFDF5"
              iconFg="#065F46"
              label="Buddy Verified"
              copy="Selfie liveness check confirms you’re a real person."
            />
            <BadgeRow
              icon="◎"
              iconBg="#EFF6FF"
              iconFg="#0652B7"
              label="Buddy Line"
              copy="Joined through a trusted invite path. Invite identities stay private."
            />
            <BadgeRow
              icon="🛡"
              iconBg="#FEF3C7"
              iconFg="#92400E"
              label="ID Verified"
              copy="Identity confirmed through secure ID verification (third-party, optional)."
            />
          </div>
          <p style={{ fontSize: 12, marginTop: 12, color: '#6B7280' }}>
            <Link href="/trust-and-safety" style={{ color: '#3293CB', fontWeight: 700, textDecoration: 'none' }}>
              Read the full Trust &amp; Safety guide →
            </Link>
          </p>
        </div>
      </div>
    </details>
  )
}

function BadgeRow({ icon, iconBg, iconFg, label, copy }: {
  icon: string; iconBg: string; iconFg: string; label: string; copy: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 26, height: 26, borderRadius: 8,
          background: iconBg, color: iconFg,
          display: 'grid', placeItems: 'center',
          fontSize: 13, fontWeight: 800,
        }}
      >{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: '#111827', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 12, color: '#475569', margin: '1px 0 0', lineHeight: 1.5 }}>{copy}</p>
      </div>
    </div>
  )
}
