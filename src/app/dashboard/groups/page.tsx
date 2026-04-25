'use client'

// Groups index — Discover & My Groups, with full create flow.
//
// Why the full rewrite:
//   * Old createGroup wrote join_mode='open' against a CHECK constraint
//     that only allowed 'free'/'approval_required' → every insert silently
//     failed and the user could never see their new group. Schema is now
//     migrated to canonical 'open'/'approval', and this page surfaces real
//     errors via the toast system instead of swallowing them.
//   * Adds an icon image (uploads to the public `images` bucket).
//   * Adds Public / Hidden visibility — Hidden groups never list in
//     Discover for non-members; only their direct link works.
//   * Adds a chat-enabled toggle on create (default on).
//   * After successful create, navigate straight to the group page so the
//     user sees the result instead of "where did it go?".

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import Paginator from '@/components/Paginator'

const GROUP_CATEGORIES = ['Travel', 'Sports', 'Learning', 'Social', 'Outdoor', 'Gaming', 'Wellness', 'Help', 'Events', 'Other']
const GROUP_PAGE_SIZE = 12

type GroupRow = {
  id: string
  name: string
  description: string | null
  category: string | null
  join_mode: 'open' | 'approval'
  visibility: 'public' | 'hidden'
  image_url: string | null
  chat_enabled: boolean
  max_members: number | null
  location_text: string | null
  created_by: string
  created_at: string
  members?: { user_id: string; role: string; status: string }[]
  creator?: { first_name: string; last_name: string } | null
}

