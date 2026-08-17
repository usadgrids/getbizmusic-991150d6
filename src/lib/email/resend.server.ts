// Central Resend sending layer. ALL outgoing email in this project goes
// through here. Brevo and the Mailgun-backed Lovable queue are no longer used.
//
// Resend is gateway-backed: requests are proxied through the Lovable connector
// gateway, which injects the real Resend API key upstream.

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

/** Verified sending identity. Replies must land in a real inbox. */
export const FROM_NAME = 'GetBizMusic'
export const FROM_EMAIL = 'ralph@getbizmusic.com'
export const REPLY_TO_EMAIL = 'ralph@getbizmusic.com'
export const FROM_HEADER = `${FROM_NAME} <${FROM_EMAIL}>`

export const SITE_URL = 'https://www.getbizmusic.com'
export const MAILING_ADDRESS = 'GetBizMusic.com · PO Box 254, National City, CA 91951'

export interface ResendMessage {
  to: string | string[]
  subject: string
  html: string
  text?: string
  /** Extra headers, e.g. List-Unsubscribe for bulk mail. */
  headers?: Record<string, string>
  tags?: Array<{ name: string; value: string }>
  /** Override the From display name only (address stays verified). */
  fromName?: string
  /** File attachments (base64 content). Not supported by the batch endpoint. */
  attachments?: Array<{ filename: string; content: string; contentType?: string }>
}

function buildPayload(msg: ResendMessage) {
  return {
    from: msg.fromName ? `${msg.fromName} <${FROM_EMAIL}>` : FROM_HEADER,
    // reply_to is set explicitly on EVERY email so replies reach a real inbox.
    reply_to: REPLY_TO_EMAIL,
    to: Array.isArray(msg.to) ? msg.to : [msg.to],
    subject: msg.subject,
    html: msg.html,
    ...(msg.text ? { text: msg.text } : {}),
    ...(msg.headers ? { headers: msg.headers } : {}),
    ...(msg.tags ? { tags: msg.tags } : {}),
    ...(msg.attachments?.length
      ? {
          attachments: msg.attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            ...(a.contentType ? { content_type: a.contentType } : {}),
          })),
        }
      : {}),
  }
}

async function resendFetch(path: string, body: unknown) {
  const lovableKey = process.env.LOVABLE_API_KEY
  const resendKey = process.env.RESEND_API_KEY
  if (!lovableKey || !resendKey) {
    throw new Error('Resend credentials missing (LOVABLE_API_KEY / RESEND_API_KEY).')
  }

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': resendKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    console.error(`Resend request failed [${res.status}]: ${errorBody}`)
    throw new Error(`Resend request failed [${res.status}]: ${errorBody}`)
  }
  return res.json()
}

/** Send a single email. Returns the Resend message id. */
export async function sendResendEmail(msg: ResendMessage): Promise<{ id: string }> {
  const body = (await resendFetch('/emails', buildPayload(msg))) as { id?: string }
  return { id: body?.id ?? '' }
}

/**
 * Send up to 100 emails in one request. Resend's batch endpoint does not
 * support attachments or tags; headers and reply_to are supported.
 */
export async function sendResendBatch(
  messages: ResendMessage[],
): Promise<Array<{ id: string }>> {
  if (!messages.length) return []
  const chunks: ResendMessage[][] = []
  for (let i = 0; i < messages.length; i += 100) chunks.push(messages.slice(i, i + 100))

  const out: Array<{ id: string }> = []
  for (const chunk of chunks) {
    const body = (await resendFetch(
      '/emails/batch',
      chunk.map((m) => {
        const p = buildPayload(m) as Record<string, unknown>
        delete p.tags
        return p
      }),
    )) as { data?: Array<{ id?: string }> }
    for (const item of body?.data ?? []) out.push({ id: item?.id ?? '' })
  }
  return out
}

/** RFC 8058 one-click unsubscribe headers for bulk/marketing mail. */
export function unsubscribeHeaders(token: string): Record<string, string> {
  const url = `${SITE_URL}/email/unsubscribe?token=${encodeURIComponent(token)}`
  return {
    'List-Unsubscribe': `<${url}>, <mailto:${REPLY_TO_EMAIL}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

export function unsubscribeUrl(token: string): string {
  return `${SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`
}

/** 32-byte hex token. */
export function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function bytesToUuid(bytes: Uint8Array): string {
  const b = bytes.slice(0, 16)
  b[6] = (b[6] & 0x0f) | 0x50
  b[8] = (b[8] & 0x3f) | 0x80
  const hex = Array.from(b)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export async function messageIdFromIdempotencyKey(idempotencyKey: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(idempotencyKey))
  return bytesToUuid(new Uint8Array(digest))
}

export function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***'
  return `${localPart[0]}***@${domain}`
}
