"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

type Bubble = {
  text: string;
  className: string;
  type: "ride" | "package" | "event" | "help";
  author?: string;
};

const bubbles: Bubble[] = [
  { type: "ride", text: "Driving Houston → Austin Friday 6pm. Three seats open, splitting gas.", className: "left-[12%] top-[12%] max-w-[18rem] scale-[1.12] z-20" },
  { type: "ride", text: "NYC → Philly Friday evening. Two open seats.", className: "left-[38%] top-[20%] max-w-[15rem] z-10" },
  { type: "package", text: "Flying Miami → Santo Domingo Sunday. Space for a small parcel.", className: "right-[38%] top-[4%] max-w-[16rem] scale-[1.11] z-20" },
  { type: "package", text: "Packages — someone's coming or going. Link in.", className: "right-[16%] top-[20%] max-w-[15rem] z-10" },
  { type: "event", text: "Extra concert ticket tonight in Bushwick. Free to a good ear.", className: "left-[12%] bottom-[32%] max-w-[16rem] z-10" },
  { type: "help", text: "Hey neighbor — your pipe is leaking. I can take a look this afternoon.", className: "left-[16%] bottom-[12%] max-w-[17rem] scale-[1.04] z-20" },
  { type: "ride", text: "Anyone coming from Texas this week? Open room for one bag.", className: "right-[24%] bottom-[8%] max-w-[16rem] z-10" },
  { type: "event", text: "Block party down the street tonight. Pull up.", className: "right-[10%] top-[36%] max-w-[14rem] z-10" },
  { type: "help", text: "Dog sitter available this weekend in Crown Heights.", className: "left-[10%] bottom-[47%] max-w-[14rem] z-10" },
  { type: "help", text: "Can teach beginner tennis Saturday morning. Kids welcome.", className: "right-[4%] top-[52%] max-w-[16rem] z-10" },
];

