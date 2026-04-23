"use client";

import React from "react";
import { motion } from "framer-motion";

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 12H19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RideIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 16L6.4 10.8C6.7 9.8 7.6 9 8.7 9H15.3C16.4 9 17.3 9.8 17.6 10.8L19 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16H20V18C20 18.6 19.6 19 19 19H18C17.4 19 17 18.6 17 18V17H7V18C7 18.6 6.6 19 6 19H5C4.4 19 4 18.6 4 18V16Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="7.5" cy="14.5" r="1" fill="currentColor" />
      <circle cx="16.5" cy="14.5" r="1" fill="currentColor" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L19 7L12 11L5 7L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M5 7V17L12 21M19 7V17L12 21M12 11V21" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function EventIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 7V5M16 7V5M5 10H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="4" y="7" width="16" height="13" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M9 14H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.5 4.5L19.5 9.5L10 19H5V14L14.5 4.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M13 6L18 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 19C3.8 16.4 6 15 9 15C12 15 14.2 16.4 15 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14.5 18.5C15 16.8 16.4 15.8 18.3 15.6C20 15.4 21.3 16.1 22 17.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function GiftIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10V20M4 10H20" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10H8.5C7.1 10 6 8.9 6 7.5C6 6.1 7.1 5 8.5 5C10.7 5 12 7.2 12 10Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10H15.5C16.9 10 18 8.9 18 7.5C18 6.1 16.9 5 15.5 5C13.3 5 12 7.2 12 10Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function GlobeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 12H21M12 3C14.8 6 16.2 9 16.2 12C16.2 15 14.8 18 12 21C9.2 18 7.8 15 7.8 12C7.8 9 9.2 6 12 3Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

const bubbles = [
  // TOP ROW — above center text
  { type: "ride", title: "RIDE", icon: RideIcon, iconBg: "bg-[#2F80ED]", iconText: "text-[#2F80ED]", author: "Naya", text: "Driving Houston \u2192 Austin Friday 6pm. Three seats open, splitting gas.", className: "left-[32px] top-[14px] w-[194px]" },
  { type: "package", title: "PACKAGE", icon: PackageIcon, iconBg: "bg-[#7C3AED]", iconText: "text-[#7C3AED]", author: "Devon", text: "Flying Miami \u2192 Santo Domingo Sunday. Space for a small parcel.", className: "left-[280px] top-[38px] w-[208px]" },
  { type: "ride", title: "RIDE", icon: RideIcon, iconBg: "bg-[#2F80ED]", iconText: "text-[#2F80ED]", author: "Chen", text: "NYC \u2192 Philly Friday evening. Two open seats.", className: "right-[260px] top-[18px] w-[172px]" },
  { type: "package", title: "PACKAGE", icon: PackageIcon, iconBg: "bg-[#7C3AED]", iconText: "text-[#7C3AED]", author: "Aisha", text: "Packages \u2014 someone\u2019s coming or going. Link in.", className: "right-[38px] top-[58px] w-[198px]" },
  // MIDDLE — flanking center text
  { type: "help", title: "HELP", icon: HelpIcon, iconBg: "bg-[#4CAF50]", iconText: "text-[#4CAF50]", author: "Rae", text: "Dog sitter available this weekend in Crown Heights.", className: "left-[24px] top-[230px] w-[168px]" },
  { type: "event", title: "EVENT", icon: EventIcon, iconBg: "bg-[#EF4444]", iconText: "text-[#EF4444]", author: "Priya", text: "Block party down the street tonight. Pull up.", className: "right-[28px] top-[240px] w-[174px]" },
  // BOTTOM ROW — below center text
  { type: "event", title: "EVENT", icon: EventIcon, iconBg: "bg-[#EF4444]", iconText: "text-[#EF4444]", author: "James", text: "Extra concert ticket tonight in Bushwick. Free to a good ear.", className: "left-[56px] bottom-[52px] w-[178px]" },
  { type: "help", title: "HELP", icon: HelpIcon, iconBg: "bg-[#4CAF50]", iconText: "text-[#4CAF50]", author: "Milo", text: "Hey neighbor \u2014 your pipe is leaking this afternoon.", className: "left-[290px] bottom-[24px] w-[182px]" },
  { type: "ride", title: "RIDE", icon: RideIcon, iconBg: "bg-[#2F80ED]", iconText: "text-[#2F80ED]", author: "Juliet", text: "Anyone coming from Texas this week? Open room for one bag.", className: "right-[180px] bottom-[46px] w-[184px]" },
];

