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

    // Update profile with additional info
    if (result.user) {
      await new Promise(r => setTimeout(r, 500)) // Wait for trigger
      await supabase.from('profiles').update({
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
        city: form.city,
        home_display_name: form.city,
        interests,
        verified_email: true,
        badges: ['New Member'],
      }).eq('id', result.user.id)
    }

    router.replace('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6">Join BuddyAlly</h1>

        <button onClick={() => signInWithGoogle()} className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 font-semibold text-sm mb-4 hover:bg-gray-50 transition">
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Sign up with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or sign up with email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4">{error}</div>}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">First Name *</label>
              <input type="text" value={form.firstName} onChange={e => update('firstName', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Alex" required />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Last Name</label>
              <input type="text" value={form.lastName} onChange={e => update('lastName', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Smith" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="you@example.com" required />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="+1 (555) 000-0000" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Password *</label>
            <input type="password" value={form.password} onChange={e => update('password', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Min 6 characters" required />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Confirm Password *</label>
            <input type="password" value={form.password2} onChange={e => update('password2', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Re-enter password" required />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">Home Area</label>
            <input type="text" value={form.city} onChange={e => update('city', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Brooklyn, NY" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-2">Interests *</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} type="button" onClick={() => toggleInterest(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${interests.includes(cat) ? 'bg-[#3293CB] text-white border-[#3293CB]' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-[#3293CB] text-white font-bold py-3 rounded-xl hover:bg-[#2678A8] transition disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account? <Link href="/login" className="text-[#3293CB] font-semibold">Log in</Link>
        </p>
      </div>
    </div>
  )
}
