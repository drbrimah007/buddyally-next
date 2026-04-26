'use client'

// Reviews list + submit form.
// Usable on profile/[id] and activity detail. Respects update_profile_rating trigger.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'
import Paginator from '@/components/Paginator'

const REVIEWS_PAGE_SIZE = 5

type Review = {
  id: string
  reviewer_id: string
  reviewed_id: string
  activity_id: string | null
  rating: number
  comment: string
  created_at: string
  reviewer?: { first_name: string; last_name: string; avatar_url: string }
}

export function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onClick={onChange ? () => onChange(n) : undefined}
          style={{ color: n <= value ? '#F59E0B' : '#E5E7EB', fontSize: size, cursor: onChange ? 'pointer' : 'default', lineHeight: 1 }}
        >★</span>
      ))}
    </span>
  )
}

export default function Reviews({ reviewedId, activityId }: { reviewedId: string; activityId?: string }) {
  const { user } = useAuth()
  const { success, error: err } = useToast()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(0)

  useEffect(() => { load() }, [reviewedId])
  useEffect(() => { setPage(0) }, [reviewedId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('reviews')
      .select('*, reviewer:profiles!reviewer_id(first_name, last_name, avatar_url)')
      .eq('reviewed_id', reviewedId)
      .order('created_at', { ascending: false })
      .limit(200)
    setReviews((data as any) || [])
    setLoading(false)
  }

  async function submit() {
    if (!user) { err('Please log in'); return }
    if (user.id === reviewedId) { err("You can't review yourself"); return }
    setSubmitting(true)
    const { error } = await supabase.from('reviews').insert({
      reviewer_id: user.id,
      reviewed_id: reviewedId,
      activity_id: activityId || null,
      rating,
      comment: comment.trim(),
    })
    setSubmitting(false)
    if (error) {
      err(error.code === '23505' ? 'You already reviewed this user' : 'Failed to submit review')
      return
    }
    success('Review submitted')
    setShowForm(false); setComment(''); setRating(5)
    load()
  }

  const hasMine = user ? reviews.some(r => r.reviewer_id === user.id) : false

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Reviews ({reviews.length})</h3>
        {user && user.id !== reviewedId && !hasMine && (
          <button onClick={() => setShowForm(v => !v)} style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#111827', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {showForm ? 'Cancel' : '+ Leave Review'}
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Rating</label>
          <div style={{ marginBottom: 10 }}><Stars value={rating} size={24} onChange={setRating} /></div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Comment (optional)</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={500} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, color: '#111827', resize: 'vertical' }} placeholder="How was your experience?" />
          <button onClick={submit} disabled={submitting} style={{ marginTop: 10, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6B7280', fontSize: 13 }}>Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p style={{ color: '#6B7280', fontSize: 13 }}>No reviews yet.</p>
      ) : (() => {
        const totalPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PAGE_SIZE))
        const clampedPage = Math.min(page, totalPages - 1)
        const pageItems = reviews.slice(clampedPage * REVIEWS_PAGE_SIZE, (clampedPage + 1) * REVIEWS_PAGE_SIZE)
        return (
          <>
            {reviews.length > REVIEWS_PAGE_SIZE && (
              <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                Showing {(clampedPage * REVIEWS_PAGE_SIZE + 1).toLocaleString()}–{(clampedPage * REVIEWS_PAGE_SIZE + pageItems.length).toLocaleString()} of {reviews.length.toLocaleString()}
              </p>
            )}
            {pageItems.map(r => {
              const name = `${r.reviewer?.first_name || ''} ${r.reviewer?.last_name || ''}`.trim() || 'User'
              return (
                <div key={r.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#4B5563', overflow: 'hidden' }}>
                      {r.reviewer?.avatar_url ? <img src={r.reviewer.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{name}</p>
                      <p style={{ fontSize: 11, color: '#6B7280' }}>{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <Stars value={r.rating} size={14} />
                  </div>
                  {r.comment && <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.5, marginTop: 6 }}>{r.comment}</p>}
                </div>
              )
            })}
            {totalPages > 1 && (
              <div style={{ marginTop: 12 }}>
                <Paginator page={clampedPage} totalPages={totalPages} onChange={setPage} />
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}
