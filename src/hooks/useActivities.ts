'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Activity } from '@/lib/types'

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('activities')
      .select('*, host:profiles!created_by(id, first_name, last_name, rating_avg, rating_count, verified_id, avatar_url, city, home_display_name), participants:activity_participants(user_id)')
      .eq('status', 'open')
      .order('date', { ascending: true })
      .limit(50)

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
    if (!error) await fetchActivities() // Refresh immediately
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
