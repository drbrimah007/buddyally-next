// POST /api/notify
// Dual-shape notification endpoint. v1 parity for the contact-code flow
// (email + push) plus the typed shape used for in-app notifications.
//
// Accepted shapes:
//   A) Contact-code message (v1 parity) — what /c/[code] posts:
//      { ownerEmail, ownerName?, senderName, message,
//        code, codeTitle?, priority, senderEmail?, senderPhone?, ownerId,
//        push_enabled?, email_enabled? }
//
//   B) Typed in-app notification:
//      { user_id, type, title, body,
//        reference_id?, reference_type?, urgent? }
//
// Env:
//   SUPABASE_SERVICE_ROLE_KEY        (required for DB writes + token lookup)
//   FIREBASE_SERVICE_ACCOUNT_JSON    (stringified service account; optional — skips FCM if unset)
//   RESEND_API_KEY                   (optional — skips email if unset)
//   NOTIFY_EMAIL_FROM                (optional — defaults to "BuddyAlly <alerts@buddyally.com>")
//   NEXT_PUBLIC_SUPABASE_URL

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---------- Shape detection ----------

type CodeMessageBody = {
  ownerEmail: string
  ownerName?: string
  senderName: string
  message: string
  code: string
  codeTitle?: string
  priority?: 'normal' | 'urgent' | string
  senderEmail?: string
  senderPhone?: string
  ownerId: string
  push_enabled?: boolean
  email_enabled?: boolean
}

type TypedBody = {
  user_id: string
  type: string
  title: string
  body: string
  reference_id?: string
  reference_type?: string
  urgent?: boolean
}

function isCodeMessageBody(b: any): b is CodeMessageBody {
  return b && typeof b === 'object' && typeof b.ownerId === 'string' && typeof b.message === 'string' && typeof b.code === 'string'
}

function isTypedBody(b: any): b is TypedBody {
  return b && typeof b === 'object' && typeof b.user_id === 'string' && typeof b.type === 'string' && typeof b.title === 'string' && typeof b.body === 'string'
}

// ---------- Firebase Admin (lazy) ----------

let fbAdmin: any = null
async function getFirebaseAdmin() {
  if (fbAdmin) return fbAdmin
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    // @ts-ignore -- optional peer
    const admin = await import('firebase-admin')
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) })
    }
    fbAdmin = admin
    return admin
  } catch (e) {
    console.error('[notify] Firebase init failed', e)
    return null
  }
}

// ---------- FCM send + token pruning ----------

