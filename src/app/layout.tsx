import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ToastProvider";
import PWAProvider from "@/components/PWAProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://buddyally.com"),
  // Default + template — per-page metadata (e.g. /home, /a/[id]) overrides
  // `default` and the template appends " — BuddyAlly" automatically.
  title: {
    default: "BuddyAlly — Find Your People. Do More Together.",
    template: "%s — BuddyAlly",
  },
  description:
    "BuddyAlly connects real people for travel, rides, packages, events, learning, local meetups, and everyday help. Verified profiles. Safer meetups. Optional tips.",
  applicationName: "BuddyAlly",
  // Keywords are weakly weighted by Google but still parsed by Bing/DDG and
  // some social previews. Mostly here to help "buddy", "buddyally", and
  // "buddy ally" searches resolve.
  keywords: [
    "BuddyAlly",
    "buddyally",
    "buddy ally",
    "buddy",
    "find a buddy",
    "ride share",
    "carpool",
    "package carry",
    "local meetups",
    "activity partners",
    "verified meetups",
    "travel buddy",
    "neighborhood help",
  ],
  authors: [{ name: "BuddyAlly", url: "https://buddyally.com" }],
  creator: "BuddyAlly",
  publisher: "BuddyAlly",
  category: "social",
  alternates: {
    canonical: "/",
  },
  // Tell Google explicitly: index everything, follow all links, max image
  // preview, max video preview, max snippet. (This matters — without an
  // explicit `index: true` some crawlers default conservative.)
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "BuddyAlly — Find Your People. Do More Together.",
    description:
      "Real people. Real help. Real motion. Connect for activities, travel, learning, rides, packages, and meetups.",
    url: "https://buddyally.com",
    siteName: "BuddyAlly",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "BuddyAlly" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BuddyAlly — Find Your People. Do More Together.",
    description:
      "Real people. Real help. Real motion. Connect for activities, travel, learning and more.",
    images: ["/og-image.png"],
  },
  // Drop your verification IDs here once you've claimed Search Console /
  // Bing Webmaster (instructions in docs/SEO.md). Leaving as `null`s now
  // keeps the file shape stable so you only edit one line each.
  verification: {
    google: undefined,   // e.g. "abc123..."
    yandex: undefined,
    other: { "msvalidate.01": [] }, // Bing
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <ToastProvider>
          <PWAProvider>{children}</PWAProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
