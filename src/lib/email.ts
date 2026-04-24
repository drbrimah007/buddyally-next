// Shared Resend email sender. Used by /api/notify and /api/saved-search-notify.
// No-ops (returns a skipped result) when RESEND_API_KEY is unset so local dev
// without mail credentials keeps working.

export type SendEmailResult =
  | { email: 'sent' }
  | { email: 'skipped_no_resend' }
  | { email: 'resend_error'; status?: number; detail?: string }

export async function sendEmailViaResend(opts: {
  to: string
  subject: string
  html: string
  replyTo?: string
}): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { email: 'skipped_no_resend' }
  const from = process.env.NOTIFY_EMAIL_FROM || 'BuddyAlly <alerts@buddyally.com>'
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: [opts.replyTo] } : {}),
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[email] Resend failed', res.status, detail)
      return { email: 'resend_error', status: res.status, detail }
    }
    return { email: 'sent' }
  } catch (e: any) {
    console.error('[email] Resend threw', e)
    return { email: 'resend_error', detail: String(e?.message || e) }
  }
}

export function escapeHtml(s: string) {
  return (s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
