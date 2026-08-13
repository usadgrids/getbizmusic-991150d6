import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from '@react-email/components'
import { ProminentNotice } from './prominent-notice'
import type { TemplateEntry } from './registry'

interface Props {
  businessName?: string
  activationCode?: string
  amountFormatted?: string
  invoiceNumber?: string
  dueDateFormatted?: string
  payNowUrl?: string
  zellePhone?: string
  venmoHandle?: string
  zelleQrUrl?: string
  artworkPending?: boolean
  artworkUploadUrl?: string
  correctionsRequested?: boolean
  correctionNotes?: string | null
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

const ActivationInvoiceEmail = ({
  businessName,
  activationCode,
  amountFormatted,
  invoiceNumber,
  dueDateFormatted,
  payNowUrl,
  zellePhone,
  venmoHandle,
  zelleQrUrl,
  artworkPending,
  artworkUploadUrl,
  correctionsRequested,
  correctionNotes,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Thank you for your order — your GetBizMusic invoice</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Get Biz Music — Invoice</Heading>
        </Section>
        <Section style={content}>
          <Heading as="h2" style={h2}>Thank you for your order{businessName ? `, ${businessName}` : ''}!</Heading>
          <Text style={p}>
            Your ad is being published. <strong>You have been billed</strong> — please pay at your earliest
            convenience. Payment is due by <strong>{dueDateFormatted || 'the date shown below'}</strong>.
          </Text>

          <Section style={box}>
            <Text style={row}><strong>Invoice number:</strong> {invoiceNumber || '—'}</Text>
            <Text style={row}><strong>Activation code:</strong> {activationCode || '—'}</Text>
            <Text style={row}><strong>Amount due:</strong> {amountFormatted || '—'}</Text>
            <Text style={row}><strong>Due date:</strong> {dueDateFormatted || '—'}</Text>
          </Section>

          {payNowUrl ? (
            <Section style={{ textAlign: 'center', margin: '22px 0' }}>
              <Link href={payNowUrl} style={button}>Pay Now by Card / Debit / Credit</Link>
            </Section>
          ) : null}

          <Section style={payBox}>
            <Text style={payTitle}>Prefer Zelle or Venmo?</Text>
            {zellePhone ? (
              <Text style={row}><strong>Zelle:</strong> {zellePhone} (WINALL MEDIA LLC)</Text>
            ) : null}
            {venmoHandle ? <Text style={row}><strong>Venmo:</strong> {venmoHandle}</Text> : null}
            <Text style={row}>
              Please include <strong>{invoiceNumber || activationCode}</strong> in the memo so we can match your payment.
            </Text>
            {zelleQrUrl ? (
              <Section style={{ textAlign: 'center', marginTop: '12px' }}>
                <img src={zelleQrUrl} alt="Zelle QR code" width="180" height="180" style={{ borderRadius: '10px' }} />
              </Section>
            ) : null}
          </Section>

          {artworkPending && artworkUploadUrl ? (
            <Section style={warnBox}>
              <Text style={warnTitle}>We still need your ad image</Text>
              <Text style={p}>
                Upload your ad artwork here whenever you're ready:{' '}
                <Link href={artworkUploadUrl} style={{ color: NAVY }}>{artworkUploadUrl}</Link>
              </Text>
            </Section>
          ) : null}

          {correctionsRequested ? (
            <Section style={warnBox}>
              <Text style={warnTitle}>Your requested corrections</Text>
              <Text style={p}>{correctionNotes || 'Corrections were requested.'}</Text>
            </Section>
          ) : null}

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
  component: ActivationInvoiceEmail,
  subject: 'Thank you for your order — your GetBizMusic invoice',
  displayName: 'Activation Invoice (Bill Me)',
  previewData: {
    businessName: 'AM Legal Services',
    activationCode: 'AMLEGAL49',
    amountFormatted: '$48.00',
    invoiceNumber: 'INV-AMLEGAL49-4821',
    dueDateFormatted: 'August 20, 2026',
    payNowUrl: 'https://www.getbizmusic.com/activate?code=AMLEGAL49',
    zellePhone: '619-707-0467',
    venmoHandle: '@RTPosadas',
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
const payBox: React.CSSProperties = { backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '8px', padding: '16px', margin: '18px 0' }
const payTitle: React.CSSProperties = { fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5B21B6', fontWeight: 700, margin: '0 0 6px 0' }
const row: React.CSSProperties = { fontSize: '13px', color: '#374151', margin: '4px 0' }
const button: React.CSSProperties = { backgroundColor: GOLD, color: NAVY, fontWeight: 700, padding: '12px 22px', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', display: 'inline-block' }
const warnBox: React.CSSProperties = { backgroundColor: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: '8px', padding: '16px', margin: '18px 0' }
const warnTitle: React.CSSProperties = { fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9A3412', fontWeight: 700, margin: '0 0 6px 0' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '22px 0' }
const footer: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '10px 0' }
const footerSmall: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }
