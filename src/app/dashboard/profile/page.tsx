'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function VerifyBadge({ verified }: { verified: { email: boolean; phone: boolean; selfie: boolean } }) {
  const e = verified.email ? 1 : 0
  const p = verified.phone ? 1 : 0
  const s = verified.selfie ? 1 : 0
  const total = e + p + s
  const color = total === 3 ? '#059669' : total >= 1 ? '#3293CB' : '#9CA3AF'
  const tooltip = `Email: ${e ? 'Verified' : 'Not verified'}\nPhone: ${p ? 'Verified' : 'Not verified'}\nSelfie: ${s ? 'Captured' : 'Not taken'}`

  return (
    <span title={tooltip} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
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
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', city: '', bio: '' })
  const [stats, setStats] = useState({ created: 0, joined: 0 })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) loadStats()
  }, [user])

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
    setEditing(true)
  }

  async function saveEdit() {
    await updateProfile({ first_name: form.firstName, last_name: form.lastName, city: form.city, home_display_name: form.city, bio: form.bio } as any)
    setEditing(false)
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const fname = `${user.id}-${Date.now()}.jpg`
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(fname, file, { contentType: file.type, upsert: true })
    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fname)
      await updateProfile({ avatar_url: urlData.publicUrl } as any)
      refreshProfile()
    }
    setUploading(false)
  }

  function shareProfile() {
    const url = `https://buddyally.com/u/${user?.id}`
    if (navigator.share) {
      navigator.share({ title: `${profile.first_name} on BuddyAlly`, url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url)
      alert('Profile link copied!')
    }
  }

  const verified = { email: profile.verified_email, phone: profile.verified_phone, selfie: profile.verified_selfie }

  return (
    <div>
      {/* Profile header */}
      <div style={{ background: 'linear-gradient(135deg, #f3f4f6, #F9FAFB)', borderRadius: 20, padding: 32, textAlign: 'center', marginBottom: 24 }}>
        <div onClick={() => fileRef.current?.click()} style={{ width: 96, height: 96, borderRadius: '50%', background: '#E0F2FE', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 700, color: '#3293CB', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}>
          {profile.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" /> : (profile.first_name?.[0] || '?')}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 0', textAlign: 'center' }}>
            {uploading ? '...' : 'Change'}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} style={{ display: 'none' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{profile.first_name} {profile.last_name}</h2>
        <p style={{ fontSize: 14, color: '#4B5563', marginTop: 4 }}>📍 {profile.home_display_name || profile.city || 'No location set'}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
          <VerifyBadge verified={verified} />
          {profile.badges?.map((b: string) => <span key={b} style={{ background: '#3293CB', color: '#fff', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{b}</span>)}
        </div>
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
        <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Interests</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(profile.interests || []).length > 0
            ? profile.interests.map((i: string) => <span key={i} style={{ background: '#E0F2FE', color: '#3293CB', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>{i}</span>)
            : <span style={{ fontSize: 14, color: '#6B7280', fontStyle: 'italic' }}>No interests set.</span>}
        </div>
      </div>

      {/* Verification */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Verification</h3>
        {[
          { key: 'email', label: 'Email', done: verified.email },
          { key: 'phone', label: 'Phone', done: verified.phone },
          { key: 'selfie', label: 'Selfie', done: verified.selfie },
        ].map(v => (
          <div key={v.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRadius: 14, border: '1px solid #E5E7EB', background: v.done ? '#F0FDF4' : '#F9FAFB', marginBottom: 8, ...(v.done ? { borderColor: '#D1FAE5' } : {}) }}>
            <span style={{ fontSize: 18 }}>{v.done ? '✅' : '⚪'}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 14 }}>{v.label}</p>
              <p style={{ fontSize: 12, color: '#6B7280' }}>{v.done ? 'Verified' : 'Not verified'}</p>
            </div>
            {!v.done && <button style={{ fontSize: 12, fontWeight: 600, color: '#3293CB', border: '1px solid #3293CB', borderRadius: 10, padding: '4px 12px', background: 'none', cursor: 'pointer' }}>Verify</button>}
          </div>
        ))}
      </div>

      {/* Account actions */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Account</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button onClick={startEdit} style={{ fontSize: 13, fontWeight: 600, border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 16px', background: '#fff', cursor: 'pointer' }}>Edit Profile</button>
          <button onClick={shareProfile} style={{ fontSize: 13, fontWeight: 600, border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 16px', background: '#fff', cursor: 'pointer' }}>Share Profile</button>
          <button onClick={() => signOut()} style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', background: '#FEE2E2', borderRadius: 10, padding: '8px 16px', border: 'none', cursor: 'pointer' }}>Log Out</button>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div onClick={() => setEditing(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Edit Profile</h2>
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>First Name</label>
                  <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Last Name</label>
                  <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Home Area</label>
                <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Bio</label>
                <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827', resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={saveEdit} style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditing(false)} style={{ padding: '14px 24px', borderRadius: 14, border: '1px solid #E5E7EB', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
