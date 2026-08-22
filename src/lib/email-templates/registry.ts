import type { ComponentType } from 'react'
import { template as adRejectionTemplate } from './ad-rejection'
import { template as paymentReceiptTemplate } from './payment-receipt'
import { template as submissionReceivedTemplate } from './submission-received'
import { template as adApprovedTemplate } from './ad-approved'
import { template as submitReminderTemplate } from './submit-reminder'
import { template as cityRequestNotificationTemplate } from './city-request-notification'
import { template as designReceiptTemplate } from './design-receipt'
import { template as designIntakeLinkTemplate } from './design-intake-link'
import { template as designOrderNotificationTemplate } from './design-order-notification'
import { template as paidOrderNotificationTemplate } from './paid-order-notification'
import { template as zelleInstructionsTemplate } from './zelle-instructions'
import { template as activationReceiptTemplate } from './activation-receipt'
import { template as activationInstructionsTemplate } from './activation-instructions'
import { template as activationInvoiceTemplate } from './activation-invoice'
import { template as businessClaimConfirmationTemplate } from './business-claim-confirmation'
import { template as membershipRenewalReminderTemplate } from './membership-renewal-reminder'
import { template as membershipReceiptTemplate } from './membership-receipt'
import { template as membershipPendingVerificationTemplate } from './membership-pending-verification'
import { template as membershipPayLaterTemplate } from './membership-pay-later'
import { template as payLaterCancelledTemplate } from './pay-later-cancelled'
import { template as claimAuditCompleteTemplate } from './claim-audit-complete'
import { template as quickpayReceiptTemplate } from './quickpay-receipt'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'ad-rejection': adRejectionTemplate,
  'payment-receipt': paymentReceiptTemplate,
  'submission-received': submissionReceivedTemplate,
  'ad-approved': adApprovedTemplate,
  'submit-reminder': submitReminderTemplate,
  'city-request-notification': cityRequestNotificationTemplate,
  'design-receipt': designReceiptTemplate,
  'design-intake-link': designIntakeLinkTemplate,
  'design-order-notification': designOrderNotificationTemplate,
  'paid-order-notification': paidOrderNotificationTemplate,
  'zelle-instructions': zelleInstructionsTemplate,
  'activation-receipt': activationReceiptTemplate,
  'activation-instructions': activationInstructionsTemplate,
  'activation-invoice': activationInvoiceTemplate,
  'business-claim-confirmation': businessClaimConfirmationTemplate,
  'membership-renewal-reminder': membershipRenewalReminderTemplate,
  'membership-receipt': membershipReceiptTemplate,
  'membership-pending-verification': membershipPendingVerificationTemplate,
  'membership-pay-later': membershipPayLaterTemplate,
  'pay-later-cancelled': payLaterCancelledTemplate,
  'claim-audit-complete': claimAuditCompleteTemplate,
  'quickpay-receipt': quickpayReceiptTemplate,
}
