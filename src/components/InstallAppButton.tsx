'use client'

// Drop-in "Install App" button. Hides itself on platforms that have no
// install prompt (e.g. already-installed, in-app browsers) and shows an
// iOS-specific hint because Safari has no beforeinstallprompt.

import { usePWA } from './PWAProvider'
import { useToast } from './ToastProvider'

type Props = {
  style?: React.CSSProperties
  label?: string
  className?: string
}

function detectIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

export default function InstallAppButton({ style, label = 'Install App', className }: Props) {
  const { canInstall, isInstalled, install } = usePWA()
  const { info } = useToast()
  const isIOS = detectIOS()

  if (isInstalled) return null
  if (!canInstall && !isIOS) return null

  return (
    <button
      className={className}
      onClick={async () => {
        const outcome = await install()
        if (outcome === 'unsupported') {
          if (isIOS) info('Tap Share, then "Add to Home Screen"')
          else info('Look for the install icon in your browser address bar')
        }
      }}
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
      {label}
    </button>
  )
}
