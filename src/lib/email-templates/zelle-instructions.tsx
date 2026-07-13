import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import { ProminentNotice } from './prominent-notice'
import type { TemplateEntry } from './registry'

interface Props {
  contactName?: string
  planLabel?: string
  rotationSeconds?: number
  amountFormatted?: string
  zellePhone?: string
  memoCode?: string
  submitUrl?: string
  designUrl?: string
  designPriceFormatted?: string
  repCode?: string | null
  discountFormatted?: string | null
  ownerName?: string
  businessName?: string
  phone?: string
  billingEmail?: string
  zelleQrUrl?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

const ZelleInstructionsEmail = ({
  contactName,
  planLabel,
  rotationSeconds,
  amountFormatted,
  zellePhone,
  memoCode,
  submitUrl,
  designUrl,
  designPriceFormatted,
  repCode,
  discountFormatted,
  ownerName,
  businessName,
  phone,
  billingEmail,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Send your Zelle payment — your ad spot is reserved</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Get Biz Music — Zelle Payment Instructions</Heading>
        </Section>

        <Section style={content}>
          <Heading as="h2" style={h2}>Your spot is reserved — please send your Zelle payment</Heading>
          <Text style={p}>
            Hi {contactName || ownerName || 'there'}, thank you for choosing Get Biz Music!
            Your <strong>{planLabel || 'ad spot'}</strong> is reserved. To activate it,
            please send your payment via Zelle using the details below.
          </Text>

          <Section style={zelleBox}>
            <Text style={zelleLabel}>Send Zelle payment to</Text>
            <Text style={zellePhoneStyle}>{zellePhone || '619-707-0467'}</Text>
            <Text style={zelleSub}>WINALL MEDIA LLC (Get Biz Music)</Text>

            <table style={amountTable} cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td style={amtLabel}>Amount</td>
                  <td style={amtValue}><strong style={{ fontSize: '20px', color: NAVY }}>{amountFormatted}</strong></td>
                </tr>
                {memoCode ? (
                  <tr>
                    <td style={amtLabel}>Memo / Note</td>
                    <td style={amtValue}><strong>Order {memoCode}</strong></td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <Text style={zelleHint}>
              Please include the memo above so we can match your payment to your order.
            </Text>
          </Section>

          <Section style={orderBox}>
            <Text style={orderTitle}>Order Summary</Text>
            <table style={receiptTable} cellPadding={0} cellSpacing={0}>
              <tbody>
                {planLabel ? <tr><td style={tdLabel}>Plan</td><td style={tdValue}>{planLabel}</td></tr> : null}
                {typeof rotationSeconds === 'number' ? (
                  <tr><td style={tdLabel}>Rotation</td><td style={tdValue}><strong>{rotationSeconds} seconds</strong> per rotation, 1 year</td></tr>
                ) : null}
                {repCode ? (
                  <tr><td style={tdLabel}>Rep Code</td><td style={tdValue}>{repCode}{discountFormatted ? ` — you saved ${discountFormatted}` : ''}</td></tr>
                ) : null}
                {businessName ? <tr><td style={tdLabel}>Business</td><td style={tdValue}>{businessName}</td></tr> : null}
                {ownerName ? <tr><td style={tdLabel}>Owner</td><td style={tdValue}>{ownerName}</td></tr> : null}
                {phone ? <tr><td style={tdLabel}>Phone</td><td style={tdValue}>{phone}</td></tr> : null}
                {billingEmail ? <tr><td style={tdLabel}>Email</td><td style={tdValue}>{billingEmail}</td></tr> : null}
                <tr><td style={tdLabel}>Status</td><td style={tdValue}><strong style={{ color: '#b45309' }}>AWAITING ZELLE PAYMENT</strong></td></tr>
              </tbody>
            </table>
          </Section>

          <Section style={ctaBox}>
            <Text style={ctaLabel}>Ready to upload your ad? Use your submission link</Text>
            <Text style={p}>
              You can submit your ad artwork now — it will go live once we confirm your Zelle payment
              (usually within 24 hours).
            </Text>
            {submitUrl ? (
              <Button href={submitUrl} style={ctaButton}>Submit Your Ad</Button>
            ) : null}
            {submitUrl ? (
              <Text style={smallLink}>
                Or copy this link:<br />
                <span style={{ wordBreak: 'break-all' }}>{submitUrl}</span>
              </Text>
            ) : null}
          </Section>

          <Section style={proBox}>
            <Text style={proHeading}>Not ready to design it yourself?</Text>
            <Text style={proBody}>
              Let our team professionally design your Get Biz Music ad for you — guaranteed to meet
              spec and pass compliance review. Just <strong>{designPriceFormatted || '$49.95'}</strong>,
              one-time.
            </Text>
            {designUrl ? (
              <Button href={designUrl} style={proButton}>
                Yes — Design My Ad for {designPriceFormatted || '$49.95'}
              </Button>
            ) : null}
          </Section>

          <Hr style={hr} />

          <Heading as="h3" style={h3}>How Zelle works</Heading>
          <Text style={p}>
            1. Open your bank's mobile app or website and find <strong>Zelle</strong> (Send Money).<br />
            2. Send <strong>{amountFormatted}</strong> to <strong>{zellePhone || '619-707-0467'}</strong>.<br />
            3. Add memo: <strong>Order {memoCode || 'your order code'}</strong>.<br />
            4. We'll confirm receipt and activate your ad — usually within 24 hours.
          </Text>
          <Text style={pSmall}>
            Zelle is free at most U.S. banks. No app download is required if your bank supports it.
          </Text>

          <Hr style={hr} />

          <Section style={disclosureBox}>
            <Heading as="h3" style={h3}>No-Refund Policy — Acknowledged at Checkout</Heading>
            <Text style={p}>
              Before completing this order, you were notified of and expressly agreed to our
              <strong> NO REFUND POLICY</strong>. All sales are final and non-refundable, in
              accordance with <strong>California Civil Code § 1723</strong>.
            </Text>
          </Section>

          <ProminentNotice />
          <Text style={footer}>Questions about your order? Reply to this email.</Text>
          <Text style={footerSmall}>USADGRIDS NOVELTY ADVERTISING — A WINALL MEDIA LLC CREATIVE</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ZelleInstructionsEmail,
  subject: 'Zelle payment instructions — Get Biz Music ad spot',
  displayName: 'Zelle Payment Instructions',
  previewData: {
    contactName: 'Tony',
    planLabel: 'Featured Slider Ad',
    rotationSeconds: 10,
    amountFormatted: '$48.00',
    zellePhone: '619-707-0467',
    memoCode: 'A1B2C3D4',
    submitUrl: 'https://www.getbizmusic.com/submit?token=example-token',
    designUrl: 'https://www.getbizmusic.com/design',
    designPriceFormatted: '$49.95',
    repCode: null,
    discountFormatted: null,
    ownerName: 'Tony Vasquez',
    businessName: 'Tony\'s Auto',
    phone: '619-555-1212',
    billingEmail: 'tony@example.com',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: NAVY }
const container: React.CSSProperties = { maxWidth: '600px', margin: '0 auto' }
const header: React.CSSProperties = { backgroundColor: NAVY, padding: '20px 25px', borderBottom: `4px solid ${GOLD}` }
const h1: React.CSSProperties = { color: '#ffffff', fontSize: '22px', margin: 0 }
const content: React.CSSProperties = { padding: '25px', fontFamily: 'Arial, sans-serif' }
const h2: React.CSSProperties = { color: NAVY, fontSize: '20px', marginTop: 0 }
const h3: React.CSSProperties = { color: NAVY, fontSize: '15px', marginTop: '16px', marginBottom: '8px' }
const p: React.CSSProperties = { fontSize: '14px', lineHeight: '22px', color: '#374151', margin: '10px 0' }
const pSmall: React.CSSProperties = { fontSize: '12px', lineHeight: '18px', color: '#6b7280', margin: '6px 0' }
const zelleBox: React.CSSProperties = {
  backgroundColor: '#F0F7FF', border: `2px solid #6D28D9`, borderRadius: '10px',
  padding: '20px', margin: '18px 0', textAlign: 'center' as const,
}
const zelleLabel: React.CSSProperties = { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6D28D9', fontWeight: 700, margin: '0 0 4px 0' }
const zellePhoneStyle: React.CSSProperties = { fontSize: '28px', fontWeight: 800, color: NAVY, margin: '4px 0', letterSpacing: '0.02em' }
const zelleSub: React.CSSProperties = { fontSize: '12px', color: '#4b5563', margin: '0 0 12px 0' }
const zelleHint: React.CSSProperties = { fontSize: '12px', color: '#6b7280', margin: '10px 0 0 0', fontStyle: 'italic' }
const amountTable: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' as const, marginTop: '10px' }
const amtLabel: React.CSSProperties = { padding: '6px 8px 6px 0', color: '#6b7280', fontSize: '12px', textAlign: 'left' as const, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
const amtValue: React.CSSProperties = { padding: '6px 0', color: '#111827', fontSize: '14px', textAlign: 'right' as const }
const orderBox: React.CSSProperties = { border: `1px solid #E2E8F0`, borderRadius: '8px', padding: '16px 18px', margin: '16px 0' }
const orderTitle: React.CSSProperties = { fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: NAVY, fontWeight: 700, margin: '0 0 10px 0', borderBottom: `2px solid ${GOLD}`, paddingBottom: '6px' }
const receiptTable: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' }
const tdLabel: React.CSSProperties = { padding: '6px 8px 6px 0', color: '#6b7280', verticalAlign: 'top', width: '38%', borderBottom: '1px solid #f1f5f9' }
const tdValue: React.CSSProperties = { padding: '6px 0', color: '#111827', verticalAlign: 'top', borderBottom: '1px solid #f1f5f9', wordBreak: 'break-all' }
const ctaBox: React.CSSProperties = { backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '18px', margin: '18px 0', textAlign: 'center' as const }
const ctaLabel: React.CSSProperties = { fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: NAVY, fontWeight: 700, margin: '0 0 6px 0' }
const ctaButton: React.CSSProperties = { backgroundColor: GOLD, color: NAVY, fontWeight: 700, padding: '12px 22px', borderRadius: '6px', textDecoration: 'none', fontSize: '15px', display: 'inline-block', margin: '10px 0' }
const smallLink: React.CSSProperties = { fontSize: '12px', color: '#6b7280', margin: '8px 0 0 0' }
const proBox: React.CSSProperties = { backgroundColor: '#FFF8EC', border: `2px solid ${GOLD}`, borderRadius: '10px', padding: '18px', margin: '18px 0', textAlign: 'center' as const }
const proHeading: React.CSSProperties = { fontSize: '15px', color: NAVY, fontWeight: 700, margin: '0 0 8px 0' }
const proBody: React.CSSProperties = { fontSize: '14px', lineHeight: '22px', color: '#3a2f1c', margin: '0 0 12px 0' }
const proButton: React.CSSProperties = { backgroundColor: NAVY, color: '#ffffff', fontWeight: 700, padding: '12px 22px', borderRadius: '6px', textDecoration: 'none', fontSize: '15px', display: 'inline-block' }
const disclosureBox: React.CSSProperties = { backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', padding: '14px 16px', margin: '10px 0' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '22px 0' }
const footer: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '10px 0' }
const footerSmall: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }
