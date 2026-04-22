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
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 20 }}>Alerts</h2>
      {loading ? (
        <div>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, marginBottom: 10 }}>
              <div style={{ height: 16, background: '#f3f4f6', borderRadius: 8, width: '60%', marginBottom: 8 }} />
              <div style={{ height: 14, background: '#f9fafb', borderRadius: 8, width: '40%' }} />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🔔</p>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>No notifications yet</p>
          <p style={{ fontSize: 14, color: '#6B7280' }}>Activity updates, messages, and alerts will appear here.</p>
        </div>
      ) : (
        <div>
          {notifications.map(n => (
            <div key={n.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, marginBottom: 10, ...(!n.read ? { borderLeft: '3px solid #3293CB' } : {}) }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{n.title || 'Notification'}</p>
              <p style={{ fontSize: 14, color: '#4B5563', marginTop: 4 }}>{n.body || n.message}</p>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>{new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
