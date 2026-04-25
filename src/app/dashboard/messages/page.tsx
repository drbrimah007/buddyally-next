'use client'

// DM inbox: conversations list, chat view, and a "+ new message"
// user-picker that starts a new 1-on-1 thread.

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import SafetyBanner from '@/components/SafetyBanner'
import Paginator from '@/components/Paginator'
import ContactMessagesPreview from '@/components/ContactMessagesPreview'
import TrustBadges from '@/components/TrustBadges'

const CONV_PAGE_SIZE = 15

type Conversation = { partnerId: string; partnerName: string; partnerAvatar: string; lastMessage: string; lastAt: string; unread: number }
type PickerUser = { id: string; first_name: string; last_name: string; avatar_url: string; city: string | null }

export default function MessagesPage() {
  const { user } = useAuth()
  const { error: err } = useToast()
  const searchParams = useSearchParams()
  const deepLinkTo = searchParams.get('to')
  // ?about=<activity title> preloads the composer with an opener about that
  // activity — used by the "Message Host" button on activity detail views.
  const deepLinkAbout = searchParams.get('about')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [convPage, setConvPage] = useState(0)
  const [chatWith, setChatWith] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [chatPartnerName, setChatPartnerName] = useState('')
  // Trust signals for the chat partner — populated when openChat fires.
  // Drives the TrustBadges row under the partner name in the DM header.
  const [chatPartnerTrust, setChatPartnerTrust] = useState<{ buddy_verified_at: string | null; id_verified_at: string | null; is_invited_member: boolean | null } | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<PickerUser[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<any>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (user) loadConversations() }, [user])

  // Deep-link: /dashboard/messages?to=<uid> opens a chat with that user.
  // ?about=<title> primes the composer with an opener.
  useEffect(() => {
    if (!deepLinkTo || !user || chatWith === deepLinkTo) return
    ;(async () => {
      const { data } = await supabase.from('profiles').select('first_name, last_name').eq('id', deepLinkTo).single()
      const name = `${data?.first_name || ''} ${data?.last_name || ''}`.trim() || 'User'
      await openChat(deepLinkTo, name)
      if (deepLinkAbout) {
        setNewMsg(`Hi! I'm interested in your activity "${deepLinkAbout}". `)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkTo, deepLinkAbout, user])

  async function loadConversations() {
    if (!user) return
    setLoading(true)
    const { data: msgs } = await supabase.from('messages')
      .select('*, sender:profiles!sender_id(first_name, last_name, avatar_url), recipient:profiles!recipient_id(first_name, last_name, avatar_url)')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .is('group_id', null)
      .is('activity_id', null)
      .order('created_at', { ascending: false })
      .limit(100)
    if (!msgs) { setLoading(false); return }
    const convMap = new Map<string, Conversation>()
    for (const m of msgs) {
      const isMe = m.sender_id === user.id
      const pid = isMe ? m.recipient_id : m.sender_id
      if (!pid) continue
      const p: any = isMe ? m.recipient : m.sender
      if (!convMap.has(pid)) {
        convMap.set(pid, {
          partnerId: pid,
          partnerName: `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'User',
          partnerAvatar: p?.avatar_url || '',
          lastMessage: m.content || m.body || '',
          lastAt: m.created_at,
          unread: !isMe && !m.read ? 1 : 0,
        })
      } else if (!isMe && !m.read) {
        convMap.get(pid)!.unread++
      }
    }
    setConversations(Array.from(convMap.values()))
    setLoading(false)
  }

  async function openChat(pid: string, name: string) {
    setChatWith(pid); setChatPartnerName(name); setShowPicker(false)
    setChatPartnerTrust(null) // reset while loading
    if (!user) return
    // Fetch messages + partner trust in parallel. Trust comes from the
    // privacy-safe profile_public view (no lineage exposed).
    const [msgRes, trustRes] = await Promise.all([
      supabase.from('messages').select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${pid}),and(sender_id.eq.${pid},recipient_id.eq.${user.id})`)
        .is('group_id', null)
        .is('activity_id', null)
        .order('created_at', { ascending: true })
        .limit(200),
      supabase.from('profile_public')
        .select('buddy_verified_at, id_verified_at, is_invited_member')
        .eq('id', pid)
        .maybeSingle(),
    ])
    setChatMessages(msgRes.data || [])
    setChatPartnerTrust((trustRes.data as any) || null)
    await supabase.from('messages').update({ read: true })
      .eq('sender_id', pid).eq('recipient_id', user.id).eq('read', false)
    queueMicrotask(() => chatEndRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior }))
  }

  // Realtime subscription for active DM thread
  useEffect(() => {
    if (!chatWith || !user) return
    const channel = supabase
      .channel(`dm:${[user.id, chatWith].sort().join(':')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` }, (p) => {
        const m = p.new as any
        if (m.sender_id === chatWith) {
          setChatMessages(prev => [...prev, m])
          // Fire-and-forget mark-as-read from a sync realtime callback — IIFE
          // so the query runs AND any error surfaces instead of being dropped.
          ;(async () => {
            const { error } = await supabase.from('messages').update({ read: true }).eq('id', m.id)
            if (error) console.error('[dm] realtime mark-as-read failed', error)
          })()
          queueMicrotask(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [chatWith, user])

  async function sendMessage() {
    if (!newMsg.trim() || !user || !chatWith) return
    const text = newMsg.trim()
    // Don't let a user DM someone who has blocked them. RLS on messages
    // is permissive, so this check lives in app code. We look for a contacts
    // row on the recipient's side with status='blocked' pointed at me.
    const { data: blockRow } = await supabase.from('user_contacts')
      .select('id')
      .eq('user_id', chatWith)
      .eq('contact_user_id', user.id)
      .eq('status', 'blocked')
      .maybeSingle()
    if (blockRow) { err('You can\'t send messages to this user.'); return }
    setNewMsg('')
    const { data, error } = await supabase.from('messages')
      .insert({ sender_id: user.id, recipient_id: chatWith, content: text })
      .select().single()
    if (error) { err('Failed to send'); return }
    setChatMessages(prev => [...prev, data])
    queueMicrotask(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }))
  }

  // User search for the new-message picker
  useEffect(() => {
    if (!showPicker) return
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!search.trim() || search.trim().length < 2) { setResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      const q = `%${search.trim()}%`
      const { data } = await supabase.from('profiles')
        .select('id, first_name, last_name, avatar_url, city')
        .or(`first_name.ilike.${q},last_name.ilike.${q},email.ilike.${q}`)
        .neq('id', user?.id || '')
        .limit(20)
      setResults(data || [])
      setSearching(false)
    }, 250)
  }, [search, showPicker, user])

  // ─── Chat view ────────────────────────────────────────────
  if (chatWith) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => { setChatWith(null); loadConversations() }} style={{ background: 'none', border: 'none', color: '#3293CB', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>&larr; Back</button>
        <Link href={`/u/${chatWith}`} style={{ textDecoration: 'none', color: '#111827' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{chatPartnerName}</h2>
          {/* Trust signals appear directly under the name per spec §6.4 —
              critical context before coordinating offline. Same fixed
              order as everywhere else. */}
          {chatPartnerTrust && (
            <div style={{ marginTop: 4 }}>
              <TrustBadges
                buddyVerifiedAt={chatPartnerTrust.buddy_verified_at}
                isInvited={chatPartnerTrust.is_invited_member}
                idVerifiedAt={chatPartnerTrust.id_verified_at}
                variant="compact"
              />
            </div>
          )}
        </Link>
      </div>
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 16, marginBottom: 16, minHeight: 300, maxHeight: 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {chatMessages.map((m, i) => (
          <div key={m.id || i} style={{ display: 'flex', justifyContent: m.sender_id === user?.id ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '78%', padding: '10px 14px', borderRadius: 16, fontSize: 14, lineHeight: 1.5, ...(m.sender_id === user?.id ? { background: '#3293CB', color: '#fff' } : { background: '#F9FAFB', color: '#111827', border: '1px solid #E5E7EB' }) }}>{m.content || m.body}</div>
          </div>
        ))}
        {chatMessages.length === 0 && <p style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>No messages yet — say hi.</p>}
        <div ref={chatEndRef} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} style={{ flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#111827' }} placeholder="Type a message…" />
        <button onClick={sendMessage} style={{ padding: '0 24px', borderRadius: 12, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Send</button>
      </div>
    </div>
  )

  // ─── Inbox ────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Messages</h2>
        <button onClick={() => setShowPicker(v => !v)} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ New Message</button>
      </div>

      {/* v1 parity — incoming contact-code messages live in their own table
          (`connect_messages`) and used to be invisible from the Messages
          inbox. This box lifts them into view so a stranger pinging your
          car/bike/pet code doesn't get lost. */}
      <ContactMessagesPreview />

      {showPicker && (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Start a conversation with…</label>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email" style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} />
          <div style={{ marginTop: 12 }}>
            {searching && <p style={{ fontSize: 13, color: '#6B7280' }}>Searching…</p>}
            {!searching && search.length >= 2 && results.length === 0 && <p style={{ fontSize: 13, color: '#6B7280' }}>No matches.</p>}
            {results.map(r => {
              const name = `${r.first_name} ${r.last_name}`.trim() || 'User'
              return (
                <div key={r.id} onClick={() => openChat(r.id, name)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10, cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#4B5563', overflow: 'hidden' }}>
                    {r.avatar_url ? <img src={r.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0]}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{name}</p>
                    {r.city && <p style={{ fontSize: 12, color: '#6B7280' }}>{r.city}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, marginBottom: 8 }}>
              <div style={{ height: 16, background: '#f3f4f6', borderRadius: 8, width: '30%', marginBottom: 8 }} />
              <div style={{ height: 14, background: '#f9fafb', borderRadius: 8, width: '60%' }} />
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>💬</p>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>No messages yet</p>
          <p style={{ fontSize: 14, color: '#6B7280' }}>Tap &ldquo;+ New Message&rdquo; above or message someone from an activity or profile.</p>
        </div>
      ) : (() => {
        const totalPages = Math.max(1, Math.ceil(conversations.length / CONV_PAGE_SIZE))
        const page = Math.min(convPage, totalPages - 1)
        const pageConversations = conversations.slice(page * CONV_PAGE_SIZE, (page + 1) * CONV_PAGE_SIZE)
        return (
        <div>
          {pageConversations.map(c => (
            <div key={c.partnerId} onClick={() => openChat(c.partnerId, c.partnerName)} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'all 0.15s', ...(c.unread ? { borderLeft: '3px solid #3293CB' } : {}) }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#4B5563', flexShrink: 0, overflow: 'hidden' }}>
                {c.partnerAvatar ? <img src={c.partnerAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : c.partnerName[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{c.partnerName}</p>
                  <p style={{ fontSize: 12, color: '#6B7280' }}>{new Date(c.lastAt).toLocaleDateString()}</p>
                </div>
                <p style={{ fontSize: 14, color: '#4B5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMessage}</p>
              </div>
              {c.unread > 0 && <div style={{ background: '#DC2626', color: '#fff', fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, lineHeight: '16px', textAlign: 'center', padding: '0 3px' }}>{c.unread}</div>}
            </div>
          ))}
          <Paginator page={page} totalPages={totalPages} onChange={setConvPage} />
        </div>
        )
      })()}
      <SafetyBanner />
    </div>
  )
}
