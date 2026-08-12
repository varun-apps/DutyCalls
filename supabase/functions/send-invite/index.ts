// DutyCalls Edge Function: send-invite
// Sends a branded invite email via Resend after create_invite creates a row.
// Called by the client (inviter) right after the create_invite RPC; JWT is
// verified by the gateway (verify_jwt = true) and again here via getUser().
// The invite token is read server-side with the service-role key — it never
// reaches the client. If RESEND_API_KEY is unset (local dev), sending is
// skipped and the deep link is returned so the UI's "Copy link" still works.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY')
const resendFrom =
  Deno.env.get('RESEND_FROM') ?? 'DutyCalls <onboarding@resend.dev>'
const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

if (!supabaseUrl || !serviceRoleKey) {
  console.error('send-invite: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

interface SendInvitePayload {
  inviteId: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '')
  const {
    data: { user }
  } = await supabase.auth.getUser(jwt)
  if (!user) return new Response('Unauthorized', { status: 401 })

  let body: SendInvitePayload
  try {
    body = await req.json()
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  // Fetch the invite (service-role bypasses RLS so we can read the token).
  const { data: inv, error } = await supabase
    .from('invites')
    .select('id, group_id, email, invited_by, token, status')
    .eq('id', body.inviteId)
    .maybeSingle()
  if (error) return json({ error: error.message }, 500)
  if (!inv) return json({ error: 'Invite not found' }, 404)

  // Only the inviter may trigger the email for invites they created.
  if (inv.invited_by !== user.id) return new Response('Forbidden', { status: 403 })

  const link = `${appUrl}/?token=${inv.token}`

  // No API key configured (e.g. local dev) → skip sending, still return link.
  if (!resendApiKey) {
    return json({ ok: false, link, reason: 'email_not_configured' })
  }

  // Personalize: group name + inviter display name.
  const [{ data: group }, { data: inviter }] = await Promise.all([
    supabase.from('groups').select('name').eq('id', inv.group_id).maybeSingle(),
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', inv.invited_by)
      .maybeSingle()
  ])
  const groupName = group?.name ?? 'a shared list'
  const inviterName = inviter?.display_name || 'Someone'

  const subject = `${inviterName} invited you to join ${groupName} on DutyCalls`
  const text = `${inviterName} invited you to join "${groupName}" on DutyCalls.\n\nAccept the invite: ${link}\n\n(You must be signed in with ${inv.email} to accept.)`
  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
    <h2 style="margin:0 0 12px">${escapeHtml(inviterName)} invited you to join ${escapeHtml(groupName)} on DutyCalls</h2>
    <p style="margin:0 0 24px;color:#475569">
      You've been invited to collaborate on a shared task list.
    </p>
    <a href="${link}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
      Accept invite
    </a>
    <p style="margin:24px 0 0;color:#64748b;font-size:13px">
      You must be signed in with ${escapeHtml(inv.email)} to accept this invite.
    </p>
  </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`
    },
    body: JSON.stringify({ from: resendFrom, to: inv.email, subject, html, text })
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => 'unknown')
    return json({ error: `Resend error: ${detail}` }, 502)
  }

  return json({ ok: true, link })
})

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
