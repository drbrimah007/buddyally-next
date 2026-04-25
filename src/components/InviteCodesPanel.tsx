'use client'

// "Your invite codes" panel rendered in the Profile page.
//
// Lets a signed-in user mint a 6-char invite code and share the URL
// (https://buddyally.com/signup?invite=ABC123). New invitees who sign up
// through that link earn the ◎ Buddy Line trust signal automatically via
// consume_invite_code() — see /trust-and-safety for the flow.
//
// Privacy note: this panel only shows codes the *current user* created
// (RLS on invite_codes restricts insert/update by inviter_id). It does
// not surface who has redeemed which code — that's mod-only territory.

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'

type Code = {
  id: string
  code: string
  use_count: number
  max_uses: number | null
  expires_at: string | null
  revoked_at: string | null
  created_at: string
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // upper, no 0/O/1/I

function randomCode(len = 6): string {
  let out = ''
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return out
}

export default function InviteCodesPanel() {
  const { user } = useAuth()
  const { success, error: toastError, info } = useToast()
  const [codes, setCodes] = useState<Code[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    let alive = true
    ;(async () => {
      const { data } = await supabase
        .from('invite_codes')
        .select('id, code, use_count, max_uses, expires_at, revoked_at, created_at')
        .eq('inviter_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (!alive) return
      setCodes((data as Code[]) || [])
      setLoading(false)
    })()
    return () => { alive = false }
  }, [user])

  async function mint() {
    if (!user || busy) return
    setBusy(true)
    // Try a few times in case of unique-violation collision (rare on a 6-char
    // base32 alphabet, but harmless to handle).
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode(6)
      const { data, error } = await supabase
        .from('invite_codes')
        .insert({ code, inviter_id: user.id, max_uses: 25 })
        .select('id, code, use_count, max_uses, expires_at, revoked_at, created_at')
        .single()
      if (!error && data) {
        setCodes((p) => [data as Code, ...p])
        success('Invite code created')
        setBusy(false)
        return
      }
      if ((error as any)?.code !== '23505') {
        toastError('Could not create code: ' + (error?.message || 'unknown'))
        setBusy(false)
        return
      }
    }
    toastError('Could not generate a unique code — try again.')
    setBusy(false)
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this invite code? People holding it won\u2019t be able to redeem.')) return
    const { error } = await supabase
      .from('invite_codes')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { toastError('Could not revoke: ' + error.message); return }
    setCodes((p) => p.map((c) => (c.id === id ? { ...c, revoked_at: new Date().toISOString() } : c)))
    info('Code revoked')
  }

  async function copyLink(code: string) {
    const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://buddyally.com'}/signup?invite=${encodeURIComponent(code)}`
    try {
      await navigator.clipboard.writeText(url)
      success('Invite link copied')
    } catch {
      toastError('Copy failed — try long-pressing the link.')
    }
  }

  if (!user) return null

  // Copy below intentionally speaks to BOTH audiences:
  //   • Direct-signup users — who got the chooser promise "Join now and
  //     invite trusted people later to build your Buddy Line." This is
  //     the surface that delivers on it. They become the *start* of their
  //     own chain when someone redeems their code.
  //   • Already-invited users — who can extend the chain by minting their
  //     own codes for friends.

  return (
    <section style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>◎ Your invite codes</h3>
        <button
          onClick={mint}
          disabled={busy}
          style={{
            padding: '8px 14px', borderRadius: 10, border: 'none',
            background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 13,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {busy ? 'Creating…' : '+ New code'}
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 14, lineHeight: 1.5 }}>
        Share an invite link. Anyone who signs up through it earns the ◎ Buddy Line trust
        signal — and you become the start of their trust chain. <strong>This is how you
        build your own Buddy Line.</strong>
      </p>

      {loading ? (
        <p style={{ fontSize: 13, color: '#6B7280' }}>Loading…</p>
      ) : codes.length === 0 ? (
        <p style={{ fontSize: 13, color: '#6B7280' }}>You haven&apos;t created any invite codes yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {codes.map((c) => {
            const revoked = !!c.revoked_at
            const exhausted = c.max_uses != null && c.use_count >= c.max_uses
            return (
              <div
                key={c.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: 12, borderRadius: 12,
                  background: revoked || exhausted ? '#F8FAFC' : '#fff',
                  border: '1px solid #E5E7EB',
                  opacity: revoked || exhausted ? 0.7 : 1,
                }}
              >
                <code style={{
                  fontSize: 14, fontWeight: 800, letterSpacing: '0.06em',
                  color: '#0652B7', background: '#EFF6FF',
                  padding: '4px 10px', borderRadius: 8,
                }}>{c.code}</code>
                <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#475569' }}>
                  Used <b>{c.use_count}</b>{c.max_uses != null && ` / ${c.max_uses}`}
                  {revoked && <span style={{ color: '#DC2626', marginLeft: 8 }}>· revoked</span>}
                  {!revoked && exhausted && <span style={{ color: '#92400E', marginLeft: 8 }}>· fully redeemed</span>}
                </div>
                {!revoked && !exhausted && (
                  <button
                    type="button"
                    onClick={() => copyLink(c.code)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
                      background: '#fff', fontSize: 12, fontWeight: 700, color: '#111827', cursor: 'pointer',
                    }}
                  >
                    Copy link
                  </button>
                )}
                {!revoked && (
                  <button
                    type="button"
                    onClick={() => revoke(c.id)}
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid #FECACA',
                      background: '#fff', fontSize: 12, fontWeight: 700, color: '#DC2626', cursor: 'pointer',
                    }}
                  >
                    Revoke
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
