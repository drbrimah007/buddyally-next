import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Link href="/"><img src="/buddyally-logo-full.png" alt="BuddyAlly" className="h-7" /></Link>
        <Link href="/" className="text-sm font-semibold text-[#3293CB]">Back to Home</Link>
      </nav>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: April 18, 2026</p>
        <div className="prose prose-gray max-w-none text-gray-600 space-y-6 text-[15px] leading-relaxed">
          <p>BuddyAlly (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the buddyally.com website and mobile application. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.</p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">1. Information We Collect</h2>
          <p><strong>Account Information:</strong> Name, email, phone, city, profile photo.</p>
          <p><strong>Authentication Data:</strong> If you sign in with Google, we receive your name, email, and profile picture. We do not receive your Google password.</p>
          <p><strong>Activity Data:</strong> Activities you create, join, or interact with, including messages, reviews, and group memberships.</p>
          <p><strong>Contact Codes:</strong> QR codes you create and messages received through them.</p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1"><li>To create and manage your account</li><li>To connect you with activities and other users</li><li>To deliver messages through Contact Codes</li><li>To send push notifications you&apos;ve opted into</li><li>To verify your identity</li><li>To improve our services</li></ul>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">3. Information Sharing</h2>
          <p>We do not sell your personal information. We use Supabase (database/auth), Vercel (hosting), and Resend (email delivery).</p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">4. Your Rights</h2>
          <ul className="list-disc pl-5 space-y-1"><li>Access, update, or delete your data through your profile</li><li>Disable push notifications in browser settings</li><li>Request account deletion by contacting us</li></ul>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">5. Contact Us</h2>
          <p>Questions? Contact us at <a href="mailto:privacy@buddyally.com" className="text-[#3293CB]">privacy@buddyally.com</a>.</p>
        </div>
      </div>
    </div>
  )
}
