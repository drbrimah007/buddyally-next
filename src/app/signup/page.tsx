'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const CATEGORIES = ['Travel','Local Activities','Sports / Play','Learning','Help / Support','Events','Outdoor','Gaming','Wellness','Ride Share','Dog Walk','Babysit','Party','Pray','Others']

export default function SignupPage() {
  const { signUpWithEmail, signInWithGoogle } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', password2: '', city: '' })
  const [interests, setInterests] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleInterest(cat: string) {
    setInterests(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.firstName || !form.email || !form.password) return setError('Name, email, and password are required.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Please enter a valid email.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    if (form.password !== form.password2) return setError('Passwords do not match.')
    if (interests.length === 0) return setError('Please select at least one interest.')

    setLoading(true)
    const result = await signUpWithEmail(form.email, form.password, {
      first_name: form.firstName,
      last_name: form.lastName,
    })
    if (result.error) { setError(result.error); setLoading(false); return }

    if (result.user) {
      await new Promise(r => setTimeout(r, 500))
      await supabase.from('profiles').update({
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
        city: form.city,
        home_display_name: form.city,
        interests,
        badges: ['New Member'],
      }).eq('id', result.user.id)
    }

    router.replace('/dashboard')
  }

  const inputStyle = { width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }
  const labelStyle = { fontSize: 13, fontWeight: 600 as const, color: '#4B5563', display: 'block' as const, marginBottom: 6 }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', padding: '16px', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: 32, width: '100%', maxWidth: 520 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Join BuddyAlly</h1>

        <button onClick={() => signInWithGoogle()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, border: '1px solid #E5E7EB', borderRadius: 14, padding: 12, fontWeight: 600, fontSize: 15, background: '#fff', cursor: 'pointer', marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Sign up with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
          <span style={{ fontSize: 13, color: '#6B7280' }}>or sign up with email</span>
          <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
        </div>

        {error && <div style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 14, padding: 12, borderRadius: 12, marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSignup} style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input type="text" value={form.firstName} onChange={e => update('firstName', e.target.value)} style={inputStyle} placeholder="Alex" required />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input type="text" value={form.lastName} onChange={e => update('lastName', e.target.value)} style={inputStyle} placeholder="Smith" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Email *</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} style={inputStyle} placeholder="you@example.com" required />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} style={inputStyle} placeholder="+1 (555) 000-0000" />
          </div>
          <div>
            <label style={labelStyle}>Password *</label>
            <input type="password" value={form.password} onChange={e => update('password', e.target.value)} style={inputStyle} placeholder="Min 6 characters" required />
          </div>
          <div>
            <label style={labelStyle}>Confirm Password *</label>
            <input type="password" value={form.password2} onChange={e => update('password2', e.target.value)} style={inputStyle} placeholder="Re-enter password" required />
          </div>
          <div>
            <label style={labelStyle}>Home Area</label>
            <input type="text" value={form.city} onChange={e => update('city', e.target.value)} style={inputStyle} placeholder="Brooklyn, NY" />
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 8 }}>Interests *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} type="button" onClick={() => toggleInterest(cat)}
                  style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', ...(interests.includes(cat) ? { background: '#3293CB', color: '#fff', border: '1px solid #3293CB' } : { background: '#F9FAFB', color: '#4B5563', border: '1px solid #E5E7EB' }) }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer', boxShadow: '0 1px 3px rgba(50,147,203,0.3)', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#6B7280', marginTop: 12 }}>
          By signing up you agree to our <Link href="/terms" style={{ color: '#3293CB', fontWeight: 600, textDecoration: 'none' }}>Terms</Link> and Community Guidelines.
        </p>
        <p style={{ textAlign: 'center', fontSize: 14, color: '#4B5563', marginTop: 12 }}>
          Already have an account? <Link href="/login" style={{ color: '#3293CB', fontWeight: 600, textDecoration: 'none' }}>Log in</Link>
        </p>
      </div>
    </div>
  )
}
