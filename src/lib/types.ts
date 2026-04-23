export type Activity = {
  id: string
  title: string
  description: string
  category: string
  location_text: string
  location_display: string
  location_mode: 'precise_place' | 'area' | 'statewide' | 'nationwide' | 'remote'
  location_lat: number | null
  location_lng: number | null
  state_code: string | null
  date: string | null
  time: string | null
  timing_mode: 'one_time' | 'date_range' | 'flexible' | 'recurring'
  start_date: string | null
  end_date: string | null
  availability_label: string | null
  recurrence_freq: string | null
  max_participants: number
  tip_enabled: boolean
  cover_image_url: string | null
  status: 'open' | 'full' | 'completed' | 'cancelled'
  created_by: string
  created_at: string
  updated_at?: string
  host?: Profile
  participants?: { user_id: string }[]
}

export type Profile = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  city: string
  home_display_name: string
  bio: string
  avatar_url: string
  home_lat: number | null
  home_lng: number | null
  interests: string[]
  rating_avg: number
  rating_count: number
  verified_email: boolean
  verified_phone: boolean
  verified_selfie: boolean
  badges: string[]
  socials: {
    instagram?: string
    twitter?: string
    linkedin?: string
    website?: string
  }
  explore_display_name?: string
  explore_lat?: number | null
  explore_lng?: number | null
  explore_radius_miles?: number
  updated_at?: string
}

export type ConnectCode = {
  id: string
  user_id: string
  code: string
  title: string
  code_type: string
  status: string
  scan_count: number
  created_at: string
}

export type Message = {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  read: boolean
  created_at: string
}

export type Contact = {
  id: string
  user_id: string
  contact_user_id: string
  status: 'active' | 'archived' | 'blocked'
  source: 'message' | 'request' | 'manual'
  last_interaction_at: string
  created_at: string
  updated_at: string
  // Optional joined profile
  contact?: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'city'>
}

export type ContactRequest = {
  id: string
  sender_id: string
  recipient_id: string
  message: string
  status: 'pending' | 'accepted' | 'denied' | 'blocked' | 'cancelled'
  created_at: string
  responded_at: string | null
  // Optional joined profiles
  sender?: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'city'>
  recipient?: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'city'>
}