async function sendFcm(opts: {
  supabase: any
  userId: string
  title: string
  body: string
  urgent: boolean
  data?: Record<string, string>
  link?: string
}) {
  const { supabase, userId, title, body, urgent, data, link } = opts
  const admin = await getFirebaseAdmin()
  if (!admin) return { push: 'skipped_no_fcm' as const }

  const { data: tokens } = await supabase
    .from('fcm_tokens')
    .select('token, urgent_only')
    .eq('user_id', userId)

  if (!tokens || tokens.length === 0) return { push: 'skipped_no_tokens' as const }

  const targets = tokens.filter((t: any) => (urgent ? true : !t.urgent_only)).map((t: any) => t.token)
  if (targets.length === 0) return { push: 'skipped_all_urgent_only' as const }

  // Compute the recipient's TOTAL unread count across surfaces and ship it
  // in the push payload so the home-screen icon shows an accurate badge
  // BEFORE the user opens the app. We add 1 to the notifications count
  // because the row this push corresponds to was just inserted by the
  // caller — it'll be visible to the badge query as part of "unread".
  // Falls back to a sensible default if any subquery errors out.
  let badgeCount = 0
  try {
    const [m, n, c, l] = await Promise.allSettled([
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('recipient_id', userId).eq('read', false).is('activity_id', null).is('group_id', null),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('read', false),
      supabase.from('connect_messages').select('id', { count: 'exact', head: true }).eq('owner_id', userId).eq('read', false),
      supabase.from('link_requests').select('id', { count: 'exact', head: true }).eq('recipient_id', userId).eq('status', 'pending'),
    ])
    badgeCount =
      (m.status === 'fulfilled' ? (m.value.count || 0) : 0) +
      (n.status === 'fulfilled' ? (n.value.count || 0) : 0) +
      (c.status === 'fulfilled' ? (c.value.count || 0) : 0) +
      (l.status === 'fulfilled' ? (l.value.count || 0) : 0)
  } catch {
    badgeCount = 1
  }

  // Resolve the deep-link once so it goes EVERYWHERE the click handler
  // could read from — `data.url` (what the SW reads in notificationclick),
  // `webpush.fcmOptions.link` (FCM's standard browser-tab opener), and
  // the in-payload `data` block (so the SW can fall back).
  const targetUrl = link || '/dashboard/alerts'

  try {
    const res = await admin.messaging().sendEachForMulticast({
      tokens: targets,
      notification: { title, body },
      // Ship the badge count + url in `data` so the SW can read both on
      // background pushes. iOS PWAs only honor these when they come through
      // the SW's notification action (not the FCM notification block).
      data: { ...(data || {}), badge: String(badgeCount), url: targetUrl },
      webpush: { fcmOptions: { link: targetUrl } },
      // APNs path for native iOS app delivery (won't apply to web push but
      // doesn't hurt — Firebase ignores when irrelevant).
      apns: { payload: { aps: { badge: badgeCount } } },
    })

    // Prune dead tokens
    const dead: string[] = []
    res.responses.forEach((r: any, i: number) => {
      if (!r.success) {
        const code = r.error?.code
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) dead.push(targets[i])
      }
    })
    if (dead.length) await supabase.from('fcm_tokens').delete().in('token', dead)

    return {
      push: 'sent' as const,
      success: res.successCount,
      failure: res.failureCount,
      pruned: dead.length,
    }
  } catch (e: any) {
    console.error('[notify] FCM send failed', e)
    return { push: 'fcm_error' as const, detail: String(e?.message || e) }
  }
}

// ---------- Resend email ----------

async function sendEmailViaResend(opts: {
  to: string
  subject: string
  html: string
  replyTo?: string
}) {
  const key = process.env.RESEND_API_KEY
  if (!key) return { email: 'skipped_no_resend' as const }
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
      console.error('[notify] Resend failed', res.status, detail)
      return { email: 'resend_error' as const, status: res.status, detail }
    }
    return { email: 'sent' as const }
  } catch (e: any) {
    console.error('[notify] Resend threw', e)
    return { email: 'resend_error' as const, detail: String(e?.message || e) }
  }
}

