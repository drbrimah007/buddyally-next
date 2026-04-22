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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Groups</h2>
      </div>

      {loading ? (
        <div>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 14 }}>
              <div style={{ height: 20, background: '#f3f4f6', borderRadius: 8, width: '50%', marginBottom: 12 }} />
              <div style={{ height: 16, background: '#f9fafb', borderRadius: 8, width: '30%' }} />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>👥</p>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>No groups yet</p>
          <p style={{ fontSize: 14, color: '#6B7280' }}>Groups for travel, activities, and shared interests coming soon.</p>
        </div>
      ) : (
        <div>
          {groups.map(g => (
            <div key={g.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{g.name}</h3>
              <p style={{ fontSize: 14, color: '#4B5563', marginBottom: 12 }}>{g.description?.substring(0, 100)}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB' }}>{g.members?.length || 0} members</span>
                <span style={{ background: '#E0F2FE', color: '#3293CB', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>{g.category}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
