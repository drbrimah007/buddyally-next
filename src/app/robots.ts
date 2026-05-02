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
          // Business module — pages opt INTO indexing per business via the
          // business_is_indexable() RPC; the per-page <meta robots> handles
          // the actual signal. We disallow the prefix here to protect crawl
          // budget on the long tail of draft / unverified businesses.
          '/b/',
        ],
      },
    ],
    sitemap: 'https://buddyally.com/sitemap.xml',
    host: 'https://buddyally.com',
  }
}
