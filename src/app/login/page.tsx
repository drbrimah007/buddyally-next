'use client'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const { signInWithEmail, signInWithGoogle, resetPassword } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const result = await signInWithEmail(email, password)
    if (result.error) {
      if (result.error.includes('not confirmed')) {
        setError('Email not confirmed. Check your inbox for the confirmation link.')
      } else {
        setError(result.error)
      }
      setLoading(false)
    } else {
      router.replace('/dashboard')
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setError('Enter your email first, then click Forgot password.'); return }
    const result = await resetPassword(email)
    if (result.error) setError(result.error)
    else setResetSent(true)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', padding: '16px', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: 32, width: '100%', maxWidth: 480 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Log In to BuddyAlly</h1>

        <button onClick={() => signInWithGoogle()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, border: '1px solid #E5E7EB', borderRadius: 14, padding: '12px', fontWeight: 600, fontSize: 15, background: '#fff', cursor: 'pointer', marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
          <span style={{ fontSize: 13, color: '#6B7280' }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
        </div>

        {error && <div style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 14, padding: 12, borderRadius: 12, marginBottom: 16 }}>{error}</div>}
        {resetSent && <div style={{ background: '#F0FDF4', color: '#059669', fontSize: 14, padding: 12, borderRadius: 12, marginBottom: 16 }}>Password reset email sent! Check your inbox.</div>}

        <form onSubmit={handleLogin} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} placeholder="you@example.com" required />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} placeholder="Your password" required />
          </div>
          <div style={{ textAlign: 'right' }}>
            <button type="button" onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: '#3293CB', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Forgot password?</button>
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer', boxShadow: '0 1px 3px rgba(50,147,203,0.3)', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 14, color: '#4B5563', marginTop: 16 }}>
          Don&apos;t have an account? <Link href="/signup" style={{ color: '#3293CB', fontWeight: 600, textDecoration: 'none' }}>Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
