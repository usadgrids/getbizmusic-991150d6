// Campaign sending for the B2B `leads` table, powered by Resend.
//
// Resend has no list/campaign builder, so the list IS our `leads` table and the
// send loop lives here. Resend also does NOT handle unsubscribe or CAN-SPAM
// automatically — the physical mailing address footer, the unsubscribe link,
// the RFC 8058 one-click headers, and the suppression check below are all ours.
import {
  MAILING_ADDRESS,
  REPLY_TO_EMAIL,
  generateToken,
  sendResendBatch,
  unsubscribeHeaders,
  unsubscribeUrl,
} from './resend.server'
import type { ResendMessage } from './resend.server'

const PRIMARY_CITY = 'National City'

export interface CampaignLead {
  id: string
  email: string
  business_name?: string | null
  owner_name?: string | null
  city?: string | null
  unsubscribe_token?: string | null
}

/** Merge-tag substitution for the admin-authored HTML. */
export function personalize(html: string, lead: CampaignLead): string {
  const firstName = (lead.owner_name ?? '').trim().split(/\s+/)[0] || 'there'
  const map: Record<string, string> = {
    business_name: lead.business_name ?? 'your business',
    owner_name: lead.owner_name ?? 'there',
    first_name: firstName,
    city: lead.city ?? PRIMARY_CITY,
    email: lead.email,
  }
  return html.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (full, key: string) => {
    const value = map[key.toLowerCase()]
    return value === undefined ? full : escapeHtml(value)
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** CAN-SPAM footer: who we are, physical address, working unsubscribe link. */
export function buildFinalHtml(htmlContent: string, unsubToken: string): string {
  const link = unsubscribeUrl(unsubToken)
  const footer = `
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.5;">
        <p style="margin:0 0 6px;">You are receiving this because your business was identified as a newly founded ${PRIMARY_CITY}-area business.</p>
        <p style="margin:0 0 6px;">${MAILING_ADDRESS}</p>
        <p style="margin:0 0 6px;">Questions? Just reply to this email — it goes straight to ${REPLY_TO_EMAIL}.</p>
        <p style="margin:0;"><a href="${link}" style="color:#2563eb;">Unsubscribe from these emails</a></p>
      </div>`
  return `${htmlContent}${footer}`
}

/** Ensure each lead has a stable unsubscribe token stored on its row. */
export async function ensureUnsubscribeTokens(
  supabaseAdmin: any,
  leads: CampaignLead[],
): Promise<Map<string, string>> {
  const tokens = new Map<string, string>()
  for (const lead of leads) {
    if (lead.unsubscribe_token) {
      tokens.set(lead.id, lead.unsubscribe_token)
      continue
    }
    const token = generateToken()
    const { error } = await supabaseAdmin
      .from('leads')
      .update({ unsubscribe_token: token })
      .eq('id', lead.id)
    if (!error) tokens.set(lead.id, token)
  }
  return tokens
}

export interface CampaignSendResult {
  sent: number
  failed: number
  skipped_suppressed: number
}

export async function sendCampaignToLeads(params: {
  supabaseAdmin: any
  leads: CampaignLead[]
  subject: string
  htmlContent: string
}): Promise<CampaignSendResult> {
  const { supabaseAdmin, leads, subject, htmlContent } = params

  // Global suppression list wins over everything.
  const { data: suppressedRows } = await supabaseAdmin
    .from('suppressed_emails')
    .select('email')
  const suppressed = new Set(
    (suppressedRows ?? []).map((r: { email: string }) => r.email.toLowerCase()),
  )

  const eligible = leads.filter((l) => !suppressed.has(l.email.toLowerCase()))
  const skipped = leads.length - eligible.length
  if (!eligible.length) return { sent: 0, failed: 0, skipped_suppressed: skipped }

  const tokens = await ensureUnsubscribeTokens(supabaseAdmin, eligible)

  let sent = 0
  let failed = 0
  const CHUNK = 100

  for (let i = 0; i < eligible.length; i += CHUNK) {
    const chunk = eligible.filter((_, idx) => idx >= i && idx < i + CHUNK)
    const messages: ResendMessage[] = []
    const chunkLeads: CampaignLead[] = []

    for (const lead of chunk) {
      const token = tokens.get(lead.id)
      if (!token) {
        failed++
        continue
      }
      messages.push({
        to: lead.email,
        subject,
        html: buildFinalHtml(personalize(htmlContent, lead), token),
        headers: unsubscribeHeaders(token),
      })
      chunkLeads.push(lead)
    }

    if (!messages.length) continue

    try {
      const results = await sendResendBatch(messages)
      const now = new Date().toISOString()
      for (let j = 0; j < chunkLeads.length; j++) {
        const lead = chunkLeads[j]
        await supabaseAdmin
          .from('leads')
          .update({
            campaign_status: 'sent',
            sent_at: now,
            last_event_at: now,
            resend_message_id: results[j]?.id ?? null,
          })
          .eq('id', lead.id)
        sent++
      }
    } catch (err) {
      console.error('Resend campaign batch failed', err)
      failed += messages.length
    }
  }

  return { sent, failed, skipped_suppressed: skipped }
}
