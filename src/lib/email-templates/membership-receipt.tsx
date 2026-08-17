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
  categoryLabel?: string
  membershipStart?: string
  membershipDue?: string
  amountFormatted?: string
  paymentMethodLabel?: string
  receiptNumber?: string
  paymentDate?: string
  /** True for the Zelle/Venmo stage-2 email (payment manually verified). */
  verified?: boolean
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
  categoryLabel,
  membershipStart,
  membershipDue,
  amountFormatted,
  paymentMethodLabel,
  receiptNumber,
  paymentDate,
  verified,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {verified
        ? 'Payment confirmed — your GetBizMusic AI Business Alliance membership receipt'
        : 'Thank you — your GetBizMusic AI Business Alliance membership receipt'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>GetBizMusic</Text>
          <Text style={brandSub}>AI Business Alliance</Text>
        </Section>

        <Heading style={h1}>
          {verified ? 'Payment Confirmed' : `Thank You${ownerName ? `, ${ownerName}` : ''}!`}
        </Heading>

        <Text style={text}>
          {verified
            ? `We've verified your payment${paymentMethodLabel ? ` by ${paymentMethodLabel}` : ''}. Your AI Business Alliance Membership is confirmed.`
            : 'Thank you for your purchase. Your GetBizMusic AI Business Alliance Membership is confirmed.'}
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>Order details</Text>
          <Row label="Receipt / Order #" value={receiptNumber} />
          <Row label="Business" value={businessName} />
          <Row label="Category" value={categoryLabel} />
          <Row label="Membership term" value="1 year (does not auto-renew)" />
          <Row label="Start date" value={membershipStart} />
          <Row label="Renewal due date" value={membershipDue} />
          <Row label="Amount paid" value={amountFormatted} />
          <Row label="Payment method" value={paymentMethodLabel} />
          <Row label="Payment date" value={paymentDate} />
        </Section>

        <Text style={note}>
          Your order will be completed within 7-10 business days.
          {verified ? '' : " We'll notify you once your listing and ad are live."}
        </Text>

        <Text style={text}>
          A PDF copy of the Membership Terms &amp; Conditions you agreed to is attached to this
          email for your records.
        </Text>

        <Hr style={hr} />

        <Text style={text}>
          Explore the GetBizMusic AI Business Alliance directory and see other local businesses
          already building their AI visibility:{' '}
          <Link href={EXPLORE_URL} style={link}>
            {EXPLORE_URL}
          </Link>
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
    data?.verified
      ? 'Payment Confirmed — Your GetBizMusic Membership Receipt'
      : `Thank you${data?.ownerName ? `, ${data.ownerName}` : ''}! Your GetBizMusic Membership Receipt`,
  displayName: 'Membership receipt',
  previewData: {
    ownerName: 'Ralph',
    businessName: 'Apex Auto Care',
    categoryLabel: 'Automotive',
    membershipStart: 'August 17, 2026',
    membershipDue: 'August 17, 2027',
    amountFormatted: '$49.95',
    paymentMethodLabel: 'Card',
    receiptNumber: 'GBM-2026-4F19C2',
    paymentDate: 'August 17, 2026 at 8:05 PM PT',
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