function escapeHtml(s: string) {
  return (s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Logo block reused across all email templates. Hosted at the public
// asset URL on production so it works from any inbox. Width fixed at
// 140px so retina-density 2x icons still render crisply without blowing
// up Gmail's preview pane.
const EMAIL_LOGO_HTML = `
  <div style="text-align:center;padding:20px 0 4px">
    <img src="https://buddyally.com/buddyally-logo-full.png" alt="BuddyAlly"
         width="140" style="display:inline-block;height:auto;max-width:140px" />
  </div>`

// Generic email template for Shape B (typed) notifications — covers
// DMs, alerts, activity pings, requests. Keeps a consistent visual to
// the code-message template but lighter, with a single CTA back to the
// alerts feed since we don't always have a deep-link in the typed body.
function typedNotificationEmailHtml(p: { firstName: string; title: string; body: string; type: string; urgent: boolean }) {
  const headerColor = p.urgent ? '#DC2626' : '#0284C7'
  const greeting = p.firstName ? `Hi ${escapeHtml(p.firstName)},` : 'Hi,'
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;padding:8px 16px 24px">
    ${EMAIL_LOGO_HTML}
    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.06);margin-top:14px">
      <div style="background:${headerColor};color:#fff;padding:18px 22px;font-weight:700;font-size:16px">
        ${p.urgent ? '🚨 URGENT — ' : ''}${escapeHtml(p.title)}
      </div>
      <div style="padding:22px">
        <p style="margin:0 0 14px;color:#4B5563;font-size:14px">${greeting}</p>
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px;font-size:15px;line-height:1.6;white-space:pre-wrap">${escapeHtml(p.body)}</div>
        <p style="margin:22px 0 0">
          <a href="https://buddyally.com/dashboard/alerts" style="display:inline-block;background:#3293CB;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;font-size:14px">Open BuddyAlly</a>
        </p>
      </div>
    </div>
    <p style="text-align:center;color:#9CA3AF;font-size:12px;margin-top:16px">
      You're receiving this because email notifications are on for your BuddyAlly account.
      Manage in <a href="https://buddyally.com/dashboard/notification-settings" style="color:#9CA3AF">Notification Settings</a>.
    </p>
  </div></body></html>`
}

function codeMessageEmailHtml(p: CodeMessageBody) {
  const urgent = p.priority === 'urgent'
  const title = p.codeTitle || p.code
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;padding:8px 16px 24px">
    ${EMAIL_LOGO_HTML}
    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.06);margin-top:14px">
      <div style="background:${urgent ? '#DC2626' : '#0284C7'};color:#fff;padding:18px 22px;font-weight:700;font-size:16px">
        ${urgent ? '🚨 URGENT — ' : ''}New message on your BuddyAlly code
      </div>
      <div style="padding:22px">
        <p style="margin:0 0 6px;color:#6B7280;font-size:13px">Code</p>
        <p style="margin:0 0 14px;font-weight:700;font-size:16px">${escapeHtml(title)} <span style="color:#6B7280;font-weight:500">(${escapeHtml(p.code)})</span></p>
        <p style="margin:0 0 6px;color:#6B7280;font-size:13px">From</p>
        <p style="margin:0 0 14px;font-weight:600">${escapeHtml(p.senderName || 'Anonymous')}</p>
        ${p.senderEmail ? `<p style="margin:0 0 6px;color:#6B7280;font-size:13px">Reply to</p><p style="margin:0 0 14px"><a href="mailto:${escapeHtml(p.senderEmail)}" style="color:#0284C7">${escapeHtml(p.senderEmail)}</a></p>` : ''}
        ${p.senderPhone ? `<p style="margin:0 0 6px;color:#6B7280;font-size:13px">Phone</p><p style="margin:0 0 14px"><a href="tel:${escapeHtml(p.senderPhone)}" style="color:#0284C7">${escapeHtml(p.senderPhone)}</a></p>` : ''}
        <p style="margin:0 0 6px;color:#6B7280;font-size:13px">Message</p>
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px;font-size:15px;line-height:1.6;white-space:pre-wrap">${escapeHtml(p.message)}</div>
        <p style="margin:22px 0 0;color:#6B7280;font-size:12px">Open your BuddyAlly dashboard to see the full thread and reply.</p>
      </div>
    </div>
    <p style="text-align:center;color:#9CA3AF;font-size:12px;margin-top:16px">
      You received this because someone scanned your BuddyAlly code <strong>${escapeHtml(p.code)}</strong>.
    </p>
  </div></body></html>`
}

// ---------- Handler ----------

export async function POST(req: Request) {
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Annotate explicitly so TS doesn't infer `any` (the inner `masterFlags`
  // closure references `supabase` which would otherwise leak through).
  let supabase: ReturnType<typeof createServiceRoleClient>
  try {
    supabase = createServiceRoleClient()
  } catch {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
  }

  // Look up the recipient's master push/email switches from `profiles`.
  // These AND-gate everything (the per-code flags can only be more
  // restrictive). Missing columns or rows = treat as ON (default-allow),
  // matching what the per-code flags do.
  async function masterFlags(userId: string): Promise<{ push: boolean; email: boolean }> {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('notify_push_enabled, notify_email_enabled')
        .eq('id', userId)
        .maybeSingle()
      const push  = (data?.notify_push_enabled  as boolean | null | undefined) !== false
      const email = (data?.notify_email_enabled as boolean | null | undefined) !== false
      return { push, email }
    } catch {
      return { push: true, email: true }
    }
  }

  // --- Shape A: contact-code message (v1 parity) ---
  if (isCodeMessageBody(payload)) {
    const p = payload as CodeMessageBody
    const urgent = p.priority === 'urgent'
    const master = await masterFlags(p.ownerId)
    // Per-code flag AND master flag must both allow.
    const pushAllowed = p.push_enabled !== false && master.push
    const emailAllowed = p.email_enabled !== false && master.email

    // 1) Write in-app notification row
    const title = urgent ? `🚨 URGENT: new message on ${p.codeTitle || p.code}` : `New message on ${p.codeTitle || p.code}`
    const body = p.message.length > 140 ? p.message.slice(0, 137) + '...' : p.message
    const { error: insErr } = await supabase.from('notifications').insert({
      user_id: p.ownerId,
      type: 'code_message',
      title,
      body,
      reference_type: 'connect_code',
    })
    if (insErr) console.error('[notify] notifications insert failed', insErr)

    // 2) Fan out push + email in parallel, respecting owner's flags
    const pushPromise = pushAllowed
      ? sendFcm({
          supabase,
          userId: p.ownerId,
          title,
          body,
          urgent,
          data: { type: 'code_message', code: p.code },
          link: '/dashboard/codes',
        })
      : Promise.resolve({ push: 'skipped_disabled_by_owner' as const })

    const emailPromise = emailAllowed && p.ownerEmail
      ? sendEmailViaResend({
          to: p.ownerEmail,
          subject: title,
          html: codeMessageEmailHtml(p),
          replyTo: p.senderEmail || undefined,
        })
      : Promise.resolve({ email: 'skipped_disabled_or_no_email' as const })

    const [pushRes, emailRes] = await Promise.all([pushPromise, emailPromise])
    return NextResponse.json({ ok: true, ...pushRes, ...emailRes })
  }

  // --- Shape B: typed in-app notification ---
  if (isTypedBody(payload)) {
    const { user_id, type, title, body, reference_id, reference_type, urgent } = payload

    const { error: insErr } = await supabase.from('notifications').insert({
      user_id, type, title, body, reference_id, reference_type,
    })
    if (insErr) {
      console.error('[notify] insert failed', insErr)
      return NextResponse.json({ error: 'Insert failed', detail: insErr.message }, { status: 500 })
    }

    // Master flags gate both push and email fanouts. The in-app row is
    // always written so the bell still lights up — we only suppress the
    // outbound channels per the user's toggles.
    const master = await masterFlags(user_id)

    // Email fanout (Shape B): every typed notification also goes to the
    // user's account email if email_enabled. The previous behavior only
    // emailed for code-message shape, leaving DMs / activity pings /
    // alerts / requests with no email channel at all. We look up the
    // account email via service role; email is best-effort, so failures
    // are reported but don't block the push response.
    let emailRes: any = { email: 'skipped_disabled_by_owner' }
    if (master.email) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('email, first_name')
        .eq('id', user_id)
        .maybeSingle()
      if (prof?.email) {
        emailRes = await sendEmailViaResend({
          to: prof.email,
          subject: title,
          html: typedNotificationEmailHtml({
            firstName: prof.first_name || '',
            title,
            body,
            type,
            urgent: !!urgent,
          }),
        })
      } else {
        emailRes = { email: 'skipped_no_email' }
      }
    }

    const pushRes = master.push
      ? await sendFcm({
          supabase,
          userId: user_id,
          title,
          body,
          urgent: !!urgent,
          data: {
            type,
            reference_id: reference_id || '',
            reference_type: reference_type || '',
          },
        })
      : { push: 'skipped_disabled_by_owner' as const }

    return NextResponse.json({ ok: true, ...pushRes, ...emailRes })
  }

  return NextResponse.json(
    { error: 'Unrecognized payload shape — expected contact-code message or typed notification' },
    { status: 400 },
  )
}
