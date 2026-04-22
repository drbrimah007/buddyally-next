import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: activity } = await supabase
    .from('activities')
    .select('*, host:profiles!created_by(first_name, last_name, rating_avg, rating_count, avatar_url, city, home_display_name, verified_id)')
    .eq('id', id)
    .single()

  if (!activity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-xl font-bold mb-2">Activity not found</h1>
          <Link href="/" className="text-[#3293CB] font-semibold">Go to BuddyAlly</Link>
        </div>
      </div>
    )
  }

  const host = activity.host as any
  const spotsLeft = activity.max_participants - (activity.participants?.length || 0)
  const timing = activity.timing_mode === 'flexible'
    ? activity.availability_label || 'Flexible'
    : activity.timing_mode === 'recurring'
    ? activity.recurrence_freq || 'Recurring'
    : activity.date
    ? new Date(activity.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + (activity.time ? ' at ' + activity.time : '')
    : 'TBA'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-center">
        <div className="max-w-3xl w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/buddyally-logo-full.png" alt="BuddyAlly" className="h-7" />
          </Link>
          <div className="flex gap-3">
            <Link href="/login" className="text-sm font-semibold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">Log In</Link>
            <Link href="/signup" className="text-sm font-semibold text-white bg-[#3293CB] rounded-lg px-3 py-1.5">Sign Up</Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Cover image */}
        {activity.cover_image_url && (
          <img src={activity.cover_image_url} alt="" className="w-full rounded-2xl mb-6 object-contain bg-gray-100" />
        )}

        {/* Title */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <span className="inline-block bg-[#3293CB] text-white text-xs font-semibold px-2.5 py-1 rounded-full mb-2">{activity.category}</span>
            <h1 className="text-2xl font-bold">{activity.title}</h1>
          </div>
        </div>

        {/* Host */}
        {host && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-500 flex-shrink-0">
              {host.avatar_url ? <img src={host.avatar_url} className="w-full h-full rounded-full object-cover" /> : (host.first_name?.[0] || '?')}
            </div>
            <div>
              <p className="font-semibold">{host.first_name} {host.last_name}</p>
              <p className="text-sm text-gray-500">{'★'.repeat(Math.round(host.rating_avg || 0))} {host.rating_avg?.toFixed(1) || '0.0'} ({host.rating_count || 0} reviews)</p>
              <p className="text-xs text-gray-400">{host.home_display_name || host.city}</p>
            </div>
          </div>
        )}

        {/* Description */}
        {activity.description && (
          <p className="text-gray-700 leading-relaxed mb-6">{activity.description}</p>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Location</p>
            <p className="font-semibold text-sm">{activity.location_mode === 'remote' ? 'Remote / Online' : activity.location_display || activity.location_text}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Date & Time</p>
            <p className="font-semibold text-sm">{timing}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Spots</p>
            <p className="font-semibold text-sm">{spotsLeft > 0 ? `${spotsLeft} of ${activity.max_participants} left` : 'Full'}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Cost</p>
            <p className="font-semibold text-sm">{activity.tip_enabled ? 'Free. Tips optional.' : 'Free'}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <p className="font-semibold mb-3">Want to join this activity?</p>
          <Link href="/signup" className="inline-block bg-[#3293CB] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#2678A8] transition">
            Sign Up to Join
          </Link>
        </div>

        {/* Safety */}
        <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 flex items-center gap-2">
            <span>🛡</span>
            <span className="font-semibold text-sm">Safety Protocols</span>
          </div>
          <div className="px-4 py-3 text-sm text-gray-600 leading-relaxed">
            <ul className="list-disc pl-5 space-y-1">
              <li>Do a live video call first</li>
              <li>Ask for a photo of their ID</li>
              <li>Let someone know where you are going</li>
              <li>Choose public, well-lit locations</li>
              <li>Never trust a buddy with valuables or anyone&apos;s life</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
