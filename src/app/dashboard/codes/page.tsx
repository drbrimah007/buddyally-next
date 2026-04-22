'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const CODE_TYPES: Record<string, { label: string; emoji: string }> = {
  contact_me: { label: 'Contact me', emoji: '💬' },
  car_sale: { label: 'Car for sale', emoji: '💰' },
  parked_car: { label: 'Parked car', emoji: '🚗' },
  lost_item: { label: 'Lost item', emoji: '🔍' },
  bike: { label: 'Bike / e-mobility', emoji: '🚲' },
  pet: { label: 'Pet tag', emoji: '🐾' },
  package: { label: 'Package', emoji: '📦' },
  property: { label: 'Property', emoji: '🏠' },
  other: { label: 'Other', emoji: '🔗' },
}

const HEADER_TEXT: Record<string, { title: string; sub: string }> = {
  contact_me: { title: 'CONTACT ME', sub: 'Send me a message' },
  car_sale: { title: 'FOR SALE', sub: 'Contact owner for details' },
  parked_car: { title: 'CONTACT OWNER', sub: 'Parking issue? Contact me' },
  lost_item: { title: 'FOUND THIS?', sub: 'Help return to owner' },
  bike: { title: 'CONTACT OWNER', sub: 'Issue with this bike? Let me know' },
  pet: { title: "I'M LOST", sub: 'Please contact my owner' },
  package: { title: 'DELIVERY ISSUE?', sub: 'Contact me about this package' },
  property: { title: 'CONTACT OWNER', sub: 'Access or issue? Let me know' },
  other: { title: 'CONTACT OWNER', sub: 'Send a message' },
}

const PRINT_STYLES: Record<string, { bg: string; text: string; accent: string }> = {
  blue: { bg: 'linear-gradient(135deg, #0284C7, #5d92f6)', text: '#fff', accent: '#fff' },
  dark: { bg: '#0F172A', text: '#fff', accent: '#3293CB' },
  white: { bg: '#ffffff', text: '#0F172A', accent: '#0284C7' },
  yellow: { bg: 'linear-gradient(135deg, #fff8dc, #ffe58a)', text: '#3a2c08', accent: '#92400E' },
  green: { bg: '#065F46', text: '#fff', accent: '#34D399' },
}

function QRCode({ code, size }: { code: string; size?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const render = () => {
      if (ref.current && (window as any).qrcode) {
        const qr = (window as any).qrcode(0, 'M')
        qr.addData('https://buddyally.com/' + code)
        qr.make()
        ref.current.innerHTML = qr.createSvgTag({ cellSize: size || 4, margin: 2 })
      }
    }
    if ((window as any).qrcode) render()
    else {
      const s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'
      s.onload = render
      document.head.appendChild(s)
    }
  }, [code, size])
  return <div ref={ref} />
}

function downloadQR(code: string) {
  if (!(window as any).qrcode) return
  const qr = (window as any).qrcode(0, 'M')
  qr.addData('https://buddyally.com/' + code)
  qr.make()
  const sz = 400, mods = qr.getModuleCount()
  const cell = Math.floor(sz / (mods + 8))
  const margin = Math.floor((sz - cell * mods) / 2)
  const canvas = document.createElement('canvas')
  canvas.width = sz; canvas.height = sz
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sz, sz)
  ctx.fillStyle = '#000'
  for (let r = 0; r < mods; r++)
    for (let c = 0; c < mods; c++)
      if (qr.isDark(r, c)) ctx.fillRect(margin + c * cell, margin + r * cell, cell, cell)
  canvas.toBlob(b => {
    if (!b) return
    const a = document.createElement('a'); a.href = URL.createObjectURL(b)
    a.download = 'buddyally-' + code + '.png'; a.click()
  }, 'image/png')
}

