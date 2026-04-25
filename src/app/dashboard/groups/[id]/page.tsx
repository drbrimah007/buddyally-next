'use client'

// Group detail: chat (realtime) + member roster + admin actions.
// Ported from v1's js/groups.js and js/messages.js group chat paths.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'

type Member = {
  user_id: string
  role: 'owner' | 'admin' | 'member'
  status: 'pending' | 'joined' | 'active' | 'removed'
  requested_at: string
  profile?: { first_name: string; last_name: string; avatar_url: string }
}

type ChatMsg = {
  id: string
  sender_id: string
  content: string
  created_at: string
  sender?: { first_name: string; last_name: string; avatar_url: string }
}

export default function GroupDetailPage() {
  const { id: groupId } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, profile } = useAuth()
  const { success, error: err, info } = useToast()

  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [tab, setTab] = useState<'chat' | 'members' | 'about'>('chat')
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const myMember = members.find(m => m.user_id === user?.id)
  const isMember = myMember?.status === 'joined' || myMember?.status === 'active'
  const isOwner = group?.created_by === user?.id
  const isAdmin = isOwner || myMember?.role === 'admin'
  const joinedMembers = members.filter(m => m.status === 'joined' || m.status === 'active')
  const pendingMembers = members.filter(m => m.status === 'pending')

  // Load group + members
  useEffect(() => {
    if (!groupId) return
    loadAll()
  }, [groupId])

  async function loadAll() {
    setLoading(true)
    const [gRes, mRes] = await Promise.all([
      supabase.from('groups').select('*, creator:profiles!created_by(id, first_name, last_name, avatar_url)').eq('id', groupId).single(),
      supabase.from('group_members').select('user_id, role, status, requested_at, profile:profiles!user_id(first_name, last_name, avatar_url)').eq('group_id', groupId),
    ])
    setGroup(gRes.data)
    setMembers((mRes.data as any) || [])
    setLoading(false)
  }

  // Load chat + subscribe realtime when on chat tab
  useEffect(() => {
    if (tab !== 'chat' || !isMember || !groupId) return
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at, sender:profiles!sender_id(first_name, last_name, avatar_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(200)
      if (!active) return
      setMessages((data as any) || [])
      queueMicrotask(() => chatEndRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior }))
    })()
    const channel = supabase
      .channel(`group:${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` }, async (p) => {
        const m = p.new as any
        // fetch sender profile
        const { data: sender } = await supabase.from('profiles').select('first_name, last_name, avatar_url').eq('id', m.sender_id).single()
        setMessages(prev => [...prev, { ...m, sender }])
        queueMicrotask(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }))
      })
      .subscribe()
    return () => { active = false; supabase.removeChannel(channel) }
  }, [tab, isMember, groupId])

  async function sendMessage() {
    if (!newMsg.trim() || !user) return
    const text = newMsg.trim()
    setNewMsg('')
    const { error } = await supabase.from('messages').insert({ sender_id: user.id, group_id: groupId, content: text })
    if (error) err('Failed to send')
  }

  async function join() {
    if (!user || !group) return
    await supabase.from('group_members').insert({
      group_id: groupId, user_id: user.id, role: 'member',
      status: group.join_mode === 'approval' ? 'pending' : 'joined',
    })
    success(group.join_mode === 'approval' ? 'Request sent' : 'Joined')
    loadAll()
  }

  async function leave() {
    if (!user || !confirm('Leave this group?')) return
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id)
    info('Left group')
    router.push('/dashboard/groups')
  }

  async function approveMember(uid: string) {
    await supabase.from('group_members').update({ status: 'joined', resolved_at: new Date().toISOString() }).eq('group_id', groupId).eq('user_id', uid)
    success('Approved')
    loadAll()
  }

  async function removeMember(uid: string) {
    if (!confirm('Remove this member from the group?')) return
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', uid)
    info('Member removed')
    loadAll()
  }

  async function promoteMember(uid: string) {
    await supabase.from('group_members').update({ role: 'admin' }).eq('group_id', groupId).eq('user_id', uid)
    success('Promoted to admin')
    loadAll()
  }

  async function demoteMember(uid: string) {
    await supabase.from('group_members').update({ role: 'member' }).eq('group_id', groupId).eq('user_id', uid)
    info('Demoted to member')
    loadAll()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#6B7280' }}>Loading group…</div>
  if (!group) return <div style={{ textAlign: 'center', padding: 80, color: '#6B7280' }}>Group not found</div>

  return (
    <div>
      {/* Header */}
      <button onClick={() => router.push('/dashboard/groups')} style={{ background: 'none', border: 'none', color: '#3293CB', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>&larr; Back to groups</button>
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, marginBottom: 16, overflow: 'hidden' }}>
        {/* Cover strip — uses uploaded image_url if present, else gradient. */}
        <div style={{
          height: 120, position: 'relative',
          background: group.image_url
            ? '#F1F5F9'
            : 'linear-gradient(135deg, #3293CB 0%, #5d92f6 100%)',
        }}>
          {group.image_url && (
            <img src={group.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          {group.visibility === 'hidden' && (
            <span style={{
              position: 'absolute', top: 12, left: 12,
              background: 'rgba(15,23,42,0.7)', color: '#fff',
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
            }}>🔒 Hidden</span>
          )}
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{group.name}</h1>
            <span style={{ background: '#E0F2FE', color: '#3293CB', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{group.category || 'Group'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <Pill>{joinedMembers.length} member{joinedMembers.length === 1 ? '' : 's'}{group.max_members ? ` / ${group.max_members}` : ''}</Pill>
            <Pill>{group.join_mode === 'open' ? 'Open' : 'Approval required'}</Pill>
            <Pill>{group.visibility === 'public' ? '🌐 Public' : '🔒 Hidden'}</Pill>
            {group.chat_enabled && <Pill>💬 Chat</Pill>}
            {group.location_text && <Pill>{group.location_text}</Pill>}
            {isOwner && <Pill color="#fff" bg="#3293CB">Owner</Pill>}
            {!isOwner && isAdmin && <Pill color="#0E7490" bg="#CFFAFE">Admin</Pill>}
          </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isMember && myMember?.status !== 'pending' && (
            <button onClick={join} style={primaryBtn}>{group.join_mode === 'approval' ? 'Request to Join' : 'Join Group'}</button>
          )}
          {myMember?.status === 'pending' && (
            <span style={{ ...Pill_style, background: '#FEF3C7', color: '#92400E' }}>Pending approval</span>
          )}
          {isMember && !isOwner && (
            <button onClick={leave} style={{ ...primaryBtn, background: '#FEE2E2', color: '#DC2626', boxShadow: 'none' }}>Leave</button>
          )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', marginBottom: 16, gap: 4 }}>
        <TabBtn active={tab === 'chat'} onClick={() => setTab('chat')}>Chat{isMember && group.chat_enabled === false ? ' (off)' : ''}</TabBtn>
        <TabBtn active={tab === 'members'} onClick={() => setTab('members')}>Members ({joinedMembers.length}{pendingMembers.length > 0 && isAdmin ? ` · ${pendingMembers.length} pending` : ''})</TabBtn>
        <TabBtn active={tab === 'about'} onClick={() => setTab('about')}>About</TabBtn>
      </div>

      {/* Chat */}
      {tab === 'chat' && (
        isMember ? (
          group.chat_enabled === false ? (
            <div style={empty}>Chat is disabled for this group.</div>
          ) : (
            <>
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, minHeight: 300, maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {messages.length === 0 && <p style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>Be the first to say hi.</p>}
                {messages.map(m => {
                  const mine = m.sender_id === user?.id
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                      {!mine && <span style={{ fontSize: 11, color: '#6B7280', marginBottom: 2, marginLeft: 4 }}>{m.sender?.first_name || 'User'}</span>}
                      <div style={{ maxWidth: '78%', padding: '10px 14px', borderRadius: 16, fontSize: 14, lineHeight: 1.5, ...(mine ? { background: '#3293CB', color: '#fff' } : { background: '#F9FAFB', color: '#111827', border: '1px solid #E5E7EB' }) }}>{m.content}</div>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message…" style={{ flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#111827' }} />
                <button onClick={sendMessage} style={{ padding: '0 24px', borderRadius: 12, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Send</button>
              </div>
            </>
          )
        ) : (
          <div style={empty}>Join the group to see the chat.</div>
        )
      )}

      {/* Members */}
      {tab === 'members' && (
        <div>
          {isAdmin && pendingMembers.length > 0 && (
            <>
              <h3 style={section}>Pending requests</h3>
              {pendingMembers.map(m => (
                <MemberRow key={m.user_id} m={m} rightSlot={
                  <>
                    <button onClick={() => approveMember(m.user_id)} style={{ ...chipBtn, background: '#DCFCE7', color: '#166534' }}>Approve</button>
                    <button onClick={() => removeMember(m.user_id)} style={{ ...chipBtn, background: '#FEE2E2', color: '#991B1B' }}>Decline</button>
                  </>
                } />
              ))}
            </>
          )}
          <h3 style={section}>Members</h3>
          {joinedMembers.length === 0 && <p style={{ color: '#6B7280', fontSize: 13 }}>No members yet.</p>}
          {joinedMembers.map(m => (
            <MemberRow key={m.user_id} m={m} rightSlot={
              isAdmin && m.user_id !== user?.id ? (
                <>
                  {m.role !== 'admin' && m.role !== 'owner' && (
                    <button onClick={() => promoteMember(m.user_id)} style={chipBtn}>Promote</button>
                  )}
                  {m.role === 'admin' && (
                    <button onClick={() => demoteMember(m.user_id)} style={chipBtn}>Demote</button>
                  )}
                  {m.role !== 'owner' && (
                    <button onClick={() => removeMember(m.user_id)} style={{ ...chipBtn, background: '#FEE2E2', color: '#991B1B' }}>Remove</button>
                  )}
                </>
              ) : null
            } />
          ))}
        </div>
      )}

      {/* About */}
      {tab === 'about' && (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20 }}>
          {group.description ? (
            <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6 }}>{group.description}</p>
          ) : (
            <p style={{ color: '#6B7280', fontSize: 13 }}>No description yet.</p>
          )}
          {group.creator && (
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 16 }}>
              Created by {group.creator.first_name} {group.creator.last_name}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Presentational helpers ─────────────────────────────────────────
const Pill_style = { fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB' } as const
function Pill({ children, color = '#4B5563', bg = '#F3F4F6' }: { children: React.ReactNode; color?: string; bg?: string }) {
  return <span style={{ ...Pill_style, background: bg, color, border: '1px solid #E5E7EB' }}>{children}</span>
}
function TabBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 14px', fontSize: 14, fontWeight: 600,
      borderBottom: active ? '2px solid #3293CB' : '2px solid transparent', marginBottom: -2,
      color: active ? '#3293CB' : '#4B5563', background: 'none', border: 'none', cursor: 'pointer',
    }}>{children}</button>
  )
}
function MemberRow({ m, rightSlot }: { m: Member; rightSlot?: React.ReactNode }) {
  const name = `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.trim() || 'User'
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#4B5563', overflow: 'hidden', flexShrink: 0 }}>
        {m.profile?.avatar_url ? <img src={m.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0]}
      </div>
      <Link href={`/u/${m.user_id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
        <p style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{name}</p>
        <p style={{ fontSize: 12, color: '#6B7280' }}>{m.role === 'owner' ? 'Owner' : m.role === 'admin' ? 'Admin' : 'Member'}</p>
      </Link>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{rightSlot}</div>
    </div>
  )
}
const primaryBtn: React.CSSProperties = { padding: '10px 18px', borderRadius: 12, border: 'none', background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(50,147,203,0.25)' }
const chipBtn: React.CSSProperties = { padding: '6px 10px', borderRadius: 8, border: 'none', background: '#F3F4F6', color: '#111827', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const section: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: '#111827', margin: '12px 0 8px' }
const empty: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }
