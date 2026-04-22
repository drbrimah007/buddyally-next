'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'

function VerifyBadge({ verified }: { verified: { email: boolean; phone: boolean; selfie: boolean } }) {
  const e = verified.email ? 1 : 0
  const p = verified.phone ? 1 : 0
  const s = verified.selfie ? 1 : 0
  const total = e + p + s
  const color = total === 3 ? '#059669' : total >= 1 ? '#3293CB' : '#9CA3AF'
  const tooltip = `Email: ${e ? 'Verified' : 'Not verified'}\nPhone: ${p ? 'Verified' : 'Not verified'}\nSelfie: ${s ? 'Captured' : 'Not taken'}`

  return (
    <span title={tooltip} className="inline-flex items-center gap-1 cursor-help">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path d="M12,2 A10,10 0 0,1 20.66,7" fill="none" stroke={e ? color : '#E5E7EB'} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M20.66,7 A10,10 0 0,1 12,22" fill="none" stroke={p ? color : '#E5E7EB'} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M12,22 A10,10 0 0,1 3.34,7" fill="none" stroke={s ? color : '#E5E7EB'} strokeWidth="2.5" strokeLinecap="round" />
        {total === 3 && <path d="M8 12l2.5 2.5L16 9.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {total === 3 && <span className="text-xs font-semibold" style={{ color }}>Verified</span>}
    </span>
  )
}

export default function ProfilePage() {
  const { profile, updateProfile, signOut } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', city: '', bio: '' })

  if (!profile) return <div className="text-center py-20 text-gray-500">Loading...</div>

  function startEdit() {
    setForm({ firstName: profile!.first_name, lastName: profile!.last_name, city: profile!.city || profile!.home_display_name || '', bio: profile!.bio || '' })
    setEditing(true)
  }

  async function saveEdit() {
    await updateProfile({ first_name: form.firstName, last_name: form.lastName, city: form.city, home_display_name: form.city, bio: form.bio } as any)
    setEditing(false)
  }

  const verified = { email: profile.verified_email, phone: profile.verified_phone, selfie: profile.verified_selfie }

  return (
    <div>
      <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl p-8 text-center mb-6">
        <div className="w-20 h-20 rounded-full bg-gray-200 mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-gray-500 overflow-hidden">
          {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" /> : (profile.first_name?.[0] || '?')}
        </div>
        <h2 className="text-xl font-bold">{profile.first_name} {profile.last_name}</h2>
        <p className="text-sm text-gray-500 mt-1">📍 {profile.home_display_name || profile.city || 'No location set'}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <VerifyBadge verified={verified} />
          {profile.badges?.map((b: string) => <span key={b} className="bg-[#3293CB] text-white text-xs font-semibold px-2 py-0.5 rounded-full">{b}</span>)}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="font-semibold mb-2">Bio</h3>
        <p className="text-sm text-gray-600">{profile.bio || 'No bio yet.'}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="font-semibold mb-2">Interests</h3>
        <div className="flex flex-wrap gap-2">
          {(profile.interests || []).length > 0
            ? profile.interests.map((i: string) => <span key={i} className="bg-blue-50 text-[#3293CB] text-xs font-semibold px-2.5 py-1 rounded-full">{i}</span>)
            : <span className="text-sm text-gray-400 italic">No interests set.</span>}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="font-semibold mb-3">Verification</h3>
        <div className="space-y-3">
          {[{ key: 'email', label: 'Email', done: verified.email }, { key: 'phone', label: 'Phone', done: verified.phone }, { key: 'selfie', label: 'Selfie', done: verified.selfie }].map(v => (
            <div key={v.key} className="flex items-center gap-3">
              <span className="text-lg">{v.done ? '✅' : '⚪'}</span>
              <div className="flex-1"><p className="font-semibold text-sm">{v.label}</p><p className="text-xs text-gray-400">{v.done ? 'Verified' : 'Not verified'}</p></div>
              {!v.done && <button className="text-xs font-semibold text-[#3293CB] border border-[#3293CB] rounded-lg px-3 py-1">Verify</button>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="font-semibold mb-3">Account</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={startEdit} className="text-sm font-semibold border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50">Edit Profile</button>
          <button className="text-sm font-semibold border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50">Share Profile</button>
          <button onClick={() => signOut()} className="text-sm font-semibold text-red-600 bg-red-50 rounded-lg px-4 py-2">Log Out</button>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Edit Profile</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">First Name</label><input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div>
                <div><label className="text-sm font-semibold text-gray-600 block mb-1">Last Name</label><input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div>
              </div>
              <div><label className="text-sm font-semibold text-gray-600 block mb-1">Home Area</label><input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div>
              <div><label className="text-sm font-semibold text-gray-600 block mb-1">Bio</label><textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={saveEdit} className="flex-1 bg-[#3293CB] text-white font-bold py-2.5 rounded-xl">Save</button>
              <button onClick={() => setEditing(false)} className="border border-gray-200 rounded-xl px-6 py-2.5 font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
