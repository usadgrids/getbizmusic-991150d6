// Server-only helper to enqueue a transactional email from trusted server
// contexts (webhooks, cron) — bypasses the auth-gated /lovable/email/transactional/send
// route by using supabaseAdmin directly. Renders the template server-side and
// enqueues via the same `enqueue_email` RPC the send route uses, so the
// existing queue dispatcher handles delivery, retries, and unsubscribe footer.
import * as React from 'react'
import { render } from 'react-email'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'GetBizMusic'
const SENDER_DOMAIN = 'notify.mail.usadgrids.com'
const FROM_DOMAIN = 'notify.mail.usadgrids.com'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function bytesToUuid(bytes: Uint8Array): string {
  const b = bytes.slice(0, 16)
  b[6] = (b[6] & 0x0f) | 0x50
  b[8] = (b[8] & 0x3f) | 0x80
  const hex = Array.from(b).map((value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

async function messageIdFromIdempotencyKey(idempotencyKey: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(idempotencyKey))
  return bytesToUuid(new Uint8Array(digest))
}

export async function enqueueTransactionalEmailInternal(input: {
  templateName: string
  recipientEmail: string
  templateData?: Record<string, unknown>
  idempotencyKey?: string
}): Promise<{ ok: boolean; reason?: string }> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

  const template = TEMPLATES[input.templateName]
  if (!template) return { ok: false, reason: `template ${input.templateName} not found` }

  const recipient = template.to || input.recipientEmail
  if (!recipient) return { ok: false, reason: 'no recipient' }
  const normalized = recipient.toLowerCase()

  const { data: suppressed } = await supabaseAdmin
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalized)
    .maybeSingle()
  if (suppressed) return { ok: false, reason: 'suppressed' }

  // Unsubscribe token (reuse existing or create)
  let unsubscribeToken: string
  const { data: existingToken } = await supabaseAdmin
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalized)
    .maybeSingle()

  if (existingToken?.token && !existingToken.used_at) {
    unsubscribeToken = existingToken.token as string
  } else {
    const fresh = generateToken()
    await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .upsert({ token: fresh, email: normalized }, { onConflict: 'email', ignoreDuplicates: true })
    const { data: readBack } = await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalized)
      .maybeSingle()
    unsubscribeToken = (readBack?.token as string) || fresh
  }

  const element = React.createElement(template.component, input.templateData || {})
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(input.templateData || {})
      : template.subject

  const idempotencyKey = input.idempotencyKey || crypto.randomUUID()
  const messageId = await messageIdFromIdempotencyKey(idempotencyKey)

  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: input.templateName,
    recipient_email: recipient,
    status: 'pending',
  })

  const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: input.templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: input.templateName,
      recipient_email: recipient,
      status: 'failed',
      error_message: enqueueError.message,
    })
    return { ok: false, reason: enqueueError.message }
  }

  return { ok: true }
}
