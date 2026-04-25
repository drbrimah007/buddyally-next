'use client'

// Slim persistent strip that sits just above the bottom nav. Two purposes:
//   1. Always-visible "Safety" link → opens the Safety Protocols overlay
//      (the same checklist the old per-page SafetyBanner expanded).
//   2. Always-visible "Report" link → opens a quick report overlay for
//      flagging a user, message, or content from anywhere in the app.
//
// Lives outside any individual page's flow so it's available on Explore,
// Feed, Messages, Groups, Codes, etc. without each page re-mounting it.

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function SafetyFooter() {
  const { user } = useAuth()
  const [open, setOpen] = useState<null | 'safety' | 'report'>(null)
  const [reportText, setReportText] = useState('')
  const [reportSubject, setReportSubject] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submitReport() {
    if (!reportText.trim() || !user) return
    setSending(true)
    setError('')
    // Writes directly to the existing `reports` table. The schema requires
    // reporter_id + reason. We stash the user-typed subject in `reason`
    // (defaulting to 'general') and the long-form text in `details`.
    const { error: e } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reason: reportSubject.trim() || 'general',
      details: reportText.trim(),
      status: 'open',
      reported_type: 'app_feedback',
    })
    setSending(false)
    if (e) {
      setError('Could not send: ' + e.message)
      return
    }
    setSent(true)
    setTimeout(() => {
      setSent(false); setOpen(null); setReportText(''); setReportSubject('')
    }, 1400)
  }

  return (
    <>
      {/* Slim strip — sits just above the bottom nav (which is z-100). The
          dashboard layout reserves bottom padding so content doesn't hide
          behind it. */}
      <div
        style={{
          position: 'fixed', bottom: 64, left: 0, right: 0, zIndex: 95,
          background: 'rgba(248,250,252,0.96)', backdropFilter: 'blur(8px)',
          borderTop: '1px solid #E5E7EB',
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18,
          padding: '6px 12px',
          fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.02em',
        }}
      >
        <button onClick={() => setOpen('safety')} style={pillBtn}>
          🛡 <span>Safety</span>
        </button>
        <span style={{ color: '#CBD5E1' }}>·</span>
        <button onClick={() => setOpen('report')} style={pillBtn}>
          🚩 <span>Report</span>
        </button>
      </div>

      {/* Safety overlay */}
      {open === 'safety' && (
        <Sheet onClose={() => setOpen(null)} title="🛡 Safety Protocols">
          <p style={{ marginBottom: 10, fontWeight: 700, color: '#111827' }}>Before any in-person meeting, ride share, package handoff, or buddy-based help:</p>
          <ul style={{ paddingLeft: 20, marginBottom: 12, lineHeight: 1.8, color: '#374151', fontSize: 14 }}>
            <li>Do a live video call first</li>
            <li>Capture a screenshot of the person during the call</li>
            <li>Ask for a photo of their ID</li>
            <li>Tell a friend or family member where you&apos;re going and who you&apos;re meeting</li>
            <li>Choose public, well-lit meeting locations</li>
            <li>Never trust a buddy with valuables, sensitive property, or anyone&apos;s life</li>
          </ul>
          <p style={{ fontSize: 12, color: '#6B7280', borderTop: '1px solid #E5E7EB', paddingTop: 10, lineHeight: 1.6 }}>
            These steps reduce risk but don&apos;t guarantee safety. If something feels wrong, cancel the interaction and report it.
          </p>
        </Sheet>
      )}

      {/* Report overlay */}
      {open === 'report' && (
        <Sheet onClose={() => setOpen(null)} title="🚩 Report a problem">
          {sent ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 38, marginBottom: 8 }}>✓</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#065F46' }}>Report sent. Thank you.</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: '#4B5563', marginBottom: 12, lineHeight: 1.6 }}>
                Tell us what happened. If it&apos;s about a specific person, message, or activity, paste the link or describe where it was.
              </p>
              <input
                value={reportSubject}
                onChange={(e) => setReportSubject(e.target.value)}
                placeholder="Short subject (optional)"
                style={input}
              />
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={5}
                placeholder="What happened? Include links / names if you can."
                style={{ ...input, marginTop: 8, resize: 'vertical', minHeight: 120 }}
              />
              <button
                onClick={submitReport}
                disabled={!reportText.trim() || sending || !user}
                style={{
                  marginTop: 12, width: '100%', padding: 12, borderRadius: 12, border: 'none',
                  background: !reportText.trim() || sending || !user ? '#CBD5E1' : '#DC2626',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  cursor: !reportText.trim() || sending || !user ? 'not-allowed' : 'pointer',
                }}
              >
                {sending ? 'Sending…' : !user ? 'Sign in to report' : 'Send report'}
              </button>
              {error && (
                <p style={{ marginTop: 8, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{error}</p>
              )}
              <p style={{ marginTop: 10, fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>
                Urgent danger? Call your local emergency number (911 in the US). BuddyAlly is not an emergency service.
              </p>
            </>
          )}
        </Sheet>
      )}
    </>
  )
}

const pillBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '4px 10px', borderRadius: 999,
  background: 'transparent', border: 'none', color: '#475569',
  fontSize: 11, fontWeight: 700, cursor: 'pointer',
}

const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '1.5px solid #E5E7EB', borderRadius: 10,
  fontSize: 14, color: '#111827', background: '#fff',
}

function Sheet({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', width: '100%', maxWidth: 540,
          borderTopLeftRadius: 22, borderTopRightRadius: 22,
          padding: '18px 18px max(20px, env(safe-area-inset-bottom))',
          maxHeight: '85vh', overflowY: 'auto',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ width: 38, height: 4, background: '#E5E7EB', borderRadius: 4, margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6B7280', padding: 0, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
