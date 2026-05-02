// Next.js App Router will serve this at /robots.txt
//
// Strategy:
//   • Allow everything that's user-facing
//   • Disallow auth-gated dashboard, admin tools, and API routes — those
//     don't help search and can dilute crawl budget
//   • Point crawlers at our dynamic sitemap

import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/dashboard/',
          '/admin',
          '/admin/',
          '/api/',
          // /b/<slug> is the legacy URL — kept for old links via permanent
          // redirect — disallow so crawlers don't index the redirect chain.
          '/b/',
          // Business pages now live at top-level /<slug>. Indexing is
          // controlled per-page via <meta robots="noindex"> until the
          // owner opts in AND business_is_indexable() returns true. We
          // can't use a robots.txt prefix rule here because top-level
          // collides with marketing pages we DO want indexed.
        ],
      },
    ],
    sitemap: 'https://buddyally.com/sitemap.xml',
    host: 'https://buddyally.com',
  }
}
