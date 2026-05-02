// LEGACY: /b/<slug> permanent-redirects to top-level /<slug>.
//
// Originally business pages lived at /b/<slug>. We later moved them to
// /<slug> for memorability. This redirect keeps any old shared links
// alive AND tells search engines the canonical URL moved (301).
//
// Do not add logic here — the dispatcher at /[code]/page.tsx is now the
// single source of truth for business page rendering.

import { redirect, permanentRedirect } from 'next/navigation'

export default async function LegacyBusinessRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!slug) redirect('/')
  permanentRedirect(`/${slug}`)
}