function BubbleCard({ bubble, index, constraintsRef }: { bubble: (typeof bubbles)[number]; index: number; constraintsRef: React.RefObject<HTMLDivElement | null> }) {
  const Icon = bubble.icon;
  return (
    <motion.div
      drag
      dragElastic={0.2}
      dragMomentum={false}
      dragConstraints={constraintsRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className={`absolute ${bubble.className} cursor-grab active:cursor-grabbing`}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4 + index * 0.25, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-[24px] bg-white/95 px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04]"
      >
        <div className="mb-2 flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${bubble.iconBg} text-white`}>
            <Icon />
          </div>
          <span className={`text-[11px] font-extrabold tracking-[0.02em] ${bubble.iconText}`}>{bubble.title}</span>
        </div>
        <p className="min-h-[72px] text-[15px] leading-8 text-[#202124]">{bubble.text}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#f5c9a9] to-[#7a4b2a] ring-1 ring-black/10" />
          <span className="text-[13px] text-[#2f3136]">{bubble.author}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FilterPill({ label, dot }: { label: string; dot?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-medium text-[#2E3136] shadow-[0_2px_10px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]">
      {dot ? <span className={`h-2.5 w-2.5 rounded-full ${dot}`} /> : null}
      <span>{label}</span>
    </div>
  );
}

function FeatureCard({ title, body, icon, tint, iconTint }: { title: string; body: string; icon: React.ReactNode; tint: string; iconTint: string }) {
  return (
    <div className={`rounded-[22px] ${tint} px-7 py-6`}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/35 ring-1 ring-black/[0.05]">
        <div className={iconTint}>{icon}</div>
      </div>
      <h3 className="text-[19px] font-extrabold tracking-[-0.02em] text-[#16181c]">{title}</h3>
      <p className="mt-2 max-w-[260px] text-[15px] leading-8 text-[#4b5563]">{body}</p>
      <a href="/homepage" className={`mt-4 inline-flex items-center gap-2 text-[14px] font-bold ${iconTint}`}>
        Learn more <ArrowIcon className="h-4 w-4" />
      </a>
    </div>
  );
}

export default function BuddyallyDesktopLanding() {
  const boardRef = React.useRef<HTMLDivElement>(null);
  return (
    <main className="min-h-screen bg-[#f3f3f3] text-[#111827]">
      <div className="mx-auto max-w-[1365px] px-10 pb-0 pt-6">
        <section>
          <div className="flex items-start justify-between gap-10 px-5">
            <div>
              <h1 className="text-[64px] font-black leading-[0.95] tracking-[-0.055em] text-black">What&apos;s going on?</h1>
              <div className="mt-2 text-[78px] font-black leading-[0.88] tracking-[-0.08em]">
                <span className="text-black">buddy</span>
                <span className="text-[#3293cb]">ally</span>
              </div>
              <p className="mt-4 max-w-[520px] text-[18px] leading-8 text-[#4B5563]">
                Link into rides, packages, events, and help<br />already in motion across cities and neighborhoods.
              </p>
            </div>
            <a href="/dashboard" className="mt-7 inline-flex items-center gap-5 rounded-full bg-[#3293cb] px-9 py-5 text-[16px] font-black uppercase tracking-[-0.02em] text-white shadow-[0_12px_26px_rgba(34,121,242,0.25)]">
              LINK UP. DO MORE.
              <ArrowIcon className="h-[22px] w-[22px]" />
            </a>
          </div>

          <div className="mt-6 rounded-[32px] border border-black/[0.05] bg-[#ECE8E0] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
            <div ref={boardRef} className="relative h-[530px] overflow-hidden rounded-[28px] bg-[#F3EFE8]">
              <div className="absolute inset-0 opacity-60" style={{
                backgroundImage: "radial-gradient(circle at 20% 18%, rgba(0,0,0,0.04) 0 2px, transparent 3px), radial-gradient(circle at 78% 12%, rgba(124,58,237,0.65) 0 4px, transparent 5px), radial-gradient(circle at 64% 46%, rgba(239,68,68,0.55) 0 4px, transparent 5px), radial-gradient(circle at 47% 14%, rgba(47,128,237,0.5) 0 4px, transparent 5px), radial-gradient(circle at 30% 54%, rgba(76,175,80,0.55) 0 4px, transparent 5px), radial-gradient(circle at 89% 41%, rgba(239,68,68,0.5) 0 4px, transparent 5px), radial-gradient(circle at 92% 80%, rgba(47,128,237,0.45) 0 4px, transparent 5px), radial-gradient(circle at 8% 78%, rgba(47,128,237,0.45) 0 4px, transparent 5px)",
                backgroundSize: "100% 100%",
              }} />

              <svg className="absolute inset-0 h-full w-full opacity-25" viewBox="0 0 1240 530" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M40 110C110 20 170 220 250 124C320 40 390 8 438 78C475 132 530 128 568 86C634 12 746 26 782 98C824 180 906 14 980 52C1052 89 1098 171 1178 88" stroke="#9CA3AF" strokeDasharray="4 6" />
                <path d="M62 386C120 286 182 492 244 402C310 307 370 290 416 352C460 410 554 420 616 370C686 312 744 292 812 334C884 378 932 456 1018 430C1110 404 1162 278 1214 332" stroke="#9CA3AF" strokeDasharray="4 6" />
                <path d="M180 72C160 144 280 172 250 256C218 348 86 308 118 414C144 494 278 430 314 494" stroke="#9CA3AF" strokeDasharray="4 6" />
                <path d="M904 44C842 86 846 160 904 196C958 230 1042 238 1012 330C986 410 850 378 834 474" stroke="#9CA3AF" strokeDasharray="4 6" />
                <path d="M548 10C540 100 684 108 704 166C728 234 626 280 674 342C718 398 846 350 854 438" stroke="#9CA3AF" strokeDasharray="4 6" />
              </svg>

              <div className="absolute right-[24px] top-[16px] flex items-center gap-3 text-[14px] text-[#555B63]">
                <span className="mr-1 font-medium">FILTER:</span>
                <FilterPill label="All" />
                <FilterPill label="Ride" dot="bg-[#2F80ED]" />
                <FilterPill label="Package" dot="bg-[#7C3AED]" />
                <FilterPill label="Event" dot="bg-[#EF4444]" />
                <FilterPill label="Help" dot="bg-[#22c55e]" />
              </div>

              <div className="absolute left-1/2 top-1/2 z-10 w-[430px] -translate-x-1/2 -translate-y-[56%] text-center">
                <div className="text-[14px] font-extrabold uppercase tracking-[0.28em] text-[#80848a]">WHAT&apos;S GOING ON?</div>
                <div className="mt-3 text-[82px] font-black leading-[0.9] tracking-[-0.07em] text-black">Someone&apos;s</div>
                <div className="-mt-2 text-[84px] font-black leading-[0.86] tracking-[-0.075em] text-[#3293cb]">going your</div>
                <div className="-mt-4 text-[84px] font-black leading-[0.86] tracking-[-0.075em] text-[#3293cb]">way.</div>
                <div className="mt-4 text-[18px] font-extrabold uppercase tracking-[0.22em] text-[#8A8C92]">DON&apos;T PAY FOR IT.</div>
              </div>

              {bubbles.map((bubble, index) => (
                <BubbleCard key={`${bubble.title}-${index}`} bubble={bubble} index={index} constraintsRef={boardRef} />
              ))}

              <div className="absolute bottom-[18px] left-1/2 z-20 flex h-[60px] w-[456px] -translate-x-1/2 items-center rounded-full bg-white/95 pl-8 pr-4 shadow-[0_8px_22px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.04]">
                <div className="flex-1 text-[16px] text-[#A0A4AA]">I&apos;m driving to Philly Friday...</div>
                <button className="rounded-full bg-[#3293cb] px-8 py-3 text-[16px] font-black text-white">Post</button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3 px-1 py-3">
          <FeatureCard title="Real people. Real moves." body="Join a network of neighbors and travelers already making things happen." icon={<PeopleIcon />} tint="bg-[#E9EDF6]" iconTint="text-[#3B82F6]" />
          <FeatureCard title="Share what you&apos;ve got." body="Rides, packages, events, skills, or help—post it and connect." icon={<GiftIcon />} tint="bg-[#EEE8F7]" iconTint="text-[#8B5CF6]" />
          <FeatureCard title="Stronger together." body="Less waste, more connection, better communities." icon={<GlobeIcon />} tint="bg-[#EEF4EA]" iconTint="text-[#43A047]" />
        </section>
      </div>

      <footer className="border-t border-black/[0.06] bg-[#F4F4F4]">
        <div className="mx-auto grid max-w-[1365px] grid-cols-[1.55fr_0.85fr_0.85fr_0.8fr_0.95fr] gap-8 px-14 py-7">
          <div>
            <div className="text-[58px] font-black leading-[0.88] tracking-[-0.08em]">
              <span className="text-black">buddy</span><span className="text-[#3293cb]">ally</span>
            </div>
            <div className="mt-2 text-[16px] font-black text-[#1B1E23]">What&apos;s going on?</div>
            <div className="mt-1 text-[16px] text-[#2E3136]">Someone&apos;s going your way.</div>
            <div className="mt-9 text-[15px] text-[#35383e]">&copy; 2026 Buddyally. All rights reserved.</div>
          </div>
          <div>
            <div className="text-[14px] font-black uppercase text-[#111827]">Company</div>
            <div className="mt-4 space-y-2 text-[16px] text-[#2E3136]">
              <div><a href="/home">About</a></div>
              <div><a href="/contact">How it works</a></div>
              <div><a href="/contact">Safety</a></div>
            </div>
          </div>
          <div>
            <div className="text-[14px] font-black uppercase text-[#111827]">Community</div>
            <div className="mt-4 space-y-2 text-[16px] text-[#2E3136]">
              <div><a href="/terms">Guidelines</a></div>
              <div><a href="/home">Blog</a></div>
              <div><a href="/contact">Support</a></div>
            </div>
          </div>
          <div>
            <div className="text-[14px] font-black uppercase text-[#111827]">Legal</div>
            <div className="mt-4 space-y-2 text-[16px] text-[#2E3136]">
              <div><a href="/terms">Terms</a></div>
              <div><a href="/privacy">Privacy</a></div>
              <div><a href="/privacy">Cookies</a></div>
            </div>
          </div>
          <div className="justify-self-end text-right">
            <div className="text-[14px] font-black text-[#111827]">Follow us</div>
            <div className="mt-6 flex items-center justify-end gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-black/35 bg-white text-[#111827] text-[20px] font-medium">ig</div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-black/35 bg-white text-[#111827]"><span className="text-[22px] font-medium">{'\ud835\udd4f'}</span></div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-black/35 bg-white text-[#111827] text-[22px] font-bold">f</div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
