// Server-only transactional email sender. Sends directly through Resend.
//
// Historically this enqueued into a pgmq queue processed by a Mailgun-backed
// dispatcher. All sending now goes through Resend. The exported name is kept
// so every existing call site (claims, activation, design orders, paid order
// notifications, reminders, etc.) continues to work unchanged.
import * as React from 'react'
import { render } from 'react-email'
import { TEMPLATES } from '@/lib/email-templates/registry'
import {
  messageIdFromIdempotencyKey,
  redactEmail,
  sendResendEmail,
} from './resend.server'

export async function enqueueTransactionalEmailInternal(input: {
  templateName: string
  recipientEmail: string
  templateData?: Record<string, unknown>
  idempotencyKey?: string
}): Promise<{ ok: boolean; reason?: string; messageId?: string }> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

  const template = TEMPLATES[input.templateName]
  if (!template) return { ok: false, reason: `template ${input.templateName} not found` }

  const recipient = template.to || input.recipientEmail
  if (!recipient) return { ok: false, reason: 'no recipient' }
  const normalized = recipient.toLowerCase()

  // Suppression is fail-closed: unsubscribed / bounced addresses never get mail.
  const { data: suppressed, error: suppressionError } = await supabaseAdmin
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalized)
    .maybeSingle()
  if (suppressionError) return { ok: false, reason: 'suppression check failed' }
  if (suppressed) return { ok: false, reason: 'suppressed' }

  const element = React.createElement(template.component, input.templateData || {})
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(input.templateData || {})
      : template.subject

  const idempotencyKey = input.idempotencyKey || crypto.randomUUID()
  const messageId = await messageIdFromIdempotencyKey(idempotencyKey)

  // Idempotency: if this exact key already sent, don't send twice.
  const { data: prior } = await supabaseAdmin
    .from('email_send_log')
    .select('id')
    .eq('message_id', messageId)
    .eq('status', 'sent')
    .maybeSingle()
  if (prior) return { ok: true, reason: 'already_sent', messageId }

  try {
    const result = await sendResendEmail({
      to: recipient,
      subject,
      html,
      text,
      tags: [{ name: 'template', value: input.templateName.slice(0, 50) }],
    })

    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: input.templateName,
      recipient_email: recipient,
      status: 'sent',
      provider_message_id: result.id || null,
    })

    return { ok: true, messageId }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    console.error('Resend transactional send failed', {
      templateName: input.templateName,
      recipient_redacted: redactEmail(recipient),
      reason,
    })
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: input.templateName,
      recipient_email: recipient,
      status: 'failed',
      error_message: reason.slice(0, 500),
    })
    return { ok: false, reason }
  }
}

/** Alias with a name that matches what it actually does now. */
export const sendTransactionalEmailInternal = enqueueTransactionalEmailInternal
