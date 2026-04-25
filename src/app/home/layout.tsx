// Server layout that owns the browser tab title + Open Graph metadata
// for the /home landing page. The page itself is 'use client' (uses
// framer-motion + interactive carousels), so it can't export `metadata`
// directly — that has to live on a server component, hence this thin
// wrapper layout.

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join buddyally',
  description:
    'Link into rides, packages, events, and help already in motion across cities and neighborhoods.',
  openGraph: {
    title: 'Join buddyally',
    description:
      'Link into rides, packages, events, and help already in motion across cities and neighborhoods.',
    url: 'https://buddyally.com/home',
    siteName: 'BuddyAlly',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join buddyally',
    description:
      'Link into rides, packages, events, and help already in motion across cities and neighborhoods.',
  },
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
