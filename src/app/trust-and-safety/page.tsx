// Trust & Safety section. Linked from:
//   • TrustBadges summary sheet ("Learn more about Trust & Safety →")
//   • Profile / settings menu
//   • Site footer
//   • Each badge tooltip's "Learn more" affordance
//
// The "Why Buddy Line exists" copy block is load-bearing per spec — it
// appears verbatim and must not be edited without spec sign-off.

import Link from 'next/link'
import type { Metadata } from 'next'

// Full social-share metadata. Without the openGraph + twitter blocks,
// shares of /trust-and-safety inherited the root layout's OG (BuddyAlly
// home) and lost the page's purpose. With them, WhatsApp / iMessage /
// Slack / X / LinkedIn previews show the real headline + description.
const SHARE_TITLE = 'Trust & Safety on BuddyAlly'
const SHARE_DESCRIPTION =
  'How BuddyAlly trust works: Buddy Verified (email + phone + selfie liveness), Buddy Line (joined through a trusted invite path), ID Verified (third-party identity check), plus how reporting and moderation run.'
const SHARE_URL = 'https://buddyally.com/trust-and-safety'

export const metadata: Metadata = {
  title: 'Trust & Safety — BuddyAlly',
  description: SHARE_DESCRIPTION,
  keywords: [
    'BuddyAlly Trust & Safety',
    'Buddy Verified',
    'Buddy Line',
    'ID Verified',
    'BuddyAlly safety',
    'verified profiles',
    'trusted invite path',
  ],
  alternates: { canonical: SHARE_URL },
  openGraph: {
    type: 'website',
    url: SHARE_URL,
    siteName: 'BuddyAlly',
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BuddyAlly Trust & Safety' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
}

export default function TrustAndSafetyPage() {
  return (
    <div style={page}>
      <div style={wrap}>
        <Link href="/" style={back}>← Home</Link>

        <header style={{ marginBottom: 32 }}>
          <p style={kicker}>Trust &amp; Safety</p>
          <h1 style={h1}>How trust works on BuddyAlly</h1>
          <p style={lead}>
            BuddyAlly is built around real meet-ups, real rides, and real help between
            people. Three trust signals help you know who you&apos;re coordinating with
            before you do anything offline.
          </p>
        </header>

        {/* Order is intentional and matches the badge order everywhere
            else: Buddy Verified → Buddy Line → ID Verified. */}

        <Section
          eyebrow="✔ Earned"
          title="Buddy Verified"
          subtitle="Email, phone (SMS or WhatsApp), and selfie liveness all confirmed."
        >
          <p>
            Buddy Verified means a member has completed three checks: their email
            address is confirmed, their phone number is confirmed via a one-time
            code over SMS or WhatsApp, and a short on-device selfie liveness
            confirms a real human is behind the account. None of the data is
            shared publicly, and the whole flow is free.
          </p>
          <p style={small}>
            How to get it: from your profile, open <em>Verifications</em> and
            complete each step — email confirmation, phone code, and the short
            selfie liveness prompt.
          </p>
        </Section>

        <Section
          eyebrow="◎ Network trust"
          title="Buddy Line"
          subtitle="Joined through a trusted invite path."
        >
          {/* VERBATIM per spec §8.3 — do not edit without sign-off. */}
          <p>
            Buddy Line shows a member joined through a trusted invitation path.
            Invite identities stay private.
          </p>
          <p style={{ ...sub, marginTop: 14 }}>Why Buddy Line exists</p>
          <p>
            Buddy Line helps strengthen trust by showing whether someone joined
            through existing human connections, while keeping those connections private.
          </p>
          <p style={small}>
            Buddy Line is a core trust layer, not a cosmetic badge. We never show
            who invited whom, and we never display trust depth or chain length —
            on the badge or anywhere else.
          </p>
        </Section>

        <Section
          eyebrow="🛡 Optional"
          title="ID Verified"
          subtitle="Identity confirmed through secure ID verification."
        >
          <p>
            ID Verified is an optional, paid identity check provided by a third
            party. It is extra assurance — not a requirement to use BuddyAlly,
            and not a substitute for using good judgement.
          </p>
          <p style={small}>
            Provider: Stripe Identity (or a comparable verified-identity service).
            BuddyAlly does not store your ID image — only the pass/fail status and
            the timestamp of verification.
          </p>
        </Section>

        <Section
          eyebrow="🚩 Got a problem?"
          title="Reporting &amp; moderation"
          subtitle="Tell us, and a real human reviews it."
        >
          <p>
            Use the <strong>Report</strong> button on any profile, activity, or
            message. Reports go into a moderation queue reviewed by our team —
            not automatic systems alone. Urgent safety situations should also be
            reported to your local emergency services.
          </p>
          <p style={small}>
            What we look at: the report itself, the reported account&rsquo;s history,
            the reporter&rsquo;s history (to filter retaliation patterns), and any
            related signals. We never share who filed a report with the person reported.
          </p>
        </Section>

        <Section
          eyebrow="🔒 Behind the scenes"
          title="How trust protections work"
          subtitle="High-level overview, no scoring exposed."
        >
          <p>
            BuddyAlly uses a mix of automated signals and human review to surface
            risky behavior — patterns of spam, abuse, fraudulent invites, and
            harassment. None of these signals are visible to other members; we
            don&rsquo;t publish reputation numbers, ranks, or tiers.
          </p>
          <p style={small}>
            We also limit what one account can do at a time (rate limits on
            messages, invites, group joins) to keep the platform feeling like
            a community, not a marketing channel.
          </p>
        </Section>

        <p style={footer}>
          Have a question or a concern? <Link href="/contact" style={link}>Contact us</Link>.
        </p>
      </div>
    </div>
  )
}

function Section({
  eyebrow, title, subtitle, children,
}: {
  eyebrow: string; title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <section style={section}>
      <p style={kicker}>{eyebrow}</p>
      <h2 style={h2}>{title}</h2>
      <p style={subline} dangerouslySetInnerHTML={{ __html: subtitle }} />
      <div style={body}>{children}</div>
    </section>
  )
}

// ─── Styles ───────────────────────────────────────────────────────
const page: React.CSSProperties = { background: '#fff', color: '#111827', minHeight: '100vh' }
const wrap: React.CSSProperties = { maxWidth: 760, margin: '0 auto', padding: '24px 20px 80px' }
const back: React.CSSProperties = { display: 'inline-block', color: '#3293CB', fontWeight: 700, fontSize: 13, textDecoration: 'none', marginBottom: 24 }
const kicker: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: '#3293CB', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 8px' }
const h1: React.CSSProperties = { fontSize: 'clamp(30px, 4.5vw, 44px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.05, margin: '0 0 12px' }
const lead: React.CSSProperties = { fontSize: 16, lineHeight: 1.7, color: '#4B5563', margin: 0 }
const section: React.CSSProperties = { padding: '28px 0', borderTop: '1px solid #E5E7EB' }
const h2: React.CSSProperties = { fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px' }
const subline: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#6B7280', margin: '0 0 14px' }
const body: React.CSSProperties = { fontSize: 14, lineHeight: 1.75, color: '#374151' }
const small: React.CSSProperties = { fontSize: 13, color: '#6B7280', marginTop: 12 }
const sub: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: '#111827', marginTop: 12 }
const footer: React.CSSProperties = { marginTop: 28, paddingTop: 16, borderTop: '1px solid #E5E7EB', fontSize: 13, color: '#6B7280' }
const link: React.CSSProperties = { color: '#3293CB', fontWeight: 700, textDecoration: 'none' }
