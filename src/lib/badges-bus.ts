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
