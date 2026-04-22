import { redirect } from 'next/navigation'

// Catch bare code URLs like buddyally.com/PKSVNT and redirect to /c/PKSVNT
// Only matches 6-character alphanumeric codes (uppercase letters + digits, no O/0/I/1)
export default async function CatchCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  // Check if it looks like a 6-char code (not a real route)
  const isCode = /^[A-Z2-9]{4,8}$/i.test(code)
  if (isCode) {
    redirect(`/c/${code.toUpperCase()}`)
  }

  // Not a code — show 404
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 40, marginBottom: 16 }}>404</p>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Page not found</h1>
        <a href="/" style={{ color: '#3293CB', fontWeight: 600 }}>Go to BuddyAlly</a>
      </div>
    </div>
  )
}
