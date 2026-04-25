'use client'

// Small transparent label that calls out seeded accounts so they never
// feel deceptive. Two states:
//
//   founding_publisher → 📣 Founding Publisher  (curated city guide)
//   founding_member    → 🌱 Founding Member     (early seed profile)
//
// Renders nothing for normal user accounts — there's no "user" badge.
// Per the founding-signals spec: "don't let seeded accounts feel
// deceptive". This is the load-bearing piece of that promise.

type Variant = 'pill' | 'compact'

export default function FoundingBadge({
  accountType,
  variant = 'pill',
}: {
  accountType: string | null | undefined
  variant?: Variant
}) {
  if (!accountType || accountType === 'user') return null

  const cfg = accountType === 'founding_publisher'
    ? {
        label: 'Founding Publisher',
        short: 'Publisher',
        emoji: '📣',
        bg: '#FEF3C7',
        fg: '#92400E',
        title: 'Curated city-guide account by BuddyAlly. Posts real local events.',
      }
    : accountType === 'founding_member'
    ? {
        label: 'Founding Member',
        short: 'Founding',
        emoji: '🌱',
        bg: '#ECFDF5',
        fg: '#065F46',
        title: 'Early seeded profile. Helps the network feel alive while real members join.',
      }
    : null

  if (!cfg) return null

  if (variant === 'compact') {
    return (
      <span
        title={cfg.title}
        aria-label={`${cfg.label}: ${cfg.title}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '2px 6px', borderRadius: 999,
          background: cfg.bg, color: cfg.fg,
          fontSize: 10, fontWeight: 800, lineHeight: 1.2,
          border: '1px solid rgba(15,23,42,0.04)',
          whiteSpace: 'nowrap',
        }}
      >
        <span aria-hidden="true">{cfg.emoji}</span>
        {cfg.short}
      </span>
    )
  }

  return (
    <span
      title={cfg.title}
      aria-label={`${cfg.label}: ${cfg.title}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 999,
        background: cfg.bg, color: cfg.fg,
        fontSize: 11, fontWeight: 800, lineHeight: 1.2,
        border: '1px solid rgba(15,23,42,0.04)',
      }}
    >
      <span aria-hidden="true">{cfg.emoji}</span>
      {cfg.label}
    </span>
  )
}
