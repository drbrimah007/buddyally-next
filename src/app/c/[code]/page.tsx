'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function PublicCodePage() {
  const { code: rawCode } = useParams<{ code: string }>()
  const code = (rawCode || '').toUpperCase()
  const [codeData, setCodeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ title: string; msg: string } | null>(null)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState('')
  const [priority, setPriority] = useState('normal')
  const [form, setForm] = useState({ name: '', message: '', email: '', phone: '' })
  const [sentPriority, setSentPriority] = useState('normal')

  useEffect(() => { if (code) loadCode() }, [code])

  async function loadCode() {
    if (!code || code.length < 4 || code.length > 8) {
      setError({ title: 'Invalid code', msg: 'This link does not match a valid BuddyAlly code.' })
      setLoading(false); return
    }
    const { data, error: err } = await supabase.from('connect_codes').select('*').eq('code', code).eq('status', 'active').single()
    if (err || !data) {
      setError({ title: 'Code not found', msg: 'This BuddyAlly code does not exist or has been deactivated.' })
      setLoading(false); return
    }
    setCodeData(data); setLoading(false)
    // Fire-and-forget scan record — surface errors instead of silently dropping.
    ;(async () => {
      const { error: scanErr } = await supabase.from('connect_scans').insert({ code_id: data.id, user_agent: navigator.userAgent })
      if (scanErr) console.error('[c/code] connect_scans insert failed', scanErr)
    })()
  }

  async function sendMessage() {
    if (!form.message.trim()) { setFormError('Please write a message.'); return }
    if (!codeData) return
    setSending(true); setFormError('')
    try {
      await supabase.from('connect_messages').insert({
        code_id: codeData.id, owner_id: codeData.user_id,
        sender_name: form.name.trim() || 'Anonymous',
        sender_email: form.email.trim(), sender_phone: form.phone.trim(),
        message: (priority === 'urgent' ? '[URGENT] ' : '') + form.message.trim(),
      })
      // Notify the owner: email + push + in-app alert via /api/notify.
      // The route honors the owner's push_enabled / email_enabled flags.
      try {
        const { data: owner } = await supabase.from('profiles').select('email, first_name').eq('id', codeData.user_id).single()
        fetch('/api/notify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerEmail: owner?.email || '', ownerName: owner?.first_name || '',
            senderName: form.name.trim() || 'Anonymous', message: form.message.trim(),
            code: codeData.code, codeTitle: codeData.title, priority,
            senderEmail: form.email.trim(), senderPhone: form.phone.trim(),
            ownerId: codeData.user_id,
            push_enabled: codeData.push_enabled !== false,
            email_enabled: codeData.email_enabled !== false,
          }),
        }).catch(() => {})
      } catch {}
      setSentPriority(priority)
      setSent(true)
    } catch {
      setFormError('Failed to send. Please try again.')
    }
    setSending(false)
  }

  const typeLabels: Record<string, string> = {
    contact_me: 'contact me page', car_sale: 'vehicle', parked_car: 'vehicle',
    lost_item: 'item', pet: 'pet', bike: 'vehicle', package: 'package',
    property: 'property', other: 'item',
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root{--sky:#0284C7;--sky-hover:#0369A1;--sky-light:#E0F2FE;--emerald:#10B981;--emerald-50:#ECFDF5;--bg:#fff;--bg-soft:#F8FAFC;--text:#0F172A;--text-sec:#475569;--text-muted:#64748B;--border:#E2E8F0;--shadow-sm:0 1px 2px rgba(0,0,0,0.05);--shadow:0 4px 6px -1px rgba(0,0,0,0.07);--shadow-lg:0 10px 15px -3px rgba(0,0,0,0.08)}
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--text);background:var(--bg-soft);line-height:1.6;-webkit-font-smoothing:antialiased;min-height:100vh;display:flex;flex-direction:column}
        a{color:inherit;text-decoration:none}
        .ba-header{background:rgba(255,255,255,0.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:14px 20px;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:800;font-size:18px;color:var(--text)}
        .ba-header img{width:28px;height:28px;border-radius:6px}
        .ba-page{flex:1;display:flex;align-items:flex-start;justify-content:center;padding:32px 16px}
        .ba-card{background:#fff;border:1px solid var(--border);border-radius:24px;box-shadow:var(--shadow-lg);width:100%;max-width:460px;overflow:hidden}
        .card-top{color:#fff;padding:24px 24px 20px;position:relative}
        .card-top.type-contact_me{background:linear-gradient(135deg,#0284C7,#5d92f6)}
        .card-top.type-car_sale{background:linear-gradient(135deg,#059669,#34d399)}
        .card-top.type-parked_car{background:linear-gradient(135deg,#EA580C,#FB923C)}
        .card-top.type-lost_item{background:linear-gradient(135deg,#7C3AED,#A78BFA)}
        .card-top.type-pet{background:linear-gradient(135deg,#DB2777,#F472B6)}
        .card-top.type-bike{background:linear-gradient(135deg,#0D9488,#2DD4BF)}
        .card-top.type-package{background:linear-gradient(135deg,#D97706,#FBBF24)}
        .card-top.type-property{background:linear-gradient(135deg,#475569,#94A3B8)}
        .card-top.type-other{background:linear-gradient(135deg,#0284C7,#5d92f6)}
        .card-top .badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,0.18);font-size:12px;font-weight:600;margin-bottom:12px}
        .card-top .code-chip{position:absolute;top:16px;right:16px;padding:4px 10px;border-radius:8px;background:rgba(0,0,0,0.2);font-size:11px;font-weight:700;letter-spacing:0.05em;font-family:'SF Mono','Fira Code',monospace}
        .card-top h1{font-size:22px;font-weight:800;line-height:1.2;letter-spacing:-0.02em}
        .card-top p{font-size:14px;color:rgba(255,255,255,0.85);margin-top:6px;line-height:1.5}
        .card-body{padding:24px}
        .ba-input{width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:14px;font:inherit;color:var(--text);background:var(--bg-soft);transition:border-color 0.2s;margin-bottom:10px}
        .ba-input:focus{outline:none;border-color:var(--sky);box-shadow:0 0 0 3px rgba(2,132,199,0.12)}
        .ba-textarea{width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:14px;font:inherit;color:var(--text);background:var(--bg-soft);min-height:80px;resize:vertical;margin-bottom:10px}
        .ba-textarea:focus{outline:none;border-color:var(--sky);box-shadow:0 0 0 3px rgba(2,132,199,0.12)}
        .btn-send{display:inline-flex;align-items:center;justify-content:center;width:100%;padding:14px;border-radius:14px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:var(--sky);color:#fff;box-shadow:0 4px 12px rgba(2,132,199,0.25)}
        .btn-send:hover{background:var(--sky-hover)}
        .btn-send:disabled{opacity:0.6;cursor:not-allowed}
        .privacy-row{display:flex;align-items:center;gap:8px;margin-top:16px;padding:12px 14px;border-radius:12px;background:var(--emerald-50);font-size:12px;color:#065F46;font-weight:600}
        .success-state{text-align:center;padding:40px 24px}
        .success-check{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#ECFDF5,#D1FAE5);color:var(--emerald);display:grid;place-items:center;font-size:32px;margin:0 auto 16px;box-shadow:0 0 0 8px rgba(16,185,129,0.08)}
        .urgent-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:999px;background:#FEE2E2;color:#DC2626;font-size:13px;font-weight:700;letter-spacing:0.03em;margin-bottom:16px;border:1.5px solid #FECACA}
        .btn-another{display:inline-flex;align-items:center;justify-content:center;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;border:1.5px solid var(--border);background:#fff;color:var(--text);cursor:pointer;margin-top:12px}
        .btn-another:hover{background:var(--bg-soft);border-color:var(--sky);color:var(--sky)}
        .ba-footer{text-align:center;padding:20px;font-size:13px;color:var(--text-muted)}
        .ba-footer a{color:var(--sky)}
        @media(max-width:480px){.ba-card{border-radius:20px}.card-top{padding:20px}.card-body{padding:20px}}
      `}} />

      <div className="ba-header">
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/buddyally-logo.png" alt="BuddyAlly" />BuddyAlly Contact
        </a>
      </div>

      <div className="ba-page">
        <div className="ba-card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: '#64748B' }}>Loading...</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <h2 style={{ fontSize: 22, marginBottom: 8 }}>{error.title}</h2>
              <p style={{ color: '#64748B', marginBottom: 24 }}>{error.msg}</p>
              <a href="/signup" style={{ color: '#0284C7', fontWeight: 600, fontSize: 15 }}>Get your own BuddyAlly code &rarr;</a>
            </div>
          ) : sent ? (
            <div className="success-state">
              {sentPriority === 'urgent' && <div className="urgent-badge">🚨 URGENT</div>}
              <div className="success-check">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h2 style={{ fontSize: 22, marginBottom: 8 }}>Message sent successfully</h2>
              <p style={{ color: '#64748B', marginBottom: 4, fontSize: 15 }}>The owner has been notified and will see your message shortly.</p>
              {form.email && <p style={{ color: '#475569', fontSize: 14, marginTop: 8 }}>They can reply to you at <strong>{form.email}</strong></p>}
              {form.phone && <p style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>Or call you at <strong>{form.phone}</strong></p>}
              <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <button className="btn-another" onClick={() => { setSent(false); setForm({ name: '', message: '', email: '', phone: '' }); setPriority('normal') }}>Send another message</button>
                <a href="/signup" style={{ color: '#0284C7', fontWeight: 600, fontSize: 14, marginTop: 4 }}>Get your own BuddyAlly code &rarr;</a>
              </div>
            </div>
          ) : codeData && (
            <>
              <div className={`card-top type-${codeData.code_type || 'contact_me'}`}>
                <div className="badge">🔗 BuddyAlly Contact</div>
                <div className="code-chip">{codeData.code}</div>
                {codeData.image_url && <img src={codeData.image_url} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 14, marginBottom: 12 }} />}
                <h1>{codeData.title}</h1>
                <p>Send a private message to the owner of this {typeLabels[codeData.code_type] || 'item'}. Your contact details are optional.</p>
              </div>
              <div className="card-body">
                {/* Links */}
                {(codeData.links || []).length > 0 && (
                  <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {codeData.links.map((l: any, i: number) => (
                      <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 14px', background: '#E0F2FE', color: '#0284C7', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>{l.label} &rarr;</a>
                    ))}
                  </div>
                )}
                {/* Social profiles */}
                {codeData.social_profiles && Object.keys(codeData.social_profiles).length > 0 && (
                  <div style={{ marginBottom: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Object.entries(codeData.social_profiles).map(([k, v]) => (
                      <a key={k} href={k === 'instagram' ? `https://instagram.com/${v}` : k === 'twitter' ? `https://x.com/${v}` : k === 'tiktok' ? `https://tiktok.com/@${v}` : v as string} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#475569' }}>{k.charAt(0).toUpperCase() + k.slice(1)}</a>
                    ))}
                  </div>
                )}
                {/* Error */}
                {formError && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 12 }}>{formError}</div>}
                {/* Priority toggle */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button type="button" onClick={() => setPriority('normal')} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: priority === 'normal' ? '2px solid #0284C7' : '2px solid #E2E8F0', background: priority === 'normal' ? '#E0F2FE' : '#fff', color: priority === 'normal' ? '#0284C7' : '#64748B', transition: 'all 0.15s' }}>Normal</button>
                  <button type="button" onClick={() => setPriority('urgent')} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: priority === 'urgent' ? '2px solid #DC2626' : '2px solid #E2E8F0', background: priority === 'urgent' ? '#FEE2E2' : '#fff', color: priority === 'urgent' ? '#DC2626' : '#64748B', transition: 'all 0.15s' }}>🚨 Urgent</button>
                </div>
                {/* Form */}
                <input className="ba-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" autoComplete="given-name" />
                <textarea className="ba-textarea" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Your message *" />
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input className="ba-input" style={{ flex: 1, marginBottom: 0 }} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email (optional)" autoComplete="email" />
                  <input className="ba-input" style={{ flex: 1, marginBottom: 0 }} type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone (optional)" autoComplete="tel" />
                </div>
                <button className="btn-send" onClick={sendMessage} disabled={sending}>{sending ? 'Sending...' : 'Send Message'}</button>
                <div className="privacy-row">🛡 The owner&apos;s phone and email stay private. Only your message is delivered.</div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="ba-footer">
        <a href="/">BuddyAlly</a> &middot; <a href="/signup">Get your own code</a> &middot; Private by default
      </div>
    </>
  )
}