function doPrintBasic(code: string, title: string, codeType: string, style: string, contentType: string, perSheet: number) {
  const s = PRINT_STYLES[style] || PRINT_STYLES.blue
  const hdr = HEADER_TEXT[codeType] || HEADER_TEXT.other
  const showQR = contentType !== 'link'
  const showLink = contentType !== 'qr'

  const stickerHTML = `
    <div style="width:100%;max-width:3.5in;margin:auto;border-radius:12px;overflow:hidden;border:2px solid ${s.text === '#fff' ? 'transparent' : '#E5E7EB'};font-family:Inter,Arial,sans-serif;">
      <div style="background:${s.bg};color:${s.text};padding:14px 16px;text-align:center;">
        <div style="font-size:18px;font-weight:900;letter-spacing:0.05em;">${hdr.title}</div>
        <div style="font-size:11px;opacity:0.85;margin-top:2px;">${hdr.sub}</div>
      </div>
      <div style="background:#fff;padding:16px;text-align:center;">
        ${showQR ? '<div id="print-qr" style="display:inline-block;margin-bottom:8px;"></div>' : ''}
        ${showLink ? `<div style="margin-top:6px;"><span style="font-size:10px;color:#6B7280;">Scan or type:</span><br><span style="font-size:15px;font-weight:800;color:#0284C7;letter-spacing:0.05em;">buddyally.com/${code}</span></div>` : ''}
        <div style="font-size:10px;color:#9CA3AF;margin-top:6px;">${title}</div>
      </div>
    </div>`

  const printWin = window.open('', '_blank')
  if (!printWin) return

  const layouts: Record<number, number[]> = { 1: [1, 1], 2: [2, 1], 4: [2, 2], 6: [2, 3], 9: [3, 3], 12: [3, 4], 16: [4, 4], 20: [4, 5] }
  const [cols, rows] = layouts[perSheet] || [1, 1]

  let stickers = ''
  for (let i = 0; i < perSheet; i++) stickers += `<div style="overflow:hidden;">${stickerHTML}</div>`

  printWin.document.write(`<!DOCTYPE html><html><head>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"><\/script>
    <style>@page{size:letter;margin:0}*{box-sizing:border-box;margin:0;padding:0}
    body{width:8.5in;min-height:11in;padding:0.25in;display:grid;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);gap:0.15in;align-content:start;print-color-adjust:exact;-webkit-print-color-adjust:exact;}</style>
    </head><body>${stickers}
    <script>
    document.querySelectorAll('#print-qr').forEach(function(el){
      if(typeof qrcode!=='undefined'){var q=qrcode(0,'M');q.addData('https://buddyally.com/${code}');q.make();el.innerHTML=q.createSvgTag({cellSize:3,margin:1});}
    });
    setTimeout(function(){window.print();},500);
    <\/script></body></html>`)
  printWin.document.close()
}

