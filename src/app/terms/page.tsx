import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Link href="/"><img src="/buddyally-logo-full.png" alt="BuddyAlly" className="h-7" /></Link>
        <Link href="/" className="text-sm font-semibold text-[#3293CB]">Back to Home</Link>
      </nav>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: April 18, 2026</p>
        <div className="prose prose-gray max-w-none text-gray-600 space-y-6 text-[15px] leading-relaxed">
          <p>By using BuddyAlly, you agree to these Terms of Service.</p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">1. Eligibility</h2>
          <p>You must be at least 18 years old to use BuddyAlly.</p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">2. Your Account</h2>
          <ul className="list-disc pl-5 space-y-1"><li>You are responsible for your account security</li><li>Provide accurate information</li><li>No multiple accounts or impersonation</li></ul>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">3. Acceptable Use</h2>
          <p>Do NOT: use BuddyAlly for illegal activities, harass others, post false content, spam, or interfere with the service.</p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">4. Activities and Meetups</h2>
          <p>BuddyAlly connects people. We do not organize or guarantee the safety of any meetups. Users participate at their own risk.</p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">5. Limitation of Liability</h2>
          <p>BuddyAlly is provided &ldquo;as is.&rdquo; We are not liable for actions of other users, injuries from meetups, or service interruptions.</p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">6. Contact</h2>
          <p>Questions? <a href="mailto:legal@buddyally.com" className="text-[#3293CB]">legal@buddyally.com</a>. See also: <Link href="/privacy" className="text-[#3293CB]">Privacy Policy</Link></p>
        </div>
      </div>
    </div>
  )
}
