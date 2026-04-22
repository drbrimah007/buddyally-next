'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const TYPE_GRADIENTS: Record<string, string> = {
  contact_me: 'linear-gradient(135deg, #0284C7, #5d92f6)',
  car_sale: 'linear-gradient(135deg, #059669, #34d399)',
  parked_car: 'linear-gradient(135deg, #EA580C, #FB923C)',
  lost_item: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
  pet: 'linear-gradient(135deg, #DB2777, #F472B6)',
  bike: 'linear-gradient(135deg, #0D9488, #2DD4BF)',
  package: 'linear-gradient(135deg, #D97706, #FBBF24)',
  property: 'linear-gradient(135deg, #475569, #94A3B8)',
  other: 'linear-gradient(135deg, #0284C7, #5d92f6)',
}

const TYPE_LABELS: Record<string, string> = {
  contact_me: 'contact', car_sale: 'vehicle', parked_car: 'vehicle',
  lost_item: 'item', pet: 'pet', bike: 'vehicle', package: 'package',
  property: 'property', other: 'item',
}

export default function PublicCodePage() {
  const { code } = useParams<{ code: string }>()
  const [codeData, setCodeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [priority, setPriority] = useState('normal')
  const [form, setForm] = useState({ name: '', message: '', email: '', phone: '' })

  useEffect(() => { if (code) loadCode() }, [code])

  async function loadCode() {
    setLoading(true)
    const codeUpper = code.toUpperCase()
    const { data, error: err } = await supabase.from('connect_codes').select('*').eq('code', codeUpper).eq('status', 'active').single()
    if (err || !data) { setError('Code not found or inactive.'); setLoading(false); return }
    setCodeData(data)
    setLoading(false)
    // Log scan
    supabase.from('connect_scans').insert({ code_id: data.id, user_agent: navigator.userAgent }).then(() => {})
  }

  async function sendMessage() {
    if (!form.message.trim()) { alert('Please enter a message.'); return }
    if (!codeData) return
    setSending(true)
    const msgText = (priority === 'urgent' ? '[URGENT] ' : '') + form.message.trim()
    await supabase.from('connect_messages').insert({
      code_id: codeData.id,
      owner_id: codeData.user_id,
      sender_name: form.name.trim() || 'Anonymous',
      sender_email: form.email.trim() || '',
      sender_phone: form.phone.trim() || '',
      message: msgText,
    })

    // Fire email notification (fire and forget)
    try {
      const { data: ownerProfile } = await supabase.from('profiles').select('email, first_name').eq('id', codeData.user_id).single()
      if (ownerProfile?.email) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerEmail: ownerProfile.email, ownerName: ownerProfile.first_name,
            senderName: form.name.trim() || 'Anonymous', message: form.message.trim(),
            code: codeData.code, codeTitle: codeData.title, priority,
            senderEmail: form.email.trim(), senderPhone: form.phone.trim(),
            ownerId: codeData.user_id,
          }),
        }).catch(() => {})
      }
    } catch {}

    setSending(false); setSent(true)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
      <p style={{ color: '#6B7280' }}>Loading...</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", background: '#F9FAFB' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
        <p style={{ fontSize: 40, marginBottom: 16 }}>🔍</p>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Code not found</h1>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>{error}</p>
        <Link href="/contact" style={{ color: '#3293CB', fontWeight: 600, textDecoration: 'none' }}>Get your own BuddyAlly code &rarr;</Link>
      </div>
    </div>
  )

  const gradient = TYPE_GRADIENTS[codeData.code_type] || TYPE_GRADIENTS.other
  const typeLabel = TYPE_LABELS[codeData.code_type] || 'item'
  const socials = codeData.social_profiles || {}
  const links = codeData.links || []

  if (sent) return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 480, width: '100%', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Message sent!</h2>
        <p style={{ fontSize: 14, color: '#4B5563', marginBottom: 24 }}>The owner has been notified and will see your message.</p>
        {form.email && <p style={{ fontSize: 13, color: '#6B7280' }}>Your email: {form.email}</p>}
        {form.phone && <p style={{ fontSize: 13, color: '#6B7280' }}>Your phone: {form.phone}</p>}
        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => { setSent(false); setForm({ name: '', message: '', email: '', phone: '' }) }} style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Send another message</button>
          <Link href="/contact" style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>Get your own code</Link>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header card */}
        <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: 24 }}>
          <div style={{ background: gradient, padding: '24px 20px', color: '#fff', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 20 }}>BuddyAlly Contact</span>
              <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 20, letterSpacing: '0.1em' }}>{codeData.code}</span>
            </div>
            {codeData.image_url && <img src={codeData.image_url} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }} />}
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{codeData.title}</h1>
            <p style={{ fontSize: 14, opacity: 0.9 }}>Send a private message to the owner of this {typeLabel}. Your contact details are optional.</p>
          </div>

          <div style={{ background: '#fff', padding: 20 }}>
            {/* Links */}
            {links.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {links.map((l: any, i: number) => (
                    <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', borderRadius: 20, background: '#E0F2FE', color: '#0284C7', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{l.label} &rarr;</a>
                  ))}
                </div>
              </div>
            )}

            {/* Social profiles */}
            {Object.keys(socials).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {socials.instagram && <a href={`https://instagram.com/${socials.instagram}`} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', borderRadius: 20, background: '#F3F4F6', color: '#4B5563', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Instagram</a>}
                  {socials.twitter && <a href={`https://x.com/${socials.twitter}`} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', borderRadius: 20, background: '#F3F4F6', color: '#4B5563', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>X / Twitter</a>}
                  {socials.tiktok && <a href={`https://tiktok.com/@${socials.tiktok}`} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', borderRadius: 20, background: '#F3F4F6', color: '#4B5563', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>TikTok</a>}
                  {socials.facebook && <a href={socials.facebook} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', borderRadius: 20, background: '#F3F4F6', color: '#4B5563', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Facebook</a>}
                  {socials.linkedin && <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', borderRadius: 20, background: '#F3F4F6', color: '#4B5563', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>LinkedIn</a>}
                  {socials.website && <a href={socials.website} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', borderRadius: 20, background: '#F3F4F6', color: '#4B5563', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Website</a>}
                </div>
              </div>
            )}

            {/* Priority toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => setPriority('normal')} style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', ...(priority === 'normal' ? { background: '#E0F2FE', color: '#0284C7', border: '2px solid #0284C7' } : { background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB' }) }}>Normal</button>
              <button onClick={() => setPriority('urgent')} style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', ...(priority === 'urgent' ? { background: '#FEE2E2', color: '#DC2626', border: '2px solid #DC2626' } : { background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB' }) }}>Urgent</button>
            </div>

            {/* Contact form */}
            <div style={{ display: 'grid', gap: 12 }}>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" autoComplete="given-name" style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} />
              <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Your message *" rows={3} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827', resize: 'none', minHeight: 80 }} />
              <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email (optional)" type="email" autoComplete="email" style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} />
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone (optional)" type="tel" autoComplete="tel" style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} />
              <button onClick={sendMessage} disabled={sending} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 12px rgba(50,147,203,0.25)', opacity: sending ? 0.6 : 1 }}>{sending ? 'Sending...' : 'Send Message'}</button>
            </div>

            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 12, textAlign: 'center' }}>The owner&apos;s phone and email stay private. Only your message is delivered.</p>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280' }}>
          Powered by <Link href="/" style={{ color: '#3293CB', fontWeight: 600, textDecoration: 'none' }}>BuddyAlly</Link>
        </p>
      </div>
    </div>
  )
}