export default function GroupsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'discover' | 'mine'>('discover')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [page, setPage] = useState(0)

  // Create-form state
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCat, setNewCat] = useState('Social')
  const [newJoin, setNewJoin] = useState<'open' | 'approval'>('open')
  const [newVisibility, setNewVisibility] = useState<'public' | 'hidden'>('public')
  const [newChatEnabled, setNewChatEnabled] = useState(true)
  const [newMax, setNewMax] = useState<string>('') // empty = no cap (rendered as "Unlimited")
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [iconPreview, setIconPreview] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (user) loadGroups() }, [user])
  useEffect(() => { setPage(0) }, [tab, search, catFilter])

  async function loadGroups() {
    setLoading(true)
    const { data, error } = await supabase
      .from('groups')
      .select('*, members:group_members(user_id, role, status), creator:profiles!created_by(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) toastError('Could not load groups: ' + error.message)
    setGroups((data as GroupRow[]) || [])
    setLoading(false)
  }

  function pickIcon(file: File | null) {
    if (!file) {
      setIconFile(null); setIconPreview(''); return
    }
    if (!file.type.startsWith('image/')) {
      toastError('Pick an image file (PNG, JPG, WebP).'); return
    }
    if (file.size > 5 * 1024 * 1024) {
      toastError('Image too large — max 5 MB.'); return
    }
    setIconFile(file)
    setIconPreview(URL.createObjectURL(file))
  }

  // Upload icon to the existing public `images` bucket. Returns null on failure.
  async function uploadIcon(file: File, ownerId: string): Promise<string | null> {
    const ext = file.name.split('.').pop() || 'png'
    const path = `groups/${ownerId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('images').upload(path, file, { contentType: file.type, upsert: false })
    if (error) {
      toastError('Image upload failed: ' + error.message)
      return null
    }
    const { data } = supabase.storage.from('images').getPublicUrl(path)
    return data?.publicUrl || null
  }

  async function createGroup() {
    if (!user) return
    const name = newName.trim()
    if (!name) { toastError('Group name is required.'); return }
    setCreating(true)

    let imageUrl: string | null = null
    if (iconFile) {
      imageUrl = await uploadIcon(iconFile, user.id)
      if (!imageUrl) { setCreating(false); return }
    }

    const max = newMax.trim() === '' ? null : (parseInt(newMax) || null)

    const { data: created, error: gErr } = await supabase
      .from('groups')
      .insert({
        name,
        description: newDesc.trim() || null,
        category: newCat,
        join_mode: newJoin,
        visibility: newVisibility,
        chat_enabled: newChatEnabled,
        image_url: imageUrl,
        max_members: max,
        created_by: user.id,
      })
      .select()
      .single()

    if (gErr || !created) {
      setCreating(false)
      toastError('Could not create group: ' + (gErr?.message || 'unknown error'))
      return
    }

    // Auto-join the creator as owner. If this fails, the group still
    // exists — surface the error but let the user proceed to the page.
    const { error: mErr } = await supabase
      .from('group_members')
      .insert({ group_id: created.id, user_id: user.id, role: 'owner', status: 'joined' })
    if (mErr) toastError('Group created, but joining as owner failed: ' + mErr.message)

    setCreating(false)
    success('Group created.')
    // Reset form
    setNewName(''); setNewDesc(''); setIconFile(null); setIconPreview('')
    setShowCreate(false)
    // Navigate straight to the new group so the user sees the result.
    router.push(`/dashboard/groups/${created.id}`)
  }

  // Membership lookups
  const myGroupIds = groups
    .filter((g) => g.members?.some((m) => m.user_id === user?.id && (m.status === 'joined' || m.status === 'active')))
    .map((g) => g.id)

  const displayed = groups.filter((g) => {
    // Hidden groups: only visible if you're already a member (or owner).
    if (g.visibility === 'hidden' && !myGroupIds.includes(g.id) && g.created_by !== user?.id) return false
    if (tab === 'mine' && !myGroupIds.includes(g.id)) return false
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false
    if (catFilter !== 'all' && g.category !== catFilter) return false
    return true
  })

  // ─── Create form ────────────────────────────────────────────────
  if (showCreate) {
    return (
      <div>
        <button onClick={() => setShowCreate(false)} style={backBtn}>&larr; Back</button>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Create a Group</h2>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>A space for people with a shared interest. Chat, plan, and meet up.</p>

        <div style={{ display: 'grid', gap: 16 }}>
          {/* Icon picker */}
          <div>
            <label style={label}>Group icon <span style={optional}>optional</span></label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 80, height: 80, borderRadius: 20,
                  border: '2px dashed #CBD5E1', background: iconPreview ? 'transparent' : '#F8FAFC',
                  display: 'grid', placeItems: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                }}
              >
                {iconPreview ? (
                  <img src={iconPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 28, color: '#94A3B8' }}>📷</span>
                )}
              </button>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{iconPreview ? 'Tap to change' : 'Tap to upload'}</p>
                <p style={{ fontSize: 12, color: '#6B7280' }}>PNG, JPG or WebP · up to 5 MB</p>
                {iconPreview && (
                  <button type="button" onClick={() => pickIcon(null)} style={{ marginTop: 6, fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Remove</button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => pickIcon(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={label}>Group name *</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={80}
              style={input}
              placeholder="e.g. NYC Hiking Crew"
            />
          </div>

          <div>
            <label style={label}>Description <span style={optional}>optional</span></label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={3}
              maxLength={500}
              style={{ ...input, resize: 'none' }}
              placeholder="What is this group about? Who should join?"
            />
          </div>

          <div>
            <label style={label}>Category</label>
            <select value={newCat} onChange={(e) => setNewCat(e.target.value)} style={{ ...input, background: '#fff' }}>
              {GROUP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label style={label}>Who can find this group?</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ChoiceCard
                active={newVisibility === 'public'}
                onClick={() => setNewVisibility('public')}
                title="🌐 Public"
                subtitle="Listed in Discover. Anyone can find it."
              />
              <ChoiceCard
                active={newVisibility === 'hidden'}
                onClick={() => setNewVisibility('hidden')}
                title="🔒 Hidden"
                subtitle="Invite-only. Only members can see it."
              />
            </div>
          </div>

          {/* Join mode */}
          <div>
            <label style={label}>How do people join?</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ChoiceCard
                active={newJoin === 'open'}
                onClick={() => setNewJoin('open')}
                title="✓ Open"
                subtitle="Tap once and you're in."
              />
              <ChoiceCard
                active={newJoin === 'approval'}
                onClick={() => setNewJoin('approval')}
                title="⏳ Approval"
                subtitle="Owner reviews each request."
              />
            </div>
          </div>

          {/* Chat */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Group chat</p>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Members can post messages in real time.</p>
            </div>
            <Toggle checked={newChatEnabled} onChange={setNewChatEnabled} />
          </div>

          <div>
            <label style={label}>Max members <span style={optional}>blank = unlimited</span></label>
            <input
              type="number"
              value={newMax}
              onChange={(e) => setNewMax(e.target.value)}
              min={2}
              placeholder="Unlimited"
              style={{ ...input, textAlign: 'center' }}
            />
          </div>

          <button
            onClick={createGroup}
            disabled={creating || !newName.trim()}
            style={{
              width: '100%', padding: 14, borderRadius: 14, border: 'none',
              background: creating || !newName.trim() ? '#CBD5E1' : '#3293CB',
              color: '#fff', fontWeight: 700, fontSize: 16,
              cursor: creating || !newName.trim() ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(50,147,203,0.25)',
            }}
          >
            {creating ? 'Creating…' : 'Create Group'}
          </button>
        </div>
      </div>
    )
  }

  // ─── Index ──────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Groups</h2>
        <button onClick={() => setShowCreate(true)} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Create Group</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', marginBottom: 14 }}>
        <button onClick={() => setTab('discover')} style={tabBtn(tab === 'discover')}>Discover</button>
        <button onClick={() => setTab('mine')} style={tabBtn(tab === 'mine')}>My Groups ({myGroupIds.length})</button>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search groups…" style={{ flex: 1, minWidth: 180, height: 40, borderRadius: 10, border: '1px solid #E5E7EB', padding: '0 12px', fontSize: 13, background: '#fff', color: '#111827' }} />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ height: 40, border: '1px solid #E5E7EB', borderRadius: 10, padding: '0 12px', fontSize: 13, background: '#fff', color: '#111827' }}>
          <option value="all">All Categories</option>
          {GROUP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 14 }}>
              <div style={{ height: 20, background: '#f3f4f6', borderRadius: 8, width: '50%', marginBottom: 12 }} />
              <div style={{ height: 16, background: '#f9fafb', borderRadius: 8, width: '30%' }} />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>👥</p>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>{tab === 'mine' ? 'No groups joined yet' : 'No groups found'}</p>
          <p style={{ fontSize: 14, color: '#6B7280' }}>{tab === 'mine' ? 'Browse Discover and join one — or create your own.' : 'Try a different search, or create the first one.'}</p>
        </div>
      ) : (() => {
        const totalPages = Math.max(1, Math.ceil(displayed.length / GROUP_PAGE_SIZE))
        const clampedPage = Math.min(page, totalPages - 1)
        const pageItems = displayed.slice(clampedPage * GROUP_PAGE_SIZE, (clampedPage + 1) * GROUP_PAGE_SIZE)
        return (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              {pageItems.map((g) => {
                const members = (g.members || []).filter((m) => m.status === 'joined' || m.status === 'active')
                const isMember = members.some((m) => m.user_id === user?.id)
                const isOwner = g.created_by === user?.id
                return (
                  <article
                    key={g.id}
                    onClick={() => router.push(`/dashboard/groups/${g.id}`)}
                    style={{
                      background: '#fff', border: '1px solid #E5E7EB', borderRadius: 18,
                      overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s',
                      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                      display: 'flex', flexDirection: 'column',
                    }}
                  >
                    {/* Cover strip — image if set, else gradient */}
                    <div style={{
                      height: 96, position: 'relative',
                      background: g.image_url
                        ? '#F1F5F9'
                        : 'linear-gradient(135deg, #3293CB 0%, #5d92f6 100%)',
                    }}>
                      {g.image_url && (
                        <img src={g.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                      <span style={{
                        position: 'absolute', top: 10, right: 10,
                        background: '#fff', color: '#3293CB',
                        fontSize: 11, fontWeight: 700, padding: '3px 10px',
                        borderRadius: 999, boxShadow: '0 1px 2px rgba(15,23,42,0.1)',
                      }}>{g.category || 'Group'}</span>
                      {g.visibility === 'hidden' && (
                        <span style={{
                          position: 'absolute', top: 10, left: 10,
                          background: 'rgba(15,23,42,0.65)', color: '#fff',
                          fontSize: 10, fontWeight: 700, padding: '3px 8px',
                          borderRadius: 999,
                        }}>🔒 Hidden</span>
                      )}
                    </div>

                    <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ fontWeight: 800, fontSize: 17, margin: 0, lineHeight: 1.25 }}>{g.name}</h3>
                      {g.description && (
                        <p style={{ fontSize: 13, color: '#4B5563', marginTop: 6, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {g.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                        <Pill>{members.length} member{members.length === 1 ? '' : 's'}{g.max_members ? ` / ${g.max_members}` : ''}</Pill>
                        <Pill>{g.join_mode === 'open' ? 'Open' : 'Approval'}</Pill>
                        {g.chat_enabled && <Pill>💬 Chat</Pill>}
                        {isOwner ? (
                          <Pill color="#fff" bg="#3293CB">Owner</Pill>
                        ) : isMember ? (
                          <Pill color="#fff" bg="#059669">Joined</Pill>
                        ) : null}
                      </div>

                      {g.creator && (
                        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#F3F4F6', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: '#4B5563' }}>{g.creator.first_name?.[0] || '?'}</div>
                          <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>by {g.creator.first_name} {g.creator.last_name}</p>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
            <div style={{ marginTop: 18 }}>
              <Paginator page={clampedPage} totalPages={totalPages} onChange={setPage} />
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Presentational helpers ──────────────────────────────────────
const input: React.CSSProperties = { width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 14, fontSize: 14, color: '#111827', background: '#fff' }
const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#111827', display: 'block', marginBottom: 6 }
const optional: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: '#94A3B8', textTransform: 'none', marginLeft: 6 }
const backBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#3293CB', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 16, padding: 0 }
function tabBtn(active: boolean): React.CSSProperties {
  return { padding: '8px 16px', fontSize: 14, fontWeight: 600, borderBottom: active ? '2px solid #3293CB' : '2px solid transparent', marginBottom: -2, color: active ? '#3293CB' : '#4B5563', background: 'none', border: 'none', cursor: 'pointer' }
}
function Pill({ children, color = '#374151', bg = '#F3F4F6' }: { children: React.ReactNode; color?: string; bg?: string }) {
  return <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>{children}</span>
}
function ChoiceCard({ active, onClick, title, subtitle }: { active: boolean; onClick: () => void; title: string; subtitle: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left', padding: 12, borderRadius: 14, cursor: 'pointer',
        ...(active
          ? { background: '#EFF6FF', border: '2px solid #3293CB', color: '#0652B7' }
          : { background: '#fff', border: '1px solid #E5E7EB', color: '#111827' }),
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: active ? '#0652B7' : '#6B7280', marginTop: 2 }}>{subtitle}</div>
    </button>
  )
}
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{
        width: 46, height: 26, borderRadius: 999, border: 'none',
        background: checked ? '#3293CB' : '#D1D5DB',
        position: 'relative', cursor: 'pointer', flexShrink: 0,
        transition: 'background 0.15s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.18)', transition: 'left 0.15s',
      }} />
    </button>
  )
}
