'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import InstallAppButton from '@/components/InstallAppButton'
import ShareButton from '@/components/ShareButton'
import InviteCodesPanel from '@/components/InviteCodesPanel'
import { searchPlaces as searchPlacesApi, pickPlace, renderPlaceLabel } from '@/lib/geo'

const ALL_CATEGORIES = ['Travel','Local Activities','Sports / Play','Learning','Help / Support','Events','Outdoor','Gaming','Wellness','Ride Share','Dog Walk','Babysit','Party','Pray','Others']

function VerifyBadge({ verified }: { verified: { email: boolean; phone: boolean; selfie: boolean } }) {
  const e = verified.email ? 1 : 0
  const p = verified.phone ? 1 : 0
  const s = verified.selfie ? 1 : 0
  const total = e + p + s
  const color = total === 3 ? '#059669' : total >= 1 ? '#3293CB' : '#9CA3AF'
  return (
    <span title={`Email: ${e ? '✓' : '✗'} Phone: ${p ? '✓' : '✗'} Selfie: ${s ? '✓' : '✗'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path d="M12,2 A10,10 0 0,1 20.66,7" fill="none" stroke={e ? color : '#E5E7EB'} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M20.66,7 A10,10 0 0,1 12,22" fill="none" stroke={p ? color : '#E5E7EB'} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M12,22 A10,10 0 0,1 3.34,7" fill="none" stroke={s ? color : '#E5E7EB'} strokeWidth="2.5" strokeLinecap="round" />
        {total === 3 && <path d="M8 12l2.5 2.5L16 9.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {total === 3 && <span style={{ fontSize: 12, fontWeight: 600, color }}>Verified</span>}
    </span>
  )
}

export default function ProfilePage() {
  const { user, profile, updateProfile, signOut, refreshProfile } = useAuth()
  const { success, error: toastError, info } = useToast()
  const [editing, setEditing] = useState(false)
  const [editingInterests, setEditingInterests] = useState(false)
  const [editingSocials, setEditingSocials] = useState(false)
  const [phoneVerifying, setPhoneVerifying] = useState(false)
  const [selfieCapturing, setSelfieCapturing] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', city: '', bio: '' })
  // Geo-picker scratchpad for the profile's Home Area edit. Latches coords
  // when user picks a place, so saveEdit can write home_lat/home_lng.
  const [homeCoords, setHomeCoords] = useState<{ lat: number; lng: number; stateCode: string } | null>(null)
  const [homeResults, setHomeResults] = useState<any[]>([])
  const [showHomeResults, setShowHomeResults] = useState(false)
  const homeSearchTimer = useRef<any>(null)
  const homeBoxRef = useRef<HTMLDivElement | null>(null)
  const [interestsForm, setInterestsForm] = useState<string[]>([])
  const [socialsForm, setSocialsForm] = useState({ instagram: '', twitter: '', linkedin: '', website: '' })
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [phoneRequestId, setPhoneRequestId] = useState('')
  const [phoneStep, setPhoneStep] = useState<'enter' | 'verify'>('enter')
  const [stats, setStats] = useState({ created: 0, joined: 0 })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selfieStream, setSelfieStream] = useState<MediaStream | null>(null)
  const [selfieChallenge, setSelfieChallenge] = useState('')
  const [selfieCountdown, setSelfieCountdown] = useState<number | null>(null)
  const [selfieReady, setSelfieReady] = useState(false)
  const [emailVerifying, setEmailVerifying] = useState(false)
  const [emailCode, setEmailCode] = useState('')
  const [emailStep, setEmailStep] = useState<'send' | 'enter'>('send')
  const [emailSending, setEmailSending] = useState(false)

  useEffect(() => { if (user) loadStats() }, [user])

  // Outside-click / Escape to close the home-area suggestions dropdown.
  // MUST stay above the `if (!profile) return ...` guard below — moving
  // it later (where it used to live) caused React error #310: on first
  // render `profile` was null and this hook was skipped, then on the
  // next render it ran, so React saw the hook count jump and crashed
  // the whole page. All hooks now sit above the early return.
  useEffect(() => {
    if (!showHomeResults) return
    function onClick(e: MouseEvent) {
      if (homeBoxRef.current && !homeBoxRef.current.contains(e.target as Node)) {
        setShowHomeResults(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowHomeResults(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [showHomeResults])

  async function loadStats() {
    if (!user) return
    const [{ count: created }, { count: joined }] = await Promise.all([
      supabase.from('activities').select('*', { count: 'exact', head: true }).eq('created_by', user.id),
      supabase.from('activity_participants').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    setStats({ created: created || 0, joined: joined || 0 })
  }

  if (!profile) return <div style={{ textAlign: 'center', padding: 80, color: '#6B7280' }}>Loading...</div>

  function startEdit() {
    setForm({ firstName: profile!.first_name, lastName: profile!.last_name, city: profile!.city || profile!.home_display_name || '', bio: profile!.bio || '' })
    // Seed coords from profile if they exist; otherwise saveEdit will null them out
    // (so the user is forced to pick from the list to enable geo filtering).
    if (profile!.home_lat != null && profile!.home_lng != null) {
      setHomeCoords({ lat: profile!.home_lat, lng: profile!.home_lng, stateCode: '' })
    } else {
      setHomeCoords(null)
    }
    setEditing(true)
  }

  function searchHome(val: string) {
    setForm(p => ({ ...p, city: val }))
    setHomeCoords(null)
    if (homeSearchTimer.current) clearTimeout(homeSearchTimer.current)
    if (!val || val.length < 2) { setHomeResults([]); setShowHomeResults(false); return }
    homeSearchTimer.current = setTimeout(async () => {
      // Bias by current home country (if any) so the user's local
      // neighborhood beats global lookalikes (Brownsville Brooklyn vs Browns NZ).
      const cc = ((profile as any)?.home_country_code || '').toLowerCase() || null
      const data = await searchPlacesApi(val, 8, cc)
      setHomeResults(data)
      setShowHomeResults(data.length > 0)
    }, 300)
  }

  function selectHomePlace(place: any) {
    const pick = pickPlace(place)
    setForm(p => ({ ...p, city: pick.display }))
    setHomeCoords({ lat: pick.lat, lng: pick.lng, stateCode: pick.stateCode })
    setHomeResults([])
    setShowHomeResults(false)
  }

  async function saveEdit() {
    const updates: any = {
      first_name: form.firstName,
      last_name: form.lastName,
      city: form.city,
      home_display_name: form.city,
      bio: form.bio,
    }
    // Only write coords if we actually have them — don't clobber previous
    // saved coords when the user edits just their bio without re-picking.
    if (homeCoords) {
      updates.home_lat = homeCoords.lat
      updates.home_lng = homeCoords.lng
    }
    await updateProfile(updates)
    setEditing(false)
  }

  function startEditInterests() {
    setInterestsForm([...(profile!.interests || [])])
    setEditingInterests(true)
  }

  function toggleInterest(cat: string) {
    setInterestsForm(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  async function saveInterests() {
    await updateProfile({ interests: interestsForm } as any)
    setEditingInterests(false)
    refreshProfile()
  }

  function startEditSocials() {
    const s = (profile!.socials || {}) as any
    setSocialsForm({ instagram: s.instagram || '', twitter: s.twitter || '', linkedin: s.linkedin || '', website: s.website || '' })
    setEditingSocials(true)
  }

  async function saveSocials() {
    const obj: Record<string, string> = {}
    if (socialsForm.instagram) obj.instagram = socialsForm.instagram.replace('@', '')
    if (socialsForm.twitter) obj.twitter = socialsForm.twitter.replace('@', '')
    if (socialsForm.linkedin) obj.linkedin = socialsForm.linkedin.startsWith('http') ? socialsForm.linkedin : 'https://linkedin.com/in/' + socialsForm.linkedin
    if (socialsForm.website) obj.website = socialsForm.website.startsWith('http') ? socialsForm.website : 'https://' + socialsForm.website
    await updateProfile({ socials: obj } as any)
    setEditingSocials(false)
    refreshProfile()
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    // Compress image
    const canvas = document.createElement('canvas')
    const img = new Image()
    img.onload = async () => {
      const maxDim = 800
      let w = img.width, h = img.height
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim }
        else { w = Math.round(w * maxDim / h); h = maxDim }
      }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(async blob => {
        if (!blob) { setUploading(false); return }
        const fname = `${user.id}-${Date.now()}.jpg`
        const { error: ue } = await supabase.storage.from('avatars').upload(fname, blob, { contentType: 'image/jpeg', upsert: true })
        if (!ue) {
          const { data: ud } = supabase.storage.from('avatars').getPublicUrl(fname)
          await updateProfile({ avatar_url: ud.publicUrl } as any)
          refreshProfile()
        }
        setUploading(false)
      }, 'image/jpeg', 0.85)
    }
    img.src = URL.createObjectURL(file)
  }

  // Phone verification — uses Supabase Edge Function (vonage-verify)
  async function sendPhoneOTP() {
    if (!phoneNumber.trim()) return
    if (!phoneNumber.startsWith('+')) { toastError('Include country code (e.g. +1 for US)'); return }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toastError('Please log in first'); return }
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/vonage-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ action: 'send', phone_number: phoneNumber })
      })
      const data = await res.json()
      if (!res.ok || data.error) { toastError('Failed: ' + (data.error || 'Unknown error')); return }
      setPhoneRequestId(data.request_id)
      setPhoneStep('verify')
      success('Code sent! Check your phone.')
    } catch { toastError('Failed to send verification code') }
  }

  async function verifyPhoneOTP() {
    if (!phoneCode.trim() || phoneCode.length < 6) { toastError('Enter the 6-digit code'); return }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toastError('Please log in first'); return }
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/vonage-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ action: 'check', request_id: phoneRequestId, code: phoneCode })
      })
      const data = await res.json()
      if (!res.ok || data.error) { toastError('Invalid code: ' + (data.error || 'Try again')); return }
      await updateProfile({ verified_phone: true, phone: phoneNumber } as any)
      refreshProfile()
      setPhoneVerifying(false)
      setPhoneStep('enter')
      setPhoneCode('')
      success('Phone verified!')
    } catch { toastError('Verification failed') }
  }

  // Selfie capture (with liveness challenge + 3s countdown, mirroring v1)
  const SELFIE_CHALLENGES = [
    'Turn your head slightly left',
    'Turn your head slightly right',
    'Look up slightly',
    'Hold still and blink',
    'Center your face in the circle',
  ]

  async function startSelfie() {
    setSelfieChallenge(SELFIE_CHALLENGES[Math.floor(Math.random() * SELFIE_CHALLENGES.length)])
    setSelfieReady(false)
    setSelfieCountdown(null)
    setSelfieCapturing(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } }, audio: false })
      setSelfieStream(stream)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
        setSelfieReady(true)
      }, 100)
    } catch {
      toastError('Camera access denied. Allow camera access in your browser settings.')
      setSelfieCapturing(false)
    }
  }

  function beginSelfieCountdown() {
    if (!selfieReady || selfieCountdown !== null) return
    let count = 3
    setSelfieCountdown(count)
    const timer = setInterval(() => {
      count -= 1
      if (count <= 0) {
        clearInterval(timer)
        setSelfieCountdown(null)
        captureSelfie()
      } else {
        setSelfieCountdown(count)
      }
    }, 1000)
  }

  async function captureSelfie() {
    if (!videoRef.current || !canvasRef.current || !user) return
    const v = videoRef.current
    const c = canvasRef.current
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    // Stop stream
    selfieStream?.getTracks().forEach(t => t.stop())
    setSelfieStream(null)
    // Upload
    c.toBlob(async blob => {
      if (!blob) return
      const fname = `selfie-${user.id}-${Date.now()}.jpg`
      const { error } = await supabase.storage.from('avatars').upload(fname, blob, { contentType: 'image/jpeg' })
      if (!error) {
        await updateProfile({ verified_selfie: true } as any)
        refreshProfile()
        success('Selfie verified!')
      } else {
        toastError('Could not upload selfie. Please try again.')
      }
      setSelfieCapturing(false)
      setSelfieReady(false)
    }, 'image/jpeg', 0.9)
  }

  function cancelSelfie() {
    selfieStream?.getTracks().forEach(t => t.stop())
    setSelfieStream(null)
    setSelfieCapturing(false)
    setSelfieReady(false)
    setSelfieCountdown(null)
  }

  async function sendEmailVerifyCode() {
    setEmailSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toastError('Please log in first'); setEmailSending(false); return }
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ action: 'send' })
      })
      const data = await res.json()
      if (!res.ok || data.error) { toastError(data.error || 'Failed to send'); setEmailSending(false); return }
      setEmailStep('enter')
      success('Verification code sent to your email!')
    } catch { toastError('Failed to send verification email') }
    setEmailSending(false)
  }

  async function verifyEmailCode() {
    if (!emailCode.trim() || emailCode.length < 6) { toastError('Enter the 6-digit code'); return }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toastError('Please log in first'); return }
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ action: 'verify', token: emailCode.trim() })
      })
      const data = await res.json()
      if (!res.ok || data.error) { toastError(data.error || 'Invalid code'); return }
      await updateProfile({ verified_email: true } as any)
      refreshProfile()
      setEmailVerifying(false)
      setEmailStep('send')
      setEmailCode('')
      success('Email verified!')
    } catch { toastError('Verification failed') }
  }

  // shareProfile removed — replaced by inline <ShareButton /> in Manage row.

  const verified = { email: profile.verified_email, phone: profile.verified_phone, selfie: profile.verified_selfie }
  const completion = [
    profile.home_display_name || profile.city,
    profile.bio,
    profile.avatar_url,
    (profile.interests || []).length > 0,
    profile.verified_email,
    profile.verified_phone,
  ].filter(Boolean).length
  const completionPct = Math.round((completion / 6) * 100)

  return (
    <div>
      {/* Profile header */}
      <div style={{ borderRadius: 20, padding: 32, textAlign: 'center', marginBottom: 24 }}>
        <div onClick={() => fileRef.current?.click()} style={{ width: 96, height: 96, borderRadius: '50%', background: '#F0F9FF', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 700, color: '#3293CB', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}>
          {profile.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" /> : (profile.first_name?.[0] || '?')}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 0', textAlign: 'center' }}>{uploading ? '...' : 'Change'}</div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} style={{ display: 'none' }} />
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>{profile.first_name} {profile.last_name}</h2>
        <p style={{ fontSize: 14, color: '#4B5563', marginTop: 4 }}>📍 {profile.home_display_name || profile.city || 'No location set'}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
          <VerifyBadge verified={verified} />
          {profile.badges?.map((b: string) => <span key={b} style={{ background: '#3293CB', color: '#fff', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{b}</span>)}
        </div>
      </div>

      {/* Profile completion */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontWeight: 600 }}>Profile Completion</h3>
          <span style={{ fontSize: 14, fontWeight: 700, color: completionPct === 100 ? '#059669' : '#3293CB' }}>{completionPct}%</span>
        </div>
        <div style={{ width: '100%', height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${completionPct}%`, height: '100%', background: completionPct === 100 ? '#059669' : '#3293CB', borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
        <p style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>{completion}/6: City, Bio, Photo, Interests, Email, Phone</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Created', value: stats.created },
          { label: 'Joined', value: stats.joined },
          { label: 'Rating', value: profile.rating_avg ? `${profile.rating_avg.toFixed(1)} ★` : 'N/A' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>{s.value}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bio */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Bio</h3>
        <p style={{ fontSize: 14, color: '#4B5563' }}>{profile.bio || 'No bio yet.'}</p>
      </div>

      {/* Interests */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontWeight: 600 }}>Interests</h3>
          <button onClick={startEditInterests} style={{ fontSize: 12, fontWeight: 600, color: '#3293CB', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(profile.interests || []).length > 0
            ? profile.interests.map((i: string) => <span key={i} style={{ background: '#E0F2FE', color: '#3293CB', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>{i}</span>)
            : <span style={{ fontSize: 14, color: '#6B7280', fontStyle: 'italic' }}>No interests set.</span>}
        </div>
      </div>

      {/* Social Links */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontWeight: 600 }}>Social Links</h3>
          <button onClick={startEditSocials} style={{ fontSize: 12, fontWeight: 600, color: '#3293CB', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
        </div>
        {profile.socials && Object.keys(profile.socials).some(k => (profile.socials as any)[k]) ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(profile.socials as any).instagram && <a href={`https://instagram.com/${(profile.socials as any).instagram}`} target="_blank" rel="noopener noreferrer" style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 20, textDecoration: 'none' }}>Instagram</a>}
            {(profile.socials as any).twitter && <a href={`https://x.com/${(profile.socials as any).twitter}`} target="_blank" rel="noopener noreferrer" style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 20, textDecoration: 'none' }}>X / Twitter</a>}
            {(profile.socials as any).linkedin && <a href={(profile.socials as any).linkedin} target="_blank" rel="noopener noreferrer" style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 20, textDecoration: 'none' }}>LinkedIn</a>}
            {(profile.socials as any).website && <a href={(profile.socials as any).website} target="_blank" rel="noopener noreferrer" style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 20, textDecoration: 'none' }}>Website</a>}
          </div>
        ) : <p style={{ fontSize: 14, color: '#6B7280', fontStyle: 'italic' }}>No social links added yet.</p>}
      </div>

      {/* Rating */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Rating</h3>
        {profile.rating_avg ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#F59E0B', fontSize: 18 }}>{'★'.repeat(Math.round(profile.rating_avg))}</span>
            <span style={{ color: '#E2E8F0', fontSize: 18 }}>{'★'.repeat(5 - Math.round(profile.rating_avg))}</span>
            <span style={{ fontSize: 15, fontWeight: 600, marginLeft: 4 }}>{profile.rating_avg.toFixed(1)}</span>
            <span style={{ fontSize: 13, color: '#6B7280' }}>({profile.rating_count || 0} reviews)</span>
          </div>
        ) : <p style={{ fontSize: 14, color: '#6B7280' }}>No ratings yet.</p>}
      </div>

      {/* Verification */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Verification</h3>
        {[
          { key: 'email', label: 'Email', done: verified.email, action: () => setEmailVerifying(true) },
          { key: 'phone', label: 'Phone', done: verified.phone, action: () => setPhoneVerifying(true) },
          { key: 'selfie', label: 'Selfie', done: verified.selfie, action: () => startSelfie() },
        ].map(v => (
          <div key={v.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRadius: 14, border: '1px solid #E5E7EB', background: v.done ? '#F0FDF4' : '#F9FAFB', marginBottom: 8, ...(v.done ? { borderColor: '#D1FAE5' } : {}) }}>
            <span style={{ fontSize: 18 }}>{v.done ? '✅' : '⚪'}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 14 }}>{v.label}</p>
              <p style={{ fontSize: 12, color: '#6B7280' }}>{v.done ? 'Verified' : 'Not verified'}</p>
            </div>
            {!v.done && (
              <button onClick={v.action} style={{ fontSize: 12, fontWeight: 600, color: '#3293CB', border: '1px solid #3293CB', borderRadius: 10, padding: '4px 12px', background: 'none', cursor: 'pointer' }}>
                Verify
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Buddy Line — invite codes the current user has minted. Sits
          above Manage so it's findable for active inviters. */}
      <InviteCodesPanel />

      {/* Manage — secondary destinations that don't deserve a thumb slot
          but still need a clear home. Includes the surfaces that used to
          clutter the bottom nav (Saved Searches, Alerts) plus the lighter
          actions (New Post, Notification Settings, Install). */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Manage</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button onClick={startEdit} style={manageBtn}>Edit Profile</button>
          {/* ShareButton renders its own pill-style trigger; uses the
              modern panel with short URL + copy + channels. */}
          <ShareButton
            url={typeof window !== 'undefined' ? `${window.location.origin}/u/${user?.id}` : `https://buddyally.com/u/${user?.id}`}
            title={`${profile?.first_name || 'My'} profile on BuddyAlly`}
            text={profile?.bio ? String(profile.bio).slice(0, 140) : ''}
            label="Share Profile"
          />
          {/* Status / Post creation lives here now — too occasional for the
              + dial, which is reserved for Create Activity / Quick Ask. */}
          <a href="/dashboard/feed?compose=1" style={manageLink}>+ New Post</a>
          <a href="/dashboard/saved-searches" style={manageLink}>Saved Searches</a>
          <a href="/dashboard/alerts" style={manageLink}>Alerts</a>
          {/* Notification settings — restored from v1. Master push/email
              switches and a one-click test send. */}
          <a href="/dashboard/notification-settings" style={manageLink}>Notifications</a>
          <a href="/trust-and-safety" style={manageLink}>Trust &amp; Safety</a>
          <InstallAppButton style={{ height: 34, padding: '0 16px', borderRadius: 10, fontSize: 13 }} />
          <button onClick={() => signOut()} style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', background: '#FEE2E2', borderRadius: 10, padding: '8px 16px', border: 'none', cursor: 'pointer' }}>Log Out</button>
        </div>
      </div>

      {/* ─── MODALS ─── */}

      {/* Edit Profile modal */}
      {editing && (
        <div onClick={() => setEditing(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Edit Profile</h2>
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>First Name</label><input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} /></div>
                <div><label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Last Name</label><input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} /></div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Home Area</label>
                <div ref={homeBoxRef} style={{ position: 'relative', zIndex: 50 }}>
                  <input
                    value={form.city}
                    onChange={e => searchHome(e.target.value)}
                    placeholder="Search a city, neighborhood, or borough..."
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }}
                  />
                  {showHomeResults && homeResults.length > 0 && (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, boxShadow: '0 10px 25px -3px rgba(0,0,0,0.15)', zIndex: 9999, maxHeight: 240, overflowY: 'auto' }}>
                      {homeResults.map((p: any, i: number) => {
                        const lbl = renderPlaceLabel(p)
                        return (
                          <div key={i} onClick={() => selectHomePlace(p)} style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: '#111827' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                            <div style={{ fontWeight: 600 }}>{lbl.primary}</div>
                            {lbl.secondary && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{lbl.secondary}</div>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                {homeCoords && <p style={{ fontSize: 12, color: '#059669', marginTop: 6, fontWeight: 600 }}>✓ Home coordinates saved — used for Explore radius and distance.</p>}
                {!homeCoords && form.city && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>Pick a suggestion above to enable miles-based Explore filtering.</p>}
              </div>
              <div><label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Bio</label><textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827', resize: 'none' }} /></div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={saveEdit} style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditing(false)} style={{ padding: '14px 24px', borderRadius: 14, border: '1px solid #E5E7EB', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Interests modal */}
      {editingInterests && (
        <div onClick={() => setEditingInterests(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 520, width: '100%' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Edit Interests</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {ALL_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => toggleInterest(cat)} style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', ...(interestsForm.includes(cat) ? { background: '#3293CB', color: '#fff', border: '1px solid #3293CB' } : { background: '#F9FAFB', color: '#4B5563', border: '1px solid #E5E7EB' }) }}>{cat}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={saveInterests} style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Save</button>
              <button onClick={() => setEditingInterests(false)} style={{ padding: '14px 24px', borderRadius: 14, border: '1px solid #E5E7EB', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Socials modal */}
      {editingSocials && (
        <div onClick={() => setEditingSocials(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 520, width: '100%' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Edit Social Links</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div><label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Instagram @handle</label><input value={socialsForm.instagram} onChange={e => setSocialsForm(p => ({ ...p, instagram: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} placeholder="@username" /></div>
              <div><label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>X / Twitter @handle</label><input value={socialsForm.twitter} onChange={e => setSocialsForm(p => ({ ...p, twitter: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} placeholder="@username" /></div>
              <div><label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>LinkedIn URL</label><input value={socialsForm.linkedin} onChange={e => setSocialsForm(p => ({ ...p, linkedin: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} placeholder="https://linkedin.com/in/..." /></div>
              <div><label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Website URL</label><input value={socialsForm.website} onChange={e => setSocialsForm(p => ({ ...p, website: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} placeholder="https://..." /></div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={saveSocials} style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditingSocials(false)} style={{ padding: '14px 24px', borderRadius: 14, border: '1px solid #E5E7EB', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone verification modal */}
      {phoneVerifying && (
        <div onClick={() => setPhoneVerifying(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Verify Phone</h2>
            {phoneStep === 'enter' ? (
              <div style={{ display: 'grid', gap: 14 }}>
                <div><label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Phone number</label><input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} type="tel" style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} placeholder="+1 (555) 000-0000" /></div>
                <button onClick={sendPhoneOTP} style={{ padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Send Verification Code</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                <p style={{ fontSize: 14, color: '#4B5563' }}>Code sent to {phoneNumber}</p>
                <div><label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Enter code</label><input value={phoneCode} onChange={e => setPhoneCode(e.target.value)} type="text" maxLength={6} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 20, color: '#111827', textAlign: 'center', letterSpacing: '0.2em' }} placeholder="000000" /></div>
                <button onClick={verifyPhoneOTP} style={{ padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Verify Code</button>
                <button onClick={() => setPhoneStep('enter')} style={{ padding: 10, borderRadius: 14, border: '1px solid #E5E7EB', background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Change number</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selfie capture modal */}
      {selfieCapturing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Selfie Capture</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 16 }}>Camera-only. No gallery upload.</p>
          <div style={{ position: 'relative', width: 320, height: 400, borderRadius: 16, overflow: 'hidden', marginBottom: 12, background: '#000' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* Face guide oval */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: '58%', height: '68%', border: '2px solid rgba(255,255,255,0.6)', borderRadius: 999 }} />
            </div>
            {/* Countdown overlay */}
            {selfieCountdown !== null && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                <div style={{ background: '#fff', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 800, color: '#111827' }}>{selfieCountdown}</div>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px', marginBottom: 12, minWidth: 320 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Challenge:</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{selfieChallenge}</p>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 12 }}>
            {!selfieReady ? 'Opening camera…' : selfieCountdown !== null ? 'Hold still…' : 'Camera ready. Follow the challenge, then capture.'}
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={beginSelfieCountdown} disabled={!selfieReady || selfieCountdown !== null} style={{ padding: '14px 32px', borderRadius: 14, border: 'none', background: selfieReady && selfieCountdown === null ? '#3293CB' : '#4B5563', color: '#fff', fontWeight: 700, fontSize: 16, cursor: selfieReady && selfieCountdown === null ? 'pointer' : 'not-allowed', opacity: selfieReady && selfieCountdown === null ? 1 : 0.6 }}>Capture in 3s</button>
            <button onClick={cancelSelfie} style={{ padding: '14px 24px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.3)', background: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Email verify modal */}
      {emailVerifying && (
        <div onClick={() => setEmailVerifying(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Verify Email</h2>
            <p style={{ fontSize: 14, color: '#4B5563', marginBottom: 16 }}>We&apos;ll send a 6-digit code to <strong>{profile.email}</strong></p>
            {emailStep === 'send' ? (
              <button onClick={sendEmailVerifyCode} disabled={emailSending} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer', opacity: emailSending ? 0.6 : 1 }}>{emailSending ? 'Sending...' : 'Send Verification Code'}</button>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                <p style={{ fontSize: 14, color: '#059669', fontWeight: 600 }}>Code sent! Check your inbox.</p>
                <input value={emailCode} onChange={e => setEmailCode(e.target.value)} type="text" maxLength={6} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 24, color: '#111827', textAlign: 'center', letterSpacing: '0.25em', fontWeight: 700 }} placeholder="000000" />
                <button onClick={verifyEmailCode} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Verify Code</button>
                <button onClick={() => { setEmailStep('send'); sendEmailVerifyCode() }} style={{ width: '100%', padding: 10, borderRadius: 14, border: '1px solid #E5E7EB', background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Resend Code</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Shared styles for the Manage section's button + link tiles. Keeps the
// row visually consistent regardless of <button> vs <a>.
const manageBtn: React.CSSProperties = {
  fontSize: 13, fontWeight: 600,
  border: '1px solid #E5E7EB', borderRadius: 10,
  padding: '8px 16px', background: '#fff', cursor: 'pointer',
}
const manageLink: React.CSSProperties = {
  ...manageBtn,
  color: '#111827', textDecoration: 'none', display: 'inline-block',
}
