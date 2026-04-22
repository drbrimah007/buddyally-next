import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-[#111]">
      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-5 py-3">
          <Link href="/">
            <img src="/buddyally-logo-full.png" alt="BuddyAlly" style={{ height: 34 }} />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-bold text-gray-700 hover:text-[#3293CB]">Log In</Link>
            <Link href="/signup" className="bg-[#3293CB] text-white text-sm font-bold px-4 py-2 rounded-xl">Sign Up</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Find Your People.<br />Do More Together.</h1>
        <p className="text-lg text-gray-700 max-w-xl mx-auto mb-8">
          Connect for travel, sports, learning, local activities, and everyday adventures. Verified profiles. Safer meetups. Optional tips.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/signup" className="bg-[#ff0a8a] text-white font-bold text-lg px-8 py-3.5 rounded-2xl shadow-lg">Get Started Free</Link>
          <Link href="/dashboard" className="border-2 border-gray-200 font-bold text-lg px-8 py-3.5 rounded-2xl">Explore Activities</Link>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="text-2xl font-black mb-6 text-center">What can you do on BuddyAlly?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[
              { emoji: "✈️", label: "Travel" },
              { emoji: "🏃", label: "Sports / Play" },
              { emoji: "📚", label: "Learning" },
              { emoji: "🤝", label: "Help / Support" },
              { emoji: "🎉", label: "Events" },
              { emoji: "🚗", label: "Ride Share" },
              { emoji: "🐕", label: "Dog Walk" },
              { emoji: "👶", label: "Babysit" },
              { emoji: "🎊", label: "Party" },
              { emoji: "🙏", label: "Pray" },
            ].map(cat => (
              <div key={cat.label} className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-sm">
                <div className="text-2xl mb-1">{cat.emoji}</div>
                <div className="text-sm font-bold">{cat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="text-2xl font-black mb-8 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Sign Up", desc: "Create your profile, pick your interests, verify your identity." },
              { step: "2", title: "Find Activities", desc: "Browse nearby activities or create your own. Set location, time, and group size." },
              { step: "3", title: "Link Up", desc: "Join activities, message people, meet up, and do more together." },
            ].map(s => (
              <div key={s.step} className="bg-gray-50 rounded-2xl p-6 text-center">
                <div className="w-10 h-10 bg-[#3293CB] text-white font-black text-lg rounded-full flex items-center justify-center mx-auto mb-3">{s.step}</div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-gray-700">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Codes */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <h2 className="text-2xl font-black mb-3">BuddyAlly Contact Codes</h2>
          <p className="text-gray-700 max-w-xl mx-auto mb-6">
            Generate a unique code for your car, property, pet, or package. Anyone can scan it to reach you — without seeing your number.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Parked Car", "Car for Sale", "Lost Item", "Pet Tag", "Package", "Property"].map(t => (
              <span key={t} className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-bold">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <h2 className="text-3xl font-black mb-4">Ready to link up?</h2>
        <Link href="/signup" className="inline-block bg-[#ff0a8a] text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-lg">Join BuddyAlly Free</Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <img src="/buddyally-logo-full.png" alt="BuddyAlly" style={{ height: 28 }} />
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-[#3293CB]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#3293CB]">Terms</Link>
          </div>
          <span>&copy; 2026 BuddyAlly</span>
        </div>
      </footer>
    </div>
  );
}
