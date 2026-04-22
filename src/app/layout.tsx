import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "BuddyAlly — Find Your People. Do More Together.",
  description: "Connect for travel, play, learning, local activities, and everyday adventures. Verified profiles. Safer meetups. Optional tips.",
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
    description: "Connect for travel, play, learning, local activities, and everyday adventures. Verified profiles. Safer meetups. Optional tips.",
    url: "https://buddyally.com",
    siteName: "BuddyAlly",
    images: [{ url: "https://buddyally.com/og-image.png", width: 1200, height: 630, alt: "BuddyAlly" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BuddyAlly — Find Your People. Do More Together.",
    description: "Real people. Real help. Real motion. Connect for activities, travel, learning and more.",
    images: ["https://buddyally.com/og-image.png"],
  },
  metadataBase: new URL("https://buddyally.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
