import Link from "next/link";
import SafetyBanner from "@/components/SafetyBanner";

const FEATURED = [
  { title:'City walk & coffee', cat:'Local Activities', loc:'Portland, OR', date:'May 2', spots:'2 spots left', free:true, icon:'☕', host:{ name:'Sarah M.', photo:'S', rating:4.9, reviews:126, color:'#0284C7' }, desc:'Casual morning walk through downtown ending at a local coffee shop.' },
  { title:'Weekend trip to Boston', cat:'Travel', loc:'Boston, MA', date:'May 10-12', spots:'1 spot left', free:false, icon:'✈️', host:{ name:'Alex K.', photo:'A', rating:4.7, reviews:43, color:'#7C3AED' }, desc:'Looking for a travel buddy to split costs and explore the city together.' },
  { title:'Tennis for beginners', cat:'Sports / Play', loc:'Central Park, NYC', date:'May 5', spots:'1 spot left', free:true, icon:'🎾', host:{ name:'Jordan P.', photo:'J', rating:4.9, reviews:89, color:'#059669' }, desc:'Beginner-friendly session. All levels welcome, especially people just starting out.' },
  { title:'Spanish conversation', cat:'Learning', loc:'Online (Zoom)', date:'Every Thu', spots:'5 spots left', free:false, icon:'📚', host:{ name:'Maria L.', photo:'M', rating:5.0, reviews:201, color:'#DC2626' }, desc:'Weekly conversation group — native speakers and learners mix for real practice.' },
  { title:'Saturday morning hike', cat:'Outdoor', loc:'Griffith Park, LA', date:'May 6', spots:'4 spots left', free:true, icon:'⛰️', host:{ name:'Chris T.', photo:'C', rating:4.8, reviews:67, color:'#EA580C' }, desc:'Easy trail, great views, good company. Bring water and snacks.' },
  { title:'School run carpool partner', cat:'Help / Support', loc:'Maple Ridge, Vancouver', date:'Weekdays', spots:'Matched!', free:true, icon:'🚗', host:{ name:'John D.', photo:'J', rating:4.9, reviews:18, color:'#16A34A' }, desc:'Looking for a parent nearby heading to Westside Academy. Share the school run.' },
]

const TOP_BUDDIES = [
  { name:'Sarah Mitchell', photo:'S', color:'#0284C7', city:'Portland, OR', rating:4.9, reviews:126, activities:34, interests:['Local Activities','Outdoor','Wellness'], badges:['ID Verified','Top Rated','Trusted Host'] },
  { name:'Maria Lopez', photo:'M', color:'#DC2626', city:'Miami, FL', rating:5.0, reviews:201, activities:52, interests:['Learning','Travel','Events'], badges:['ID Verified','Top Rated','Trusted Host'] },
  { name:'Jordan Park', photo:'J', color:'#059669', city:'New York, NY', rating:4.9, reviews:89, activities:28, interests:['Sports / Play','Outdoor','Wellness'], badges:['ID Verified','Top Rated'] },
  { name:'Alex Kim', photo:'A', color:'#7C3AED', city:'Boston, MA', rating:4.7, reviews:43, activities:15, interests:['Travel','Gaming','Events'], badges:['ID Verified','Active Member'] },
  { name:'Chris Torres', photo:'C', color:'#EA580C', city:'Los Angeles, CA', rating:4.8, reviews:67, activities:22, interests:['Outdoor','Wellness','Sports / Play'], badges:['ID Verified','Top Rated'] },
  { name:'Taylor Reed', photo:'T', color:'#0891B2', city:'Austin, TX', rating:4.6, reviews:34, activities:18, interests:['Gaming','Events','Learning'], badges:['ID Verified','Active Member'] },
  { name:'Priya Sharma', photo:'P', color:'#BE185D', city:'Chicago, IL', rating:4.9, reviews:56, activities:31, interests:['Learning','Travel','Wellness'], badges:['ID Verified','Top Rated','Trusted Host'] },
  { name:'Marcus Johnson', photo:'M', color:'#4338CA', city:'Atlanta, GA', rating:4.7, reviews:45, activities:20, interests:['Sports / Play','Help / Support','Events'], badges:['ID Verified','Active Member'] },
]

