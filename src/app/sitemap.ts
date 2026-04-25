// Next.js App Router will serve this at /sitemap.xml
//
// Combines:
//   1) static public routes (splash, /home, /login, /signup, /privacy, /terms, /contact)
//   2) every public open activity at /a/[id] (queries Supabase)
//   3) every active profile at /u/[id] (queries Supabase)
//
// Cached at the edge for 6 hours via `revalidate`. Crawl-budget conscious:
// caps activities at 5000, profiles at 5000, both sorted by recency.

import type { MetadataRoute } from 'next'
import { createServiceRoleClient } from '@/lib/supabase-server'

export const revalidate = 21600 // 6 hours

const SITE = 'https://buddyally.com'

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${SITE}/`,        changeFrequency: 'weekly',  priority: 1.0 },
  { url: `${SITE}/home`,    changeFrequency: 'weekly',  priority: 0.95 },
  { url: `${SITE}/login`,   changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITE}/signup`,  changeFrequency: 'monthly', priority: 0.7 },
  { url: `${SITE}/privacy`, changeFrequency: 'yearly',  priority: 0.3 },
  { url: `${SITE}/terms`,   changeFrequency: 'yearly',  priority: 0.3 },
  { url: `${SITE}/contact`, changeFrequency: 'yearly',  priority: 0.3 },
  { url: `${SITE}/trust-and-safety`, changeFrequency: 'monthly', priority: 0.6 },
  // City landing pages — high-intent local SEO ("buddyally abuja", "abuja
  // ride share", etc). One entry per supported city.
  { url: `${SITE}/abuja`,   changeFrequency: 'weekly',  priority: 0.85 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let activityRoutes: MetadataRoute.Sitemap = []
  let profileRoutes: MetadataRoute.Sitemap = []

  try {
    const supabase = createServiceRoleClient()

    const [actRes, profRes] = await Promise.all([
      supabase
        .from('activities')
        .select('id, updated_at')
        .eq('status', 'open')
        .order('updated_at', { ascending: false })
        .limit(5000),
      supabase
        .from('profiles')
        .select('id, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5000),
    ])

    activityRoutes = (actRes.data || []).map((a: any) => ({
      url: `${SITE}/a/${a.id}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : undefined,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))

    profileRoutes = (profRes.data || []).map((p: any) => ({
      url: `${SITE}/u/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  } catch {
    // Service role key not configured (e.g. local dev without env). Fall
    // back to static routes only — better than 500'ing the sitemap.
  }

  return [...STATIC_ROUTES, ...activityRoutes, ...profileRoutes]
}
