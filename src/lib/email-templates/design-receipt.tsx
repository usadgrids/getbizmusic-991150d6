import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  amountFormatted?: string
  orderNumber?: string
  billingEmail?: string
  intakeUrl?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

const DesignReceiptEmail = ({ amountFormatted, orderNumber, billingEmail, intakeUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment received — your professional ad design is on the way</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Get Biz Music — Pro Ad Design</Heading>
        </Section>
        <Section style={content}>
          <Heading as="h2" style={h2}>Payment received — thank you!</Heading>
          <Text style={p}>
            Your BizSpot Music–compliant ad design order is confirmed. Our team will get
            started as soon as we have your business details.
          </Text>

          <Section style={box}>
            <Text style={boxLabel}>Order summary</Text>
            <Text style={p}><strong>Service:</strong> Pro Ad Design (BizSpot Music–compliant)</Text>
            {amountFormatted ? <Text style={p}><strong>Amount:</strong> {amountFormatted} USD</Text> : null}
            {orderNumber ? <Text style={smallMuted}>Order #: {orderNumber}</Text> : null}
            {billingEmail ? <Text style={smallMuted}>Billing email: {billingEmail}</Text> : null}
          </Section>

          <Heading as="h3" style={h3}>Next step — send us your business info</Heading>
          <Text style={p}>
            Click the button below to share your logo, business name, services, phone, and
            any style preferences. It takes 2–3 minutes.
          </Text>
          {intakeUrl ? (
            <Section style={{ textAlign: 'center', margin: '18px 0' }}>
              <Button href={intakeUrl} style={ctaButton}>Send My Business Info</Button>
            </Section>
          ) : null}

          <Heading as="h3" style={h3}>What happens next</Heading>
          <Text style={p}>
            You'll receive your initial ad design for approval or revision within
            <strong> 72 hours</strong> of submitting your business info. Unlimited revisions
            are included until you give final approval.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>Questions? Just reply to this email.</Text>
          <Text style={footerSmall}>USADGRIDS NOVELTY ADVERTISING — A WINALL MEDIA LLC CREATIVE</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DesignReceiptEmail,
  subject: 'Payment received — Pro Ad Design',
  displayName: 'Pro Ad Design Receipt',
  previewData: {
    amountFormatted: '$49.95',
    orderNumber: 'cs_test_123',
    billingEmail: 'you@example.com',
    intakeUrl: 'https://www.getbizmusic.com/design/return?session_id=cs_test_123',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: NAVY }
const container: React.CSSProperties = { maxWidth: '600px', margin: '0 auto' }
const header: React.CSSProperties = { backgroundColor: NAVY, padding: '20px 25px', borderBottom: `4px solid ${GOLD}` }
const h1: React.CSSProperties = { color: '#ffffff', fontSize: '22px', margin: 0 }
const content: React.CSSProperties = { padding: '25px', fontFamily: 'Arial, sans-serif' }
const h2: React.CSSProperties = { color: NAVY, fontSize: '20px', marginTop: 0 }
const h3: React.CSSProperties = { color: NAVY, fontSize: '15px', marginTop: '18px', marginBottom: '8px' }
const p: React.CSSProperties = { fontSize: '14px', lineHeight: '22px', color: '#374151', margin: '10px 0' }
const box: React.CSSProperties = { backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px 16px', margin: '14px 0' }
const boxLabel: React.CSSProperties = { fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: NAVY, fontWeight: 700, margin: '0 0 4px 0' }
const smallMuted: React.CSSProperties = { fontSize: '12px', color: '#6b7280', margin: '2px 0' }
const ctaButton: React.CSSProperties = { backgroundColor: GOLD, color: NAVY, fontWeight: 700, padding: '12px 22px', borderRadius: '6px', textDecoration: 'none', fontSize: '15px', display: 'inline-block' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '22px 0' }
const footer: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '10px 0' }
const footerSmall: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }
