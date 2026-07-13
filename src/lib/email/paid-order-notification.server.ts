import { enqueueTransactionalEmailInternal } from './enqueue.server'

const SITE_URL = 'https://www.getbizmusic.com'

const PLAN_LABELS: Record<string, string> = {
  image_5: 'Standard Image Ad',
  slider_10: 'Featured Slider Ad',
}

const PLAN_SECONDS: Record<string, number> = {
  image_5: 7,
  slider_10: 10,
}

export async function sendPaidOrderNotificationToProcessing(params: {
  orderType: 'ad' | 'design'
  email: string
  plan?: string
  amountCents: number
  currency?: string | null
  sessionId: string
  submissionToken?: string | null
  paymentIntentId?: string | null
  receiptUrl?: string | null
  cardholderName?: string | null
  cardBrand?: string | null
  cardLast4?: string | null
  paidAtIso?: string | null
}): Promise<void> {
  try {
    const paymentDate = params.paidAtIso
      ? new Date(params.paidAtIso).toLocaleString('en-US', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'America/Los_Angeles',
        }) + ' PT'
      : undefined

    const isDesign = params.orderType === 'design'
    const planLabel = isDesign ? 'Pro Ad Design' : (PLAN_LABELS[params.plan ?? ''] ?? params.plan ?? 'Ad spot')
    const rotationSeconds = isDesign ? undefined : PLAN_SECONDS[params.plan ?? '']
    const actionUrl = isDesign
      ? `${SITE_URL}/design/return?session_id=${params.sessionId}`
      : params.submissionToken
        ? `${SITE_URL}/submit?token=${params.submissionToken}`
        : undefined

    await enqueueTransactionalEmailInternal({
      templateName: 'paid-order-notification',
      recipientEmail: 'processing@getbizmusic.com',
      idempotencyKey: `paid-order-notification-${params.sessionId}`,
      templateData: {
        orderTypeLabel: isDesign ? 'Pro ad design' : 'Ad spot',
        customerEmail: params.email,
        planLabel,
        rotationSeconds,
        amountFormatted: `$${(params.amountCents / 100).toFixed(2)}`,
        orderNumber: params.sessionId,
        paymentIntentId: params.paymentIntentId ?? undefined,
        paymentDate,
        cardholderName: params.cardholderName ?? undefined,
        cardBrand: params.cardBrand ?? undefined,
        cardLast4: params.cardLast4 ?? undefined,
        receiptUrl: params.receiptUrl ?? undefined,
        actionUrl,
        actionLabel: isDesign ? 'Customer intake link' : 'Customer submission link',
      },
    })
  } catch (e) {
    console.error('paid-order-notification enqueue failed:', e)
  }
}
