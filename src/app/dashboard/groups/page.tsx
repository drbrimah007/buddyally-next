'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const GROUP_CATEGORIES = ['Travel','Sports','Learning','Social','Outdoor','Gaming','Wellness','Help','Events','Other']

export default function GroupsPage() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'discover' | 'mine'>('discover')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [viewingGroup, setViewingGroup] = useState<any>(null)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCat, setNewCat] = useState('Social')
  const [newPrivacy, setNewPrivacy] = useState('open')
  const [newMax, setNewMax] = useState(50)

  useEffect(() => { if (user) loadGroups() }, [user])

  async function loadGroups() {
    setLoading(true)
    const { data } = await supabase.from('groups')
      .select('*, members:group_members(user_id, role, status), creator:profiles!created_by(first_name, last_name)')
      .order('created_at', { ascending: false }).limit(50)
    setGroups(data || [])
    setLoading(false)
  }

  async function createGroup() {
    if (!newName.trim() || !user) return
    const { data } = await supabase.from('groups').insert({
      name: newName.trim(), description: newDesc.trim(), category: newCat,
      join_mode: newPrivacy, max_members: newMax, created_by: user.id,
    }).select().single()
    if (data) {
      await supabase.from('group_members').insert({ group_id: data.id, user_id: user.id, role: 'owner', status: 'joined' })
    }
    setNewName(''); setNewDesc(''); setShowCreate(false); loadGroups()
  }

  async function joinGroup(groupId: string, joinMode: string) {
    if (!user) return
    await supabase.from('group_members').insert({
      group_id: groupId, user_id: user.id, role: 'member',
      status: joinMode === 'approval' ? 'pending' : 'joined'
    })
    loadGroups()
  }

  async function leaveGroup(groupId: string) {
    if (!user || !confirm('Leave this group?')) return
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id)
    setViewingGroup(null); loadGroups()
  }

  const myGroupIds = groups.filter(g => g.members?.some((m: any) => m.user_id === user?.id && m.status === 'joined')).map(g => g.id)
  const displayed = groups.filter(g => {
    if (tab === 'mine' && !myGroupIds.includes(g.id)) return false
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false
    if (catFilter !== 'all' && g.category !== catFilter) return false
    return true
  })

  // Group detail view
  if (viewingGroup) {
    const g = viewingGroup
    const members = (g.members || []).filter((m: any) => m.status === 'joined')
    const isMember = members.some((m: any) => m.user_id === user?.id)
    const isOwner = g.created_by === user?.id
    return (
      <div>
        <button onClick={() => setViewingGroup(null)} style={{ background: 'none', border: 'none', color: '#3293CB', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>&larr; Back to groups</button>
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>{g.name}</h2>
            <span style={{ background: '#E0F2FE', color: '#3293CB', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>{g.category}</span>
          </div>
          {g.description && <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6, marginBottom: 16 }}>{g.description}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <span style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB' }}>{members.length} members</span>
            <span style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB' }}>{g.join_mode === 'open' ? 'Open' : 'Approval required'}</span>
            {g.location_text && <span style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB' }}>{g.location_text}</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isOwner ? (
              <span style={{ background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 12 }}>Owner</span>
            ) : isMember ? (
              <button onClick={() => leaveGroup(g.id)} style={{ padding: '8px 16px', borderRadius: 12, border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Leave Group</button>
            ) : (
              <button onClick={() => joinGroup(g.id, g.join_mode)} style={{ padding: '8px 16px', borderRadius: 12, border: 'none', background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{g.join_mode === 'approval' ? 'Request to Join' : 'Join Group'}</button>
            )}
          </div>
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Members ({members.length})</h3>
        {members.length === 0 ? (
          <p style={{ fontSize: 14, color: '#6B7280' }}>No members yet.</p>
        ) : (
          <div>
            {members.map((m: any) => (
              <div key={m.user_id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#4B5563' }}>?</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>Member</p>
                  <p style={{ fontSize: 11, color: '#6B7280' }}>{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Create group form
  if (showCreate) {
    return (
      <div>
        <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#3293CB', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>&larr; Back</button>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Create a Group</h2>
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Group Name *</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 14, fontSize: 14, color: '#111827' }} placeholder="e.g. NYC Hiking Crew" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Description</label>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 14, fontSize: 14, color: '#111827', resize: 'none' }} placeholder="What is this group about?" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Category</label>
            <select value={newCat} onChange={e => setNewCat(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 14, fontSize: 14, color: '#111827', background: '#fff' }}>
              {GROUP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Join Mode</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setNewPrivacy('open')} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', ...(newPrivacy === 'open' ? { background: '#E0F2FE', color: '#3293CB', border: '2px solid #3293CB' } : { background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB' }) }}>Open</button>
              <button onClick={() => setNewPrivacy('approval')} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', ...(newPrivacy === 'approval' ? { background: '#E0F2FE', color: '#3293CB', border: '2px solid #3293CB' } : { background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB' }) }}>Approval</button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Max Members</label>
            <input type="number" value={newMax} onChange={e => setNewMax(parseInt(e.target.value) || 50)} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 14, fontSize: 14, color: '#111827' }} />
          </div>
          <button onClick={createGroup} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 12px rgba(50,147,203,0.25)' }}>Create Group</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Groups</h2>
        <button onClick={() => setShowCreate(true)} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Create Group</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', marginBottom: 16 }}>
        <button onClick={() => setTab('discover')} style={{ padding: '8px 16px', fontSize: 14, fontWeight: 600, borderBottom: tab === 'discover' ? '2px solid #3293CB' : '2px solid transparent', marginBottom: -2, color: tab === 'discover' ? '#3293CB' : '#4B5563', background: 'none', border: 'none', cursor: 'pointer' }}>Discover</button>
        <button onClick={() => setTab('mine')} style={{ padding: '8px 16px', fontSize: 14, fontWeight: 600, borderBottom: tab === 'mine' ? '2px solid #3293CB' : '2px solid transparent', marginBottom: -2, color: tab === 'mine' ? '#3293CB' : '#4B5563', background: 'none', border: 'none', cursor: 'pointer' }}>My Groups ({myGroupIds.length})</button>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search groups..." style={{ flex: 1, minWidth: 180, height: 40, borderRadius: 10, border: '1px solid #E5E7EB', padding: '0 12px', fontSize: 13, background: '#fff', color: '#111827' }} />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ height: 40, border: '1px solid #E5E7EB', borderRadius: 10, padding: '0 12px', fontSize: 13, background: '#fff', color: '#111827' }}>
          <option value="all">All Categories</option>
          {GROUP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
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
      ) : displayed.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>👥</p>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>{tab === 'mine' ? 'No groups joined yet' : 'No groups found'}</p>
          <p style={{ fontSize: 14, color: '#6B7280' }}>{tab === 'mine' ? 'Browse and join groups from Discover.' : 'Create or join groups for travel, activities, and shared interests.'}</p>
        </div>
      ) : (
        <div>
          {displayed.map(g => {
            const members = (g.members || []).filter((m: any) => m.status === 'joined')
            const isMember = members.some((m: any) => m.user_id === user?.id)
            const isOwner = g.created_by === user?.id
            const creator = g.creator as any
            return (
              <div key={g.id} onClick={() => setViewingGroup(g)} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <h3 style={{ fontWeight: 600, fontSize: 16 }}>{g.name}</h3>
                  <span style={{ background: '#E0F2FE', color: '#3293CB', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{g.category}</span>
                </div>
                {g.description && <p style={{ fontSize: 14, color: '#4B5563', marginBottom: 12 }}>{g.description?.substring(0, 100)}</p>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB' }}>{members.length} members</span>
                  <span style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB' }}>{g.join_mode === 'open' ? 'Open' : 'Approval'}</span>
                  {g.location_text && <span style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB' }}>{g.location_text || 'Online'}</span>}
                  {isOwner && <span style={{ background: '#3293CB', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>Owner</span>}
                  {isMember && !isOwner && <span style={{ background: '#059669', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>Joined</span>}
                </div>
                {creator && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10, borderTop: '1px solid #E5E7EB' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#4B5563' }}>{creator.first_name?.[0] || '?'}</div>
                    <p style={{ fontSize: 12, color: '#6B7280' }}>Created by {creator.first_name} {creator.last_name}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
