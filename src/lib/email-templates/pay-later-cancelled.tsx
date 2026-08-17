import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  ownerName?: string
  businessName?: string
  invoiceNumber?: string
  amountFormatted?: string
  dueDateFormatted?: string
  renewUrl?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'
const EXPLORE_URL = 'https://www.getbizmusic.com/sdcounty'

const PayLaterCancelledEmail = ({
  ownerName,
  businessName,
  invoiceNumber,
  amountFormatted,
  dueDateFormatted,
  renewUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Pay Later submission has been cancelled</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>GetBizMusic</Text>
          <Text style={brandSub}>AI Business Alliance</Text>
        </Section>

        <Heading style={h1}>Your Pay Later Submission Was Cancelled</Heading>

        <Text style={text}>
          Hi {ownerName || 'there'},
        </Text>

        <Text style={text}>
          We&rsquo;re writing to let you know that your GetBizMusic AI Business Alliance membership
          submission{businessName ? ` for ${businessName}` : ''} was automatically cancelled
          because payment was not received within the 7-day Pay Later window.
        </Text>

        {invoiceNumber ? (
          <Section style={card}>
            <Text style={row}><span style={labelStyle}>Invoice #</span> <strong>{invoiceNumber}</strong></Text>
            {amountFormatted ? <Text style={row}><span style={labelStyle}>Amount</span> <strong>{amountFormatted}</strong></Text> : null}
            {dueDateFormatted ? <Text style={row}><span style={labelStyle}>Due date</span> <strong>{dueDateFormatted}</strong></Text> : null}
          </Section>
        ) : null}

        <Section style={note}>
          <Text style={noteText}>
            <strong>What this means:</strong> Your ad spot reservation has been released, and any
            Founding Member benefits, Priority Access Code price locks, or promotional terms
            associated with that submission have been cleared. No payment was charged and your card
            was never billed.
          </Text>
        </Section>

        <Text style={text}>
          Want to try again? You can submit a new membership request at the current pricing and
          terms. We&rsquo;d love to welcome you to the Alliance.
        </Text>

        {renewUrl ? (
          <Section style={{ textAlign: 'center', margin: '22px 0' }}>
            <Button href={renewUrl} style={ctaButton}>Start a New Membership</Button>
          </Section>
        ) : null}

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
  component: PayLaterCancelledEmail,
  subject: 'Your Pay Later submission has been cancelled',
  displayName: 'Pay Later Cancellation Notice',
  previewData: {
    ownerName: 'Ralph',
    businessName: 'Apex Auto Care',
    invoiceNumber: 'GBM-PL-7F3A2C',
    amountFormatted: '$49.95',
    dueDateFormatted: 'August 24, 2026',
    renewUrl: 'https://www.getbizmusic.com/pricing',
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
const row = { margin: '0 0 6px', fontSize: '14px', color: '#333333' }
const labelStyle = { display: 'inline-block', width: '120px', color: '#5B6B80' }
const note = { backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 14px', margin: '18px 0' }
const noteText = { fontSize: '14px', lineHeight: '1.6', color: '#991B1B' }
const hr = { borderColor: '#E1E7EF', margin: '22px 0' }
const link = { color: NAVY, fontWeight: 'bold' as const }
const ctaButton = { backgroundColor: GOLD, color: NAVY, fontWeight: 'bold', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontSize: '14px' }
const footer = { fontSize: '12px', color: '#7A889B', lineHeight: '1.6' }
