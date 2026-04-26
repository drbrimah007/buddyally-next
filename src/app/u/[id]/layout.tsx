// Server-side metadata wrapper for /u/[id] — same pattern as /a/[id]/layout.tsx.
// Without per-profile OG, every shared profile link unfurled the site
// default. Now each profile carries its own card with name, city, bio,
// and avatar.

import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase-server'

const SITE = 'https://buddyally.com'

type ProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  city: string | null
  home_display_name: string | null
  bio: string | null
  avatar_url: string | null
  account_type: string | null
  rating_avg: number | null
  rating_count: number | null
}

async function fetchProfile(id: string): Promise<ProfileRow | null> {
  try {
    const supabase = createServiceRoleClient()
    const { data } = await supabase
      .from('profile_public')
      .select('id, first_name, last_name, city, home_display_name, bio, avatar_url, account_type, rating_avg, rating_count')
      .eq('id', id)
      .maybeSingle()
    return (data as ProfileRow | null) || null
  } catch {
    return null
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params
  const p = await fetchProfile(id)

  if (!p) {
    return {
      title: 'Profile not found — BuddyAlly',
      alternates: { canonical: `${SITE}/u/${id}` },
    }
  }

  const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'BuddyAlly member'
  const tag = p.account_type === 'founding_publisher'
    ? '📣 Founding Publisher · '
    : p.account_type === 'founding_member'
    ? '🌱 Founding Member · '
    : ''
  const title = `${fullName} on BuddyAlly`
  const where = p.home_display_name || p.city
  const ratingChunk = (p.rating_count || 0) > 0
    ? `★ ${(p.rating_avg || 0).toFixed(1)} (${p.rating_count} review${p.rating_count === 1 ? '' : 's'})`
    : ''
  const factBits = [tag.trim(), where, ratingChunk].filter(Boolean).join(' · ')
  const baseBio = (p.bio || '').replace(/\s+/g, ' ').trim().slice(0, 160)
  const description = baseBio
    ? (factBits ? `${baseBio} — ${factBits}` : baseBio)
    : (factBits || `${fullName} is on BuddyAlly.`)

  // Avatar makes the best card image when present. Otherwise fall back
  // to the site OG so link previews never look bare.
  const ogImage = p.avatar_url || `${SITE}/og-image.png`
  const url = `${SITE}/u/${p.id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'profile',
      url,
      siteName: 'BuddyAlly',
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: fullName }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
