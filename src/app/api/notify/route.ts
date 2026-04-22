// POST /api/notify
// Fan-out notification endpoint: inserts a notifications row and pushes FCM.
// Port of v1's api/notify.js (Node + Firebase Admin).
//
// Expected body:
//   { user_id: uuid, type: string, title: string, body: string,
//     reference_id?: uuid, reference_type?: string,
//     urgent?: boolean }
//
// Env required:
//   SUPABASE_SERVICE_ROLE_KEY
//   FIREBASE_SERVICE_ACCOUNT_JSON  (stringified JSON of a service account)
//   NEXT_PUBLIC_SUPABASE_URL
//
// Falls back gracefully when Firebase isn't configured (still writes the
// notifications row so the in-app bell works).

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type NotifyBody = {
  user_id: string
  type: string
  title: string
  body: string
  reference_id?: string
  reference_type?: string
  urgent?: boolean
}

// Lazy Firebase Admin init (only when env is configured).
let fbAdmin: any = null
async function getFirebaseAdmin() {
  if (fbAdmin) return fbAdmin
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    // Dynamic import kept out of TS static graph so the build doesn't fail
    // when firebase-admin isn't installed (it's optional for push).
    // @ts-ignore -- optional peer; install firebase-admin to enable FCM
    const admin = await import('firebase-admin')
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(raw)),
      })
    }
    fbAdmin = admin
    return admin
  } catch (e) {
    console.error('[notify] Firebase init failed', e)
    return null
  }
}

export async function POST(req: Request) {
  let payload: NotifyBody
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { user_id, type, title, body, reference_id, reference_type, urgent } = payload
  if (!user_id || !type || !title || !body) {
    return NextResponse.json({ error: 'user_id, type, title, body are required' }, { status: 400 })
  }

  let supabase
  try {
    supabase = createServiceRoleClient()
  } catch {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
  }

  // 1) Write the in-app notification row (non-blocking on FCM failure).
  const { error: insErr } = await supabase.from('notifications').insert({
    user_id, type, title, body, reference_id, reference_type,
  })
  if (insErr) {
    console.error('[notify] insert failed', insErr)
    return NextResponse.json({ error: 'Insert failed', detail: insErr.message }, { status: 500 })
  }

  // 2) Fan out FCM push (if configured + tokens exist for this user).
  const admin = await getFirebaseAdmin()
  if (!admin) {
    return NextResponse.json({ ok: true, push: 'skipped_no_fcm' })
  }

  const { data: tokens } = await supabase
    .from('fcm_tokens')
    .select('token, urgent_only')
    .eq('user_id', user_id)

  if (!tokens || tokens.length === 0) {
    return NextResponse.json({ ok: true, push: 'skipped_no_tokens' })
  }

  const targets = tokens
    .filter(t => (urgent ? true : !t.urgent_only))
    .map(t => t.token)

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, push: 'skipped_all_urgent_only' })
  }

  try {
    const res = await admin.messaging().sendEachForMulticast({
      tokens: targets,
      notification: { title, body },
      data: {
        type,
        reference_id: reference_id || '',
        reference_type: reference_type || '',
      },
      webpush: {
        fcmOptions: { link: '/dashboard/alerts' },
      },
    })

    // Prune dead tokens.
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
    if (dead.length) {
      await supabase.from('fcm_tokens').delete().in('token', dead)
    }

    return NextResponse.json({
      ok: true,
      push: 'sent',
      success: res.successCount,
      failure: res.failureCount,
      pruned: dead.length,
    })
  } catch (e: any) {
    console.error('[notify] FCM send failed', e)
    return NextResponse.json({ ok: true, push: 'fcm_error', detail: String(e?.message || e) })
  }
}
