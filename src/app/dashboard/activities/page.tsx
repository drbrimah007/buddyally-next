'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function MyActivitiesPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'created' | 'joined'>('created')
  const [created, setCreated] = useState<any[]>([])
  const [joined, setJoined] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const [{ data: mine }, { data: parts }] = await Promise.all([
      supabase.from('activities').select('*, participants:activity_participants(user_id)').eq('created_by', user.id).order('created_at', { ascending: false }),
      supabase.from('activity_participants').select('activity_id, activity:activities(*, host:profiles!created_by(first_name, last_name))').eq('user_id', user.id),
    ])
    setCreated(mine || [])
    setJoined((parts || []).map((p: any) => p.activity).filter(Boolean))
    setLoading(false)
  }

  async function cancelActivity(id: string) {
    if (!confirm('Cancel this activity?')) return
    await supabase.from('activities').update({ status: 'cancelled' }).eq('id', id)
    loadData()
  }

  async function deleteActivity(id: string) {
    if (!confirm('Delete this activity permanently?')) return
    await supabase.from('activities').delete().eq('id', id)
    loadData()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold">My Activities</h1>
        <a href="/dashboard" className="bg-[#3293CB] text-white font-bold text-sm px-4 py-2.5 rounded-xl">+ New Activity</a>
      </div>

      <div className="flex gap-0 mb-4 border-b-2 border-gray-200">
        <button onClick={() => setTab('created')} className={`py-2 px-4 text-sm font-semibold border-b-2 -mb-[2px] transition ${tab === 'created' ? 'border-[#3293CB] text-[#3293CB]' : 'border-transparent text-gray-400'}`}>
          Created ({created.length})
        </button>
        <button onClick={() => setTab('joined')} className={`py-2 px-4 text-sm font-semibold border-b-2 -mb-[2px] transition ${tab === 'joined' ? 'border-[#3293CB] text-[#3293CB]' : 'border-transparent text-gray-400'}`}>
          Joined {joined.length > 0 && <span className="ml-1 bg-[#3293CB] text-white text-xs px-1.5 py-0.5 rounded-full">{joined.length}</span>}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse"><div className="h-5 bg-gray-200 rounded w-1/2 mb-3" /><div className="h-4 bg-gray-100 rounded w-1/3" /></div>)}</div>
      ) : tab === 'created' ? (
        created.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-3xl mb-3">🎯</p>
            <p className="font-semibold mb-2">No activities yet</p>
            <p className="text-sm text-gray-500 mb-4">Create your first activity to get started.</p>
            <a href="/dashboard" className="inline-block bg-[#3293CB] text-white font-bold px-6 py-2.5 rounded-xl">Create Activity</a>
          </div>
        ) : (
          <div className="space-y-3">
            {created.map(a => (
              <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{a.title}</h3>
                    <p className="text-sm text-gray-500">{a.location_display || a.location_text} &bull; {a.status}</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    {(a.participants?.length || 0)}/{a.max_participants}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => cancelActivity(a.id)} className="text-xs font-semibold border border-gray-200 rounded-lg px-3 py-1.5">Cancel</button>
                  <button onClick={() => deleteActivity(a.id)} className="text-xs font-semibold text-red-600 bg-red-50 rounded-lg px-3 py-1.5">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        joined.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-3xl mb-3">🔍</p>
            <p className="font-semibold mb-2">No joined activities</p>
            <p className="text-sm text-gray-500">Browse and join activities from Explore.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {joined.map((a: any) => (
              <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-bold">{a.title}</h3>
                <p className="text-sm text-gray-500">{a.location_display || a.location_text}</p>
                <p className="text-xs text-gray-400 mt-1">Host: {a.host?.first_name} {a.host?.last_name}</p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
