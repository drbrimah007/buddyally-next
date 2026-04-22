'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function AlertsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) loadNotifications() }, [user])

  async function loadNotifications() {
    if (!user) return; setLoading(true)
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
    setNotifications(data || []); setLoading(false)
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-5">Alerts</h1>
      {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse"><div className="h-4 bg-gray-200 rounded w-2/3 mb-2" /><div className="h-3 bg-gray-100 rounded w-1/2" /></div>)}</div>
      : notifications.length === 0 ? <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center"><p className="text-3xl mb-3">🔔</p><p className="font-semibold mb-2">No notifications yet</p><p className="text-sm text-gray-500">Activity updates, messages, and alerts will appear here.</p></div>
      : <div className="space-y-2">{notifications.map(n => (
        <div key={n.id} className={`bg-white border border-gray-200 rounded-xl p-4 ${!n.read ? 'border-l-4 border-l-[#3293CB]' : ''}`}>
          <p className="text-sm font-semibold">{n.title || 'Notification'}</p>
          <p className="text-sm text-gray-500 mt-1">{n.body || n.message}</p>
          <p className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
        </div>
      ))}</div>}
    </div>
  )
}
