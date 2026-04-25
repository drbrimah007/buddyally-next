// City-targeted landing page for Abuja. Mirrors the visual design Perry
// drafted (sky-blue accent, big tracking-tight headlines, glass Buddy Pulse
// preview, soft stat tiles, dark "why" panel) but drops the "first / beta /
// founding members / Abuja first" framing per spec — the page reads as a
// living BuddyAlly destination for Abuja, not a launch announcement.

import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BuddyAlly in Abuja — Rides, help, events, and people nearby',
  description:
    'Find rides going your way across Abuja, share local help, post events, and connect with people moving through Wuse, Garki, Maitama, Jabi, and more.',
  alternates: { canonical: 'https://buddyally.com/abuja' },
  openGraph: {
    title: 'BuddyAlly in Abuja',
    description: 'Rides, local help, events, and people already moving around Abuja.',
    url: 'https://buddyally.com/abuja',
    type: 'website',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BuddyAlly in Abuja',
    description: 'Rides, local help, events, and people already moving around Abuja.',
    images: ['/og-image.png'],
  },
}

export default function AbujaPage() {
  return (
    <div style={{ background: '#f4f5f7', color: '#111827', overflow: 'hidden' }}>
      <div style={wrap}>
        {/* Top bar — minimal, just logo + log-in. */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0' }}>
          <Link href="/" style={{ ...logoBase, textDecoration: 'none', color: '#111827' }}>
            buddy<span style={{ color: '#3293cb' }}>ally</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontWeight: 800, fontSize: 14, color: '#475569' }}>
            <Link href="/login" style={loginLink}>Log In</Link>
          </div>
        </nav>

        {/* Hero — headline left, glass Buddy Pulse preview right. */}
        <main style={hero}>
          <div>
            <span style={pill}><span style={dot} /> Buddy Pulse · Abuja</span>
            <h1 style={h1}>
              Someone&apos;s going your way, <span style={{ color: '#3293cb' }}>Abuja.</span>
            </h1>
            <p style={subhead}>
              Share rides, local help, events, and opportunities already moving around your city. Connect with the people right next to you.
            </p>
            <div style={ctaRow}>
              <Link href="/signup" style={{ ...btn, ...btnPrimary }}>Join free →</Link>
              <Link href="#pulse" style={{ ...btn, ...btnSecondary }}>See Buddy Pulse</Link>
            </div>
            <p style={{ ...micro, marginTop: 16 }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: '#197bb8', fontWeight: 950 }}>Log in</Link>
            </p>
          </div>

          {/* Buddy Pulse preview card — single visible signal + dot pagination. */}
          <aside id="pulse" style={pulseCard}>
            <div style={pulseInner}>
              <div style={grain} />
              <div style={mapLine} />
              <span style={{ ...pin, ...pinOne }} />
              <span style={{ ...pin, ...pinTwo }} />
              <span style={{ ...pin, ...pinThree }} />
              <div style={pulseTop}>
                <div style={pulseLabel}>Buddy Pulse Abuja</div>
                <div style={livePill}>Live preview</div>
              </div>
              <div style={notice}>
                <div style={noticeType}><span style={dot} /> Ride Share</div>
                <h2 style={noticeH2}>Need ride to airport tomorrow morning.</h2>
                <p style={noticeP}>Two seats open from Wuse. Split fuel if you&apos;re heading that way.</p>
                <div style={noticeMeta}>📍 Wuse · 5 min ago</div>
              </div>
              <div style={dots}>
                <span style={{ ...dotsSpan, ...dotsActive }} />
                <span style={dotsSpan} />
                <span style={dotsSpan} />
              </div>
            </div>
          </aside>
        </main>

        {/* What's moving — three category cards. */}
        <section style={section}>
          <h2 style={sectionTitle}>What&apos;s moving in Abuja?</h2>
          <p style={sectionSub}>
            BuddyAlly is for real local motion: rides, events, help, shared plans, and people already nearby.
          </p>
          <div style={cards}>
            <div style={card}>
              <div style={iconBox}>🚗</div>
              <h3 style={cardH3}>Going Your Way</h3>
              <p style={cardP}>Find people already moving across Abuja, or share a ride when you have space.</p>
            </div>
            <div style={card}>
              <div style={iconBox}>📍</div>
              <h3 style={cardH3}>Buddy Pulse</h3>
              <p style={cardP}>See what&apos;s happening near Wuse, Garki, Maitama, Jabi, and more.</p>
            </div>
            <div style={card}>
              <div style={iconBox}>🤝</div>
              <h3 style={cardH3}>Help &amp; Community</h3>
              <p style={cardP}>Connect around local needs, favors, skills, and everyday support.</p>
            </div>
          </div>
        </section>

        {/* Real signals — example activity tiles. Static examples; real
            data flows from the live activities table once people post. */}
        <section style={section}>
          <h2 style={sectionTitle}>Real things people post.</h2>
          <p style={sectionSub}>
            Useful, local, easy to act on. The kind of thing you&apos;d text a friend — but visible to everyone moving nearby.
          </p>
          <div style={activityWall}>
            {SAMPLE_SIGNALS.map((a) => (
              <div key={a.title} style={activity}>
                <span style={tag}>{a.tag}</span>
                <h4 style={activityH4}>{a.title}</h4>
                <p style={activityP}>{a.body}</p>
                <div style={where}>📍 {a.where}</div>
              </div>
            ))}
          </div>
          <div style={{ ...ctaRow, justifyContent: 'center', marginTop: 26 }}>
            <Link href="/signup" style={{ ...btn, ...btnPrimary }}>Join to post or connect →</Link>
          </div>
        </section>

        {/* Why this works — dark panel with three supporting bullets. */}
        <section style={section}>
          <div style={whyGrid}>
            <div style={whyBox}>
              <h2 style={whyBoxH2}>Built around your city.</h2>
              <p style={whyBoxP}>
                Abuja is dense enough to feel local and connected enough to spread through friends, groups, schools, offices, churches, and neighborhoods.
              </p>
            </div>
            <div style={bullets}>
              <div style={bullet}>
                <b style={{ fontSize: 18 }}>Action, not feed</b>
                <p style={bulletP}>Post something useful, find something nearby, connect when it actually matters.</p>
              </div>
              <div style={bullet}>
                <b style={{ fontSize: 18 }}>People you can meet</b>
                <p style={bulletP}>Profiles show ratings, verifications, and what they&apos;ve hosted before.</p>
              </div>
              <div style={bullet}>
                <b style={{ fontSize: 18 }}>Free to use</b>
                <p style={bulletP}>BuddyAlly is free for everyday rides, help, and meet-ups across Abuja.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA. */}
        <section style={section}>
          <div style={referral}>
            <h2 style={referralH2}>Bring Abuja closer.</h2>
            <p style={referralP}>Join, post what you&apos;re doing, and invite friends who move through your city.</p>
            <div style={{ ...ctaRow, justifyContent: 'center' }}>
              <Link href="/signup" style={{ ...btn, ...btnPrimary }}>Join free →</Link>
            </div>
            <p style={micro}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: '#197bb8', fontWeight: 950 }}>Log in</Link>
            </p>
          </div>
        </section>

        <footer style={footer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
            <div>© {new Date().getFullYear()} BuddyAlly</div>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <Link href="/trust-and-safety" style={footerLink}>Trust &amp; Safety</Link>
              <Link href="/privacy" style={footerLink}>Privacy</Link>
              <Link href="/terms" style={footerLink}>Terms</Link>
              <Link href="/contact" style={footerLink}>Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

// ─── Sample signals (static, illustrative) ─────────────────────────
const SAMPLE_SIGNALS: { tag: string; title: string; body: string; where: string }[] = [
  { tag: 'Ride',   title: 'Abuja → Kaduna Friday',     body: 'Two seats open. Leaving around 4pm.',   where: 'Garki' },
  { tag: 'Sports', title: 'Pickup basketball tonight', body: 'Need three more players. Casual run.',  where: 'Wuse 2' },
  { tag: 'Help',   title: 'Need help moving a table',  body: 'Quick lift nearby. Fuel help available.', where: 'Maitama' },
  { tag: 'Event',  title: 'Extra ticket tonight',      body: 'Free to join if you\u2019re nearby.',     where: 'Jabi' },
]

// ─── Inline styles ─────────────────────────────────────────────────
const wrap: React.CSSProperties = { maxWidth: 1180, margin: '0 auto', padding: '0 24px' }
const logoBase: React.CSSProperties = { fontSize: 36, fontWeight: 950, letterSpacing: '-0.08em', lineHeight: 0.9 }
const loginLink: React.CSSProperties = { padding: '10px 16px', borderRadius: 999, background: '#fff', border: '1px solid rgba(15,23,42,.08)', color: 'inherit', textDecoration: 'none' }

const hero: React.CSSProperties = {
  padding: '28px 0 64px',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 440px)',
  gap: 34,
  alignItems: 'center',
}

