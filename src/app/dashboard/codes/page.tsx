'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const CODE_TYPES = [
  { value: 'contact_me', label: '💬 Contact me' },
  { value: 'car_sale', label: '💰 Car for sale' },
  { value: 'parked_car', label: '🚗 Parked car' },
  { value: 'lost_item', label: '🔍 Lost item' },
  { value: 'pet', label: '🐾 Pet tag' },
  { value: 'package', label: '📦 Package' },
  { value: 'property', label: '🏠 Property' },
  { value: 'other', label: '🔗 Other' },
]

export default function CodesPage() {
  const { user } = useAuth()
  const [codes, setCodes] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState('contact_me')

  useEffect(() => { if (user) loadCodes() }, [user])

  async function loadCodes() {
    if (!user) return; setLoading(true)
    const { data: c } = await supabase.from('connect_codes').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setCodes(c || [])
    if (c && c.length > 0) {
      const ids = c.map((x: any) => x.id)
      const { data: m } = await supabase.from('connect_messages').select('*').in('code_id', ids).order('created_at', { ascending: false })
      setMessages(m || [])
    }
    setLoading(false)
  }

  async function createCode() {
    if (!newTitle.trim() || !user) return
    const code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('')
    await supabase.from('connect_codes').insert({ user_id: user.id, code, title: newTitle.trim(), code_type: newType, status: 'active' })
    setNewTitle(''); setShowCreate(false)
    loadCodes()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold">My Contact Codes</h1>
        <button onClick={() => setShowCreate(true)} className="bg-[#3293CB] text-white font-bold text-sm px-4 py-2.5 rounded-xl">+ New Code</button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <h3 className="font-bold mb-3">Create Contact Code</h3>
          <div className="space-y-3">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Title (e.g. My Car, Front Door)" />
            <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm">
              {CODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={createCode} className="bg-[#3293CB] text-white font-bold px-6 py-2.5 rounded-xl text-sm">Create</button>
              <button onClick={() => setShowCreate(false)} className="border border-gray-200 rounded-xl px-6 py-2.5 text-sm font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse"><div className="h-5 bg-gray-200 rounded w-1/2 mb-3" /><div className="h-4 bg-gray-100 rounded w-1/3" /></div>)}</div>
      ) : codes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-3xl mb-3">🔗</p>
          <p className="font-semibold mb-2">No codes yet</p>
          <p className="text-sm text-gray-500 mb-4">Create your first BuddyAlly Contact Code.</p>
          <button onClick={() => setShowCreate(true)} className="bg-[#3293CB] text-white font-bold px-6 py-2.5 rounded-xl">Create My Code</button>
        </div>
      ) : (
        <div className="space-y-4">
          {codes.map(c => {
            const cMsgs = messages.filter(m => m.code_id === c.id)
            const unread = cMsgs.filter((m: any) => !m.read).length
            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-bold text-base">{c.title}</h3>
                    <p className="text-sm text-gray-500">{CODE_TYPES.find(t => t.value === c.code_type)?.label} &bull; buddyally.com/{c.code}</p>
                  </div>
                  <span className="text-xs font-semibold bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full">{c.status}</span>
                </div>
                <div className="flex gap-2 flex-wrap mb-3">
                  <span className="bg-blue-50 text-[#3293CB] text-xs font-semibold px-2.5 py-1 rounded-full">{c.scan_count || 0} scans</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer ${unread > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                    {cMsgs.length} messages{unread > 0 ? ` (${unread} new)` : ''}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(`https://buddyally.com/${c.code}`); alert('Link copied!') }} className="text-xs font-semibold border border-gray-200 rounded-lg px-3 py-1.5">Copy Link</button>
                  <button className="text-xs font-semibold border border-gray-200 rounded-lg px-3 py-1.5">Print</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
