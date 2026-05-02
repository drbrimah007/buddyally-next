// Business module — shared types, slug validation, theme defaults.
//
// Everything here is local to the /b/* and /dashboard/business/* routes.
// Importing this file from any non-business route is a code smell; the
// module is meant to stay isolatable so it can be feature-flagged or
// removed without ripple effects.

// ── Feature flag ─────────────────────────────────────────────────────
// Set NEXT_PUBLIC_FEATURE_BUSINESS=1 in Vercel to expose UI entry points
// (the "My Business" link in the dashboard sidebar). The /b/* routes
// themselves are always reachable via direct URL, but with the flag off
// no link appears anywhere in the app and there's no traffic to them.
export const BUSINESS_FEATURE_ENABLED =
  (process.env.NEXT_PUBLIC_FEATURE_BUSINESS || '').trim() === '1'

// ── Theme types ──────────────────────────────────────────────────────

export type BusinessTemplate =
  | 'marketplace-bold'
  | 'editorial'
  | 'minimal'
  | 'portfolio'
  | 'service-pro'
  | 'local-spot'

export type ColorPreset =
  | 'brand-ally'
  | 'lagos-sunset'
  | 'atlanta-cool'
  | 'deep-forest'
  | 'pastel-peach'
  | 'mono-white'
  | 'mono-black'
  | 'royal-plum'
  | 'sand-beige'
  | 'custom'

export type SectionId = 'hero' | 'wares' | 'about' | 'contact' | 'testimonials'

export type SectionConfig = {
  id: SectionId
  on: boolean
  variant?: string
}

export type BusinessTheme = {
  template: BusinessTemplate
  colors: {
    preset: ColorPreset
    primary?: string
    accent?: string
    bg?: string
    text?: string
  }
  sections: SectionConfig[]
}

export const DEFAULT_THEME: BusinessTheme = {
  template: 'marketplace-bold',
  colors: { preset: 'brand-ally' },
  sections: [
    { id: 'hero',    on: true, variant: 'split' },
    { id: 'wares',   on: true, variant: 'grid-2col' },
    { id: 'about',   on: true },
    { id: 'contact', on: true, variant: 'buttons' },
  ],
}

// Each preset is a self-contained CSS variable set. Used by the public
// page renderer to set CSS variables on the page <root>; everything
// downstream consumes via var(--ba-bus-primary), etc.
export const COLOR_PRESETS: Record<Exclude<ColorPreset, 'custom'>, {
  primary: string; accent: string; bg: string; text: string; muted: string
}> = {
  'brand-ally':    { primary: '#3293cb', accent: '#bce0f4', bg: '#ffffff', text: '#111827', muted: '#6b7280' },
  'lagos-sunset':  { primary: '#ff6b35', accent: '#f7c59f', bg: '#1a1a1a', text: '#ffffff', muted: '#9ca3af' },
  'atlanta-cool':  { primary: '#0d9488', accent: '#5eead4', bg: '#0f172a', text: '#f8fafc', muted: '#94a3b8' },
  'deep-forest':   { primary: '#15803d', accent: '#86efac', bg: '#0a0a0a', text: '#f0fdf4', muted: '#a3a3a3' },
  'pastel-peach':  { primary: '#f97316', accent: '#fed7aa', bg: '#fff7ed', text: '#431407', muted: '#9a3412' },
  'mono-white':    { primary: '#000000', accent: '#e5e7eb', bg: '#ffffff', text: '#111827', muted: '#6b7280' },
  'mono-black':    { primary: '#ffffff', accent: '#374151', bg: '#000000', text: '#f9fafb', muted: '#9ca3af' },
  'royal-plum':    { primary: '#7c3aed', accent: '#c4b5fd', bg: '#1e1b4b', text: '#f5f3ff', muted: '#a5b4fc' },
  'sand-beige':    { primary: '#a16207', accent: '#fde68a', bg: '#fefce8', text: '#422006', muted: '#854d0e' },
}

// ── Slug validation ─────────────────────────────────────────────────

// Reserved at the application level (route collisions, brand protection,
// common-confusion words). Even if the DB slug regex would allow them,
// validateSlug() rejects these to keep URLs predictable.
const RESERVED_SLUGS = new Set([
  // Existing top-level routes — keep this in sync with /src/app/*
  'admin', 'api', 'dashboard', 'login', 'signup', 'splash',
  'home', 'home-v1', 'homepage',
  'trust-and-safety', 'privacy', 'terms', 'contact',
  'a', 'b', 'c', 's', 'u',
  'lagos', 'abuja', 'atlanta', 'child-safety',
  'explore', '_next',
  // BuddyAlly brand
  'buddy', 'ally', 'buddyally', 'founders', 'founding', 'official',
  // Common reserved
  'www', 'mail', 'ftp', 'support', 'help', 'docs', 'blog', 'about',
  'pricing', 'features', 'team', 'careers', 'jobs', 'press',
  'security', 'legal', 'cookies', 'sitemap', 'robots',
  // Trust/safety adjacent (don't let users impersonate)
  'safety', 'verified', 'verify', 'moderator', 'mod',
])

export type SlugError =
  | 'too_short' | 'too_long'
  | 'invalid_chars' | 'no_letter'
  | 'starts_or_ends_with_hyphen' | 'consecutive_hyphens'
  | 'reserved'

export function validateSlug(slug: string): SlugError | null {
  if (typeof slug !== 'string') return 'invalid_chars'
  const s = slug.trim().toLowerCase()
  if (s.length < 3) return 'too_short'
  if (s.length > 30) return 'too_long'
  if (!/^[a-z0-9-]+$/.test(s)) return 'invalid_chars'
  if (!/[a-z]/.test(s)) return 'no_letter'
  if (s.startsWith('-') || s.endsWith('-')) return 'starts_or_ends_with_hyphen'
  if (s.includes('--')) return 'consecutive_hyphens'
  if (RESERVED_SLUGS.has(s)) return 'reserved'
  return null
}

export function slugErrorMessage(err: SlugError): string {
  switch (err) {
    case 'too_short': return 'Slug must be at least 3 characters.'
    case 'too_long': return 'Slug must be 30 characters or fewer.'
    case 'invalid_chars': return 'Use only lowercase letters, numbers, and hyphens.'
    case 'no_letter': return 'Slug must contain at least one letter.'
    case 'starts_or_ends_with_hyphen': return 'Slug can\'t start or end with a hyphen.'
    case 'consecutive_hyphens': return 'No double hyphens allowed.'
    case 'reserved': return 'That slug is reserved. Try another.'
  }
}

export function businessUrl(slug: string): string {
  return `/b/${slug}`
}
