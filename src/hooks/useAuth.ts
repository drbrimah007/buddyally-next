'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    // Explicit safe column list (no `select('*')`). The four admin-only
    // fields — invited_by_user_id, invite_root_user_id, invite_chain_depth,
    // invite_code_id, trust_weight — are revoked at the DB column level
    // for the anon/authenticated roles, so a wildcard select would error.
    // We keep this list narrow on purpose: even the user themselves should
    // never see their own root inviter or chain depth (spec §4).
    const SAFE_COLUMNS = [
      'id', 'email', 'first_name', 'last_name', 'phone', 'city',
      'home_display_name', 'bio', 'avatar_url', 'home_lat', 'home_lng',
      'interests', 'rating_avg', 'rating_count',
      'verified_email', 'verified_phone', 'verified_selfie',
      'badges', 'socials',
      'explore_display_name', 'explore_lat', 'explore_lng', 'explore_radius_miles',
      'home_country_code',
      // Trust-layer surface signals (boolean / timestamps only — no lineage).
      'is_invited_member', 'buddy_verified_at', 'id_verified_at', 'id_verified_provider',
      'notify_push_enabled', 'notify_email_enabled',
      'blocked_users', 'is_admin',
      'created_at', 'updated_at',
    ].join(', ')
    // Cast — passing a runtime column-list string widens Supabase's inferred
    // row type to a generic shape that doesn't satisfy our Profile type.
    // The shape is fine at runtime (these are the legit profile columns),
    // we just need to tell TS to trust it.
    const { data } = await supabase.from('profiles').select(SAFE_COLUMNS).eq('id', userId).single()

    // Sync auth.users.email_confirmed_at → profiles.verified_email.
    //
    // Two separate fields tracking the same thing: Supabase Auth flips
    // email_confirmed_at when the user clicks the signup confirmation
    // link, but our `verified_email` column stays false until something
    // updates it. The profile page reads `verified_email` to decide
    // whether to nag the user — without this sync, anyone who confirms
    // through the link still gets prompted to verify a second time via
    // the in-app 6-digit code flow. Belt-and-suspenders: we one-shot
    // update the column the moment we notice the discrepancy on load.
    if (data && !(data as any).verified_email) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser?.email_confirmed_at) {
        await supabase.from('profiles').update({ verified_email: true }).eq('id', userId)
        ;(data as any).verified_email = true
      }
    }

    setProfile(data as any)
    setLoading(false)
  }

  async function signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { user: data.user }
  }

  async function signUpWithEmail(email: string, password: string, meta: Record<string, string>) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: meta,
        emailRedirectTo: window.location.origin + '/dashboard',
      }
    })
    if (error) return { error: error.message }
    return { user: data.user }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' }
    })
    if (error) return { error: error.message }
    return {}
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login',
    })
    if (error) return { error: error.message }
    return {}
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return
    const { error } = await supabase.from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null)
    }
    return { error: error?.message }
  }

  return {
    user,
    profile,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile: () => user && loadProfile(user.id),
  }
}
