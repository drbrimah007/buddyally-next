'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

type Conversation = { partnerId: string; partnerName: string; partnerAvatar: string; lastMessage: string; lastAt: string; unread: number }

export default function MessagesPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [chatWith, setChatWith] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [chatPartnerName, setChatPartnerName] = useState('')

  useEffect(() => { if (user) loadConversations() }, [user])

  async function loadConversations() {
    if (!user) return; setLoading(true)
    const { data: msgs } = await supabase.from('messages')
      .select('*, sender:profiles!sender_id(first_name, last_name, avatar_url), recipient:profiles!recipient_id(first_name, last_name, avatar_url)')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(100)
    if (!msgs) { setLoading(false); return }
    const convMap = new Map<string, Conversation>()
    for (const m of msgs) {
      const isMe = m.sender_id === user.id; const pid = isMe ? m.recipient_id : m.sender_id; const p = isMe ? m.recipient : m.sender
      if (!convMap.has(pid)) convMap.set(pid, { partnerId: pid, partnerName: `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'User', partnerAvatar: p?.avatar_url || '', lastMessage: m.content, lastAt: m.created_at, unread: !isMe && !m.read ? 1 : 0 })
      else if (!isMe && !m.read) convMap.get(pid)!.unread++
    }
    setConversations(Array.from(convMap.values())); setLoading(false)
  }

  async function openChat(pid: string, name: string) {
    setChatWith(pid); setChatPartnerName(name); if (!user) return
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${pid}),and(sender_id.eq.${pid},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: true }).limit(50)
    setChatMessages(data || [])
    await supabase.from('messages').update({ read: true }).eq('sender_id', pid).eq('recipient_id', user.id).eq('read', false)
  }

  async function sendMessage() {
    if (!newMsg.trim() || !user || !chatWith) return
    await supabase.from('messages').insert({ sender_id: user.id, recipient_id: chatWith, content: newMsg.trim() })
    setChatMessages(prev => [...prev, { sender_id: user.id, content: newMsg.trim(), created_at: new Date().toISOString() }])
    setNewMsg('')
  }

  if (chatWith) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => { setChatWith(null); loadConversations() }} style={{ background: 'none', border: 'none', color: '#3293CB', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>&larr; Back</button>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{chatPartnerName}</h2>
      </div>
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 16, marginBottom: 16, minHeight: 300, maxHeight: 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {chatMessages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.sender_id === user?.id ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '78%', padding: '10px 14px', borderRadius: 16, fontSize: 14, lineHeight: 1.5, ...(m.sender_id === user?.id ? { background: '#3293CB', color: '#fff' } : { background: '#F9FAFB', color: '#111827' }) }}>{m.content}</div>
          </div>
        ))}
        {chatMessages.length === 0 && <p style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>No messages yet</p>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} style={{ flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#111827' }} placeholder="Type a message..." />
        <button onClick={sendMessage} style={{ padding: '0 24px', borderRadius: 12, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Send</button>
      </div>
    </div>
  )

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 20 }}>Messages</h2>
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
          <p style={{ fontSize: 14, color: '#6B7280' }}>Start a conversation from an activity or profile.</p>
        </div>
      ) : (
        <div>
          {conversations.map(c => (
            <div key={c.partnerId} onClick={() => openChat(c.partnerId, c.partnerName)} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'all 0.15s', ...( c.unread ? { borderLeft: '3px solid #3293CB' } : {}) }}>
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
        </div>
      )}
    </div>
  )
}
