// Tiny pub/sub for nav badge invalidation.
//
// The dashboard layout already polls every 30s and re-polls on pathname
// change. The 30s lag was fine for stale reads, but the pathname re-poll
// races with mark-as-read writes (the page mounts, fires the .update(),
// the layout's setTimeout(loadBadges, 600) sometimes wins). So pages now
// explicitly call notifyBadgesChanged() AFTER their mark-read commits,
// and the layout listens for the event and re-polls instantly.
//
// Implemented on top of window CustomEvent so there's no React-context
// plumbing. SSR-safe (guards typeof window).

const EVENT = 'ba:badges:refresh'

export function notifyBadgesChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENT))
}

export function onBadgesChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

// ── OS app icon badge ────────────────────────────────────────────────
// Calls the Web App Badging API to put a count on the BuddyAlly home-
// screen icon. Supported on iOS 16.4+ PWAs (installed to home screen),
// modern Chromium browsers, and Safari macOS. Silently no-ops where the
// API isn't exposed — never throws into the calling component.
export function setOsBadge(count: number) {
  if (typeof navigator === 'undefined') return
  const n = Math.max(0, Math.floor(count || 0))
  try {
    if (n === 0) {
      // clearAppBadge is the explicit "no badge" call. Falling back to
      // setAppBadge(0) on browsers that don't expose clear works too.
      if ('clearAppBadge' in navigator) (navigator as any).clearAppBadge()
      else if ('setAppBadge' in navigator) (navigator as any).setAppBadge(0)
    } else {
      if ('setAppBadge' in navigator) (navigator as any).setAppBadge(n)
    }
  } catch { /* iOS sometimes throws on first call before SW is ready — ignore */ }
}
