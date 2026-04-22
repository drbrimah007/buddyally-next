'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type ToastKind = 'info' | 'success' | 'error' | 'warn'
type Toast = { id: number; text: string; kind: ToastKind }

type ToastCtx = {
  toast: (text: string, kind?: ToastKind) => void
  success: (text: string) => void
  error: (text: string) => void
  info: (text: string) => void
  warn: (text: string) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

const KIND_STYLES: Record<ToastKind, { bg: string; fg: string; border: string }> = {
  info:    { bg: '#EFF6FF', fg: '#1E40AF', border: '#BFDBFE' },
  success: { bg: '#ECFDF5', fg: '#065F46', border: '#A7F3D0' },
  error:   { bg: '#FEF2F2', fg: '#991B1B', border: '#FECACA' },
  warn:    { bg: '#FFFBEB', fg: '#92400E', border: '#FDE68A' },
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(cur => [...cur, { id, text, kind }])
    setTimeout(() => setToasts(cur => cur.filter(t => t.id !== id)), 3800)
  }, [])

  const value: ToastCtx = {
    toast: push,
    success: (t) => push(t, 'success'),
    error:   (t) => push(t, 'error'),
    info:    (t) => push(t, 'info'),
    warn:    (t) => push(t, 'warn'),
  }

  // Let callers outside React context (e.g. utility modules) fire toasts too.
  useEffect(() => {
    ;(window as any).__buddyToast = push
    return () => { delete (window as any).__buddyToast }
  }, [push])

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed', top: 72, left: 0, right: 0, zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 8, pointerEvents: 'none',
        }}
      >
        {toasts.map(t => {
          const s = KIND_STYLES[t.kind]
          return (
            <div
              key={t.id}
              role="status"
              style={{
                pointerEvents: 'auto',
                background: s.bg, color: s.fg,
                border: `1px solid ${s.border}`,
                padding: '10px 16px', borderRadius: 12,
                fontSize: 13, fontWeight: 600,
                maxWidth: 'min(90vw, 480px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                animation: 'bta-slide-in 0.18s ease-out',
              }}
            >
              {t.text}
            </div>
          )
        })}
        <style jsx global>{`
          @keyframes bta-slide-in {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </Ctx.Provider>
  )
}

// Convenience helper usable anywhere (including non-React code paths).
export function toast(text: string, kind: ToastKind = 'info') {
  if (typeof window !== 'undefined' && (window as any).__buddyToast) {
    ;(window as any).__buddyToast(text, kind)
  } else if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log(`[toast:${kind}]`, text)
  }
}
