'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Activity } from '@/lib/types'

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    // Bumped from 50 → 500. The 50 cap was silently truncating the feed
    // once the DB grew past ~50 open activities. Filtering happens client-side
    // (city, radius, country, category) so we need the full dataset on hand.
    const { data, error } = await supabase
      .from('activities')
      // Trust + account_type pulled on the host embed.
      // - Trust: buddy_verified_at, id_verified_at, is_invited_member
      // - account_type: drives the transparent FoundingBadge so seed
      //   accounts are never mistaken for organic users.
      // is_invited_member is a generated column — invited_by_user_id is
      // never returned to the client per privacy spec §4.
      .select('*, host:profiles!created_by(id, first_name, last_name, rating_avg, rating_count, verified_selfie, avatar_url, city, home_display_name, buddy_verified_at, id_verified_at, is_invited_member, account_type), participants:activity_participants(user_id)')
      .eq('status', 'open')
      .order('date', { ascending: true })
      .limit(500)

    if (!error && data) setActivities(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchActivities() }, [fetchActivities])

  async function createActivity(userId: string, activity: Partial<Activity>) {
    const { data, error } = await supabase
      .from('activities')
      .insert({ ...activity, created_by: userId })
      .select()
      .single()
    if (!error) {
      await fetchActivities() // Refresh immediately
      // Fire-and-forget: notify users whose saved searches match this new
      // activity (push + email + in-app). Never blocks create UX — if the
      // endpoint errors we just swallow it.
      if (data?.id) {
        fetch('/api/saved-search-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activity_id: data.id }),
        }).catch(() => {})
      }
    }
    return { data, error: error?.message }
  }

  async function updateActivity(id: string, updates: Partial<Activity>) {
    const { error } = await supabase
      .from('activities')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) await fetchActivities() // Refresh immediately
    return { error: error?.message }
  }

  async function deleteActivity(id: string) {
    const { error } = await supabase.from('activities').delete().eq('id', id)
    if (!error) await fetchActivities() // Refresh immediately
    return { error: error?.message }
  }

  async function joinActivity(activityId: string, userId: string) {
    const { error } = await supabase
      .from('activity_participants')
      .insert({ activity_id: activityId, user_id: userId })
    if (!error) await fetchActivities()
    return { error: error?.message }
  }

  async function leaveActivity(activityId: string, userId: string) {
    const { error } = await supabase
      .from('activity_participants')
      .delete()
      .eq('activity_id', activityId)
      .eq('user_id', userId)
    if (!error) await fetchActivities()
    return { error: error?.message }
  }

  return { activities, loading, fetchActivities, createActivity, updateActivity, deleteActivity, joinActivity, leaveActivity }
}