const pill: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '8px 13px', borderRadius: 999,
  background: '#eaf6fc', color: '#197bb8',
  fontSize: 12, fontWeight: 950, letterSpacing: '.12em', textTransform: 'uppercase',
}
const dot: React.CSSProperties = { width: 8, height: 8, borderRadius: '50%', background: '#3293cb' }

const h1: React.CSSProperties = {
  margin: '18px 0 0',
  fontSize: 'clamp(54px, 7vw, 96px)',
  lineHeight: 0.88,
  letterSpacing: '-0.085em',
  fontWeight: 950,
}

const subhead: React.CSSProperties = {
  margin: '24px 0 0', maxWidth: 620,
  color: '#475569', fontSize: 19, lineHeight: 1.75, fontWeight: 520,
}

const ctaRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 30, alignItems: 'center' }
const btn: React.CSSProperties = {
  border: 0, cursor: 'pointer', borderRadius: 22, padding: '17px 23px',
  fontSize: 15, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '-.01em',
  display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none',
}
const btnPrimary: React.CSSProperties = { background: '#3293cb', color: '#fff', boxShadow: '0 16px 34px rgba(50,147,203,.26)' }
const btnSecondary: React.CSSProperties = { background: '#fff', color: '#111827', border: '1px solid rgba(15,23,42,.08)' }
const micro: React.CSSProperties = { color: '#64748b', fontSize: 14, fontWeight: 700 }

