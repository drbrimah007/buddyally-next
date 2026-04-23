'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { AuthRedirect } from '@/components/AuthRedirect'

type Bubble = {
  text: string
  className: string
  type: 'ride' | 'package' | 'event' | 'help'
  author?: string
}

const bubbles: Bubble[] = [
  { type: 'ride',    text: 'Driving Houston → Austin Friday 6pm. Three seats open, splitting gas.', className: 'left-[12%] top-[12%] max-w-[18rem] scale-[1.12] z-20' },
  { type: 'ride',    text: 'NYC → Philly Friday evening. Two open seats.',                         className: 'left-[38%] top-[20%] max-w-[15rem] z-10' },
  { type: 'package', text: 'Flying Miami → Santo Domingo Sunday. Space for a small parcel.',       className: 'right-[38%] top-[4%] max-w-[16rem] scale-[1.11] z-20' },
  { type: 'package', text: "Packages — someone's coming or going. Link in.",                       className: 'right-[16%] top-[20%] max-w-[15rem] z-10' },
  { type: 'event',   text: 'Extra concert ticket tonight in Bushwick. Free to a good ear.',        className: 'left-[12%] bottom-[32%] max-w-[16rem] z-10' },
  { type: 'help',    text: 'Hey neighbor — your pipe is leaking. I can take a look this afternoon.', className: 'left-[16%] bottom-[12%] max-w-[17rem] scale-[1.04] z-20' },
  { type: 'ride',    text: 'Anyone coming from Texas this week? Open room for one bag.',           className: 'right-[24%] bottom-[8%] max-w-[16rem] z-10' },
  { type: 'event',   text: 'Block party down the street tonight. Pull up.',                        className: 'right-[10%] top-[36%] max-w-[14rem] z-10' },
  { type: 'help',    text: 'Dog sitter available this weekend in Crown Heights.',                  className: 'left-[10%] bottom-[47%] max-w-[14rem] z-10' },
  { type: 'help',    text: 'Can teach beginner tennis Saturday morning. Kids welcome.',            className: 'right-[4%] top-[52%] max-w-[16rem] z-10' },
]

const mobileBubbles = [
  "Why pay for rides when someone's going your way?",
  'Driving Houston → Austin Friday. Three seats open.',
  'Flying Miami → Santo Domingo. Space for a small parcel.',
  "Packages — someone's coming or going. Link in.",
  'Hey neighbor — your pipe is leaking. I can take a look.',
  'Block party down the street tonight. Pull up.',
  'Anyone coming from Texas this week?',
  'Can teach beginner tennis Saturday morning. Kids welcome.',
]

