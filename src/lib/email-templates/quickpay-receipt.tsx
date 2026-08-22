import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  ownerName?: string
  businessName?: string
  amountFormatted?: string
  orderNumber?: string
  paymentDate?: string
  membershipDue?: string
}

const EXPLORE_URL = 'https://www.getbizmusic.com/sdcounty'

const Row = ({ label, value }: { label: string; value?: string }) =>
  value ? (
    <Text style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value}</span>
    </Text>
  ) : null

const Email = ({
  ownerName,
  businessName,
  amountFormatted,
  orderNumber,
  paymentDate,
  membershipDue,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your GetBizMusic AI Business Alliance membership receipt</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>GetBizMusic</Text>
          <Text style={brandSub}>AI Business Alliance</Text>
        </Section>

        <Heading style={h1}>Thank You{ownerName ? `, ${ownerName}` : ''}!</Heading>

        <Text style={text}>
          Your payment was received and your GetBizMusic AI Business Alliance one-year membership is
          confirmed.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>Order details</Text>
          <Row label="Order #" value={orderNumber} />
          <Row label="Business" value={businessName} />
          <Row label="Membership term" value="1 year (does not auto-renew)" />
          <Row label="Renewal due date" value={membershipDue} />
          <Row label="Amount paid" value={amountFormatted} />
          <Row label="Payment method" value="Card" />
          <Row label="Payment date" value={paymentDate} />
        </Section>

        <Text style={note}>
          Your ADVERTISEMENT / AI CITATION-READY listing will be ready in 3–5 business days for your
          final approval. We&rsquo;ll email you the moment it&rsquo;s ready to review.
        </Text>

        <Text style={text}>
          In the meantime, view our ADVERTISER-supported music streaming website:{' '}
          <Link href={EXPLORE_URL} style={link}>
            {EXPLORE_URL}
          </Link>
        </Text>

        <Hr style={hr} />

        <Text style={text}>
          This is a one-time annual payment — there are no recurring charges and no subscription. If
          you wish to renew, we&rsquo;ll email you a reminder 30 days before your annual expiration.
          All membership fees are non-refundable once optimization work has begun.
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
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `Thank you${data?.ownerName ? `, ${data.ownerName}` : ''}! Your GetBizMusic Membership Receipt`,
  displayName: 'Quick Pay membership receipt',
  previewData: {
    ownerName: 'Ralph',
    businessName: 'Apex Auto Care',
    amountFormatted: '$49.95',
    orderNumber: 'GBM-7U9QQTFE',
    paymentDate: 'August 22, 2026 at 8:05 PM PT',
    membershipDue: 'August 22, 2027',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 26px', maxWidth: '600px' }
const header = { borderBottom: '3px solid #D4A24C', paddingBottom: '10px', marginBottom: '18px' }
const brand = { margin: '0', fontSize: '22px', fontWeight: 'bold', color: '#0F2A4A' }
const brandSub = { margin: '2px 0 0', fontSize: '12px', color: '#D4A24C', letterSpacing: '1px' }
const h1 = { fontSize: '22px', color: '#0F2A4A', margin: '0 0 12px' }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#333333' }
const card = {
  backgroundColor: '#F7F9FC',
  border: '1px solid #E1E7EF',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '18px 0',
}
const cardTitle = {
  margin: '0 0 10px',
  fontSize: '13px',
  fontWeight: 'bold',
  color: '#0F2A4A',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}
const rowStyle = { margin: '0 0 6px', fontSize: '14px', color: '#333333' }
const labelStyle = { display: 'inline-block', width: '175px', color: '#5B6B80' }
const valueStyle = { fontWeight: 'bold' as const, color: '#0F2A4A' }
const note = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#0F2A4A',
  backgroundColor: '#FFF7E6',
  border: '1px solid #F0DDB4',
  borderRadius: '8px',
  padding: '12px 14px',
}
const hr = { borderColor: '#E1E7EF', margin: '22px 0' }
const link = { color: '#0F2A4A', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#7A889B', lineHeight: '1.6' }
