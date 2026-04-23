'use client'

// Public Contact Codes landing / about page.
// Routes as /contact — a static segment that takes precedence over the
// dynamic [code]/page.tsx root catch-all, so this wins over the "code
// lookup" scan page when the path is literally "contact".
//
// At the top: a lookup input. Submitting routes to /CODE, which re-exports
// c/[code] and gives the exact same result as scanning a BuddyAlly QR.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const USE_CASES = [
  { icon: '💵', title: 'Cars for sale', text: 'Buyers ask questions without your number on the window.' },
  { icon: '🚗', title: 'Parked cars', text: 'Blocked driveway, bumps, tow risks — get warned fast.' },
  { icon: '👜', title: 'Lost items', text: 'Tag luggage, keys, gear so finders can reach you.' },
  { icon: '🛵', title: 'Bikes & e-mobility', text: 'E-bikes, scooters, motorcycles left on the street.' },
  { icon: '🐾', title: 'Pet tags', text: 'Lost pet? Neighbors message you without your number on the collar.' },
  { icon: '📦', title: 'Packages', text: 'Doormen, neighbors, couriers can reach you about deliveries.' },
]

export default function ContactCodesPage() {
  const router = useRouter()
  const [lookup, setLookup] = useState('')
  const [lookupError, setLookupError] = useState('')

  function submitLookup(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const raw = lookup.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (raw.length < 4 || raw.length > 8) {
      setLookupError('Enter a 4–8 character BuddyAlly code.')
      return
    }
    setLookupError('')
    // Same result as scanning a QR — root-level [code] route re-exports c/[code].
    router.push('/' + raw)
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root{--sky:#0284C7;--sky-hover:#0369A1;--sky-light:#E0F2FE;--sky-100:#BAE6FD;--emerald:#10B981;--emerald-50:#ECFDF5;--bg:#FFFFFF;--bg-soft:#F8FAFC;--text:#0F172A;--text-sec:#475569;--text-muted:#64748B;--border:#E2E8F0;--shadow-sm:0 1px 2px rgba(0,0,0,0.05);--shadow:0 4px 6px -1px rgba(0,0,0,0.07);--shadow-lg:0 10px 15px -3px rgba(0,0,0,0.08)}
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--text);background:var(--bg);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
        a{color:inherit;text-decoration:none}
        h1{font-size:clamp(2rem,4.5vw,3.1rem);font-weight:800;line-height:1.1;letter-spacing:-0.025em}
        h2{font-size:clamp(1.5rem,3vw,2.05rem);font-weight:700;line-height:1.2;letter-spacing:-0.015em}
        h3{font-weight:700}
        .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border-radius:16px;font-size:15px;font-weight:600;cursor:pointer;border:none;transition:all .15s ease;text-decoration:none}
        .btn-primary{background:var(--sky);color:#fff;box-shadow:0 4px 12px rgba(2,132,199,0.25)}
        .btn-primary:hover{background:var(--sky-hover);transform:translateY(-1px)}
        .btn-secondary{background:#fff;color:var(--text);border:1.5px solid var(--border)}
        .btn-secondary:hover{border-color:#94A3B8}
        .btn-sm{padding:8px 16px;font-size:13px;border-radius:12px}
        .nav-cc{position:sticky;top:0;z-index:50;backdrop-filter:blur(12px);background:rgba(255,255,255,0.92);border-bottom:1px solid var(--border)}
        .nav-cc .inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:14px 20px;gap:20px}
        .nav-cc .links{display:flex;align-items:center;gap:24px;font-size:14px;font-weight:500;color:var(--text-muted)}
        .nav-cc .links a:hover{color:var(--text)}
        .nav-cc .auth{display:flex;gap:10px;align-items:center}
        .container-cc{max-width:1000px;margin:0 auto;padding:0 20px}
        .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
        .lookup-form{display:flex;gap:10px;max-width:560px;margin:0 auto 6px;align-items:stretch}
        .lookup-input{flex:1;padding:14px 18px;border:1.5px solid var(--border);border-radius:14px;font:inherit;font-size:16px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;background:#fff;color:var(--text);transition:border-color .15s}
        .lookup-input:focus{outline:none;border-color:var(--sky);box-shadow:0 0 0 3px rgba(2,132,199,0.12)}
        .lookup-input::placeholder{letter-spacing:0;text-transform:none;font-weight:500;color:var(--text-muted)}
        .lookup-btn{padding:14px 22px;border-radius:14px;border:none;background:var(--sky);color:#fff;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 4px 12px rgba(2,132,199,0.25);white-space:nowrap;transition:background .15s}
        .lookup-btn:hover{background:var(--sky-hover)}
        .lookup-err{color:#991b1b;background:#fee2e2;border-radius:10px;padding:8px 12px;font-size:13px;max-width:560px;margin:0 auto}
        @media(max-width:768px){.grid-3{grid-template-columns:1fr}.grid-2{grid-template-columns:1fr}.nav-cc .links{display:none}.lookup-form{flex-direction:column}}
      `}} />

      {/* NAV */}
      <nav className="nav-cc">
        <div className="inner">
          <Link href="/home" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/buddyally-logo-full.png" alt="BuddyAlly" style={{ height: 26, width: 'auto' }} />
          </Link>
          <div className="links">
            <Link href="/home#how-it-works">How It Works</Link>
            <Link href="/home#trust-safety">Trust &amp; Safety</Link>
            <Link href="/contact" style={{ color: 'var(--sky)', fontWeight: 600 }}>Contact Codes</Link>
          </div>
          <div className="auth">
            <Link href="/login" className="btn btn-secondary btn-sm">Log In</Link>
            <Link href="/signup" className="btn btn-primary btn-sm">Sign Up Free</Link>
          </div>
        </div>
      </nav>

      {/* LOOKUP — "Have a code to contact? Enter here." */}
      <section style={{ padding: '28px 0 8px', background: 'linear-gradient(180deg, var(--bg-soft) 0%, #fff 100%)' }}>
        <div className="container-cc">
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--sky)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Have a code to contact?</p>
            <h3 style={{ fontSize: 20, fontWeight: 700 }}>Enter it here — same as scanning the QR.</h3>
          </div>
          <form className="lookup-form" onSubmit={submitLookup}>
            <input
              className="lookup-input"
              value={lookup}
              onChange={e => { setLookup(e.target.value); if (lookupError) setLookupError('') }}
              placeholder="e.g. AB72KQ"
              maxLength={12}
              autoComplete="off"
              spellCheck={false}
              aria-label="BuddyAlly code"
            />
            <button type="submit" className="lookup-btn">Contact owner →</button>
          </form>
          {lookupError && <div className="lookup-err">{lookupError}</div>}
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 10 }}>
            Just the 4–8 characters after <span style={{ fontFamily: 'SF Mono, Fira Code, monospace', color: 'var(--text)' }}>buddyally.com/</span>
          </p>
        </div>
      </section>

      {/* HERO */}
      <section style={{ padding: '40px 0 36px' }}>
        <div className="container-cc" style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, background: 'rgba(16,185,129,0.08)', color: 'var(--emerald)', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
            A BuddyAlly feature · Private contact for you and your things
          </div>
          <h1 style={{ maxWidth: '14ch', margin: '0 auto 16px' }}>Let people reach you fast — without giving out your number</h1>
          <p style={{ color: 'var(--text-sec)', fontSize: 17, maxWidth: 580, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Get a <strong>private contact page</strong>, QR code, and short BuddyAlly code for you, your car, bike, pet, lost items, packages, and property. Someone scans or types your code, sends a message, and you get notified instantly.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            <Link href="/signup" className="btn btn-primary">Create My Code</Link>
            <Link href="/dashboard/codes" className="btn btn-secondary">My Codes</Link>
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span><span style={{ color: 'var(--emerald)', fontWeight: 700 }}>✓</span> Push notifications</span>
            <span><span style={{ color: 'var(--emerald)', fontWeight: 700 }}>✓</span> Email delivery</span>
            <span>⏲ SMS coming soon</span>
          </div>
        </div>
      </section>

      {/* CODE EXPLAINER */}
      <section>
        <div className="container-cc">
          <div style={{ padding: '22px 24px', borderRadius: 22, background: 'linear-gradient(135deg,#fff 0%,var(--sky-light) 100%)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 60, height: 60, borderRadius: 12, background: '#0F172A', display: 'grid', placeItems: 'center' }}>
                <div style={{ width: 40, height: 40, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 2 }}>
                  {[1,1,1,0,1, 1,0,1,1,0, 1,1,1,0,1, 0,1,0,1,0, 1,1,1,0,1].map((on, i) => (
                    <span key={i} style={{ background: on ? '#fff' : 'transparent', borderRadius: 1 }} />
                  ))}
                </div>
              </div>
              <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>=</span>
              <div style={{ background: '#0F172A', color: '#fff', fontFamily: 'SF Mono, Fira Code, monospace', fontWeight: 700, letterSpacing: '0.12em', padding: '10px 14px', borderRadius: 12, fontSize: 16 }}>buddyally.com/AB72KQ</div>
            </div>
            <p style={{ flex: 1, minWidth: 260, color: 'var(--text-sec)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: 'var(--text)' }}>Two ways to reach you, zero friction.</strong> Scan the QR or type the short URL. No app needed. The link goes straight to the owner&apos;s private contact page.
            </p>
          </div>

          <div style={{ marginTop: 16, padding: '18px 24px', borderRadius: 16, background: '#0F172A', color: '#fff', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.2)', color: '#4ADE80', fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 999, letterSpacing: '0.04em' }}>✓ ID VERIFIED</span>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', flex: 1, minWidth: 260 }}>
              <strong style={{ color: '#fff' }}>Already a BuddyAlly member?</strong> Messages from other members arrive with their verified profile and star rating. Not a member? Sending a message is still free. No account required.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '40px 0' }}>
        <div className="container-cc">
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: 'var(--sky)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>How it works</div>
            <h2>Scan. Message. Get notified.</h2>
          </div>
          <div className="grid-3">
            {[
              { n: 1, t: 'Create your page', d: 'Name the item and get a QR code + short BuddyAlly code instantly.' },
              { n: 2, t: 'Place the code', d: "Windshield, bike frame, pet collar, luggage, mailbox — anywhere it's needed." },
              { n: 3, t: 'Get notified', d: 'Push and email are live. SMS coming soon. Your codes work forever.' },
            ].map(s => (
              <div key={s.n} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: 22, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--sky-light)', color: 'var(--sky)', display: 'grid', placeItems: 'center', fontWeight: 800, marginBottom: 14 }}>{s.n}</div>
                <h3 style={{ fontSize: 17, marginBottom: 6 }}>{s.t}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section style={{ padding: '0 0 40px' }}>
        <div className="container-cc">
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: 'var(--sky)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Use cases</div>
            <h2>Built for the moments when someone needs to reach you now.</h2>
          </div>
          <div className="grid-3" style={{ gap: 12 }}>
            {USE_CASES.map(u => (
              <div key={u.title} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>{u.icon}</div>
                <h3 style={{ fontSize: 16, marginBottom: 4 }}>{u.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{u.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE PREVIEW */}
      <section id="preview" style={{ padding: '0 0 40px' }}>
        <div className="container-cc">
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: 'var(--sky)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Live preview</div>
            <h2>Clear for the public. Useful for the owner.</h2>
          </div>
          <div style={{ background: 'linear-gradient(135deg,var(--sky-light) 0%,#fff 60%)', border: '1px solid var(--border)', borderRadius: 24, padding: 24 }}>
            <div className="grid-2">
              {/* Scanner side */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 18, padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sky)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>What the scanner sees</div>
                <div style={{ background: 'var(--bg-soft)', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Black e-bike on W 83rd St</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Message the owner about damage, towing, or a return.</div>
                </div>
                <div style={{ background: 'var(--bg-soft)', borderRadius: 10, padding: 10, fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>✍ Your name...</div>
                <div style={{ background: 'var(--bg-soft)', borderRadius: 10, padding: '10px 10px 30px', fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>What happened?</div>
                <div style={{ background: 'var(--sky)', color: '#fff', borderRadius: 12, padding: 10, textAlign: 'center', fontWeight: 600, fontSize: 14 }}>Send Message</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: 10, borderRadius: 10, background: 'var(--emerald-50)', fontSize: 12, color: '#065F46', fontWeight: 600 }}>
                  🛡 Phone and email stay private
                </div>
              </div>
              {/* Owner side */}
              <div style={{ background: '#0F172A', borderRadius: 18, padding: 18, color: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sky-100)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>What you see (dashboard)</div>
                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Street Parking Alert</div>
                  <div style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 13, color: 'var(--sky-100)', letterSpacing: '0.1em' }}>buddyally.com/AB72KQ</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(16,185,129,0.15)', color: '#4ADE80', fontSize: 11, fontWeight: 700 }}>Push: On</span>
                    <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(16,185,129,0.15)', color: '#4ADE80', fontSize: 11, fontWeight: 700 }}>Email: On</span>
                    <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(251,191,36,0.15)', color: '#FBBF24', fontSize: 11, fontWeight: 700 }}>SMS: Soon</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>RECENT MESSAGES</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,var(--sky),#5d92f6)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>M</div>
                    <div style={{ flex: 1, fontSize: 13 }}>Maya: &quot;Blocking the driveway...&quot;</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>2m</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#10B981,#34D399)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>C</div>
                    <div style={{ flex: 1, fontSize: 13 }}>Chris: &quot;Found your umbrella&quot;</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>1h</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '0 0 40px' }}>
        <div className="container-cc">
          <div style={{ background: 'linear-gradient(135deg,var(--sky-light) 0%,#fff 60%)', border: '1px solid var(--border)', borderRadius: 24, padding: 32, boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ marginBottom: 8 }}>Create a code for the things that matter</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Cars, bikes, luggage, pets, packages, property. One minute to set up.</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link href="/signup" className="btn btn-primary">Create My Code</Link>
              <Link href="/home" className="btn btn-secondary">Back to BuddyAlly</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '40px 20px 60px', marginTop: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
        <div>© 2026 BuddyAlly Contact · Made in New York</div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 12 }}>
          <Link href="/home" style={{ color: 'var(--sky)' }}>Home</Link>
          <Link href="/contact" style={{ color: 'var(--sky)' }}>Contact Codes</Link>
          <Link href="/privacy" style={{ color: 'var(--sky)' }}>Privacy</Link>
          <Link href="/terms" style={{ color: 'var(--sky)' }}>Terms</Link>
        </div>
      </footer>
    </>
  )
}