const TRUST_ITEMS = [
  { title:'Government ID verification', text:'Users verify identity to build a safer, more trustworthy platform.' },
  { title:'Star ratings and reviews', text:'Ratings help members identify reliable, respectful, and safe people to meet.' },
  { title:'Profile badges', text:'Show trust signals like ID Verified, Phone Verified, and Top Rated.' },
  { title:'Report and block tools', text:'Members can quickly report bad behavior and block unsafe users.' },
]

const REASONS = ['Verified profiles','Travel companions','Local activity partners','Optional tipping, not pressure','Star ratings that build trust','Safer meetups and moderation']

export default function HomePage() {
  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: '#111827', background: '#fff', lineHeight: 1.6 }}>

      {/* Sticky nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E5E7EB', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flexShrink: 0 }}>
          <img src="/buddyally-logo-full.png" alt="BuddyAlly" style={{ height: 22, width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 13, fontWeight: 500, flexShrink: 1, minWidth: 0 }}>
          <a href="#how-it-works" style={{ color: '#4B5563', textDecoration: 'none' }}>How It Works</a>
          <a href="#trust-safety" style={{ color: '#4B5563', textDecoration: 'none' }}>Trust &amp; Safety</a>
          <Link href="/contact" style={{ color: '#3293CB', fontWeight: 600, textDecoration: 'none' }}>Contact Codes</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '5px 10px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#111827', textDecoration: 'none' }}>Log In</Link>
          <Link href="/signup" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '5px 10px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: 'none', background: '#3293CB', color: '#fff', textDecoration: 'none', boxShadow: '0 1px 3px rgba(50,147,203,0.3)' }}>Sign Up</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 100, padding: '100px 24px 80px', background: 'linear-gradient(180deg, #F9FAFB 0%, #fff 50%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 50, background: 'rgba(255,255,255,0.8)', border: '1px solid #E0F2FE', fontSize: 13, fontWeight: 600, color: '#3293CB', backdropFilter: 'blur(8px)', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
              BuddyAlly &bull; Trusted people, real activities
            </div>
            <h1 style={{ marginTop: 24, fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              Find your people. <span style={{ color: '#3293CB' }}>Do more together.</span>
            </h1>
            <p style={{ marginTop: 20, fontSize: 18, color: '#4B5563', maxWidth: 520, lineHeight: 1.7 }}>
              BuddyAlly helps people connect for travel, play, learning, local activities, and everyday adventures. Join for free, meet trusted people, and tip only when it feels right.
            </p>
            <div style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/signup" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', borderRadius: 14, fontSize: 15, fontWeight: 600, background: '#3293CB', color: '#fff', textDecoration: 'none', boxShadow: '0 1px 3px rgba(50,147,203,0.3)' }}>Find Buddies</Link>
              <Link href="/signup" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', borderRadius: 14, fontSize: 15, fontWeight: 600, background: '#fff', color: '#111827', border: '1px solid #E5E7EB', textDecoration: 'none' }}>Offer an Activity</Link>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 28 }}>
              {['Free to join','Government ID verification','Star ratings','Safer meetups'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#4B5563' }}>
                  <span style={{ color: '#059669', fontWeight: 700 }}>✓</span> {t}
                </div>
              ))}
            </div>
          </div>

          {/* Preview card — right column */}
          <div style={{ position: 'relative' }}>
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 28, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ background: '#F9FAFB', borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700 }}>Popular on BuddyAlly</p>
                    <p style={{ fontSize: 13, color: '#6B7280' }}>Real activities with trusted hosts</p>
                  </div>
                  <span style={{ background: '#059669', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>Live</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { title: 'City walk & coffee', loc: 'Portland, OR', host: 'Sarah M.', rating: 4.9, color: '#0284C7' },
                    { title: 'Weekend trip to Boston', loc: 'Boston, MA', host: 'Alex K.', rating: 4.7, color: '#7C3AED' },
                    { title: 'Tennis for beginners', loc: 'Central Park, NYC', host: 'Jordan P.', rating: 4.9, color: '#059669' },
                  ].map(a => (
                    <div key={a.title} style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #E5E7EB' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</p>
                          <p style={{ fontSize: 12, color: '#6B7280' }}>{a.loc}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: a.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{a.host[0]}</div>
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 600 }}>{a.host}</p>
                            <p style={{ fontSize: 10, color: '#6B7280' }}><span style={{ color: '#F59E0B' }}>★</span> {a.rating}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ borderRadius: 14, border: '1px solid #F3F4F6', background: '#F9FAFB', padding: '14px 16px', marginTop: 14 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>Trust signals matter</p>
                  <p style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>Look for Government ID Verified badges and strong star ratings before meeting.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3293CB', marginBottom: 12 }}>How it works</p>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>Simple, social, and safer</h2>
          <p style={{ fontSize: 18, color: '#4B5563', maxWidth: 640, margin: '0 auto 48px', lineHeight: 1.7 }}>BuddyAlly makes it easy to meet people around shared interests, with trust systems built in from the start.</p>
        </div>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {[
            { step: '01', title: 'Create your profile', text: 'Add your photo, interests, city, and activity preferences. Complete email, phone, and government ID verification to build trust.' },
            { step: '02', title: 'Browse or post activities', text: 'Find people for travel, learning, local adventures, sports, games, and everyday plans — or create your own activity and invite others.' },
            { step: '03', title: 'Meet safely and rate the experience', text: 'Chat first, meet with confidence, and leave a star rating after the activity so the community stays reliable and trustworthy.' },
          ].map(s => (
            <div key={s.step} style={{ borderRadius: 20, border: '1px solid #E5E7EB', background: '#fff', padding: 32, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#3293CB', marginBottom: 16 }}>{s.step}</p>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3, marginBottom: 12 }}>{s.title}</h3>
              <p style={{ fontSize: 15, color: '#4B5563', lineHeight: 1.7 }}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Activities */}
      <section id="featured-activities" style={{ padding: '80px 24px', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 36 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3293CB', marginBottom: 12 }}>Featured activities</p>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', fontWeight: 700, marginBottom: 8 }}>Happening now on BuddyAlly</h2>
              <p style={{ fontSize: 18, color: '#4B5563', marginTop: 8 }}>Real activities hosted by verified members. Join for free — tips are always optional.</p>
            </div>
            <Link href="/signup" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', borderRadius: 14, fontSize: 15, fontWeight: 600, background: '#3293CB', color: '#fff', textDecoration: 'none' }}>Browse All Activities</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURED.map(a => (
              <div key={a.title} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                <div style={{ height: 140, background: 'linear-gradient(135deg, #F3F4F6, #F9FAFB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>{a.icon}</div>
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600 }}>{a.title}</h3>
                    <span style={{ background: '#3293CB', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{a.cat}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>{a.loc} &bull; {a.date}</p>
                  <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6, marginBottom: 12 }}>{a.desc}</p>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    <span style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB' }}>{a.spots}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, ...(a.free ? { background: '#059669', color: '#fff' } : { background: '#D97706', color: '#fff' }) }}>{a.free ? 'Free' : 'Tips optional'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: a.host.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>{a.host.photo}</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{a.host.name}</p>
                      <p style={{ fontSize: 12, color: '#6B7280' }}><span style={{ color: '#F59E0B' }}>★</span> {a.host.rating} ({a.host.reviews})</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Buddies */}
      <section id="top-buddies" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3293CB', marginBottom: 12 }}>Top rated buddies</p>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', fontWeight: 700, marginBottom: 8 }}>Meet trusted members of the community</h2>
          <p style={{ fontSize: 18, color: '#4B5563', margin: '8px auto 36px', maxWidth: 640 }}>Star ratings and verification badges help you find reliable, respectful people to connect with.</p>
        </div>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {TOP_BUDDIES.map(b => (
            <div key={b.name} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 24, textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: b.color, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff' }}>{b.photo}</div>
              <p style={{ fontWeight: 600, fontSize: 15 }}>{b.name}</p>
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{b.city}</p>
              <p style={{ fontSize: 13, marginTop: 4 }}><span style={{ color: '#F59E0B' }}>★</span> {b.rating} ({b.reviews} reviews)</p>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{b.activities} activities</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
                {b.badges.map(badge => (
                  <span key={badge} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, ...(badge.includes('Verified') ? { background: '#059669', color: '#fff' } : badge === 'Top Rated' ? { background: '#D97706', color: '#fff' } : { background: '#3293CB', color: '#fff' }) }}>{badge}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Real Stories */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(170deg, #F0FDF4 0%, #fff 50%, #F0F9FF 100%)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3293CB', marginBottom: 12 }}>Real stories</p>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', fontWeight: 700, marginBottom: 8 }}>Connections that make life easier</h2>
          <p style={{ fontSize: 18, color: '#4B5563', margin: '8px auto 0', maxWidth: 640 }}>BuddyAlly isn&apos;t just for weekend adventures. It&apos;s for the everyday moments where having the right person nearby changes everything.</p>
        </div>
        {/* John & Jack story */}
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(22,163,106,0.09), rgba(2,132,199,0.09))', padding: '32px 32px 0', display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: -20 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#16A34A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, border: '3px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>J</div>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#0284C7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, border: '3px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginLeft: -16 }}>J</div>
              </div>
              <div style={{ flex: 1, minWidth: 200, paddingBottom: 24 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Featured Connection</p>
                <h3 style={{ fontSize: 20, marginTop: 4, fontWeight: 600 }}>John &amp; Jack — the school run buddies</h3>
              </div>
            </div>
            <div style={{ padding: 32 }}>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: '#4B5563', marginBottom: 20 }}>John and Jack are both dads with kids at Westside Academy — a 25-minute drive each way. They didn&apos;t know each other, but they were both making that long drive twice a day, five days a week.</p>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: '#4B5563', marginBottom: 20 }}>They found each other on BuddyAlly through a &quot;School Run Carpool&quot; activity post. Turns out they live three streets apart. Now they split the commute — <strong style={{ color: '#111827' }}>John handles morning drop-offs, Jack handles afternoon pickups.</strong></p>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: '#4B5563', marginBottom: 24 }}>Each of them got back <strong style={{ color: '#111827' }}>over an hour a day.</strong> The kids became friends. The families started having weekend barbecues. What started as a carpool became a real friendship.</p>

              {/* Profile cards */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                {[
                  { name: 'John D.', photo: 'J', color: '#16A34A', rating: 4.9, reviews: 18, badges: ['ID Verified', 'Trusted Host'] },
                  { name: 'Jack M.', photo: 'J', color: '#0284C7', rating: 4.8, reviews: 14, badges: ['ID Verified', 'Active Member'] },
                ].map(p => (
                  <div key={p.name} style={{ flex: 1, minWidth: 180, background: '#F9FAFB', borderRadius: 14, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: p.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>{p.photo}</div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 13 }}><span style={{ color: '#F59E0B' }}>★</span> <strong>{p.rating}</strong> <span style={{ color: '#6B7280' }}>({p.reviews})</span></div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {p.badges.map(b => (
                        <span key={b} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, ...(b.includes('Verified') ? { background: '#059669', color: '#fff' } : { background: '#3293CB', color: '#fff' }) }}>{b}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderRadius: 14, border: '1px solid #F3F4F6', background: '#F9FAFB', padding: '16px 20px' }}>
                <p style={{ fontSize: 14, lineHeight: 1.6 }}><strong>&quot;We were both burning an hour a day on the same drive and didn&apos;t even know it. BuddyAlly matched us in a day. Now the kids are best friends and we&apos;ve got our mornings back.&quot;</strong> <span style={{ color: '#6B7280' }}>— John D., Maple Ridge</span></p>
              </div>
            </div>
          </div>
        </div>
        {/* More stories */}
        <div style={{ maxWidth: 1200, margin: '32px auto 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {[
            { text: '"I moved to a new city and didn\'t know anyone. Found a hiking group on BuddyAlly my first weekend — now I have a whole friend group."', name: 'Lisa W.', photo: 'L', color: '#EA580C', rating: 4.7, reviews: 22, borderColor: '#3293CB' },
            { text: '"As a solo traveler, finding verified travel buddies changed everything. I\'ve done three trips with people I met here. All great experiences."', name: 'Raj P.', photo: 'R', color: '#7C3AED', rating: 4.9, reviews: 31, borderColor: '#059669' },
            { text: '"My daughter needed a study partner for AP Physics. Found one through BuddyAlly\'s Learning section — both kids aced the exam."', name: 'Diana K.', photo: 'D', color: '#BE185D', rating: 5.0, reviews: 9, borderColor: '#D97706' },
          ].map(s => (
            <div key={s.name} style={{ background: '#fff', border: '1px solid #E5E7EB', borderLeft: `4px solid ${s.borderColor}`, borderRadius: 16, padding: 24, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#4B5563', marginBottom: 12 }}>{s.text}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{s.photo}</div>
                <div><p style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</p><p style={{ fontSize: 12 }}><span style={{ color: '#F59E0B' }}>★</span> {s.rating} <span style={{ color: '#6B7280' }}>({s.reviews} reviews)</span></p></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust & Safety */}
      <section id="trust-safety" style={{ padding: '80px 24px', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32, alignItems: 'start' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3293CB', marginBottom: 12 }}>Trust and safety</p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', fontWeight: 700, marginBottom: 16 }}>Safety is part of the product, not an afterthought</h2>
            <p style={{ fontSize: 18, color: '#4B5563', maxWidth: 640, lineHeight: 1.7 }}>BuddyAlly uses government ID verification, profile badges, star ratings, reviews, and reporting tools to help people feel safer before connecting in real life.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {TRUST_ITEMS.map(t => (
              <div key={t.title} style={{ borderRadius: 16, border: '1px solid #E5E7EB', background: '#fff', padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{t.title}</h3>
                <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6 }}>{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why BuddyAlly — dark section */}
      <section id="why" style={{ background: '#111827', color: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32, alignItems: 'start' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#E0F2FE', marginBottom: 12 }}>Why BuddyAlly</p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', fontWeight: 700, marginBottom: 20 }}>Built for real connection, not endless scrolling</h2>
            <p style={{ fontSize: 18, color: '#94A3B8', lineHeight: 1.7, maxWidth: 520 }}>Most platforms are either too transactional, too social, or too vague. BuddyAlly is designed to help people actually do things together—with trust, ratings, and verification supporting every connection.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {REASONS.map(r => (
              <div key={r} style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', padding: 20, color: '#E2E8F0', backdropFilter: 'blur(8px)', fontSize: 15, fontWeight: 500 }}>{r}</div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ borderRadius: 20, background: '#3293CB', padding: '48px 32px', color: '#fff', boxShadow: '0 4px 12px rgba(50,147,203,0.25)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', fontWeight: 700, marginBottom: 12, color: '#fff' }}>Start building your next adventure</h2>
                <p style={{ fontSize: 17, maxWidth: 560, color: 'rgba(255,255,255,0.9)' }}>Join BuddyAlly to meet people for travel, play, help, and meaningful shared experiences — with verified profiles and trusted ratings.</p>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/signup" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', borderRadius: 14, fontSize: 15, fontWeight: 700, background: '#fff', color: '#3293CB', textDecoration: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>Join Free</Link>
                <a href="#how-it-works" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', borderRadius: 14, fontSize: 15, fontWeight: 600, background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.5)', textDecoration: 'none' }}>See How It Works</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Codes section */}
      <section id="contact-codes" style={{ padding: '0 24px 40px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3293CB', marginBottom: 12 }}>BuddyAlly Connect</p>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', fontWeight: 700, marginBottom: 8 }}>Contact Codes for your car, pet, or property</h2>
          <p style={{ fontSize: 18, color: '#4B5563' }}>Generate a unique code. Anyone can scan it to reach you — without seeing your number.</p>
        </div>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
          {['Parked Car','Car for Sale','Lost Item','Pet Tag','Package','Property'].map(t => (
            <span key={t} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 999, padding: '8px 16px', fontSize: 14, fontWeight: 600 }}>{t}</span>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link href="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 14, fontSize: 15, fontWeight: 600, background: '#3293CB', color: '#fff', textDecoration: 'none', boxShadow: '0 1px 3px rgba(50,147,203,0.3)' }}>Learn more about Contact Codes →</Link>
        </div>
      </section>

      {/* Safety + trust-badges explainer + link to /trust-and-safety —
          unified via shared SafetyBanner component. */}
      <section style={{ padding: '0 24px 40px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <SafetyBanner />
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#111827', color: '#94A3B8', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>BuddyAlly</p>
          <p style={{ fontSize: 14 }}>Find your people. Do more together.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20, fontSize: 13 }}>
            <Link href="/contact" style={{ color: '#94A3B8', textDecoration: 'none' }}>Contact Codes</Link>
            <a href="#trust-safety" style={{ color: '#94A3B8', textDecoration: 'none' }}>Safety</a>
            <Link href="/privacy" style={{ color: '#94A3B8', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms" style={{ color: '#94A3B8', textDecoration: 'none' }}>Terms</Link>
          </div>
          <p style={{ marginTop: 20, fontSize: 12, color: '#64748B' }}>&copy; 2026 BuddyAlly. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
