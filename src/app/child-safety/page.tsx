// Child Safety Standards — required public page for any social-category
// app on Google Play (and a baseline expectation for any platform that
// hosts user-generated content involving real-world introductions).
//
// Google's Play Console "Child Safety Standards" declaration form needs
// a publicly accessible URL pointing here, plus a CSAE (Child Sexual
// Abuse and Exploitation) contact email. This page satisfies both.
//
// Content guidelines we follow:
//   • Zero tolerance for CSAM / CSAE — explicit statement
//   • Minimum age (13+) and how we enforce it
//   • Reporting paths: in-app + direct email
//   • What we do with reports (cooperation w/ NCMEC, IWF, regional bodies)
//   • Moderation and proactive prevention practices
//   • Direct contact for child safety reports
//
// This page is intentionally plain and serious in tone — no marketing.

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Child Safety Standards · BuddyAlly',
  description:
    'BuddyAlly\'s zero-tolerance commitment to child safety, anti-CSAE practices, reporting mechanisms, and compliance with applicable laws.',
  alternates: { canonical: 'https://buddyally.com/child-safety' },
  robots: { index: true, follow: true },
}

const REPORT_EMAIL = 'safety@buddyally.com'

export default function ChildSafetyPage() {
  return (
    <div style={wrap}>
      <header style={{ marginBottom: 40 }}>
        <Link href="/" style={back}>← Home</Link>
        <p style={kicker}>Policy</p>
        <h1 style={h1}>Child Safety Standards</h1>
        <p style={sub}>
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </header>

      <Section title="Our commitment">
        <p style={p}>
          BuddyAlly has a <b>zero-tolerance policy</b> for child sexual abuse
          and exploitation (CSAE). We do not allow content, behavior, or
          accounts that sexualize minors, facilitate the grooming or
          exploitation of children, or attempt to share, request, or
          distribute child sexual abuse material (CSAM) in any form.
        </p>
        <p style={p}>
          We take immediate action — including permanent bans, content
          removal, preservation of evidence, and reports to the appropriate
          authorities — whenever we detect or are notified of such activity.
        </p>
      </Section>

      <Section title="Minimum age">
        <p style={p}>
          BuddyAlly is intended for users <b>13 years of age and older</b>.
          We do not knowingly collect personal information from anyone under
          13. Users in jurisdictions with a higher minimum age for digital
          consent (e.g. 16 in parts of the EU under GDPR) must meet their
          local requirement.
        </p>
        <p style={p}>
          If we learn that an account belongs to someone under 13, we will
          remove the account and any associated data. Parents and guardians
          who believe their child has registered without permission can
          email <a href={`mailto:${REPORT_EMAIL}`} style={link}>{REPORT_EMAIL}</a> for
          immediate removal.
        </p>
      </Section>

      <Section title="How to report a child safety concern">
        <p style={p}>
          If you encounter content, a profile, or behavior on BuddyAlly that
          you believe sexualizes, endangers, or exploits a minor, please
          report it immediately through any of the following channels:
        </p>
        <ul style={ul}>
          <li><b>In-app:</b> Tap the ⋯ menu on any profile, activity, message, or post → <b>Report</b> → choose <b>Child safety</b> as the category.</li>
          <li><b>Email:</b> <a href={`mailto:${REPORT_EMAIL}`} style={link}>{REPORT_EMAIL}</a> — monitored 7 days a week. Reports involving imminent harm to a child are escalated immediately.</li>
          <li><b>If a child is in immediate danger,</b> contact your local law enforcement first, then notify us so we can preserve evidence and assist any investigation.</li>
        </ul>
        <p style={p}>
          You do not need to be a member of BuddyAlly to send a report. Reports
          can be anonymous, but providing your contact information helps us
          follow up if we need clarification.
        </p>
      </Section>

      <Section title="What happens after a report">
        <p style={p}>
          Every child-safety report is reviewed by a member of our trust &amp;
          safety team. When we confirm a violation we:
        </p>
        <ul style={ul}>
          <li>Permanently remove the offending content and ban the account.</li>
          <li>Preserve relevant logs and metadata as evidence in a secure, restricted store.</li>
          <li>Where applicable, report apparent CSAM to the <b>National Center for Missing &amp; Exploited Children (NCMEC)</b> in the United States, the <b>Internet Watch Foundation (IWF)</b> in the United Kingdom, and equivalent national bodies in other jurisdictions.</li>
          <li>Cooperate fully with lawful requests from law enforcement.</li>
        </ul>
      </Section>

      <Section title="Proactive prevention">
        <p style={p}>
          BuddyAlly combines automated and human review to reduce the risk
          of harm before it reaches users:
        </p>
        <ul style={ul}>
          <li><b>Account verification:</b> Optional selfie verification, email verification, and phone verification create accountability around real-world identity.</li>
          <li><b>Buddy Line lineage:</b> Invite-based accounts are tied to the trust chain that brought them in, deterring the creation of throwaway abusive accounts.</li>
          <li><b>Image moderation:</b> Uploaded photos are screened for known CSAM signatures and obviously inappropriate content. Confirmed matches are removed automatically and reported.</li>
          <li><b>Keyword and behavior signals:</b> Patterns associated with grooming, age-misrepresentation, and exploitation trigger account flags for human review.</li>
          <li><b>Reporting affordances:</b> Every profile, message, activity, and post has a one-tap report flow that includes a child-safety category, surfaced to reviewers as high-priority.</li>
          <li><b>Block &amp; ignore:</b> Users can block or hide any other user at any time; blocked users cannot see, message, or interact with the blocking user.</li>
        </ul>
      </Section>

      <Section title="Compliance with applicable laws">
        <p style={p}>
          BuddyAlly complies with all applicable child safety laws in the
          jurisdictions where the service is offered, including but not
          limited to the U.S. Children&apos;s Online Privacy Protection Act
          (COPPA), 18 U.S.C. § 2258A reporting obligations, the U.K. Online
          Safety Act 2023, the EU Digital Services Act (DSA), and the
          relevant provisions of the U.N. Convention on the Rights of the
          Child. We report apparent CSAM to NCMEC and equivalent national
          bodies as required.
        </p>
      </Section>

      <Section title="Contact for child safety">
        <p style={p}>
          For all child-safety matters — reports, questions, parental
          requests, law-enforcement preservation requests — contact:
        </p>
        <p style={contactBlock}>
          <b>BuddyAlly Trust &amp; Safety</b><br/>
          <a href={`mailto:${REPORT_EMAIL}`} style={link}>{REPORT_EMAIL}</a><br/>
          We aim to respond within 24 hours, and within 1 hour for matters
          involving immediate risk to a child.
        </p>
      </Section>

      <footer style={{ marginTop: 60, paddingTop: 24, borderTop: '1px solid #E5E7EB', color: '#6B7280', fontSize: 13 }}>
        <Link href="/trust-and-safety" style={link}>Trust &amp; Safety overview</Link>
        {' · '}<Link href="/privacy" style={link}>Privacy</Link>
        {' · '}<Link href="/terms" style={link}>Terms</Link>
        {' · '}<Link href="/contact" style={link}>Contact</Link>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={h2}>{title}</h2>
      {children}
    </section>
  )
}

const wrap: React.CSSProperties = { maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px', color: '#111827', fontFamily: "'Inter', -apple-system, sans-serif" }
const back: React.CSSProperties = { color: '#3293CB', fontWeight: 700, fontSize: 13, textDecoration: 'none' }
const kicker: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: '#3293CB', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '20px 0 8px' }
const h1: React.CSSProperties = { fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 8px' }
const h2: React.CSSProperties = { fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em', marginTop: 28, marginBottom: 12 }
const sub: React.CSSProperties = { color: '#6B7280', fontSize: 13, margin: 0 }
const p: React.CSSProperties = { fontSize: 15, lineHeight: 1.7, color: '#374151', margin: '0 0 14px' }
const ul: React.CSSProperties = { fontSize: 15, lineHeight: 1.85, color: '#374151', paddingLeft: 22, margin: '0 0 14px' }
const link: React.CSSProperties = { color: '#3293CB', fontWeight: 600, textDecoration: 'none' }
const contactBlock: React.CSSProperties = { fontSize: 15, lineHeight: 1.8, color: '#374151', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px' }
