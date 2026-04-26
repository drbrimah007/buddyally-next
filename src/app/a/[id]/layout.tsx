// Server-side metadata wrapper for /a/[id]. The activity page itself is
// 'use client' (it needs hooks for join / chat / share), so we can't
// declare `generateMetadata` directly on it. A layout in the same folder
// IS allowed to be a Server Component even when the page is client —
// Next.js wires the metadata on top of the client tree.
//
// Without this, every shared activity link (iMessage / WhatsApp / Slack /
// X / Facebook) was unfurling the root site default OG ("BuddyAlly —
// Find Your People…") instead of the actual activity title + description
// + cover image.

import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase-server'

const SITE = 'https://buddyally.com'

type ActivityRow = {
  id: string
  title: string | null
  description: string | null
  cover_image_url: string | null
  category: string | null
  location_display: string | null
  date: string | null
  time: string | null
  status: string | null
  host: { first_name: string | null; last_name: string | null } | null
}

async function fetchActivity(id: string): Promise<ActivityRow | null> {
  // Use service role here so even non-open / private rows still produce
  // metadata when the link gets opened by an admin or signed-in scraper.
  // Falls back to null gracefully if env or row missing.
  try {
    const supabase = createServiceRoleClient()
    const { data } = await supabase
      .from('activities')
      .select('id, title, description, cover_image_url, category, location_display, date, time, status, host:profiles!created_by(first_name, last_name)')
      .eq('id', id)
      .maybeSingle()
    return (data as ActivityRow | null) || null
  } catch {
    return null
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params
  const activity = await fetchActivity(id)

  if (!activity) {
    return {
      title: 'Activity not found — BuddyAlly',
      alternates: { canonical: `${SITE}/a/${id}` },
    }
  }

  const title = activity.title || 'Activity on BuddyAlly'
  const hostName = activity.host
    ? `${activity.host.first_name || ''} ${activity.host.last_name?.[0] || ''}`.trim()
    : ''
  const dateChunk = activity.date
    ? new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  // Build a meta description that reads as a real preview line:
  //   "<description excerpt> — Hosted by Sarah K · 📍 Brooklyn · 📅 Apr 28"
  const factBits: string[] = []
  if (hostName) factBits.push(`Hosted by ${hostName}`)
  if (activity.location_display) factBits.push(`📍 ${activity.location_display}`)
  if (dateChunk) factBits.push(`📅 ${dateChunk}`)
  const facts = factBits.join(' · ')
  const baseDesc = (activity.description || '').replace(/\s+/g, ' ').trim().slice(0, 180)
  const description = baseDesc
    ? (facts ? `${baseDesc} — ${facts}` : baseDesc)
    : (facts || 'Join this activity on BuddyAlly.')

  // Cover image takes priority for the social card. Fall back to the
  // site OG image so links never look bare.
  const ogImage = activity.cover_image_url || `${SITE}/og-image.png`
  const url = `${SITE}/a/${activity.id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: 'BuddyAlly',
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    robots: activity.status === 'open' ? { index: true, follow: true } : { index: false, follow: true },
  }
}

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
