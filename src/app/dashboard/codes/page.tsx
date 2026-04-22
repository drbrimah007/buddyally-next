'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const CODE_TYPES = [
  { value: 'contact_me', label: 'Contact me' },
  { value: 'car_sale', label: 'Car for sale' },
  { value: 'parked_car', label: 'Parked car' },
  { value: 'bike', label: 'Bike / e-mobility' },
  { value: 'lost_item', label: 'Lost item tag' },
  { value: 'pet', label: 'Pet tag' },
  { value: 'package', label: 'Package / delivery' },
  { value: 'property', label: 'Property / gate' },
  { value: 'other', label: 'Other' },
]

function QRCode({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const render = () => {
      if (ref.current && (window as any).qrcode) {
        const qr = (window as any).qrcode(0, 'M')
        qr.addData('https://buddyally.com/' + code)
        qr.make()
        ref.current.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2 })
      }
    }
    if ((window as any).qrcode) { render() }
    else {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'
      script.onload = render
      document.head.appendChild(script)
    }
  }, [code])
  return <div ref={ref} />
}

export default function CodesPage() {
  const { user } = useAuth()
  const [codes, setCodes] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [viewingCode, setViewingCode] = useState<any>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
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
    await supabase.from('connect_codes').insert({ user_id: user.id, code, title: newTitle.trim(), description: newDesc.trim(), code_type: newType, status: 'active' })
    setNewTitle(''); setNewDesc(''); setShowCreate(false)
    loadCodes()
  }

  async function toggleStatus(codeId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    await supabase.from('connect_codes').update({ status: newStatus }).eq('id', codeId)
    loadCodes()
  }

  async function deleteCode(codeId: string) {
    if (!confirm('Delete this code? Messages will also be removed.')) return
    await supabase.from('connect_messages').delete().eq('code_id', codeId)
    await supabase.from('connect_codes').delete().eq('id', codeId)
    setViewingCode(null)
    loadCodes()
  }

  async function markRead(msgId: string) {
    await supabase.from('connect_messages').update({ read: true }).eq('id', msgId)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, read: true } : m))
  }

  function copyLink(code: string) {
    navigator.clipboard.writeText(`https://buddyally.com/${code}`)
    alert('Link copied!')
  }

  // Detail view for a single code
  if (viewingCode) {
    const c = viewingCode
    const cMsgs = messages.filter(m => m.code_id === c.id)
    const unread = cMsgs.filter((m: any) => !m.read).length
    return (
      <div>
        <button onClick={() => setViewingCode(null)} style={{ background: 'none', border: 'none', color: '#3293CB', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>&larr; Back to codes</button>
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{c.title}</h2>
            <span style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, ...(c.status === 'active' ? { background: '#F0FDF4', color: '#059669' } : { background: '#FEF3C7', color: '#D97706' }) }}>{c.status}</span>
          </div>
          <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#3293CB', letterSpacing: '0.12em', fontSize: 16, marginBottom: 4 }}>{c.code}</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 14 }}>{CODE_TYPES.find(t => t.value === c.code_type)?.label} &bull; buddyally.com/{c.code}</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flexShrink: 0 }}><QRCode code={c.code} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ background: '#E0F2FE', color: '#0284C7', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>{c.scan_count || 0} scans</span>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999, ...(unread > 0 ? { background: '#FEF3C7', color: '#D97706' } : { background: '#F3F4F6', color: '#4B5563' }) }}>{cMsgs.length} messages{unread > 0 ? ` (${unread} new)` : ''}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => copyLink(c.code)} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Copy Link</button>
                <button onClick={() => toggleStatus(c.id, c.status)} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{c.status === 'active' ? 'Pause' : 'Activate'}</button>
                <button onClick={() => deleteCode(c.id)} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Messages ({cMsgs.length})</h3>
        {cMsgs.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <p style={{ color: '#6B7280', fontSize: 14 }}>No messages yet. Share your code to start receiving messages.</p>
          </div>
        ) : cMsgs.map(m => (
          <div key={m.id} onClick={() => !m.read && markRead(m.id)} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, marginBottom: 10, ...(!m.read ? { borderLeft: '3px solid #3293CB' } : {}), cursor: !m.read ? 'pointer' : 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #3293CB, #5d92f6)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}>{(m.sender_name || 'A')[0].toUpperCase()}</div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{m.sender_name || 'Anonymous'}</span>
              </div>
              <span style={{ fontSize: 12, color: '#6B7280' }}>{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <p style={{ fontSize: 14, color: '#111827', lineHeight: 1.6 }}>{m.message || m.content}</p>
            {m.sender_phone && <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Phone: {m.sender_phone}</p>}
            {m.sender_email && <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Email: {m.sender_email}</p>}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>My Contact Codes</h2>
        <button onClick={() => setShowCreate(true)} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ New Code</button>
      </div>

      {showCreate && (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Create a Contact Code</h3>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>What is this code for?</label>
              <select value={newType} onChange={e => setNewType(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 14, fontSize: 14, color: '#111827', background: '#fff' }}>
                {CODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Title (what people see)</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 14, fontSize: 14, color: '#111827' }} placeholder="e.g. Black Honda Civic on W 83rd St" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Description (optional)</label>
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 14, fontSize: 14, color: '#111827', resize: 'none' }} placeholder="Any details to help the person contacting you" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={createCode} style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 12px rgba(50,147,203,0.25)' }}>Create Code</button>
              <button onClick={() => setShowCreate(false)} style={{ padding: '14px 24px', borderRadius: 14, border: '1px solid #E5E7EB', background: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div>{[1, 2].map(i => <div key={i} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 24, marginBottom: 16 }}><div style={{ height: 20, background: '#f3f4f6', borderRadius: 8, width: '50%', marginBottom: 12 }} /><div style={{ height: 16, background: '#f9fafb', borderRadius: 8, width: '30%' }} /></div>)}</div>
      ) : codes.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🔗</p>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>No codes yet</p>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>Create your first BuddyAlly Contact Code.</p>
          <button onClick={() => setShowCreate(true)} style={{ padding: '12px 24px', borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Create My Code</button>
        </div>
      ) : (
        <div>
          {codes.map(c => {
            const cMsgs = messages.filter(m => m.code_id === c.id)
            const unread = cMsgs.filter((m: any) => !m.read).length
            return (
              <div key={c.id} onClick={() => setViewingCode(c)} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{c.title}</h3>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#3293CB', letterSpacing: '0.12em', fontSize: 16 }}>{c.code}</div>
                  </div>
                  <span style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, ...(c.status === 'active' ? { background: '#F0FDF4', color: '#059669' } : { background: '#FEF3C7', color: '#D97706' }) }}>{c.status}</span>
                </div>
                <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 14 }}>{CODE_TYPES.find(t => t.value === c.code_type)?.label} &bull; buddyally.com/{c.code}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={{ background: '#E0F2FE', color: '#0284C7', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>{c.scan_count || 0} scans</span>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999, ...(unread > 0 ? { background: '#FEF3C7', color: '#D97706' } : { background: '#F3F4F6', color: '#4B5563' }) }}>{cMsgs.length} messages{unread > 0 ? ` (${unread} new)` : ''}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={e => { e.stopPropagation(); copyLink(c.code) }} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Copy Link</button>
                  <button onClick={e => { e.stopPropagation(); toggleStatus(c.id, c.status) }} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{c.status === 'active' ? 'Pause' : 'Activate'}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