const pulseCard: React.CSSProperties = {
  background: '#eee9df', borderRadius: 34, padding: 18,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.55), 0 18px 60px rgba(15,23,42,.08)',
  border: '1px solid rgba(15,23,42,.05)',
}
const pulseInner: React.CSSProperties = {
  position: 'relative', minHeight: 480,
  borderRadius: 28, background: '#f8fafc',
  overflow: 'hidden', padding: 22,
}
const grain: React.CSSProperties = {
  position: 'absolute', inset: 0, opacity: 0.07, pointerEvents: 'none',
  backgroundImage:
    'radial-gradient(circle at 20% 30%, #000 0 1px, transparent 1px), radial-gradient(circle at 70% 60%, #000 0 1px, transparent 1px)',
  backgroundSize: '7px 7px, 11px 11px', mixBlendMode: 'multiply',
}
const mapLine: React.CSSProperties = {
  position: 'absolute', inset: 0, opacity: 0.24, pointerEvents: 'none',
  background:
    'radial-gradient(circle at 20% 22%, rgba(50,147,203,.38), transparent 22%), radial-gradient(circle at 78% 34%, rgba(139,92,246,.28), transparent 22%), radial-gradient(circle at 45% 80%, rgba(34,197,94,.22), transparent 23%)',
}

const pulseTop: React.CSSProperties = { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }
const pulseLabel: React.CSSProperties = { fontSize: 12, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '.18em', color: '#64748b' }
const livePill: React.CSSProperties = { background: 'rgba(255,255,255,.8)', padding: '8px 12px', borderRadius: 999, color: '#64748b', fontSize: 12, fontWeight: 900 }

const notice: React.CSSProperties = {
  position: 'relative', zIndex: 2, marginTop: 58,
  background: 'rgba(255,255,255,.88)', border: '1px solid rgba(15,23,42,.06)',
  borderRadius: 28, padding: 26,
  boxShadow: '0 12px 30px rgba(15,23,42,.08)', minHeight: 245,
}
const noticeType: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, color: '#197bb8', fontSize: 12, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '.15em' }
const noticeH2: React.CSSProperties = { margin: '16px 0 0', fontSize: 38, lineHeight: 0.98, letterSpacing: '-.06em', fontWeight: 950 }
const noticeP: React.CSSProperties = { margin: '14px 0 0', color: '#475569', lineHeight: 1.65, fontWeight: 600 }
const noticeMeta: React.CSSProperties = { marginTop: 18, color: '#64748b', fontSize: 14, fontWeight: 800 }

const dots: React.CSSProperties = { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 18 }
const dotsSpan: React.CSSProperties = { height: 7, width: 7, borderRadius: 999, background: '#cbd5e1' }
const dotsActive: React.CSSProperties = { width: 28, background: '#3293cb' }

