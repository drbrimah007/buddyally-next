'use client'

// Registers the service worker, captures the beforeinstallprompt event for
// later use, and exposes an install() helper via React context so any button
// anywhere can trigger the install prompt (mirrors v1's installApp()).

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type PWAContext = {
  canInstall: boolean
  isInstalled: boolean
  install: () => Promise<'accepted' | 'dismissed' | 'unsupported'>
}

const Ctx = createContext<PWAContext>({ canInstall: false, isInstalled: false, install: async () => 'unsupported' })

export function usePWA() { return useContext(Ctx) }

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  const deferred = useRef<InstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    return !!standalone || iosStandalone
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Register the service worker (ignore failures in dev).
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
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
        return choice.outcome
      } catch {
        return 'dismissed' as const
      }
    }
    return 'unsupported' as const
  }, [])

  return <Ctx.Provider value={{ canInstall, isInstalled, install }}>{children}</Ctx.Provider>
}
