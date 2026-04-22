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
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => { setChatWith(null); loadConversations() }} className="text-[#3293CB] font-semibold text-sm">&larr; Back</button>
        <h2 className="text-lg font-bold">{chatPartnerName}</h2>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 min-h-[300px] max-h-[500px] overflow-y-auto space-y-3">
        {chatMessages.map((m, i) => (
          <div key={i} className={`flex ${m.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${m.sender_id === user?.id ? 'bg-[#3293CB] text-white' : 'bg-gray-100 text-gray-800'}`}>{m.content}</div>
          </div>
        ))}
        {chatMessages.length === 0 && <p className="text-center text-gray-400 py-10">No messages yet</p>}
      </div>
      <div className="flex gap-2">
        <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Type a message..." />
        <button onClick={sendMessage} className="bg-[#3293CB] text-white font-bold px-6 rounded-xl">Send</button>
      </div>
    </div>
  )

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-5">Messages</h1>
      {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/3 mb-2" /><div className="h-3 bg-gray-100 rounded w-2/3" /></div>)}</div>
      : conversations.length === 0 ? <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center"><p className="text-3xl mb-3">💬</p><p className="font-semibold mb-2">No messages yet</p><p className="text-sm text-gray-500">Start a conversation from an activity or profile.</p></div>
      : <div className="space-y-2">{conversations.map(c => (
        <div key={c.partnerId} onClick={() => openChat(c.partnerId, c.partnerName)} className={`bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-sm transition ${c.unread ? 'border-l-4 border-l-[#3293CB]' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 flex-shrink-0 overflow-hidden">{c.partnerAvatar ? <img src={c.partnerAvatar} className="w-full h-full object-cover" alt="" /> : c.partnerName[0]}</div>
          <div className="flex-1 min-w-0"><div className="flex items-center justify-between"><p className="font-semibold text-sm">{c.partnerName}</p><p className="text-xs text-gray-400">{new Date(c.lastAt).toLocaleDateString()}</p></div><p className="text-sm text-gray-500 truncate">{c.lastMessage}</p></div>
          {c.unread > 0 && <div className="bg-[#3293CB] text-white text-xs font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5">{c.unread}</div>}
        </div>
      ))}</div>}
    </div>
  )
}
