"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#ffcf00] text-black">
      <AnimatedBackground />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 pt-[max(6rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <img src="/buddyally-logo.png" alt="BuddyAlly" className="h-14 w-14 sm:h-16 sm:w-16 mx-auto" />
        </motion.div>

        {/* Headline */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, x: -40, y: -20, rotate: -20 }}
            animate={{ opacity: 1, x: 0, y: 0, rotate: -15 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute -left-6 -top-4 z-20 bg-[#ff0a8a] px-4 py-2 text-white text-sm font-black uppercase shadow-xl"
          >
            WE ON
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="leading-[0.9]"
          >
            <span className="block text-[#ff0a8a] text-[clamp(4rem,18vw,10rem)] font-black tracking-[-0.08em]">
              BUDDY
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="leading-[0.9]"
          >
            <span className="block text-black text-[clamp(4rem,18vw,10rem)] font-black tracking-[-0.08em]">
              ALLY
            </span>
          </motion.div>
        </div>

        {/* This Summer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-4 bg-black px-5 py-2 rounded-xl"
        >
          <span className="text-yellow-300 text-xl sm:text-2xl font-black uppercase">THIS SUMMER</span>
        </motion.div>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-6 text-lg font-bold text-black/70"
        >
          Real people. Real help. Real motion.
        </motion.p>

        {/* CTA */}
        <motion.a
          href="/dashboard"
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          className="mt-10 flex items-center gap-3 bg-[#ff0a8a] text-white text-xl sm:text-2xl font-black px-10 py-5 rounded-2xl shadow-2xl"
        >
          LINK UP. DO MORE
          <motion.span animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
            <ArrowRight />
          </motion.span>
        </motion.a>

        {/* Secondary links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-6 flex gap-6 text-sm font-semibold text-black/50"
        >
          <a href="/login" className="hover:text-black transition">Log In</a>
          <a href="/signup" className="hover:text-black transition">Sign Up Free</a>
        </motion.div>
      </div>
    </main>
  );
}

function AnimatedBackground() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.7)_0%,rgba(255,231,77,0.9)_20%,rgba(255,207,0,1)_50%,rgba(255,180,0,1)_100%)]" />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[150vmax] w-[150vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40"
        style={{ background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,0.5) 0deg 3deg, transparent 3deg 12deg)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
        style={{ background: "repeating-conic-gradient(from 0deg, rgba(255,100,0,0.5) 0deg 2deg, transparent 2deg 15deg)" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />
    </>
  );
}
