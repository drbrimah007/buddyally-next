'use client'

// Collapsible Safety Protocols card — mirrors v1's safetyBanner() and is
// shown at the bottom of Explore and Messages.

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
        <p style={{ fontSize: 12, color: '#6B7280', borderTop: '1px solid #E5E7EB', paddingTop: 10 }}>
          These measures do not guarantee safety, but they may help protect you. If something feels wrong, cancel the interaction.
        </p>
      </div>
    </details>
  )
}
