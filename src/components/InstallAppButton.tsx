'use client'

// Install button rendered in the Profile page's Manage row. Replaced the
// old "trigger native prompt directly" behavior with "open the visual
// instructions modal" — needed because iOS users had no useful response
// from the old button (Safari has no native install prompt). When the app
// is already installed, this collapses to a small ✓ Installed pill so the
// user can confirm it took.

import { useState } from 'react'
import { usePWA } from './PWAProvider'
import InstallAppModal from './InstallAppModal'

type Props = {
  style?: React.CSSProperties
  label?: string
  className?: string
}

export default function InstallAppButton({ style, label = 'Install App', className }: Props) {
  const { isInstalled } = usePWA()
  const [open, setOpen] = useState(false)

  if (isInstalled) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 10,
          background: '#F0FDF4', color: '#166534',
          fontWeight: 700, fontSize: 13,
          border: '1px solid #BBF7D0',
          ...style,
        }}
      >
        ✓ App installed
      </span>
    )
  }

  return (
    <>
      <button
        className={className}
        onClick={() => setOpen(true)}
        style={{
          height: 40,
          padding: '0 16px',
          borderRadius: 10,
          border: '1px solid #E5E7EB',
          background: '#fff',
          color: '#111827',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          ...style,
        }}
      >
        📱 {label}
      </button>
      {open && <InstallAppModal onClose={() => setOpen(false)} />}
    </>
  )
}
