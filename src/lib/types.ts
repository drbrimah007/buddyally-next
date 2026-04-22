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
  verified_id: boolean
  badges: string[]
  socials: {
    instagram?: string
    twitter?: string
    linkedin?: string
    website?: string
  }
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
