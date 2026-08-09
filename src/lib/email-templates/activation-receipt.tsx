import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import { ProminentNotice } from './prominent-notice'
import type { TemplateEntry } from './registry'

interface Props {
  businessName?: string
  activationCode?: string
  amountFormatted?: string
  paymentMethod?: string
  orderNumber?: string
  correctionsRequested?: boolean
  correctionNotes?: string | null
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

const ActivationReceiptEmail = ({
  businessName,
  activationCode,
  amountFormatted,
  paymentMethod,
  orderNumber,
  correctionsRequested,
  correctionNotes,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment received — we're perfecting your GetBizMusic ad</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Get Biz Music — Payment Received</Heading>
        </Section>
        <Section style={content}>
          <Heading as="h2" style={h2}>Thank you{businessName ? `, ${businessName}` : ''}!</Heading>
          <Text style={p}>
            We received your payment and our design team is now working on your ad to perfection.
            Please allow a few business days. You'll get a second email the moment your ad is
            <strong> live and activated</strong> on GetBizMusic.com.
          </Text>

          <Section style={box}>
            <Text style={row}><strong>Activation code:</strong> {activationCode || '—'}</Text>
            <Text style={row}><strong>Amount paid:</strong> {amountFormatted || '—'}</Text>
            <Text style={row}><strong>Payment method:</strong> {paymentMethod || '—'}</Text>
            <Text style={row}><strong>Order number:</strong> {orderNumber || '—'}</Text>
          </Section>

          {correctionsRequested ? (
            <Section style={warnBox}>
              <Text style={warnTitle}>Your requested corrections</Text>
              <Text style={p}>{correctionNotes || 'Corrections were requested.'}</Text>
              <Text style={small}>
                Our team will apply these changes and send the updated ad for your approval before it goes live.
              </Text>
            </Section>
          ) : (
            <Text style={p}>
              You approved the ad proof as-is, so we'll publish exactly what you reviewed.
            </Text>
          )}

          <Hr style={hr} />
          <ProminentNotice />
          <Text style={footer}>Questions? Just reply to this email.</Text>
          <Text style={footerSmall}>USADGRIDS NOVELTY ADVERTISING — A WINALL MEDIA LLC CREATIVE</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ActivationReceiptEmail,
  subject: 'Payment received — we are working on your GetBizMusic ad',
  displayName: 'Activation Receipt',
  previewData: {
    businessName: 'AM Legal Services',
    activationCode: 'AMLEGAL49',
    amountFormatted: '$48.00',
    paymentMethod: 'stripe',
    orderNumber: 'cs_test_123',
    correctionsRequested: false,
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: NAVY }
const container: React.CSSProperties = { maxWidth: '600px', margin: '0 auto' }
const header: React.CSSProperties = { backgroundColor: NAVY, padding: '20px 25px', borderBottom: `4px solid ${GOLD}` }
const h1: React.CSSProperties = { color: '#ffffff', fontSize: '22px', margin: 0 }
const content: React.CSSProperties = { padding: '25px', fontFamily: 'Arial, sans-serif' }
const h2: React.CSSProperties = { color: NAVY, fontSize: '20px', marginTop: 0 }
const p: React.CSSProperties = { fontSize: '14px', lineHeight: '22px', color: '#374151', margin: '10px 0' }
const box: React.CSSProperties = { backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', margin: '18px 0' }
const row: React.CSSProperties = { fontSize: '13px', color: '#374151', margin: '4px 0' }
const warnBox: React.CSSProperties = { backgroundColor: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: '8px', padding: '16px', margin: '18px 0' }
const warnTitle: React.CSSProperties = { fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9A3412', fontWeight: 700, margin: '0 0 6px 0' }
const small: React.CSSProperties = { fontSize: '12px', color: '#6b7280', margin: '8px 0 0 0' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '22px 0' }
const footer: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '10px 0' }
const footerSmall: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }
