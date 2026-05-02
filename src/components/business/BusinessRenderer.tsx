// Business page renderer — server component, used by:
//   • /[code]/page.tsx (top-level — buddyally.com/<slug>)
//   • Future preview iframe in the dashboard editor
//
// Owns nothing about routing or auth. Caller passes a slug and we
// either return the rendered page or null (so the caller can decide
// what to fall through to — 404, contact-code dispatcher, etc.).

import { createServiceRoleClient } from '@/lib/supabase-server'
import { COLOR_PRESETS, type BusinessTheme } from '@/lib/business'

export type LoadedBusiness = {
  biz: any
  wares: any[]
  indexable: boolean
}

/** Service-role read of a published business + its in-stock wares. */
export async function loadPublishedBusiness(slug: string): Promise<LoadedBusiness | null> {
  if (!slug) return null
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
  const { data: indexableData } = await sb.rpc('business_is_indexable', { b_id: biz.id })
  return { biz, wares: wares || [], indexable: !!indexableData }
}

export default function BusinessRenderer({ data }: { data: LoadedBusiness }) {
  const { biz, wares } = data
  const theme = (biz.theme as BusinessTheme) || { template: 'marketplace-bold', colors: { preset: 'brand-ally' }, sections: [] }
  const palette = theme.colors.preset !== 'custom'
    ? COLOR_PRESETS[theme.colors.preset as Exclude<typeof theme.colors.preset, 'custom'>]
    : { primary: theme.colors.primary || '#3293cb', accent: theme.colors.accent || '#bce0f4', bg: theme.colors.bg || '#fff', text: theme.colors.text || '#111', muted: '#6b7280' }

  const cssVars: React.CSSProperties = {
    ['--ba-bus-primary' as any]: palette.primary,
    ['--ba-bus-accent' as any]: palette.accent,
    ['--ba-bus-bg' as any]: palette.bg,
    ['--ba-bus-text' as any]: palette.text,
    ['--ba-bus-muted' as any]: palette.muted,
  }

  return (
    <div style={{ ...cssVars, background: 'var(--ba-bus-bg)', color: 'var(--ba-bus-text)', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <header style={{ padding: '60px 24px 30px', textAlign: 'center', maxWidth: 980, margin: '0 auto' }}>
        {biz.logo_url && (
          <img src={biz.logo_url} alt="" style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover', marginBottom: 16 }} />
        )}
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 950, letterSpacing: '-0.04em', margin: 0 }}>{biz.name}</h1>
        {biz.tagline && (
          <p style={{ fontSize: 18, color: 'var(--ba-bus-muted)', marginTop: 12, maxWidth: 620, marginInline: 'auto' }}>{biz.tagline}</p>
        )}
      </header>

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

      {biz.bio && (
        <section style={{ padding: '40px 24px', maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>About</h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ba-bus-muted)', whiteSpace: 'pre-wrap' }}>{biz.bio}</p>
        </section>
      )}

      <footer style={{ padding: '40px 24px 80px', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: 60, fontSize: 12, color: 'var(--ba-bus-muted)' }}>
        <p>
          Listed on <a href="/" style={{ color: 'var(--ba-bus-primary)', textDecoration: 'none', fontWeight: 700 }}>BuddyAlly</a>.
          Payments and order fulfillment are handled by the seller directly. BuddyAlly facilitates discovery only and is not party to any transaction.
        </p>
      </footer>
    </div>
  )
}
