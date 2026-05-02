// Top-level catch-all dispatcher.
//
// One URL, two possible meanings:
//   • lowercase 5+ chars matching a published business → render BusinessRenderer
//   • anything else (especially uppercase 4-8 char codes) → render the contact-code page
//
// Disambiguation is by string shape (case + length), not heuristic. If a
// user picks a slug like "PKSVNT" it's blocked at slug-validation time
// (see lib/business.ts — must be lowercase). And contact codes are always
// uppercase by code generation. So overlap is impossible by construction.
//
// The business path is server-rendered (ISR 60s) for SEO; the contact-code
// path is the existing client component.

import type { Metadata } from 'next'
import BusinessRenderer, { loadPublishedBusiness } from '@/components/business/BusinessRenderer'
import ContactCodePage from '../c/[code]/page'

export const revalidate = 60
export const dynamicParams = true

type Props = { params: Promise<{ code: string }> }

// Lowercase-only + at least 5 chars + only [a-z0-9-] → a business slug
// candidate. Same regex as the DB CHECK constraint, but we also short-
// circuit on length so contact-code-shaped strings (4-8 uppercase) skip
// the DB lookup entirely.
function looksLikeBusinessSlug(s: string): boolean {
  if (!s || s.length < 5 || s.length > 30) return false
  return /^[a-z0-9][a-z0-9-]{3,28}[a-z0-9]$/.test(s)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  if (looksLikeBusinessSlug(code)) {
    const data = await loadPublishedBusiness(code)
    if (data) {
      return {
        title: `${data.biz.name} · BuddyAlly`,
        description: data.biz.tagline || `${data.biz.name} on BuddyAlly`,
        // Default noindex unless owner opted in AND quality bar met
        robots: data.indexable ? 'index, follow' : 'noindex, follow',
        openGraph: {
          title: data.biz.name,
          description: data.biz.tagline || '',
          images: data.biz.cover_image_url ? [data.biz.cover_image_url] : ['/og-image.png'],
          type: 'website',
        },
      }
    }
  }
  // Fall through — contact-code page handles its own metadata via the
  // client component (no per-code OG tags, just the site default).
  return {}
}

export default async function CatchAllPage({ params }: Props) {
  const { code } = await params
  if (looksLikeBusinessSlug(code)) {
    const data = await loadPublishedBusiness(code)
    if (data) return <BusinessRenderer data={data} />
  }
  // Not a business — render the contact-code experience. The client
  // component reads the same param and shows "Invalid code" if it
  // doesn't match a real connect_code either.
  return <ContactCodePage />
}
