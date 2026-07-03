import { supabase } from '@/integrations/supabase/client'

export async function sendTransactionalEmail(input: {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, unknown>
}) {
  const { data: sess } = await supabase.auth.getSession()
  const token = sess.session?.access_token
  if (!token) throw new Error('Must be signed in to send email')

  const res = await fetch('/lovable/email/transactional/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Email send failed (${res.status})`)
  }
  return res.json() as Promise<{ ok: true; messageId?: string }>
}
