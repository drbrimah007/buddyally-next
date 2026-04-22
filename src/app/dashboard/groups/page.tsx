'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function GroupsPage() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) loadGroups() }, [user])

  async function loadGroups() {
    setLoading(true)
    const { data } = await supabase.from('groups')
      .select('*, members:group_members(user_id, role, status), creator:profiles!created_by(first_name, last_name)')
      .order('created_at', { ascending: false }).limit(30)
    setGroups(data || [])
    setLoading(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold">Groups</h1>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse"><div className="h-5 bg-gray-200 rounded w-1/2 mb-3" /><div className="h-4 bg-gray-100 rounded w-1/3" /></div>)}</div>
      ) : groups.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-3xl mb-3">👥</p>
          <p className="font-semibold mb-2">No groups yet</p>
          <p className="text-sm text-gray-700">Groups for travel, activities, and shared interests coming soon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <div key={g.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold">{g.name}</h3>
              <p className="text-sm text-gray-700 mt-1">{g.description?.substring(0, 100)}</p>
              <div className="flex gap-2 mt-3">
                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{g.members?.length || 0} members</span>
                <span className="text-xs font-semibold bg-blue-50 text-[#3293CB] px-2.5 py-1 rounded-full">{g.category}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
