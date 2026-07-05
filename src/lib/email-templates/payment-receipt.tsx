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
  amountFormatted?: string
  submitUrl?: string
  receiptUrl?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

const PaymentReceiptEmail = ({
  contactName,
  planLabel,
  amountFormatted,
  submitUrl,
  receiptUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment received — submit your BizSpot Directory ad</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>BizSpot Directory — National City</Heading>
        </Section>

        <Section style={content}>
          <Heading as="h2" style={h2}>Payment received — thank you!</Heading>
          <Text style={p}>Hi {contactName || 'there'},</Text>
          <Text style={p}>
            We've received your payment for <strong>{planLabel || 'your ad plan'}</strong>
            {amountFormatted ? <> — <strong>{amountFormatted}</strong></> : null}.
            Your one-year novelty ad spot is reserved.
          </Text>

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
          </Section>

          <Hr style={hr} />

          <Heading as="h3" style={h3}>Reminder — what you agreed to</Heading>
          <Text style={p}>
            This is a fun novelty ad spot with <strong>no guaranteed views, plays,
            impressions, sales, or foot traffic</strong>. All sales are final and
            non-refundable, as disclosed before checkout (California Civil Code § 1723).
          </Text>

          {receiptUrl ? (
            <Text style={p}>
              A Stripe receipt is also available here:{' '}
              <a href={receiptUrl} style={{ color: NAVY }}>{receiptUrl}</a>
            </Text>
          ) : null}

          <Hr style={hr} />
          <Text style={footer}>
            Questions? Just reply to this email and our team will respond within 24 hours.
          </Text>
          <Text style={footerSmall}>
            USADGRIDS NOVELTY ADVERTISING — A WINALL MEDIA LLC CREATIVE
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentReceiptEmail,
  subject: 'Payment received — submit your BizSpot Directory ad',
  displayName: 'Payment Receipt & Submission Link',
  previewData: {
    contactName: 'Tony',
    planLabel: 'Standard Image Ad',
    amountFormatted: '$12.00',
    submitUrl: 'https://bizspotmusicad.lovable.app/submit?token=example-token',
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
const h3: React.CSSProperties = { color: NAVY, fontSize: '15px', marginTop: '16px', marginBottom: '8px' }
const p: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#374151',
  margin: '10px 0',
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
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '22px 0' }
const footer: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '10px 0' }
const footerSmall: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }
