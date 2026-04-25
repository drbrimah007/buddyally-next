'use client'

// Registers the service worker, captures the beforeinstallprompt event for
// later use, and exposes an install() helper via React context so any button
// anywhere can trigger the install prompt (mirrors v1's installApp()).
//
// Install detection is the tricky bit. Three signals, in priority order:
//
//   1. `display-mode: standalone` matches → confirmed installed (Chrome/Edge/Android,
//      iOS Safari when launched from the home-screen icon).
//   2. iOS-specific `navigator.standalone === true` → confirmed installed on iOS
//      when launched from the home screen.
//   3. localStorage `ba_app_installed = '1'` → user told us they installed it.
//      This is the *only* signal that survives an iOS visit from regular Safari
//      (where the two above are both false even after install).
//
// The combination plus a 30-day snooze and a "never ask again" flag is what
// finally stops the popup-on-every-visit problem — previous tries only used
// signal 1 and broke immediately on iOS.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type PWAContext = {
  canInstall: boolean       // true ⇒ native beforeinstallprompt is queued
  isInstalled: boolean      // any signal says "already installed"
  install: () => Promise<'accepted' | 'dismissed' | 'unsupported'>
  // Mark installed ourselves (called by the modal's "I've installed it" button).
  markInstalled: () => void
}

const Ctx = createContext<PWAContext>({
  canInstall: false,
  isInstalled: false,
  install: async () => 'unsupported',
  markInstalled: () => {},
})

export function usePWA() { return useContext(Ctx) }

const LS_INSTALLED = 'ba_app_installed'

function readInstalledState(): boolean {
  if (typeof window === 'undefined') return false
  // Browser display-mode (covers most platforms once installed).
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
  // iOS-only flag (Safari launched from home-screen icon).
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  // Sticky user-confirmed flag (the one that handles iOS-Safari-after-install).
  let userFlag = false
  try { userFlag = window.localStorage.getItem(LS_INSTALLED) === '1' } catch {}
  return !!standalone || iosStandalone || userFlag
}

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  const deferred = useRef<InstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(readInstalledState)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Register the service worker (ignore failures in dev).
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Persist the standalone observation so iOS users who later open the
    // app from regular Safari are still recognized as installed.
    if (readInstalledState()) {
      try { window.localStorage.setItem(LS_INSTALLED, '1') } catch {}
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      deferred.current = e as InstallPromptEvent
      setCanInstall(true)
    }
    const onInstalled = () => {
      deferred.current = null
      setCanInstall(false)
      setIsInstalled(true)
      try { window.localStorage.setItem(LS_INSTALLED, '1') } catch {}
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (deferred.current) {
      try {
        await deferred.current.prompt()
        const choice = await deferred.current.userChoice
        deferred.current = null
        setCanInstall(false)
        if (choice.outcome === 'accepted') {
          setIsInstalled(true)
          try { window.localStorage.setItem(LS_INSTALLED, '1') } catch {}
        }
        return choice.outcome
      } catch {
        return 'dismissed' as const
      }
    }
    return 'unsupported' as const
  }, [])

  const markInstalled = useCallback(() => {
    setIsInstalled(true)
    try { window.localStorage.setItem(LS_INSTALLED, '1') } catch {}
  }, [])

  return <Ctx.Provider value={{ canInstall, isInstalled, install, markInstalled }}>{children}</Ctx.Provider>
}
