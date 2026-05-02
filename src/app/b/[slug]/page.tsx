// Public business page — /b/<slug>
//
// Server-rendered with ISR (60s revalidate). The same component tree
// is reused by the dashboard preview, so what owners see in the editor
// is exactly what visitors see.
//
// SEO defense:
//   1. Default `<meta robots>` is noindex unless business_is_indexable()
//      RPC returns true (verified + ≥3 wares + owner opted in).
//   2. /b/* is also blocked in /robots.txt — see /src/app/robots.ts.
//   3. Business pages are NOT in /sitemap.xml. Indexed-eligible ones go
//      in a separate /sitemap-businesses.xml that's not referenced from
//      robots.txt — only Search Console will know about it.

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { COLOR_PRESETS, type BusinessTheme } from '@/lib/business'

export const revalidate = 60 // ISR — page cached at edge for 60s
export const dynamicParams = true

type Props = { params: Promise<{ slug: string }> }

async function loadBusiness(slug: string) {
  const sb = createServiceRoleClient()
  const { data: biz } = await sb
    .from('business_profiles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (!biz) return null
  const { data: wares } = await sb
    .from('business_wares')
    .select('*')
    .eq('business_id', biz.id)
    .eq('in_stock', true)
    .order('sort_order', { ascending: true })
    .limit(60)
  // Indexability check — also used to decide noindex meta
  const { data: indexableData } = await sb
    .rpc('business_is_indexable', { b_id: biz.id })
  const indexable = !!indexableData
  return { biz, wares: wares || [], indexable }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await loadBusiness(slug)
  if (!data) return { title: 'Not found · BuddyAlly' }
  const { biz, indexable } = data
  return {
    title: `${biz.name} · BuddyAlly`,
    description: biz.tagline || `${biz.name} on BuddyAlly`,
    // Default to noindex; flip ONLY when the quality bar + opt-in are met.
    robots: indexable ? 'index, follow' : 'noindex, follow',
    openGraph: {
      title: biz.name,
      description: biz.tagline || '',
      images: biz.cover_image_url ? [biz.cover_image_url] : ['/og-image.png'],
      type: 'website',
    },
  }
}

export default async function BusinessPage({ params }: Props) {
  const { slug } = await params
  const data = await loadBusiness(slug)
  if (!data) notFound()
  const { biz, wares } = data
  const theme = (biz.theme as BusinessTheme) || { template: 'marketplace-bold', colors: { preset: 'brand-ally' }, sections: [] }
  const palette = theme.colors.preset !== 'custom'
    ? COLOR_PRESETS[theme.colors.preset as Exclude<typeof theme.colors.preset, 'custom'>]
    : { primary: theme.colors.primary || '#3293cb', accent: theme.colors.accent || '#bce0f4', bg: theme.colors.bg || '#fff', text: theme.colors.text || '#111', muted: '#6b7280' }

  // Apply palette via CSS variables on the wrapping element. The
  // template components below all consume var(--ba-bus-*) so swapping
  // a preset re-themes the whole page with no re-render of children.
  const cssVars: React.CSSProperties = {
    ['--ba-bus-primary' as any]: palette.primary,
    ['--ba-bus-accent' as any]: palette.accent,
    ['--ba-bus-bg' as any]: palette.bg,
    ['--ba-bus-text' as any]: palette.text,
    ['--ba-bus-muted' as any]: palette.muted,
  }

  return (
    <div style={{ ...cssVars, background: 'var(--ba-bus-bg)', color: 'var(--ba-bus-text)', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Hero */}
      <header style={{ padding: '60px 24px 30px', textAlign: 'center', maxWidth: 980, margin: '0 auto' }}>
        {biz.logo_url && (
          <img src={biz.logo_url} alt="" style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover', marginBottom: 16 }} />
        )}
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 950, letterSpacing: '-0.04em', margin: 0 }}>{biz.name}</h1>
        {biz.tagline && (
          <p style={{ fontSize: 18, color: 'var(--ba-bus-muted)', marginTop: 12, maxWidth: 620, marginInline: 'auto' }}>{biz.tagline}</p>
        )}
      </header>

      {/* Wares grid */}
      {wares.length > 0 && (
        <section style={{ padding: '20px 24px 60px', maxWidth: 980, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {wares.map((w: any) => (
              <article key={w.id} style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, overflow: 'hidden' }}>
                {w.image_url && <img src={w.image_url} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }} />}
                <div style={{ padding: 14 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{w.title}</h3>
                  {w.price_text && <p style={{ fontSize: 14, color: 'var(--ba-bus-primary)', fontWeight: 700, marginTop: 4 }}>{w.price_text}</p>}
                  {w.description && <p style={{ fontSize: 13, color: 'var(--ba-bus-muted)', marginTop: 8, lineHeight: 1.5 }}>{w.description}</p>}
                  {(w.payment_link || (Array.isArray(biz.default_payment_links) && biz.default_payment_links.length > 0)) && (
                    <a
                      href={w.payment_link || (biz.default_payment_links as any[])[0]?.url}
                      target="_blank" rel="noopener noreferrer nofollow"
                      style={{ display: 'inline-block', marginTop: 12, padding: '8px 14px', borderRadius: 10, background: 'var(--ba-bus-primary)', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
                    >
                      Buy / Inquire →
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* About */}
      {biz.bio && (
        <section style={{ padding: '40px 24px', maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>About</h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ba-bus-muted)', whiteSpace: 'pre-wrap' }}>{biz.bio}</p>
        </section>
      )}

      {/* Footer disclaimer — keeps you out of payment law */}
      <footer style={{ padding: '40px 24px 80px', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: 60, fontSize: 12, color: 'var(--ba-bus-muted)' }}>
        <p>
          Listed on <a href="/" style={{ color: 'var(--ba-bus-primary)', textDecoration: 'none', fontWeight: 700 }}>BuddyAlly</a>.
          Payments and order fulfillment are handled by the seller directly. BuddyAlly facilitates discovery only and is not party to any transaction.
        </p>
      </footer>
    </div>
  )
}
