import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  contactName?: string
  planLabel?: string
  rotationSeconds?: number
  amountFormatted?: string
  submitUrl?: string
  receiptUrl?: string
  // Transaction detail fields
  orderNumber?: string
  paymentDate?: string // formatted date/time string
  cardholderName?: string
  cardBrand?: string
  cardLast4?: string
  paymentIntentId?: string
  currency?: string
  billingEmail?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

const PaymentReceiptEmail = ({
  contactName,
  planLabel,
  rotationSeconds,
  amountFormatted,
  submitUrl,
  receiptUrl,
  orderNumber,
  paymentDate,
  cardholderName,
  cardBrand,
  cardLast4,
  paymentIntentId,
  currency,
  billingEmail,
}: Props) => {
  const cardLine =
    cardBrand || cardLast4
      ? `${cardBrand ? cardBrand.toUpperCase() : 'Card'}${cardLast4 ? ` ending in ${cardLast4}` : ''}`
      : null

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Get Biz Music payment receipt & submission link</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Get Biz Music — Payment Receipt</Heading>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={h2}>Payment received — thank you!</Heading>
            <Text style={p}>Hi {contactName || 'there'},</Text>
            <Text style={p}>
              We've received your payment for <strong>{planLabel || 'your ad plan'}</strong>
              {amountFormatted ? <> — <strong>{amountFormatted}</strong></> : null}.
              Your one-year novelty ad spot is reserved.
            </Text>

            <Section style={receiptBox}>
              <Text style={receiptTitle}>Transaction Details</Text>
              <table style={receiptTable} cellPadding={0} cellSpacing={0}>
                <tbody>
                  {orderNumber ? (
                    <tr><td style={tdLabel}>Order / Session ID</td><td style={tdValue}>{orderNumber}</td></tr>
                  ) : null}
                  {paymentIntentId ? (
                    <tr><td style={tdLabel}>Transaction ID</td><td style={tdValue}>{paymentIntentId}</td></tr>
                  ) : null}
                  {paymentDate ? (
                    <tr><td style={tdLabel}>Date & Time</td><td style={tdValue}>{paymentDate}</td></tr>
                  ) : null}
                  {planLabel ? (
                    <tr><td style={tdLabel}>Item</td><td style={tdValue}>{planLabel} (1-year novelty ad spot)</td></tr>
                  ) : null}
                  {rotationSeconds ? (
                    <tr><td style={tdLabel}>Rotation Time</td><td style={tdValue}><strong>{rotationSeconds} seconds</strong> per rotation</td></tr>
                  ) : null}
                  {amountFormatted ? (
                    <tr><td style={tdLabel}>Amount Charged</td><td style={tdValue}><strong>{amountFormatted}{currency ? ` ${currency.toUpperCase()}` : ''}</strong></td></tr>
                  ) : null}
                  {cardholderName ? (
                    <tr><td style={tdLabel}>Name on Card</td><td style={tdValue}>{cardholderName}</td></tr>
                  ) : null}
                  {cardLine ? (
                    <tr><td style={tdLabel}>Payment Method</td><td style={tdValue}>{cardLine}</td></tr>
                  ) : null}
                  {billingEmail ? (
                    <tr><td style={tdLabel}>Billing Email</td><td style={tdValue}>{billingEmail}</td></tr>
                  ) : null}
                  <tr><td style={tdLabel}>Merchant</td><td style={tdValue}>WINALL MEDIA LLC (Get Biz Music)</td></tr>
                  <tr><td style={tdLabel}>Status</td><td style={tdValue}><strong style={{ color: '#059669' }}>PAID</strong></td></tr>
                </tbody>
              </table>
              {receiptUrl ? (
                <Text style={smallLink}>
                  Official Stripe receipt: <br />
                  <a href={receiptUrl} style={{ color: NAVY, wordBreak: 'break-all' }}>{receiptUrl}</a>
                </Text>
              ) : null}
            </Section>

            <Section style={ctaBox}>
              <Text style={ctaLabel}>Next step — upload your ad</Text>
              <Text style={p}>
                Click the button below to open your private submission link.
                Bookmark it — you'll need it to submit or update your ad.
              </Text>
              {submitUrl ? (
                <Button href={submitUrl} style={ctaButton}>Submit Your Ad</Button>
              ) : null}
              {submitUrl ? (
                <Text style={smallLink}>
                  Or copy this link: <br />
                  <span style={{ wordBreak: 'break-all' }}>{submitUrl}</span>
                </Text>
              ) : null}
              <Text style={{ ...p, fontSize: '13px', marginTop: '10px' }}>
                <strong>Note:</strong> A separate confirmation email will be sent once you
                successfully complete your ad submission — it will include your unique ad
                URL that you can share anywhere.
              </Text>
            </Section>

            <Hr style={hr} />

            <Section style={disclosureBox}>
              <Heading as="h3" style={h3}>No-Refund Policy — Acknowledged at Checkout</Heading>
              <Text style={p}>
                Before completing this purchase, you were notified of and expressly agreed to
                our <strong>NO REFUND POLICY</strong>. All sales are final and non-refundable.
              </Text>
              <Text style={p}>
                This disclosure was made in accordance with <strong>California Civil Code
                § 1723</strong>, which requires retail sellers to conspicuously disclose their
                refund policy prior to sale. You confirmed your agreement via checkbox at
                checkout, and this consent is recorded with a timestamp and IP address.
              </Text>
              <Text style={p}>
                This is a <strong>fun novelty ad spot</strong> with <strong>no guaranteed
                views, plays, impressions, sales, leads, or foot traffic</strong>. Your spot
                on the display was reserved for the full year at the time of purchase.
              </Text>
            </Section>

            <Hr style={hr} />
            <Text style={footer}>
              Questions about this receipt? Reply to this email and our team will respond
              within 24 hours.
            </Text>
            <Text style={footerSmall}>
              USADGRIDS NOVELTY ADVERTISING — A WINALL MEDIA LLC CREATIVE
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PaymentReceiptEmail,
  subject: 'Payment receipt & submission link — Get Biz Music',
  displayName: 'Payment Receipt & Submission Link',
  previewData: {
    contactName: 'Tony',
    planLabel: 'Featured Slider Ad',
    rotationSeconds: 10,
    amountFormatted: '$24.00',
    currency: 'usd',
    orderNumber: 'cs_test_a1B2c3D4e5F6g7',
    paymentIntentId: 'pi_3Nxxxxx',
    paymentDate: 'July 7, 2026 at 3:42 PM PDT',
    cardholderName: 'Tony Vasquez',
    cardBrand: 'visa',
    cardLast4: '4242',
    billingEmail: 'tony@example.com',
    submitUrl: 'https://www.getbizmusic.com/submit?token=example-token',
    receiptUrl: 'https://pay.stripe.com/receipts/example',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: 'Georgia, "Times New Roman", serif',
  color: NAVY,
}
const container: React.CSSProperties = { maxWidth: '600px', margin: '0 auto', padding: '0' }
const header: React.CSSProperties = {
  backgroundColor: NAVY,
  padding: '20px 25px',
  borderBottom: `4px solid ${GOLD}`,
}
const h1: React.CSSProperties = { color: '#ffffff', fontSize: '22px', margin: '0' }
const content: React.CSSProperties = { padding: '25px', fontFamily: 'Arial, sans-serif' }
const h2: React.CSSProperties = { color: NAVY, fontSize: '20px', marginTop: '0' }
const h3: React.CSSProperties = { color: NAVY, fontSize: '15px', marginTop: '0', marginBottom: '8px' }
const p: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#374151',
  margin: '10px 0',
}
const receiptBox: React.CSSProperties = {
  border: `1px solid #E2E8F0`,
  borderRadius: '8px',
  padding: '16px 18px',
  margin: '16px 0',
  backgroundColor: '#ffffff',
}
const receiptTitle: React.CSSProperties = {
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: NAVY,
  fontWeight: 700,
  margin: '0 0 10px 0',
  borderBottom: `2px solid ${GOLD}`,
  paddingBottom: '6px',
}
const receiptTable: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '13px',
}
const tdLabel: React.CSSProperties = {
  padding: '6px 8px 6px 0',
  color: '#6b7280',
  verticalAlign: 'top',
  width: '38%',
  borderBottom: '1px solid #f1f5f9',
}
const tdValue: React.CSSProperties = {
  padding: '6px 0',
  color: '#111827',
  verticalAlign: 'top',
  borderBottom: '1px solid #f1f5f9',
  wordBreak: 'break-all',
}
const ctaBox: React.CSSProperties = {
  backgroundColor: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: '8px',
  padding: '18px',
  margin: '18px 0',
  textAlign: 'center' as const,
}
const ctaLabel: React.CSSProperties = {
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: NAVY,
  fontWeight: 700,
  margin: '0 0 6px 0',
}
const ctaButton: React.CSSProperties = {
  backgroundColor: GOLD,
  color: NAVY,
  fontWeight: 700,
  padding: '12px 22px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '15px',
  display: 'inline-block',
  margin: '10px 0',
}
const smallLink: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '8px 0 0 0',
}
const disclosureBox: React.CSSProperties = {
  backgroundColor: '#FEF3C7',
  border: '1px solid #FCD34D',
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '10px 0',
}
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '22px 0' }
const footer: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '10px 0' }
const footerSmall: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }
