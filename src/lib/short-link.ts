// Mints (or fetches) a 6-character base62 short code for a long URL and
// returns an absolute https://buddyally.com/s/<code> URL. Used by ShareButton
// so DMs / SMS / WhatsApp links look like buddyally.com/s/aB3xK9 instead of
// buddyally.com/a/9c2c46a9-01f4-4721-873c-f582ac151fb0.
//
// Strategy:
//   1. Normalize the input URL (strip hash, trailing slash).
//   2. Look up by url — return existing code if present.
//   3. Otherwise, generate random 6-char codes, attempting insert until
//      one succeeds (collisions on a small alphanumeric space are rare).
//   4. Falls back to the original URL on any error so sharing never breaks.

import { supabase } from '@/lib/supabase'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789' // dropped 0/O/1/I/l for legibility

function randomCode(len = 6): string {
  let out = ''
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return out
}

function normalize(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ''
    let s = u.toString()
    if (s.endsWith('/')) s = s.slice(0, -1)
    return s
  } catch {
    return url
  }
}

function origin(): string {
  if (typeof window !== 'undefined' && window.location) return window.location.origin
  return 'https://buddyally.com'
}

export async function getOrMintShortLink(longUrl: string, createdBy?: string | null): Promise<string> {
  const url = normalize(longUrl)

  try {
    const { data: existing } = await supabase
      .from('short_links')
      .select('code')
      .eq('url', url)
      .maybeSingle()
    if (existing?.code) return `${origin()}/s/${existing.code}`

    // Try a few inserts to avoid the rare collision case.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode(6)
      const { error } = await supabase
        .from('short_links')
        .insert({ code, url, created_by: createdBy || null })
      if (!error) return `${origin()}/s/${code}`
      // Unique-violation? Re-roll the code. Anything else, bail to fallback.
      if ((error as any).code !== '23505') break
    }
  } catch {
    // fall through
  }
  return longUrl
}
