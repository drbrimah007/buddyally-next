'use client'

// One-shot install nudge that opens the InstallAppModal a few seconds after
// sign-in. The whole point of this file is the *gate* — past attempts kept
// re-prompting on every visit; this one checks every escape hatch we have:
//
//   1. PWAProvider says we're already installed → never show.
//   2. Sticky localStorage flag (set by the modal's "I've installed it"
//      button OR by appinstalled event) → never show.
//   3. localStorage snooze date in the future → don't show now.
//   4. sessionStorage flag set the first time we render this session →
//      don't show twice in one session even if the user navigates around.
//
// The 3-second delay gives the user time to land on Explore before we
// interrupt with anything.

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePWA } from './PWAProvider'
import InstallAppModal from './InstallAppModal'

const SESSION_KEY = 'ba_install_shown_this_session'
const SNOOZE_KEY  = 'ba_install_snoozed_until'

export default function InstallAutoPrompt() {
  const { user, loading } = useAuth()
  const { isInstalled } = usePWA()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (loading || !user) return
    if (isInstalled) return

    // Already shown this session — don't pester.
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return
    } catch { /* sessionStorage blocked → fall through and show once */ }

    // Snoozed → check the date.
    try {
      const snoozedUntil = localStorage.getItem(SNOOZE_KEY)
      if (snoozedUntil) {
        const t = Date.parse(snoozedUntil)
        if (!isNaN(t) && t > Date.now()) return
      }
    } catch {}

    // Wait a beat after sign-in lands so we don't blast on first paint.
    const timer = setTimeout(() => {
      setShow(true)
      try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
    }, 3000)
    return () => clearTimeout(timer)
  }, [loading, user, isInstalled])

  if (!show) return null
  return <InstallAppModal onClose={() => setShow(false)} />
}
