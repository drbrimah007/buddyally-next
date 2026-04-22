import Link from "next/link";

export default function Home() {
  return (
    <main className="h-screen w-full overflow-hidden relative bg-yellow-400">
      {/* Sunburst background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.6)_0%,rgba(255,200,0,1)_40%,rgba(255,180,0,1)_100%)]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
        {/* Logo */}
        <div className="text-3xl font-bold mb-6 tracking-tight">
          <span className="text-black">buddy</span>
          <span className="text-[#3293CB]">ally</span>
        </div>

        {/* Main text */}
        <h1 className="text-[56px] md:text-[110px] font-black leading-[0.9] tracking-tight">
          <span className="block text-black">WE DO</span>
          <span className="block text-pink-600">BUDDY</span>
          <span className="block text-black">ALLY</span>
        </h1>

        {/* Subline */}
        <div className="mt-4 text-xl md:text-3xl font-bold bg-black text-yellow-300 px-4 py-2 inline-block">
          THIS SUMMER
        </div>

        {/* Subtext */}
        <p className="mt-4 text-lg font-semibold text-black/70">
          Real people. Real help. Real activities.
        </p>

        {/* CTA */}
        <Link
          href="/explore"
          className="mt-10 bg-pink-600 text-white text-xl md:text-2xl font-bold px-10 py-5 rounded-2xl shadow-xl hover:scale-105 transition-transform inline-block"
        >
          LINK UP. DO MORE &rarr;
        </Link>

        {/* Secondary links */}
        <div className="mt-6 flex gap-6 text-sm font-semibold text-black/60">
          <Link href="/login" className="hover:text-black transition">Log In</Link>
          <Link href="/signup" className="hover:text-black transition">Sign Up Free</Link>
        </div>
      </div>
    </main>
  );
}
