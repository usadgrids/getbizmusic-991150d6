import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  ownerName?: string
  businessName?: string
  categoryLabel?: string
  amountFormatted?: string
  invoiceNumber?: string
  dueDateFormatted?: string
  payNowUrl?: string
  zellePhone?: string
  venmoHandle?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'
const EXPLORE_URL = 'https://www.getbizmusic.com/sdcounty'

const MembershipPayLaterEmail = ({
  ownerName,
  businessName,
  categoryLabel,
  amountFormatted,
  invoiceNumber,
  dueDateFormatted,
  payNowUrl,
  zellePhone,
  venmoHandle,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your membership is reserved — payment due by {dueDateFormatted || 'the due date'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>GetBizMusic</Text>
          <Text style={brandSub}>AI Business Alliance</Text>
        </Section>

        <Heading style={h1}>
          Your Membership is Reserved{ownerName ? `, ${ownerName}` : ''}
        </Heading>

        <Text style={text}>
          Thanks for joining the GetBizMusic AI Business Alliance
          {businessName ? ` for ${businessName}` : ''}. You chose{' '}
          <strong>Pay Later (Bill Me)</strong> as your payment method
          {amountFormatted ? ` for ${amountFormatted}` : ''}.
          Your ad submission link and spot are reserved — just send your payment and
          we&rsquo;ll activate everything once it&rsquo;s confirmed.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>Invoice details</Text>
          <Text style={row}><span style={labelStyle}>Invoice #</span> <strong>{invoiceNumber || '—'}</strong></Text>
          {businessName ? <Text style={row}><span style={labelStyle}>Business</span> <strong>{businessName}</strong></Text> : null}
          {categoryLabel ? <Text style={row}><span style={labelStyle}>Category</span> <strong>{categoryLabel}</strong></Text> : null}
          {amountFormatted ? <Text style={row}><span style={labelStyle}>Amount due</span> <strong>{amountFormatted}</strong></Text> : null}
          <Text style={row}><span style={labelStyle}>Due date</span> <strong>{dueDateFormatted || '—'}</strong></Text>
          <Text style={row}><span style={labelStyle}>Membership term</span> <strong>1 year (no auto-renew)</strong></Text>
        </Section>

        <Section style={warnBox}>
          <Text style={warnTitle}>Payment is due within 7 days</Text>
          <Text style={warnText}>
            If payment is not received within 7 days, your reservation will be automatically
            cancelled along with any Founding Member benefits, Priority Access Code price locks,
            or other promotional terms. You&rsquo;d then need to submit a new request at current
            pricing.
          </Text>
        </Section>

        {payNowUrl ? (
          <Section style={{ textAlign: 'center', margin: '22px 0' }}>
            <Button href={payNowUrl} style={ctaButton}>Pay Now by Card / Debit / Credit</Button>
          </Section>
        ) : null}

        <Section style={payBox}>
          <Text style={payTitle}>Prefer Zelle or Venmo?</Text>
          {zellePhone ? <Text style={row}><strong>Zelle:</strong> {zellePhone} (WINALL MEDIA LLC)</Text> : null}
          {venmoHandle ? <Text style={row}><strong>Venmo:</strong> {venmoHandle}</Text> : null}
          <Text style={row}>
            Please include <strong>{invoiceNumber || 'your invoice number'}</strong> in the memo so we
            can match your payment.
          </Text>
        </Section>

        <Hr style={hr} />

        <Text style={text}>
          Explore the GetBizMusic AI Business Alliance directory:{' '}
          <Link href={EXPLORE_URL} style={link}>{EXPLORE_URL}</Link>
        </Text>

        <Text style={footer}>
          Questions? Just reply to this email — it reaches us directly.
          <br />
          GetBizMusic.com · PO Box 254, National City, CA 91951
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MembershipPayLaterEmail,
  subject: (data: Record<string, any>) =>
    `Your membership is reserved${data?.ownerName ? `, ${data.ownerName}` : ''} — payment due ${data?.dueDateFormatted || 'soon'}`,
  displayName: 'Membership Pay Later Confirmation (Bill Me)',
  previewData: {
    ownerName: 'Ralph',
    businessName: 'Apex Auto Care',
    categoryLabel: 'Automotive',
    amountFormatted: '$49.95',
    invoiceNumber: 'GBM-PL-7F3A2C',
    dueDateFormatted: 'August 24, 2026',
    payNowUrl: 'https://www.getbizmusic.com/pricing',
    zellePhone: '619-707-0467',
    venmoHandle: '@RTPosadas',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 26px', maxWidth: '600px' }
const header = { borderBottom: '3px solid #D4A24C', paddingBottom: '10px', marginBottom: '18px' }
const brand = { margin: '0', fontSize: '22px', fontWeight: 'bold', color: NAVY }
const brandSub = { margin: '2px 0 0', fontSize: '12px', color: GOLD, letterSpacing: '1px' }
const h1 = { fontSize: '21px', color: NAVY, margin: '0 0 12px' }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#333333' }
const card = { backgroundColor: '#F7F9FC', border: '1px solid #E1E7EF', borderRadius: '10px', padding: '16px 18px', margin: '18px 0' }
const cardTitle = { margin: '0 0 10px', fontSize: '13px', fontWeight: 'bold', color: NAVY, textTransform: 'uppercase' as const, letterSpacing: '1px' }
const row = { margin: '0 0 6px', fontSize: '14px', color: '#333333' }
const labelStyle = { display: 'inline-block', width: '155px', color: '#5B6B80' }
const warnBox = { backgroundColor: '#FFF7E6', border: '1px solid #F0DDB4', borderRadius: '8px', padding: '12px 14px', margin: '18px 0' }
const warnTitle = { margin: '0 0 6px', fontSize: '13px', fontWeight: 'bold', color: NAVY }
const warnText = { fontSize: '14px', lineHeight: '1.6', color: NAVY, margin: '0' }
const payBox = { backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '8px', padding: '16px', margin: '18px 0' }
const payTitle = { fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: '#5B21B6', fontWeight: 700, margin: '0 0 6px' }
const hr = { borderColor: '#E1E7EF', margin: '22px 0' }
const link = { color: NAVY, fontWeight: 'bold' as const }
const ctaButton = { backgroundColor: GOLD, color: NAVY, fontWeight: 'bold', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontSize: '14px' }
const footer = { fontSize: '12px', color: '#7A889B', lineHeight: '1.6' }