export default function BuddyallyPostSplashLanding() {
  return (
    <main className="min-h-screen bg-[#f5f6f8] text-slate-900">
      <section className="relative overflow-hidden border-b border-black/5 bg-white">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-14">
          <div className="mb-8 flex items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="text-balance text-5xl font-black tracking-[-0.06em] text-slate-950 sm:text-6xl lg:text-7xl">
                What&apos;s going on?
              </div>
              <div className="mt-2 text-[clamp(3rem,8vw,6rem)] font-black leading-none tracking-[-0.09em]">
                <span className="text-black">buddy</span><span className="text-[#3293cb]">ally</span>
              </div>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Link into rides, packages, events, and help already in motion across cities and neighborhoods.
              </p>
            </div>

            <a
              href="/dashboard"
              className="shrink-0 items-center gap-2 rounded-2xl bg-[#3293cb] px-6 py-4 text-base font-black uppercase tracking-[-0.02em] text-white shadow-[0_18px_40px_rgba(50,147,203,0.28)] md:inline-flex"
            >
              Link Up. Do More.
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>

          <div className="relative mt-10 h-[44rem] overflow-hidden rounded-[2rem] border border-black/5 bg-[#f3efe8] lg:block">
            <div className="absolute right-6 top-5 flex items-center gap-4 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 backdrop-blur-sm">
              <span>Filter:</span>
              <span className="text-slate-900">All</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />Ride</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" />Package</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Event</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Help</span>
            </div>

            <div className="absolute left-1/2 top-1/2 z-30 w-[34rem] -translate-x-1/2 -translate-y-[34%] text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.38em] text-slate-400">What&apos;s going on?</div>
              <div className="mt-3 text-[4.7rem] font-black leading-[0.9] tracking-[-0.08em] text-black">Someone&apos;s</div>
              <div className="-mt-2 text-[4.35rem] font-black leading-[0.86] tracking-[-0.08em] text-[#3293cb]">going your</div>
              <div className="-mt-2 text-[4.35rem] font-black leading-[0.86] tracking-[-0.08em] text-[#3293cb]">way.</div>
              <div className="mt-2 text-[1.1rem] font-bold uppercase tracking-[0.22em] text-slate-500">Don&apos;t pay for it.</div>
            </div>

            {bubbles.map((bubble, index) => {
              const colorMap = {
                ride: "bg-[#3293cb]",
                package: "bg-[#8b5cf6]",
                event: "bg-[#ef4444]",
                help: "bg-[#22c55e]",
              } as const;

              const authorMap = ["Naya", "Chen", "Devon", "Aisha", "Priya", "James", "Rae", "Milo", "Jules", "Jordan"];

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                  className={`absolute ${bubble.className}`}
                  style={{ willChange: "transform" }}
                >
                  <motion.div
                    animate={{ y: [0, -6, 0], rotate: index % 2 === 0 ? [0, -0.6, 0] : [0, 0.6, 0] }}
                    transition={{ duration: 4.6 + index * 0.22, repeat: Infinity, ease: "easeInOut" }}
                    className={`rounded-[1.15rem] border border-black/5 bg-white ${bubble.type === "package" && index === 2 ? "pl-4 pr-0 py-4" : "px-4 py-4"} shadow-[0_6px_18px_rgba(15,23,42,0.06)]`}>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">
                      <span className={`h-2 w-2 rounded-full ${colorMap[bubble.type]}`} />
                      <span className={bubble.type === "ride" ? "text-[#3293cb]" : bubble.type === "package" ? "text-[#8b5cf6]" : bubble.type === "event" ? "text-[#ef4444]" : "text-[#22c55e]"}>{bubble.type}</span>
                      <span>·</span>
                      <span>{authorMap[index % authorMap.length]}</span>
                    </div>
                    <div className="mt-2 text-[1.02rem] leading-7 text-slate-900">{bubble.text}</div>
                  </motion.div>
                </motion.div>
              );
            })}

            <div className="absolute bottom-2 left-1/2 z-10 w-[28rem] -translate-x-1/2 rounded-full border border-black/10 bg-white/85 px-5 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="truncate text-lg text-slate-400">I&apos;m driving to Philly Friday...</div>
                <button className="rounded-full bg-[#d9d3c8] px-5 py-2 text-sm font-bold text-white">Post</button>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-6 max-w-3xl text-center">
            <p className="text-base font-medium leading-7 text-slate-600">
              Rides, packages, events, help — already in motion.
            </p>
          </div>

          <div className="mt-6 flex justify-center">
            <a
              href="/dashboard"
              className="w-full max-w-3xl inline-flex items-center justify-center gap-3 rounded-2xl bg-[#3293cb] px-8 py-5 text-xl font-black uppercase tracking-[-0.02em] text-white shadow-[0_18px_40px_rgba(50,147,203,0.28)]"
            >
              Link Up. Do More.
              <ArrowRight className="h-6 w-6" />
            </a>
          </div>

        </div>
      </section>

      {/* 4 Feature Cards */}
      <section className="border-t border-black/5 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon="👥" title="Real people. Real moves." text="Verified profiles. Star ratings. People you can trust, already making things happen." color="#3293cb" />
            <FeatureCard icon="🔗" title="Share what you&apos;ve got." text="Rides, packages, events, skills, connections. Post what you have. Link in to what others offer." color="#8b5cf6" />
            <FeatureCard icon="💡" title="Costs nothing." text="Free or occasional tips. No middleman fees. Plug into movement that already exists." color="#22c55e" />
            <FeatureCard icon="🤝" title="Stronger together." text="Neighborhoods, cities, communities — linked up and looking out for each other." color="#ef4444" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/5 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <div className="text-2xl font-black tracking-[-0.06em]">
                <span className="text-black">buddy</span><span className="text-[#3293cb]">ally</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Real connections.<br />Someone&apos;s going your way.</p>
            </div>
            {/* Company */}
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">Company</div>
              <div className="flex flex-col gap-2 text-sm text-slate-600">
                <a href="/home" className="hover:text-slate-900">About</a>
                <a href="/contact" className="hover:text-slate-900">Contact Codes</a>
                <a href="#" className="hover:text-slate-900">How It Works</a>
              </div>
            </div>
            {/* Community */}
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">Community</div>
              <div className="flex flex-col gap-2 text-sm text-slate-600">
                <a href="#" className="hover:text-slate-900">Trust &amp; Safety</a>
                <a href="#" className="hover:text-slate-900">Site Rules</a>
                <a href="/privacy" className="hover:text-slate-900">Privacy</a>
                <a href="/terms" className="hover:text-slate-900">Terms</a>
              </div>
            </div>
            {/* Follow */}
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">Follow us</div>
              <div className="flex gap-3">
                <a href="#" className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-[#3293cb] hover:text-white transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.3 4.3 0 001.88-2.38 8.59 8.59 0 01-2.72 1.04 4.28 4.28 0 00-7.3 3.9A12.14 12.14 0 013.15 4.85a4.28 4.28 0 001.32 5.71 4.24 4.24 0 01-1.94-.54v.05a4.28 4.28 0 003.43 4.19 4.27 4.27 0 01-1.93.07 4.29 4.29 0 004 2.97A8.59 8.59 0 012 19.54a12.1 12.1 0 006.56 1.92c7.88 0 12.2-6.53 12.2-12.2l-.01-.56A8.72 8.72 0 0024 5.06a8.5 8.5 0 01-2.54.7z"/></svg>
                </a>
                <a href="#" className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-[#3293cb] hover:text-white transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7A10 10 0 0022 12.06c0-5.53-4.5-10.02-10-10.02z"/></svg>
                </a>
                <a href="#" className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-[#3293cb] hover:text-white transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c2.72 0 3.06.01 4.12.06 1.07.05 1.8.22 2.43.47a4.9 4.9 0 011.77 1.15 4.9 4.9 0 011.15 1.77c.25.64.42 1.36.47 2.43.05 1.06.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.07-.22 1.8-.47 2.43a4.9 4.9 0 01-1.15 1.77 4.9 4.9 0 01-1.77 1.15c-.64.25-1.36.42-2.43.47-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.07-.05-1.8-.22-2.43-.47a4.9 4.9 0 01-1.77-1.15 4.9 4.9 0 01-1.15-1.77c-.25-.64-.42-1.36-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.07.22-1.8.47-2.43a4.9 4.9 0 011.15-1.77A4.9 4.9 0 015.45 2.53c.64-.25 1.36-.42 2.43-.47C8.94 2.01 9.28 2 12 2zm0 1.8c-2.67 0-2.99.01-4.04.06-.97.04-1.5.2-1.85.34-.46.18-.8.4-1.15.74-.35.35-.56.69-.74 1.15-.14.35-.3.88-.34 1.85-.05 1.05-.06 1.37-.06 4.04s.01 2.99.06 4.04c.04.97.2 1.5.34 1.85.18.46.4.8.74 1.15.35.35.69.56 1.15.74.35.14.88.3 1.85.34 1.05.05 1.37.06 4.04.06s2.99-.01 4.04-.06c.97-.04 1.5-.2 1.85-.34.46-.18.8-.4 1.15-.74.35-.35.56-.69.74-1.15.14-.35.3-.88.34-1.85.05-1.05.06-1.37.06-4.04s-.01-2.99-.06-4.04c-.04-.97-.2-1.5-.34-1.85a3.1 3.1 0 00-.74-1.15 3.1 3.1 0 00-1.15-.74c-.35-.14-.88-.3-1.85-.34-1.05-.05-1.37-.06-4.04-.06zm0 3.06a5.14 5.14 0 110 10.28 5.14 5.14 0 010-10.28zm0 8.48a3.34 3.34 0 100-6.68 3.34 3.34 0 000 6.68zm5.34-8.68a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4z"/></svg>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-black/5 text-center text-xs text-slate-400">
            &copy; 2026 BuddyAlly. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, text, color }: { icon: string; title: string; text: string; color: string }) {
  return (
    <div className="rounded-[1.6rem] border border-black/5 bg-[#f5f6f8] p-6">
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg mb-4" style={{ background: color + '15', color }}>{icon}</div>
      <div className="text-lg font-black tracking-[-0.03em] text-slate-900">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
      <a href="/signup" className="mt-3 inline-flex items-center gap-1 text-sm font-bold" style={{ color }}>Learn more <ArrowRight className="h-3.5 w-3.5" /></a>
    </div>
  );
}
