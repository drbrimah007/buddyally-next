// Contribution badge mapping. Used across Explore cards, the Activity
// Detail modal, and /a/[id]. Kept deliberately LABEL-ONLY — no "Cost:"
// title prefix. Badges stand on their own so activities read as
// coordinated shared effort, not priced listings.

export type ContributionType = 'free' | 'split' | 'gas' | 'tips' | 'bring' | 'covered'

export type ContributionBadge = {
  label: string
  // Tailwind palette — bg + fg hex pair for inline styles (so it works
  // in both Tailwind class sites and inline-style sites).
  bg: string
  fg: string
}

export function contributionBadge(
  contribution_type: string | null | undefined,
  tip_enabled: boolean | null | undefined,
): ContributionBadge {
  // Resolve the type even on legacy rows that only have tip_enabled set.
  const t: ContributionType =
    (contribution_type as ContributionType) || (tip_enabled ? 'tips' : 'free')
  switch (t) {
    case 'free':    return { label: 'Free to join',    bg: '#059669', fg: '#ffffff' }
    case 'split':   return { label: 'Split cost',      bg: '#2563EB', fg: '#ffffff' }
    case 'gas':     return { label: 'Gas help',        bg: '#D97706', fg: '#ffffff' }
    case 'tips':    return { label: 'Tips welcome',    bg: '#CA8A04', fg: '#ffffff' }
    case 'bring':   return { label: 'Bring something', bg: '#7C3AED', fg: '#ffffff' }
    case 'covered': return { label: 'Covered',         bg: '#0EA5E9', fg: '#ffffff' }
    default:        return { label: 'Free to join',    bg: '#059669', fg: '#ffffff' }
  }
}
