'use client'

// Feed — reverse-chronological stream of:
//   • Activities posted by users you follow
//   • Posts (short text updates) from users you follow
//   • Matches from your saved searches (shown once per match, newest first)
// Paginated at 20 items per page.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Paginator from '@/components/Paginator'
import PostComposer from '@/components/PostComposer'

type FeedItem =
  | { kind: 'activity'; ts: string; data: any }
  | { kind: 'post'; ts: string; data: any }
  | { kind: 'saved_match'; ts: string; data: any; savedSearchName: string }

const PAGE_SIZE = 20

function avatarFor(p: any) {
  const name = `${p?.first_name || '?'} ${p?.last_name || ''}`.trim()
  if (p?.avatar_url) return <img src={p.avatar_url} alt={name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
  const initial = (p?.first_name?.[0] || '?').toUpperCase()
  return (
    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#3293CB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
      {initial}
    </div>
  )
}

function displayName(p: any) {
  return `${p?.first_name || 'Someone'}${p?.last_name ? ' ' + p.last_name : ''}`.trim()
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString()
}

export default function FeedPage() {
  const { user } = useAuth()
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (!user) return
    void loadFeed()
  }, [user])

  async function loadFeed() {
    if (!user) return
    setLoading(true)
    try {
      // 1) Who do I follow?
      const { data: follows } = await supabase
        .from('follows')
        .select('followed_id')
        .eq('follower_id', user.id)
      const followIds = (follows || []).map((f: any) => f.followed_id)
      setFollowingIds(followIds)

      // Include the user's OWN posts + activities in their feed so they can
      // see what they shared (and edit/delete their own posts inline).
      const ids = Array.from(new Set([user.id, ...followIds]))

      // Parallel queries, bounded to recent 60 days for the following-based feeds.
      const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString()
      const [actRes, postRes, savedRes] = await Promise.all([
        supabase
          .from('activities')
          .select('*, host:profiles!host_id(id, first_name, last_name, avatar_url)')
          .in('host_id', ids)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(60),
        supabase
          .from('posts')
          .select('*, author:profiles!user_id(id, first_name, last_name, avatar_url)')
          .in('user_id', ids)
          .is('deleted_at', null)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(60),
        supabase
          .from('saved_searches')
          .select('*')
          .eq('user_id', user.id),
      ])

      // Build saved-search match list. For each saved search, find activities
      // created after the user's last_seen_at that match the filter_json.
      // Keeps things simple & RLS-friendly: we run per-search queries client-side.
      const savedMatches: FeedItem[] = []
      const searches = (savedRes.data as any[]) || []
      await Promise.all(
        searches.map(async (s) => {
          const f = s.filter_json || {}
          let q = supabase
            .from('activities')
            .select('*, host:profiles!host_id(id, first_name, last_name, avatar_url)')
            .gt('created_at', s.last_seen_at || since)
            .order('created_at', { ascending: false })
            .limit(10)
          if (f.category && f.category !== 'all') q = q.eq('category', f.category)
          if (f.free_only) q = q.eq('is_free', true)
          if (f.city) q = q.ilike('location_display', `%${f.city}%`)
          if (f.q) q = q.ilike('title', `%${f.q}%`)
          const { data } = await q
          for (const a of (data || [])) {
            savedMatches.push({
              kind: 'saved_match',
              ts: a.created_at,
              data: a,
              savedSearchName: s.name,
            })
          }
        })
      )

      // Merge + sort DESC by timestamp
      const merged: FeedItem[] = [
        ...(actRes.data || []).map((a: any) => ({ kind: 'activity' as const, ts: a.created_at, data: a })),
        ...(postRes.data || []).map((p: any) => ({ kind: 'post' as const, ts: p.created_at, data: p })),
        ...savedMatches,
      ].sort((x, y) => +new Date(y.ts) - +new Date(x.ts))

      setItems(merged)
      setPage(0)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const pageItems = useMemo(
    () => items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [items, page]
  )

  if (!user) return null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Feed</h2>
        <Link
          href="/dashboard/saved-searches"
          style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#111827', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
        >
          Saved Searches
        </Link>
      </div>

      {/* Compose — public posts to your followers */}
      <PostComposer onPosted={() => loadFeed()} />

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>📡</p>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Your Feed is empty</p>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
            {followingIds.length === 0
              ? 'Follow people to see their activities and posts here. You can also save an activity search to catch new matches.'
              : 'Nothing new from the people you follow yet — and no saved-search matches.'}
          </p>
          <Link href="/dashboard" style={{ display: 'inline-block', padding: '10px 16px', borderRadius: 12, background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Find people to follow
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pageItems.map((it, i) => (
              <FeedCard
                key={it.kind + '-' + (it.data.id || i)}
                item={it}
                currentUserId={user.id}
                onPostChanged={loadFeed}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div style={{ marginTop: 20 }}>
              <Paginator page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FeedCard({
  item, currentUserId, onPostChanged,
}: {
  item: FeedItem
  currentUserId: string
  onPostChanged: () => void
}) {
  if (item.kind === 'post') {
    return <PostCard post={item.data} ts={item.ts} currentUserId={currentUserId} onChanged={onPostChanged} />
  }

  // activity or saved_match — same card shape, different badge
  const a = item.data
  const badgeText = item.kind === 'saved_match' ? `Saved: ${item.savedSearchName}` : 'New activity'
  const badgeColor = item.kind === 'saved_match' ? '#D97706' : '#059669'
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <Link href={`/u/${a.host?.id}`} style={{ textDecoration: 'none' }}>{avatarFor(a.host)}</Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={`/u/${a.host?.id}`} style={{ color: '#111827', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            {displayName(a.host)}
          </Link>
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            <span style={{ color: badgeColor, fontWeight: 600 }}>{badgeText}</span> · {relTime(item.ts)}
          </div>
        </div>
      </div>
      <Link href={`/a/${a.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        {a.cover_image_url && (
          <img src={a.cover_image_url} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />
        )}
        <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{a.title}</p>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
          {a.category}
          {a.location_display ? ' · ' + a.location_display : ''}
          {a.date ? ' · ' + new Date(a.date).toLocaleDateString() : ''}
        </p>
        {a.description && (
          <p style={{ fontSize: 14, color: '#4B5563', marginTop: 8, lineHeight: 1.5 }}>
            {a.description.length > 240 ? a.description.slice(0, 237) + '…' : a.description}
          </p>
        )}
      </Link>
    </div>
  )
}

// Post card — separated so it can hold its own editing state. When the
// current user IS the author we expose inline Edit + Delete. Edit toggles
// a textarea with Save / Cancel. Delete soft-removes via deleted_at so
// analytics survive (RLS filters deleted_at IS NULL on read).
function PostCard({
  post, ts, currentUserId, onChanged,
}: {
  post: any
  ts: string
  currentUserId: string
  onChanged: () => void
}) {
  const isMine = post.user_id === currentUserId
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(post.body as string)
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  async function saveEdit() {
    const body = draft.trim()
    if (!body || body === post.body) { setEditing(false); return }
    setBusy(true)
    const { error } = await supabase
      .from('posts')
      .update({ body })
      .eq('id', post.id)
    setBusy(false)
    if (error) { alert(error.message || 'Could not save'); return }
    setEditing(false)
    onChanged()
  }

  async function remove() {
    if (!confirm('Delete this post?')) return
    setBusy(true)
    const { error } = await supabase
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', post.id)
    setBusy(false)
    if (error) { alert(error.message || 'Could not delete'); return }
    onChanged()
  }

  return (
    <div style={{ position: 'relative', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <Link href={`/u/${post.author?.id}`} style={{ textDecoration: 'none' }}>{avatarFor(post.author)}</Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={`/u/${post.author?.id}`} style={{ color: '#111827', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            {displayName(post.author)}
          </Link>
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            Posted · {relTime(ts)}
            {post.visibility !== 'public' && <> · <span style={{ fontWeight: 600 }}>{post.visibility}</span></>}
          </div>
        </div>
        {isMine && !editing && (
          <button
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Post options"
            style={{
              width: 28, height: 28, display: 'grid', placeItems: 'center',
              background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8,
              color: '#4B5563', cursor: 'pointer', flexShrink: 0,
            }}
          >
            ⋯
          </button>
        )}
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div style={{
              position: 'absolute', top: 44, right: 12, zIndex: 50, minWidth: 140,
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
              boxShadow: '0 12px 28px rgba(15,23,42,0.12)', padding: 4, display: 'flex', flexDirection: 'column',
            }}>
              <button
                onClick={() => { setDraft(post.body); setEditing(true); setMenuOpen(false) }}
                style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#111827' }}
              >Edit</button>
              <button
                onClick={() => { setMenuOpen(false); void remove() }}
                style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#DC2626' }}
              >Delete</button>
            </div>
          </>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
            rows={4}
            autoFocus
            style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: 10, fontSize: 15, lineHeight: 1.5, fontFamily: 'inherit', resize: 'vertical', color: '#111827' }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={() => { setEditing(false); setDraft(post.body) }}
              style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >Cancel</button>
            <button
              onClick={saveEdit}
              disabled={busy || !draft.trim()}
              style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
            >{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 15, lineHeight: 1.55, whiteSpace: 'pre-wrap', color: '#111827' }}>{post.body}</p>
      )}
    </div>
  )
}