export default function CodesPage() {
  const { user } = useAuth()
  const [codes, setCodes] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [viewingCode, setViewingCode] = useState<any>(null)
  const [showPrint, setShowPrint] = useState<any>(null)
  const [printStyle, setPrintStyle] = useState('blue')
  const [printContent, setPrintContent] = useState('both')
  const [printCount, setPrintCount] = useState(4)

  // Create form state
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newType, setNewType] = useState('contact_me')
  const [newImage, setNewImage] = useState<string | null>(null)
  const [newLinks, setNewLinks] = useState<{ label: string; url: string }[]>([])
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [socials, setSocials] = useState({ instagram: '', twitter: '', facebook: '', linkedin: '', tiktok: '', website: '' })
  const imageRef = useRef<HTMLInputElement>(null)

  // Auto mark-as-read when viewing a code (must be top-level, not inside conditional)
  useEffect(() => {
    if (!viewingCode) return
    const cMsgs = messages.filter(m => m.code_id === viewingCode.id)
    const unreadIds = cMsgs.filter(m => !m.read).map(m => m.id)
    if (unreadIds.length > 0) {
      supabase.from('connect_messages').update({ read: true, read_at: new Date().toISOString() }).in('id', unreadIds)
    }
  }, [viewingCode, messages])

  const loadCodes = useCallback(async () => {
    if (!user) return; setLoading(true)
    const { data: c } = await supabase.from('connect_codes').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setCodes(c || [])
    if (c && c.length > 0) {
      const ids = c.map((x: any) => x.id)
      const { data: m } = await supabase.from('connect_messages').select('*').in('code_id', ids).order('created_at', { ascending: false })
      setMessages(m || [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => { if (user) loadCodes() }, [user, loadCodes])

  function addLink() {
    if (!linkLabel.trim() || !linkUrl.trim()) return
    const url = linkUrl.trim().startsWith('http') ? linkUrl.trim() : 'https://' + linkUrl.trim()
    setNewLinks(prev => [...prev, { label: linkLabel.trim(), url }])
    setLinkLabel(''); setLinkUrl('')
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setNewImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function createCode() {
    if (!newTitle.trim() || !user) return
    const code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('')

    // Upload image
    let imageUrl = ''
    if (newImage) {
      try {
        const blob = await fetch(newImage).then(r => r.blob())
        const fname = code.toLowerCase() + '-' + Date.now() + '.jpg'
        const { error: ue } = await supabase.storage.from('connect-images').upload(fname, blob, { contentType: blob.type })
        if (!ue) {
          const { data: ud } = supabase.storage.from('connect-images').getPublicUrl(fname)
          imageUrl = ud?.publicUrl || ''
        }
      } catch {}
    }

    // Collect socials
    const socialObj: Record<string, string> = {}
    if (socials.instagram) socialObj.instagram = socials.instagram.replace('@', '')
    if (socials.twitter) socialObj.twitter = socials.twitter.replace('@', '')
    if (socials.tiktok) socialObj.tiktok = socials.tiktok.replace('@', '')
    if (socials.facebook) socialObj.facebook = socials.facebook.startsWith('http') ? socials.facebook : 'https://facebook.com/' + socials.facebook
    if (socials.linkedin) socialObj.linkedin = socials.linkedin.startsWith('http') ? socials.linkedin : 'https://linkedin.com/in/' + socials.linkedin
    if (socials.website) socialObj.website = socials.website.startsWith('http') ? socials.website : 'https://' + socials.website

    const { data } = await supabase.from('connect_codes').insert({
      user_id: user.id, code, title: newTitle.trim(), description: newDesc.trim(),
      code_type: newType, status: 'active', push_enabled: true, email_enabled: true,
      image_url: imageUrl, links: newLinks, social_profiles: socialObj,
    }).select().single()

    // Reset form
    setNewTitle(''); setNewDesc(''); setNewImage(null); setNewLinks([]); setSocials({ instagram: '', twitter: '', facebook: '', linkedin: '', tiktok: '', website: '' })
    setShowCreate(false)
    await loadCodes()
    if (data) setViewingCode(data)
  }

  async function toggleStatus(codeId: string, currentStatus: string) {
    await supabase.from('connect_codes').update({ status: currentStatus === 'active' ? 'paused' : 'active' }).eq('id', codeId)
    loadCodes()
  }

  async function deleteCode(codeId: string) {
    if (!confirm('Delete this code? Messages will also be removed.')) return
    await supabase.from('connect_messages').delete().eq('code_id', codeId)
    await supabase.from('connect_codes').delete().eq('id', codeId)
    setViewingCode(null); loadCodes()
  }

  async function markRead(msgId: string) {
    await supabase.from('connect_messages').update({ read: true, read_at: new Date().toISOString() }).eq('id', msgId)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, read: true } : m))
  }

  async function deleteMessage(msgId: string) {
    if (!confirm('Delete this message?')) return
    await supabase.from('connect_messages').delete().eq('id', msgId)
    setMessages(prev => prev.filter(m => m.id !== msgId))
  }

  function copyLink(code: string) {
    navigator.clipboard.writeText(`https://buddyally.com/${code}`)
    alert('Link copied!')
  }

  // ─── PRINT MODAL ─────────────────────────────────────────
  if (showPrint) {
    const c = showPrint
    return (
      <div>
        <button onClick={() => setShowPrint(null)} style={{ background: 'none', border: 'none', color: '#3293CB', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>&larr; Back</button>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Print Sticker — {c.title}</h2>

        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Style</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
            {['blue', 'dark', 'white', 'yellow', 'green'].map(s => (
              <button key={s} onClick={() => setPrintStyle(s)} style={{ padding: '12px 8px', borderRadius: 10, border: printStyle === s ? '2px solid #3293CB' : '1px solid #E5E7EB', background: s === 'blue' ? '#0284C7' : s === 'dark' ? '#0F172A' : s === 'white' ? '#fff' : s === 'yellow' ? '#ffe58a' : '#065F46', color: s === 'white' ? '#111' : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{s}</button>
            ))}
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Content</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[{ v: 'both', l: 'QR + Link' }, { v: 'qr', l: 'QR only' }, { v: 'link', l: 'Link only' }].map(o => (
              <button key={o.v} onClick={() => setPrintContent(o.v)} style={{ padding: '8px 16px', borderRadius: 10, border: printContent === o.v ? '2px solid #3293CB' : '1px solid #E5E7EB', background: printContent === o.v ? '#E0F2FE' : '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{o.l}</button>
            ))}
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Per Sheet</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {[1, 2, 4, 6, 9, 12, 16, 20].map(n => (
              <button key={n} onClick={() => setPrintCount(n)} style={{ width: 40, height: 40, borderRadius: 10, border: printCount === n ? '2px solid #3293CB' : '1px solid #E5E7EB', background: printCount === n ? '#E0F2FE' : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{n}</button>
            ))}
          </div>

          <button onClick={() => doPrintBasic(c.code, c.title, c.code_type, printStyle, printContent, printCount)} style={{ padding: '14px 32px', borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 12px rgba(50,147,203,0.25)' }}>Print Now</button>
        </div>
      </div>
    )
  }

  // ─── CODE DETAIL VIEW ─────────────────────────────────────
  if (viewingCode) {
    const c = viewingCode
    const cMsgs = messages.filter(m => m.code_id === c.id)
    const unread = cMsgs.filter((m: any) => !m.read).length
    const tp = CODE_TYPES[c.code_type] || CODE_TYPES.other

    return (
      <div>
        <button onClick={() => { setViewingCode(null); loadCodes() }} style={{ background: 'none', border: 'none', color: '#3293CB', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>&larr; Back to codes</button>

        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700 }}>{c.title}</h2>
            <span style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, ...(c.status === 'active' ? { background: '#F0FDF4', color: '#059669' } : { background: '#FEF3C7', color: '#D97706' }) }}>{c.status}</span>
          </div>
          <div style={{ fontFamily: "'SF Mono', Menlo, Consolas, monospace", fontWeight: 800, color: '#3293CB', letterSpacing: '0.12em', fontSize: 20, marginBottom: 4 }}>{c.code}</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 14 }}>{tp.emoji} {tp.label} &bull; buddyally.com/{c.code}</div>

          {c.image_url && <img src={c.image_url} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12, marginBottom: 14 }} />}
          {c.description && <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6, marginBottom: 14 }}>{c.description}</p>}

          {/* Links */}
          {c.links && c.links.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 6 }}>Links</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {c.links.map((l: any, i: number) => (
                  <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{ padding: '4px 12px', borderRadius: 20, background: '#E0F2FE', color: '#0284C7', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>{l.label} &rarr;</a>
                ))}
              </div>
            </div>
          )}

          {/* Social profiles */}
          {c.social_profiles && Object.keys(c.social_profiles).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 6 }}>Socials</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(c.social_profiles).map(([k, v]) => (
                  <span key={k} style={{ padding: '4px 12px', borderRadius: 20, background: '#F3F4F6', color: '#4B5563', fontSize: 12, fontWeight: 600 }}>{k}: {v as string}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ flexShrink: 0 }}><QRCode code={c.code} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ background: '#E0F2FE', color: '#0284C7', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>{c.scan_count || 0} scans</span>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999, ...(unread > 0 ? { background: '#FEF3C7', color: '#D97706' } : { background: '#F3F4F6', color: '#4B5563' }) }}>{cMsgs.length} messages{unread > 0 ? ` (${unread} new)` : ''}</span>
                <span style={{ background: '#F0FDF4', color: '#059669', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>Active</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setShowPrint(c)} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Print Sticker</button>
                <button onClick={() => copyLink(c.code)} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Copy Link</button>
                <button onClick={() => downloadQR(c.code)} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Download QR</button>
                <a href={`/c/${c.code}`} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', color: '#111827' }}>Preview</a>
                <button onClick={() => toggleStatus(c.id, c.status)} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{c.status === 'active' ? 'Pause' : 'Activate'}</button>
                <button onClick={() => deleteCode(c.id)} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF' }}>Created {new Date(c.created_at).toLocaleDateString()}</p>
        </div>

        {/* Messages */}
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Messages ({cMsgs.length})</h3>
        {cMsgs.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <p style={{ color: '#6B7280', fontSize: 14 }}>No messages yet. Share your code to start receiving messages.</p>
          </div>
        ) : cMsgs.map(m => (
          <div key={m.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, marginBottom: 10, ...(!m.read ? { borderLeft: '3px solid #3293CB' } : {}) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #3293CB, #5d92f6)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}>{(m.sender_name || 'A')[0].toUpperCase()}</div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{m.sender_name || 'Anonymous'}</span>
                {m.message?.startsWith('[URGENT]') && <span style={{ background: '#DC2626', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>URGENT</span>}
              </div>
              <span style={{ fontSize: 12, color: '#6B7280' }}>{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <p style={{ fontSize: 14, color: '#111827', lineHeight: 1.6 }}>{m.message?.replace('[URGENT] ', '') || m.content}</p>
            {m.sender_email && <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Email: <a href={`mailto:${m.sender_email}`} style={{ color: '#3293CB' }}>{m.sender_email}</a></p>}
            {m.sender_phone && <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Phone: <a href={`tel:${m.sender_phone}`} style={{ color: '#3293CB' }}>{m.sender_phone}</a></p>}
            <button onClick={() => deleteMessage(m.id)} style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete message</button>
          </div>
        ))}
      </div>
    )
  }

  // ─── CREATE CODE MODAL ────────────────────────────────────
  if (showCreate) {
    const previewCode = 'XXXXXX'
    return (
      <div>
        <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#3293CB', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>&larr; Back</button>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Create a Contact Code</h2>

        <div style={{ background: '#E0F2FE', borderRadius: 16, padding: 20, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#3293CB', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Your BuddyAlly Code</div>
          <div style={{ fontFamily: 'monospace', fontSize: 32, fontWeight: 800, letterSpacing: '0.15em', color: '#111827' }}>Auto-generated</div>
          <div style={{ fontSize: 13, color: '#4B5563', marginTop: 6 }}>buddyally.com/XXXXXX</div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>What is this code for?</label>
            <select value={newType} onChange={e => setNewType(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 14, fontSize: 14, color: '#111827', background: '#fff' }}>
              {Object.entries(CODE_TYPES).map(([v, t]) => <option key={v} value={v}>{t.emoji} {t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Title (what people see) *</label>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 14, fontSize: 14, color: '#111827' }} placeholder="e.g. Black Honda Civic on W 83rd St" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Description (optional)</label>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 14, fontSize: 14, color: '#111827', resize: 'none' }} placeholder="Any details to help the person contacting you" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Image (optional)</label>
            {newImage && <img src={newImage} alt="" style={{ width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 12, marginBottom: 8 }} />}
            <input ref={imageRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ width: '100%', padding: 10, border: '1.5px dashed #E5E7EB', borderRadius: 14, fontSize: 14, color: '#6B7280', cursor: 'pointer' }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Links (open in new tab for visitors)</label>
            {newLinks.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#F9FAFB', borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
                <span style={{ flex: 1 }}>{l.label} &rarr; {l.url}</span>
                <button onClick={() => setNewLinks(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 16 }}>&times;</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={linkLabel} onChange={e => setLinkLabel(e.target.value)} placeholder="Label" style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827' }} />
              <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827' }} />
              <button onClick={addLink} style={{ background: '#E0F2FE', color: '#3293CB', border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}>+</button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Social Profiles (optional)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input value={socials.instagram} onChange={e => setSocials(p => ({ ...p, instagram: e.target.value }))} placeholder="Instagram @handle" style={{ padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827' }} />
              <input value={socials.twitter} onChange={e => setSocials(p => ({ ...p, twitter: e.target.value }))} placeholder="X / Twitter @handle" style={{ padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827' }} />
              <input value={socials.facebook} onChange={e => setSocials(p => ({ ...p, facebook: e.target.value }))} placeholder="Facebook URL" style={{ padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827' }} />
              <input value={socials.linkedin} onChange={e => setSocials(p => ({ ...p, linkedin: e.target.value }))} placeholder="LinkedIn URL" style={{ padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827' }} />
              <input value={socials.tiktok} onChange={e => setSocials(p => ({ ...p, tiktok: e.target.value }))} placeholder="TikTok @handle" style={{ padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827' }} />
              <input value={socials.website} onChange={e => setSocials(p => ({ ...p, website: e.target.value }))} placeholder="Website URL" style={{ padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827' }} />
            </div>
          </div>
          <button onClick={createCode} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 12px rgba(50,147,203,0.25)' }}>Create Code</button>
        </div>
      </div>
    )
  }

  // ─── CODES LIST ───────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>My Contact Codes</h2>
        <button onClick={() => setShowCreate(true)} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ New Code</button>
      </div>

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
            const tp = CODE_TYPES[c.code_type] || CODE_TYPES.other
            return (
              <div key={c.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{c.title}</h3>
                    <div style={{ fontFamily: "'SF Mono', Menlo, Consolas, monospace", fontWeight: 800, color: '#3293CB', letterSpacing: '0.12em', fontSize: 16 }}>{c.code}</div>
                  </div>
                  <span style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, ...(c.status === 'active' ? { background: '#F0FDF4', color: '#059669' } : { background: '#FEF3C7', color: '#D97706' }) }}>{c.status}</span>
                </div>
                <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 14 }}>{tp.emoji} {tp.label} &bull; buddyally.com/{c.code}</div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
                  <div style={{ flexShrink: 0 }}><QRCode code={c.code} size={3} /></div>
                  <div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      <span style={{ background: '#E0F2FE', color: '#0284C7', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>{c.scan_count || 0} scans</span>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999, ...(unread > 0 ? { background: '#FEF3C7', color: '#D97706' } : { background: '#F3F4F6', color: '#4B5563' }) }}>{cMsgs.length} messages{unread > 0 ? ` (${unread} new)` : ''}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => setShowPrint(c)} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Print</button>
                      <button onClick={() => copyLink(c.code)} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Copy Link</button>
                      <button onClick={() => downloadQR(c.code)} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Download QR</button>
                      <button onClick={() => setViewingCode(c)} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>View / Edit</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
