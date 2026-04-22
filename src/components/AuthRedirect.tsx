'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function AuthRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Check localStorage for existing session (instant, no flash)
    try {
      const stored = localStorage.getItem('buddyally-auth')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && (parsed.access_token || (parsed.currentSession && parsed.currentSession.access_token))) {
          router.replace('/dashboard')
        }
      }
    } catch {}
  }, [router])

  return null
}
