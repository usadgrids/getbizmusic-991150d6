import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import { ProminentNotice } from './prominent-notice'
import type { TemplateEntry } from './registry'

interface Props {
  orderTypeLabel?: string
  customerEmail?: string
  planLabel?: string
  rotationSeconds?: number
  amountFormatted?: string
  orderNumber?: string
  paymentIntentId?: string
  paymentDate?: string
  cardholderName?: string
  cardBrand?: string
  cardLast4?: string
  receiptUrl?: string
  actionUrl?: string
  actionLabel?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

const Row = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <Text style={p}>
      <strong>{label}:</strong> {value}
    </Text>
  ) : null

const PaidOrderNotificationEmail = ({
  orderTypeLabel,
  customerEmail,
  planLabel,
  rotationSeconds,
  amountFormatted,
  orderNumber,
  paymentIntentId,
  paymentDate,
  cardholderName,
  cardBrand,
  cardLast4,
  receiptUrl,
  actionUrl,
  actionLabel,
}: Props) => {
  const cardLine =
    cardBrand || cardLast4
      ? `${cardBrand ? cardBrand.toUpperCase() : 'Card'}${cardLast4 ? ` ending in ${cardLast4}` : ''}`
      : null

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>New paid {orderTypeLabel || 'order'} — {customerEmail || 'unknown customer'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Get Biz Music — New Paid Order</Heading>
          </Section>
          <Section style={content}>
            <Section style={badge}>
              <Text style={badgeText}>PAID · {amountFormatted || '—'}</Text>
            </Section>
            <Heading as="h2" style={h2}>
              {orderTypeLabel || 'Order'} paid
            </Heading>

            <Text style={sectionLabel}>Customer & order</Text>
            <Row label="Order type" value={orderTypeLabel} />
            <Row label="Customer email" value={customerEmail} />
            <Row label="Plan / product" value={planLabel} />
            {typeof rotationSeconds === 'number' ? (
              <Row label="Rotation time" value={`${rotationSeconds} seconds`} />
            ) : null}
            <Row label="Amount" value={amountFormatted} />
            <Row label="Order / session ID" value={orderNumber} />
            <Row label="Transaction ID" value={paymentIntentId} />
            <Row label="Date & time" value={paymentDate} />

            <Hr style={hr} />
            <Text style={sectionLabel}>Payment method</Text>
            <Row label="Name on card" value={cardholderName} />
            <Row label="Card" value={cardLine} />
            {receiptUrl ? <Row label="Stripe receipt" value={receiptUrl} /> : null}

            {actionUrl ? (
              <>
                <Hr style={hr} />
                <Text style={sectionLabel}>Customer next step</Text>
                <Text style={p}>
                  <a href={actionUrl} style={{ color: NAVY, wordBreak: 'break-all' }}>
                    {actionLabel || actionUrl}
                  </a>
                </Text>
              </>
            ) : null}

            <Hr style={hr} />
            <ProminentNotice />
            <Text style={footer}>This order was paid and needs processing.</Text>
            <Text style={footerSmall}>USADGRIDS NOVELTY ADVERTISING — A WINALL MEDIA LLC CREATIVE</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PaidOrderNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New paid ${data.orderTypeLabel || 'order'} — ${data.customerEmail || 'Get Biz Music'}`,
  displayName: 'Paid Order — Processing Notification',
  to: 'processing@getbizmusic.com',
  previewData: {
    orderTypeLabel: 'Ad spot',
    customerEmail: 'tony@example.com',
    planLabel: 'Featured Slider Ad',
    rotationSeconds: 10,
    amountFormatted: '$24.00',
    orderNumber: 'cs_test_a1B2c3D4e5F6g7',
    paymentIntentId: 'pi_3Nxxxxx',
    paymentDate: 'July 7, 2026 at 3:42 PM PDT',
    cardholderName: 'Tony Vasquez',
    cardBrand: 'visa',
    cardLast4: '4242',
    receiptUrl: 'https://pay.stripe.com/receipts/example',
    actionUrl: 'https://www.getbizmusic.com/submit?token=example-token',
    actionLabel: 'Customer submission link',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: NAVY }
const container: React.CSSProperties = { maxWidth: '640px', margin: '0 auto' }
const header: React.CSSProperties = { backgroundColor: NAVY, padding: '20px 25px', borderBottom: `4px solid ${GOLD}` }
const h1: React.CSSProperties = { color: '#ffffff', fontSize: '22px', margin: 0 }
const content: React.CSSProperties = { padding: '25px', fontFamily: 'Arial, sans-serif' }
const badge: React.CSSProperties = { backgroundColor: GOLD, borderRadius: '6px', padding: '8px 12px', marginBottom: '14px' }
const badgeText: React.CSSProperties = { color: NAVY, fontSize: '12px', fontWeight: 700, margin: 0, letterSpacing: '0.05em' }
const h2: React.CSSProperties = { color: NAVY, fontSize: '20px', marginTop: 0 }
const sectionLabel: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 6px 0' }
const p: React.CSSProperties = { fontSize: '14px', lineHeight: '22px', color: '#374151', margin: '6px 0' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '18px 0' }
const footer: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '10px 0' }
const footerSmall: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }
