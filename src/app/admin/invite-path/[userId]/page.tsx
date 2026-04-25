'use client'

// Mod-only invite path viewer.
//
// Calls public.admin_invite_path(userId) which itself enforces the
// moderator role check (raises 'forbidden' if the caller doesn't have
// the moderator/admin badge). We also pre-check is_moderator() client-
// side so non-mods get a clean 403 page instead of an opaque RPC error.
//
// What this surface shows: the lineage chain from the flagged user back
// up to the root invite, plus the trust_weight of each link. This is
// the *only* place chain data is rendered — never on user-facing pages.

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

type ChainRow = {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  step: number
  invite_code: string | null
  invited_at: string | null
}

export default function InvitePathPage() {
  const { user, loading: authLoading } = useAuth()
  const { userId } = useParams<{ userId: string }>()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [chain, setChain] = useState<ChainRow[] | null>(null)
  const [trust, setTrust] = useState<number | null>(null)
  const [error, setError] = useState('')

  // Gate: only moderators (or admins) see this surface.
  useEffect(() => {
    if (authLoading || !user) return
    ;(async () => {
      const { data, error: e } = await supabase.rpc('is_moderator', { p_user: user.id })
      if (e || !data) { setAllowed(false); return }
      setAllowed(true)
    })()
  }, [authLoading, user])

  // Load the chain + the flagged user's trust_weight (admin-only column,
  // not in profile_public — must read directly from profiles).
  useEffect(() => {
    if (!allowed || !userId) return
    ;(async () => {
      const [pathRes, weightRes] = await Promise.all([
        supabase.rpc('admin_invite_path', { p_user: userId }),
        supabase.from('profiles').select('trust_weight').eq('id', userId).maybeSingle(),
      ])
      if (pathRes.error) { setError(pathRes.error.message); return }
      setChain((pathRes.data as ChainRow[]) || [])
      setTrust((weightRes.data?.trust_weight as number | null) ?? null)
    })()
  }, [allowed, userId])

  if (authLoading || allowed === null) return <div style={pad}>Checking permissions…</div>
  if (!user) return <div style={pad}>Sign in required.</div>
  if (!allowed) {
    return (
      <div style={pad}>
        <h1 style={h1}>Forbidden</h1>
        <p style={muted}>This page is restricted to moderators.</p>
      </div>
    )
  }

  return (
    <div style={pad}>
      <Link href="/dashboard" style={back}>← Dashboard</Link>
      <p style={kicker}>Admin · Trust &amp; Safety</p>
      <h1 style={h1}>Invite Path</h1>
      <p style={muted}>Lineage from the flagged user up to the root signup.</p>

      <section style={metaCard}>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <div>
            <p style={metaLabel}>Depth</p>
            <p style={metaValue}>{chain ? Math.max(0, chain.length - 1) : '…'}</p>
          </div>
          <div>
            <p style={metaLabel}>Root inviter</p>
            <p style={metaValue}>
              {chain && chain.length > 0
                ? formatName(chain[chain.length - 1])
                : '—'}
            </p>
          </div>
          <div>
            <p style={metaLabel}>Trust weight</p>
            <p style={metaValue}>{trust !== null ? trust.toFixed(3) : '—'}</p>
          </div>
        </div>
      </section>

      {error && <p style={{ color: '#DC2626', marginTop: 16 }}>{error}</p>}

      {chain && (
        <section style={{ marginTop: 18 }}>
          <h2 style={h2}>Chain</h2>
          {chain.length === 0 ? (
            <p style={muted}>No chain found.</p>
          ) : (
            <ol style={chainList}>
              {chain.map((row) => (
                <li key={row.id} style={chainItem}>
                  <div style={chainAvatar}>
                    {row.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span>{(row.first_name?.[0] || '?').toUpperCase()}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={chainName}>{formatName(row)}</p>
                    <p style={chainSub}>
                      Step {row.step}
                      {row.invite_code && ` · code ${row.invite_code}`}
                      {row.invited_at && ` · joined ${new Date(row.invited_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Link href={`/u/${row.id}`} style={chainLink}>Open profile →</Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <p style={{ ...muted, marginTop: 20, fontSize: 12 }}>
        Privacy: this view is the only surface that exposes lineage. Never share
        chain contents with end users — Trust &amp; Safety summary on user-facing
        pages remains depth-free per spec.
      </p>
    </div>
  )
}

function formatName(r: ChainRow): string {
  return `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unknown'
}

// ─── Styles ──────────────────────────────────────────────────────
const pad: React.CSSProperties = { maxWidth: 720, margin: '0 auto', padding: '24px 20px 80px', color: '#111827' }
const back: React.CSSProperties = { color: '#3293CB', fontWeight: 700, fontSize: 13, textDecoration: 'none' }
const kicker: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: '#3293CB', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '24px 0 8px' }
const h1: React.CSSProperties = { fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 6px' }
const h2: React.CSSProperties = { fontSize: 16, fontWeight: 800, margin: '0 0 10px' }
const muted: React.CSSProperties = { color: '#6B7280', fontSize: 14, margin: 0 }
const metaCard: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16, marginTop: 18 }
const metaLabel: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }
const metaValue: React.CSSProperties = { fontSize: 18, fontWeight: 800, margin: '4px 0 0' }
const chainList: React.CSSProperties = { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }
const chainItem: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12 }
const chainAvatar: React.CSSProperties = { width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', overflow: 'hidden', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: '#475569', flexShrink: 0 }
const chainName: React.CSSProperties = { fontSize: 14, fontWeight: 700, margin: 0 }
const chainSub: React.CSSProperties = { fontSize: 12, color: '#6B7280', margin: '2px 0 0' }
const chainLink: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#3293CB', textDecoration: 'none' }
