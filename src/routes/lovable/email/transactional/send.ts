import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'

// Authenticated transactional email endpoint. Sends via Resend.
export const Route = createFileRoute('/lovable/email/transactional/send')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseServiceKey) {
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const token = authHeader.slice('Bearer '.length).trim()
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(token)
        if (authError || !user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let body: Record<string, any>
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 })
        }

        const templateName: string = body.templateName || body.template_name
        const recipientEmail: string = body.recipientEmail || body.recipient_email
        const idempotencyKey: string | undefined = body.idempotencyKey || body.idempotency_key
        const templateData =
          body.templateData && typeof body.templateData === 'object' ? body.templateData : {}

        if (!templateName) {
          return Response.json({ error: 'templateName is required' }, { status: 400 })
        }

        const { enqueueTransactionalEmailInternal } = await import('@/lib/email/enqueue.server')
        const result = await enqueueTransactionalEmailInternal({
          templateName,
          recipientEmail,
          templateData,
          idempotencyKey,
        })

        if (!result.ok) {
          if (result.reason === 'suppressed') {
            return Response.json({ success: false, reason: 'email_suppressed' })
          }
          return Response.json({ error: result.reason ?? 'Failed to send email' }, { status: 500 })
        }

        return Response.json({ ok: true, success: true, messageId: result.messageId })
      },
    },
  },
})