const pin: React.CSSProperties = {
  position: 'absolute', width: 14, height: 14, borderRadius: '50%',
  background: '#3293cb', boxShadow: '0 0 0 10px rgba(50,147,203,.14)', zIndex: 1,
}
const pinOne: React.CSSProperties   = { left: '14%', top: '18%' }
const pinTwo: React.CSSProperties   = { right: '16%', top: '28%', background: '#8b5cf6', boxShadow: '0 0 0 10px rgba(139,92,246,.14)' }
const pinThree: React.CSSProperties = { left: '34%', bottom: '16%', background: '#22c55e', boxShadow: '0 0 0 10px rgba(34,197,94,.14)' }

const section: React.CSSProperties = { padding: '56px 0' }
const sectionTitle: React.CSSProperties = { fontSize: 'clamp(34px, 4.5vw, 60px)', lineHeight: 0.92, letterSpacing: '-.07em', fontWeight: 950, margin: 0 }
const sectionSub: React.CSSProperties = { marginTop: 14, color: '#64748b', fontSize: 17, lineHeight: 1.7, maxWidth: 660, fontWeight: 560 }

const cards: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 26 }
const card: React.CSSProperties = { background: '#fff', borderRadius: 30, padding: 28, border: '1px solid rgba(15,23,42,.06)', boxShadow: '0 12px 30px rgba(15,23,42,.05)' }
const iconBox: React.CSSProperties = { width: 58, height: 58, display: 'grid', placeItems: 'center', borderRadius: 20, background: '#eaf6fc', fontSize: 28 }
const cardH3: React.CSSProperties = { margin: '20px 0 0', fontSize: 24, lineHeight: 1, letterSpacing: '-.04em', fontWeight: 950 }
const cardP: React.CSSProperties = { color: '#64748b', lineHeight: 1.7, fontWeight: 560 }

const activityWall: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 26 }
const activity: React.CSSProperties = { background: '#fff', borderRadius: 26, padding: 18, border: '1px solid rgba(15,23,42,.06)', boxShadow: '0 8px 24px rgba(15,23,42,.045)', minHeight: 188, display: 'flex', flexDirection: 'column' }
const tag: React.CSSProperties = { alignSelf: 'flex-start', padding: '7px 10px', borderRadius: 999, background: '#eef8fe', color: '#197bb8', fontSize: 11, fontWeight: 950, textTransform: 'uppercase' }
const activityH4: React.CSSProperties = { margin: '16px 0 0', fontSize: 20, lineHeight: 1.08, letterSpacing: '-.04em', fontWeight: 950 }
const activityP: React.CSSProperties = { color: '#64748b', lineHeight: 1.55, fontSize: 14, fontWeight: 560 }
const where: React.CSSProperties = { marginTop: 'auto', color: '#334155', fontSize: 13, fontWeight: 850 }

const whyGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'center' }
const whyBox: React.CSSProperties = { background: '#111827', color: '#fff', borderRadius: 34, padding: 34 }
const whyBoxH2: React.CSSProperties = { margin: 0, fontSize: 'clamp(34px, 4.5vw, 54px)', lineHeight: 0.92, letterSpacing: '-.07em' }
const whyBoxP: React.CSSProperties = { color: '#cbd5e1', lineHeight: 1.75, fontSize: 17 }
const bullets: React.CSSProperties = { display: 'grid', gap: 14 }
const bullet: React.CSSProperties = { background: '#fff', borderRadius: 24, padding: 22, border: '1px solid rgba(15,23,42,.06)' }
const bulletP: React.CSSProperties = { margin: '8px 0 0', color: '#64748b', lineHeight: 1.6 }

const referral: React.CSSProperties = { background: '#eaf6fc', borderRadius: 40, padding: 46, textAlign: 'center', border: '1px solid rgba(50,147,203,.12)' }
const referralH2: React.CSSProperties = { margin: 0, fontSize: 'clamp(38px, 5vw, 70px)', lineHeight: 0.9, letterSpacing: '-.075em', fontWeight: 950 }
const referralP: React.CSSProperties = { color: '#475569', fontSize: 18, lineHeight: 1.7 }

const footer: React.CSSProperties = { padding: '30px 0 44px', color: '#64748b', fontSize: 14, fontWeight: 700 }
const footerLink: React.CSSProperties = { color: 'inherit', textDecoration: 'none' }