export default function BuddyallyPostSplashLanding() {
  return (
    <>
      {/* Existing-user auto-redirect to /dashboard if they have a session */}
      <AuthRedirect />

      <main className="min-h-screen bg-[#f5f6f8] text-slate-900">
        <section className="relative overflow-hidden border-b border-black/5 bg-white">
          <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-24 lg:pt-8">
            {/* Top bar with logo + Log in */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-2">
                <img src="/buddyally-logo-full.png" alt="BuddyAlly" className="h-7 w-auto" />
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="hidden sm:inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-black"
                >
                  Sign up
                </Link>
              </div>
            </div>

            <div className="mb-8 flex items-start justify-between gap-6">
              <div className="max-w-3xl">
                <div className="text-balance text-5xl font-black tracking-[-0.06em] text-slate-950 sm:text-6xl lg:text-7xl">
                  What&apos;s going on?
                </div>
                <div className="mt-2 text-[clamp(3rem,8vw,6rem)] font-black leading-none tracking-[-0.09em]">
                  <span className="text-black">buddy</span>
                  <span className="text-[#3293cb]">ally</span>
                </div>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Link into rides, packages, events, and help already in motion across cities and neighborhoods.
                </p>
              </div>
              <Link
                href="/login"
                className="hidden shrink-0 items-center gap-2 rounded-2xl bg-[#3293cb] px-6 py-4 text-base font-black uppercase tracking-[-0.02em] text-white shadow-[0_18px_40px_rgba(50,147,203,0.28)] md:inline-flex"
              >
                Link Up. Do More.
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            <div className="relative mt-10 hidden h-[44rem] overflow-hidden rounded-[2rem] border border-black/5 bg-[#f3efe8] lg:block">
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
                  ride: 'bg-[#3293cb]',
                  package: 'bg-[#8b5cf6]',
                  event: 'bg-[#ef4444]',
                  help: 'bg-[#22c55e]',
                } as const
                const textColorMap = {
                  ride: 'text-[#3293cb]',
                  package: 'text-[#8b5cf6]',
                  event: 'text-[#ef4444]',
                  help: 'text-[#22c55e]',
                } as const
                const authorMap = ['Naya', 'Chen', 'Devon', 'Aisha', 'Priya', 'James', 'Rae', 'Milo', 'Jules', 'Jordan']
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.06 }}
                    className={`absolute ${bubble.className}`}
                    style={{ willChange: 'transform' }}
                  >
                    <motion.div
                      animate={{ y: [0, -6, 0], rotate: index % 2 === 0 ? [0, -0.6, 0] : [0, 0.6, 0] }}
                      transition={{ duration: 4.6 + index * 0.22, repeat: Infinity, ease: 'easeInOut' }}
                      className="rounded-[1.15rem] border border-black/5 bg-white px-4 py-4 shadow-[0_6px_18px_rgba(15,23,42,0.06)]"
                    >
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">
                        <span className={`h-2 w-2 rounded-full ${colorMap[bubble.type]}`} />
                        <span className={textColorMap[bubble.type]}>{bubble.type}</span>
                        <span>·</span>
                        <span>{authorMap[index % authorMap.length]}</span>
                      </div>
                      <div className="mt-2 text-[1.02rem] leading-7 text-slate-900">{bubble.text}</div>
                    </motion.div>
                  </motion.div>
                )
              })}

              <div className="absolute bottom-2 left-1/2 z-10 w-[28rem] -translate-x-1/2 rounded-full border border-black/10 bg-white/85 px-5 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="truncate text-lg text-slate-400">I&apos;m driving to Philly Friday...</div>
                  <Link href="/login" className="rounded-full bg-[#d9d3c8] px-5 py-2 text-sm font-bold text-white hover:bg-[#c9c3b8]">Post</Link>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-6 hidden max-w-3xl text-center lg:block">
              <p className="text-base font-medium leading-7 text-slate-600">
                Rides, packages, events, help — already in motion.
              </p>
            </div>

            <div className="mt-6 hidden lg:flex justify-center">
              <Link
                href="/login"
                className="w-full max-w-3xl inline-flex items-center justify-center gap-3 rounded-2xl bg-[#3293cb] px-8 py-5 text-xl font-black uppercase tracking-[-0.02em] text-white shadow-[0_18px_40px_rgba(50,147,203,0.28)] hover:bg-[#2678a8]"
              >
                Link Up. Do More.
                <ArrowRight className="h-6 w-6" />
              </Link>
            </div>

            {/* Mobile */}
            <div className="mt-8 space-y-3 lg:hidden">
              <div className="rounded-[1.6rem] border border-black/5 bg-white p-5 shadow-sm">
                <div className="text-base font-black uppercase tracking-[0.14em] text-slate-500">What&apos;s going on?</div>
                <div className="mt-2 text-[clamp(2.3rem,10vw,3.6rem)] font-black leading-none tracking-[-0.08em]">
                  <span className="text-black">buddy</span>
                  <span className="text-[#3293cb]">ally</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Rides, packages, events, neighbor help, and connections already happening.
                </p>
              </div>
              <div className="grid gap-3">
                {mobileBubbles.map((text, index) => (
                  <motion.div
                    key={text}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * index }}
                    className="relative rounded-[1.6rem] border-2 border-black bg-white px-4 py-4 shadow-[0_6px_0px_rgba(0,0,0,0.15)] before:content-['B'] before:absolute before:bottom-[-8px] before:left-5 before:w-5 before:h-5 before:rounded-[0.8rem] before:bg-black before:text-white before:flex before:items-center before:justify-center before:text-[12px] before:font-black after:content-[''] after:absolute after:bottom-[-5px] after:left-7 after:w-2 after:h-2 after:rounded-full after:bg-[#3293cb]"
                  >
                    <div className="text-sm font-bold leading-6 text-slate-800">{text}</div>
                  </motion.div>
                ))}
              </div>
              <Link
                href="/login"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3293cb] px-6 py-4 text-base font-black uppercase tracking-[-0.02em] text-white shadow-[0_18px_40px_rgba(50,147,203,0.28)]"
              >
                Link Up. Do More.
                <ArrowRight className="h-5 w-5" />
              </Link>
              <div className="pt-2 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link href="/login" className="font-bold text-[#3293cb] underline">Log in</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard title="Beat the cost starts with"     text="Why pay for rides when someone's going your way? Cut out the middle man." />
            <InfoCard title="Costs nothing"                  text="Free or occasional tips. Ride together, package together, and plug into movement that already exists." />
            <InfoCard title="Build the community"            text="Neighborhood fun, events, favors, learning, staying in touch, and helping kids train together. Buddyally." />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-10 text-center sm:px-6 lg:px-8">
          <p className="text-lg font-semibold text-slate-700">
            Link up into the movement that exists and stop paying for it.
          </p>
        </section>

        <footer className="border-t border-black/5 bg-[#fbfbfc]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-8 text-sm font-semibold text-slate-500 sm:px-6 lg:px-8">
            <Link href="/home"     className="hover:text-slate-900">How It Works</Link>
            <Link href="/home"     className="hover:text-slate-900">Contact Codes</Link>
            <Link href="/privacy"  className="hover:text-slate-900">Privacy</Link>
            <Link href="/terms"    className="hover:text-slate-900">Terms</Link>
            <Link href="/contact"  className="hover:text-slate-900">Contact</Link>
            <Link href="/login"    className="hover:text-slate-900">Log in</Link>
          </div>
          <div className="mx-auto max-w-7xl px-4 pb-6 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
            © {new Date().getFullYear()} BuddyAlly
          </div>
        </footer>
      </main>
    </>
  )
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.6rem] border border-black/5 bg-white p-6 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#3293cb]">buddyally connect</div>
      <div className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-900">{title}</div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  )
}
