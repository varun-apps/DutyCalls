// DutyCalls Edge Function: notify-group
// Sends Web Push notifications to the OTHER members of a group when a task changes.
// Called by the client (actor) right after a mutation; JWT is verified by the gateway
// (verify_jwt = true) and again here via getUser().

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webPush from 'https://esm.sh/web-push@3'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

if (!supabaseUrl || !serviceRoleKey || !vapidPrivateKey || !vapidPublicKey) {
  console.error('notify-group: missing required env vars')
}

webPush.setVapidDetails('mailto:hello@dutycalls.app', vapidPublicKey, vapidPrivateKey)

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

interface NotifyPayload {
  group_id: string
  task_id: string
  title: string
  action: 'created' | 'updated' | 'status_changed' | 'deleted'
  status?: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '')
  const { data: { user } } = await supabase.auth.getUser(jwt)
  if (!user) return new Response('Unauthorized', { status: 401 })

  let body: NotifyPayload
  try {
    body = await req.json()
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  // Other members of the group (exclude the actor).
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', body.group_id)
    .neq('user_id', user.id)

  const otherIds = (members ?? []).map((m) => m.user_id)
  if (otherIds.length === 0) return json({ sent: 0 })

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .in('user_id', otherIds)

  const subscriptions = subs ?? []
  if (subscriptions.length === 0) return json({ sent: 0 })

  const notification = {
    title: 'DutyCalls',
    body: bodyFor(body),
    data: { url: `${appUrl}/?task=${body.task_id}` }
  }

  const results = await Promise.all(
    subscriptions.map((s) =>
      webPush
        .sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
          JSON.stringify(notification)
        )
        .then(() => 'ok')
        .catch((e: { statusCode: number }) => {
          // 410/404 → subscription is dead; remove it.
          if (e.statusCode === 410 || e.statusCode === 404) {
            return supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', s.endpoint)
              .then(() => 'removed')
          }
          return 'error'
        })
    )
  )

  return json({ sent: results.filter((r) => r === 'ok').length })
})

function bodyFor(p: NotifyPayload): string {
  switch (p.action) {
    case 'created':
      return `New task: ${p.title}`
    case 'status_changed':
      return `"${p.title}" → ${p.status ?? 'updated'}`
    case 'updated':
      return `"${p.title}" was updated`
    case 'deleted':
      return `"${p.title}" was deleted`
    default:
      return 'A task was updated'
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
