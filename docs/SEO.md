# BuddyAlly — SEO Setup Guide

You can ship every meta tag and sitemap in the world, but **none of them
make Google index you faster than telling Google directly.** Most of the
"my site doesn't appear" problem isn't code — it's that you've never
verified the domain in Search Console and submitted the sitemap.

This guide is the full checklist, ordered by impact.

---

## 0. What's already shipped (this commit)

- `src/app/layout.tsx` — root metadata: title template, description,
  keywords (BuddyAlly, buddy ally, buddy, etc.), Open Graph, Twitter Card,
  explicit `robots: { index: true, follow: true }`, large image preview.
- `src/app/robots.ts` → served at `/robots.txt`. Allows everything except
  `/dashboard`, `/admin`, `/api/`. Points to the sitemap.
- `src/app/sitemap.ts` → served at `/sitemap.xml`. Includes static pages
  + every public open activity (`/a/[id]`) + every profile (`/u/[id]`).
  Cached 6h at the edge.
- `src/app/page.tsx` — JSON-LD `Organization` + `WebSite` + `SearchAction`
  (the WebSite SearchAction is what enables Google's sitelinks search box).
- `/home/layout.tsx` — page-specific metadata (browser tab title etc).
- Per-route metadata can be added the same way for `/login`, `/signup`,
  `/contact`, `/privacy`, `/terms` (all currently inherit from root).

---

## 1. Google Search Console (15 min — biggest single lever)

This is the single most important step. Without it, Google may not crawl
you for weeks.

1. Go to https://search.google.com/search-console
2. Add property → **Domain** (preferred) or **URL prefix**
   - Domain: requires DNS TXT record (Vercel makes this easy: Settings →
     Domains → DNS records → add the TXT Google gives you)
   - URL prefix: easier — just paste `https://buddyally.com`, then verify
     by adding a meta tag (Google gives you a string like
     `google-site-verification=abc123...`). Drop it into
     `src/app/layout.tsx` → `metadata.verification.google`.
3. After verification, in the left nav: **Sitemaps** → enter `sitemap.xml`
   → Submit.
4. **URL inspection** → paste `https://buddyally.com/` → click "Request
   indexing". Repeat for `/home`, your top 5–10 activities and profiles.

You should see crawl activity within 24h and pages start indexing in
1–7 days. Without verification, Google will eventually find you, but it
might take weeks.

## 2. Bing Webmaster Tools (5 min — same idea)

https://www.bing.com/webmasters

Add the site, verify (similar meta tag flow — drop the value into
`metadata.verification.other['msvalidate.01']`), submit sitemap.
Bing also powers DuckDuckGo, Ecosia, and Yahoo — covers ~10% of search.

## 3. Make sure the site name resolves as "BuddyAlly"

Google uses several signals to decide your "site name" in results. Help
it by:

- ✅ The JSON-LD `Organization` block on `/` says `name: "BuddyAlly"` and
  `alternateName: ["Buddy Ally", "buddyally", "Buddy"]` — done.
- ✅ Page `<title>` tags consistently include "BuddyAlly" — done via
  `title.template`.
- ✅ Domain matches the brand (`buddyally.com`) — done.

Once you have official social accounts, add them to the JSON-LD `sameAs`
array in `src/app/page.tsx` — Twitter, Instagram, LinkedIn, Facebook.
This unlocks the right-hand "knowledge panel" on Google and helps the
brand resolve as a real entity vs a random word.

## 4. Backlinks (the slow one — but the real growth lever)

Google's job is to figure out who's important. Important = other
trustworthy sites link to you. Even one or two real backlinks change
ranking dramatically. Cheap moves:

- Set up a Crunchbase profile: https://www.crunchbase.com/add
- Product Hunt launch when you're ready: https://www.producthunt.com
- Reddit / niche forums (real value, not spam)
- Press / blog mentions
- Partnerships — get listed on ride-share / community-help directories
- Indie Hackers, Hacker News (Show HN)

## 5. Content for long-tail searches

Right now there's no content on the site that targets searches like
"how to find a ride buddy in Brooklyn" or "share a package to Lagos".
Each of those is a long-tail keyword that brings in real intent traffic.
Plan a small content layer:

- A `/blog` route with 5–10 posts (one per use case)
- A `/cities/[city]` route — "BuddyAlly in Brooklyn" — auto-generated
  from your data (top hosts, recent activities)
- An `/about` page (currently missing — Google likes "about" pages as
  trust signals)

## 6. Open Graph image health

`/public/og-image.png` exists. Verify it actually looks good:

1. Open https://www.opengraph.xyz/url/https%3A%2F%2Fbuddyally.com
2. If it's blurry / wrong size / boring — replace it. Aim for
   1200×630px, BuddyAlly logo + tagline, bold color (sky blue is on-brand).

This is what shows up when anyone shares a link in iMessage, Slack,
WhatsApp, etc. It's the most-seen design surface besides the homepage.

## 7. Performance & Core Web Vitals

Google ranks fast sites higher. Test:

- https://pagespeed.web.dev/?url=https://buddyally.com
- https://search.google.com/test/mobile-friendly?url=https://buddyally.com

Target: **LCP < 2.5s, CLS < 0.1, INP < 200ms**. Your stack (Next.js 16 +
Vercel) is fast by default. Common drags: the splash page's CSS
animations, large unoptimized images, Leaflet's tile load.

## 8. Verify it actually works

After deploying:

```
curl -I https://buddyally.com/robots.txt        # 200 OK
curl    https://buddyally.com/robots.txt        # see Allow / Disallow
curl    https://buddyally.com/sitemap.xml | head -50
```

Then paste the homepage into:

- https://search.google.com/test/rich-results — confirms the JSON-LD
  parses and Google sees the Organization + WebSite blocks
- https://cards-dev.twitter.com/validator — Twitter Card preview
- https://developers.facebook.com/tools/debug/ — OG preview + recache

---

## Realistic timeline

- Day 0: deploy, verify in Search Console, submit sitemap
- Day 1–3: Google starts crawling, index `/`, `/home`
- Week 1–2: most static pages indexed; activity / profile pages start
  appearing
- Week 2–4: searches for "buddyally" start surfacing the site
- Month 1–3: branded queries ("buddy ally", "buddyally signup") work
  cleanly; long-tail queries start trickling in IF you add content
- Month 3+: real organic traffic correlates with backlinks + content

There is no shortcut. Anyone who promises Day-1 first-page ranking for a
new domain is selling you snake oil.
