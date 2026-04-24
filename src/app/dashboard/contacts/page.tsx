'use client'

// Contacts dashboard — three tabs:
//   • Contacts   : everyone you've messaged or accepted a link-up from
//   • Requests   : link-up requests sent TO you (accept / deny / block)
//   • Sent       : link-up requests YOU sent that are still pending / resolved
//
// Per-contact actions: Message, Archive, Unarchive, Block, Unblock, Delete.
// Auto-add happens server-side via a trigger on messages INSERT, so this page
// just reads the `contacts` table — it doesn't need to write on every DM.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'
import Paginator from '@/components/Paginator'
import type { Contact, ContactRequest } from '@/lib/types'

const PER_PAGE = 18

type Tab = 'contacts' | 'requests' | 'sent'
type ContactFilter = 'active' | 'archived' | 'blocked'

export default function ContactsPage() {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('contacts')
  const [filter, setFilter] = useState<ContactFilter>('active')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [requestsIn, setRequestsIn] = useState<ContactRequest[]>([])
  const [requestsOut, setRequestsOut] = useState<ContactRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  // Tracks which ally's gear menu is open, so we don't need a state per card.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => { if (user) loadAll() }, [user])
  useEffect(() => { setPage(0) }, [tab, filter])

  async function loadAll() {
    if (!user) return
    setLoading(true)
    const [c, ri, ro] = await Promise.all([
      supabase.from('user_contacts')
        .select('*, contact:profiles!contact_user_id(id, first_name, last_name, avatar_url, city)')
        .eq('user_id', user.id)
        .order('last_interaction_at', { ascending: false }),
      supabase.from('link_requests')
        .select('*, sender:profiles!sender_id(id, first_name, last_name, avatar_url, city)')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('link_requests')
        .select('*, recipient:profiles!recipient_id(id, first_name, last_name, avatar_url, city)')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false }),
    ])
    setContacts((c.data as any as Contact[]) || [])
    setRequestsIn((ri.data as any as ContactRequest[]) || [])
    setRequestsOut((ro.data as any as ContactRequest[]) || [])
    setLoading(false)
  }

  // ─── actions ────────────────────────────────────────────────────
  async function setContactStatus(c: Contact, status: 'active' | 'archived' | 'blocked') {
    const { error } = await supabase.from('user_contacts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', c.id)
    if (error) { toastError(error.message || 'Could not update ally.'); return }
    success(status === 'active' ? 'Restored' : status === 'archived' ? 'Archived' : 'Blocked')
    loadAll()
  }

  async function deleteContact(c: Contact) {
    if (!confirm('Delete this ally?')) return
    const { error } = await supabase.from('user_contacts').delete().eq('id', c.id)
    if (error) { toastError(error.message || 'Could not delete.'); return }
    success('Deleted')
    loadAll()
  }

  async function respondToRequest(r: ContactRequest, status: 'accepted' | 'denied' | 'blocked') {
    const { error } = await supabase.from('link_requests')
      .update({ status })
      .eq('id', r.id)
    if (error) { toastError(error.message || 'Could not respond.'); return }
    success(status === 'accepted' ? 'Accepted — added to allies' : status === 'denied' ? 'Declined' : 'Blocked')
    loadAll()
  }

  async function cancelRequest(r: ContactRequest) {
    const { error } = await supabase.from('link_requests').update({ status: 'cancelled' }).eq('id', r.id)
    if (error) { toastError(error.message || 'Could not cancel.'); return }
    success('Request cancelled')
    loadAll()
  }

  // ─── derived ────────────────────────────────────────────────────
  const filteredContacts = contacts.filter(c => c.status === filter)
  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / PER_PAGE))
  const pageItems = filteredContacts.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  const pendingIn = requestsIn.filter(r => r.status === 'pending')
  const resolvedIn = requestsIn.filter(r => r.status !== 'pending')
  const pendingOut = requestsOut.filter(r => r.status === 'pending')
  const resolvedOut = requestsOut.filter(r => r.status !== 'pending')

  function displayName(p: any) {
    if (!p) return 'Unknown'
    return `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'User'
  }

  function avatar(p: any, size = 40) {
    const name = displayName(p)
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#4B5563', overflow: 'hidden', flexShrink: 0 }}>
        {p?.avatar_url ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0]}
      </div>
    )
  }

  // ─── render ─────────────────────────────────────────────────────
  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: `
        .contact-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px}
        @media(max-width:900px){.contact-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:620px){.contact-grid{grid-template-columns:1fr}}
      `}} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>My Allies</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: '#F3F4F6', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {([
          { id: 'contacts' as Tab, label: `Allies (${contacts.filter(c => c.status === 'active').length})` },
          { id: 'requests' as Tab, label: `Requests${pendingIn.length > 0 ? ` · ${pendingIn.length}` : ''}` },
          { id: 'sent' as Tab, label: `Sent${pendingOut.length > 0 ? ` · ${pendingOut.length}` : ''}` },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '8px 14px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? '#3293CB' : '#4B5563',
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
            }}>{t.label}</button>
        ))}
      </div>

      {/* Contacts tab */}
      {tab === 'contacts' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {(['active', 'archived', 'blocked'] as ContactFilter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '5px 12px', borderRadius: 16, border: '1px solid ' + (filter === f ? '#3293CB' : '#E5E7EB'),
                background: filter === f ? '#EFF6FF' : '#fff',
                color: filter === f ? '#3293CB' : '#4B5563',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
              }}>{f} ({contacts.filter(c => c.status === f).length})</button>
            ))}
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>Loading…</p>
          ) : pageItems.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>👥</p>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>No {filter} allies</p>
              <p style={{ fontSize: 14, color: '#6B7280' }}>
                {filter === 'active' ? 'Start a message with someone, or send a link-up request from their profile.' :
                 filter === 'archived' ? 'Archived allies stay out of your main list but aren\'t blocked.' :
                 'Blocked users can\'t send you new requests.'}
              </p>
            </div>
          ) : (
            <>
              <div className="contact-grid">
                {pageItems.map(c => {
                  // Actions for the gear menu depend on current status.
                  //   active    → Archive / Disconnect / Block
                  //   archived  → Restore / Disconnect / Block
                  //   blocked   → Unblock / Remove
                  // Disconnect = delete the ally row entirely (softer label
                  // than "Delete" for an active contact).
                  const menuActions: { label: string; danger?: boolean; onClick: () => void }[] =
                    c.status === 'active'
                      ? [
                          { label: 'Archive',    onClick: () => { setContactStatus(c, 'archived'); setOpenMenuId(null) } },
                          { label: 'Disconnect', danger: true, onClick: () => { deleteContact(c); setOpenMenuId(null) } },
                          { label: 'Block',      danger: true, onClick: () => { setContactStatus(c, 'blocked'); setOpenMenuId(null) } },
                        ]
                      : c.status === 'archived'
                      ? [
                          { label: 'Restore',    onClick: () => { setContactStatus(c, 'active'); setOpenMenuId(null) } },
                          { label: 'Disconnect', danger: true, onClick: () => { deleteContact(c); setOpenMenuId(null) } },
                          { label: 'Block',      danger: true, onClick: () => { setContactStatus(c, 'blocked'); setOpenMenuId(null) } },
                        ]
                      : [
                          { label: 'Unblock', onClick: () => { setContactStatus(c, 'active'); setOpenMenuId(null) } },
                          { label: 'Remove',  danger: true, onClick: () => { deleteContact(c); setOpenMenuId(null) } },
                        ]

                  const isOpen = openMenuId === c.id
                  return (
                    <div key={c.id} style={{ position: 'relative', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      {/* Gear button — sits top-right so the card stays clean */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(isOpen ? null : c.id) }}
                        aria-label="Ally options"
                        style={{
                          position: 'absolute', top: 8, right: 8, width: 30, height: 30,
                          display: 'grid', placeItems: 'center',
                          background: isOpen ? '#EFF6FF' : '#F9FAFB',
                          border: '1px solid #E5E7EB', borderRadius: 8,
                          color: '#4B5563', cursor: 'pointer',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                      </button>

                      {/* Avatar + identity — bumped to 52px so the photo
                          (when present) actually reads as a face. */}
                      <Link href={`/u/${c.contact_user_id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit', minWidth: 0, paddingRight: 32 }}>
                        {avatar(c.contact, 52)}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName(c.contact)}</div>
                          {c.contact?.city && <div style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {c.contact.city}</div>}
                        </div>
                      </Link>

                      {/* Primary CTA. Archived/blocked states don't expose
                          messaging directly — use the gear to restore first. */}
                      {c.status === 'active' && (
                        <button
                          onClick={() => router.push(`/dashboard/messages?to=${c.contact_user_id}`)}
                          style={{ ...btnPrimary, marginTop: 12, width: '100%', padding: '10px 14px', fontSize: 13 }}
                        >
                          Message
                        </button>
                      )}
                      {c.status === 'archived' && (
                        <div style={{ marginTop: 12, fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Archived</div>
                      )}
                      {c.status === 'blocked' && (
                        <div style={{ marginTop: 12, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>Blocked</div>
                      )}

                      {/* Popover menu */}
                      {isOpen && (
                        <>
                          <div
                            onClick={() => setOpenMenuId(null)}
                            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                          />
                          <div style={{
                            position: 'absolute', top: 42, right: 8, zIndex: 50,
                            minWidth: 160, background: '#fff', border: '1px solid #E5E7EB',
                            borderRadius: 10, boxShadow: '0 12px 28px rgba(15,23,42,0.12)',
                            padding: 4, display: 'flex', flexDirection: 'column',
                          }}>
                            {menuActions.map(a => (
                              <button
                                key={a.label}
                                onClick={a.onClick}
                                style={{
                                  textAlign: 'left', padding: '8px 12px', borderRadius: 8,
                                  border: 'none', background: 'transparent', cursor: 'pointer',
                                  fontSize: 13, fontWeight: 600,
                                  color: a.danger ? '#DC2626' : '#111827',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = a.danger ? '#FEF2F2' : '#F3F4F6')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                {a.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
              <Paginator page={page} totalPages={totalPages} onChange={setPage} />
            </>
          )}
        </div>
      )}

      {/* Requests received tab */}
      {tab === 'requests' && (
        <div>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>Loading…</p>
          ) : pendingIn.length === 0 && resolvedIn.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>📬</p>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>No link-up requests</p>
              <p style={{ fontSize: 14, color: '#6B7280' }}>When someone wants to connect without messaging first, it&apos;ll show up here.</p>
            </div>
          ) : (
            <>
              {pendingIn.length > 0 && (
                <>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#4B5563', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>Pending ({pendingIn.length})</h3>
                  {pendingIn.map(r => (
                    <div key={r.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                      <Link href={`/u/${r.sender_id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
                        {avatar(r.sender, 44)}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{displayName(r.sender)}</div>
                          {r.sender?.city && <div style={{ fontSize: 12, color: '#6B7280' }}>📍 {r.sender.city}</div>}
                        </div>
                      </Link>
                      {r.message && <p style={{ fontSize: 13, color: '#4B5563', marginTop: 10, padding: 10, background: '#F9FAFB', borderRadius: 8 }}>&ldquo;{r.message}&rdquo;</p>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        <button onClick={() => respondToRequest(r, 'accepted')} style={btnPrimary}>Accept</button>
                        <button onClick={() => respondToRequest(r, 'denied')} style={btnGhost}>Deny</button>
                        <button onClick={() => respondToRequest(r, 'blocked')} style={btnDanger}>Block</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {resolvedIn.length > 0 && (
                <>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#4B5563', margin: '20px 0 10px', textTransform: 'uppercase', letterSpacing: 0.4 }}>History</h3>
                  {resolvedIn.slice(0, 30).map(r => (
                    <div key={r.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7 }}>
                      {avatar(r.sender, 32)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{displayName(r.sender)}</div>
                        <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'capitalize' }}>{r.status}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Requests sent tab */}
      {tab === 'sent' && (
        <div>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>Loading…</p>
          ) : pendingOut.length === 0 && resolvedOut.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>✈️</p>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>No sent requests</p>
              <p style={{ fontSize: 14, color: '#6B7280' }}>Use the &ldquo;Link up&rdquo; button on someone&apos;s profile to send a request.</p>
            </div>
          ) : (
            <>
              {pendingOut.length > 0 && (
                <>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#4B5563', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>Waiting ({pendingOut.length})</h3>
                  {pendingOut.map(r => (
                    <div key={r.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Link href={`/u/${r.recipient_id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                        {avatar(r.recipient, 40)}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{displayName(r.recipient)}</div>
                          <div style={{ fontSize: 12, color: '#6B7280' }}>Sent {new Date(r.created_at).toLocaleDateString()}</div>
                        </div>
                      </Link>
                      <button onClick={() => cancelRequest(r)} style={btnGhost}>Cancel</button>
                    </div>
                  ))}
                </>
              )}
              {resolvedOut.length > 0 && (
                <>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#4B5563', margin: '20px 0 10px', textTransform: 'uppercase', letterSpacing: 0.4 }}>History</h3>
                  {resolvedOut.slice(0, 30).map(r => (
                    <div key={r.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7 }}>
                      {avatar(r.recipient, 32)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{displayName(r.recipient)}</div>
                        <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'capitalize' }}>{r.status}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Shared button styles — kept local since we don't have a button component
const btnPrimary: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: 'none', background: '#3293CB', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#111827', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const btnDanger: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
