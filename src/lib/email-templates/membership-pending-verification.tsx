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
  paymentMethodLabel?: string
  amountFormatted?: string
  memoCode?: string
}

const EXPLORE_URL = 'https://www.getbizmusic.com/sdcounty'

const Email = ({
  ownerName,
  businessName,
  paymentMethodLabel = 'Zelle',
  amountFormatted,
  memoCode,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your submission — payment verification pending</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>GetBizMusic</Text>
          <Text style={brandSub}>AI Business Alliance</Text>
        </Section>

        <Heading style={h1}>
          We&apos;ve received your submission{ownerName ? `, ${ownerName}` : ''}
        </Heading>

        <Text style={text}>
          Thanks for joining the GetBizMusic AI Business Alliance
          {businessName ? ` for ${businessName}` : ''}. You selected{' '}
          <strong>{paymentMethodLabel}</strong> as your payment method
          {amountFormatted ? ` for ${amountFormatted}` : ''}
          {memoCode ? ` (memo/reference: ${memoCode})` : ''}.
        </Text>

        <Section style={note}>
          <Text style={noteText}>
            <strong>Payment verification pending.</strong> {paymentMethodLabel} payments must be
            manually verified by GetBizMusic before your membership and ad go live. As soon as we
            confirm your payment, you&apos;ll receive a final confirmation email with your receipt
            and order details.
          </Text>
        </Section>

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
    `We've received your submission${data?.ownerName ? `, ${data.ownerName}` : ''} — payment verification pending`,
  displayName: 'Membership submission received (verification pending)',
  previewData: {
    ownerName: 'Ralph',
    businessName: 'Apex Auto Care',
    paymentMethodLabel: 'Zelle',
    amountFormatted: '$49.95',
    memoCode: 'A1B2C3D4',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 26px', maxWidth: '600px' }
const header = { borderBottom: '3px solid #D4A24C', paddingBottom: '10px', marginBottom: '18px' }
const brand = { margin: '0', fontSize: '22px', fontWeight: 'bold', color: '#0F2A4A' }
const brandSub = { margin: '2px 0 0', fontSize: '12px', color: '#D4A24C', letterSpacing: '1px' }
const h1 = { fontSize: '21px', color: '#0F2A4A', margin: '0 0 12px' }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#333333' }
const note = {
  backgroundColor: '#FFF7E6',
  border: '1px solid #F0DDB4',
  borderRadius: '8px',
  padding: '4px 14px',
  margin: '18px 0',
}
const noteText = { fontSize: '14px', lineHeight: '1.6', color: '#0F2A4A' }
const hr = { borderColor: '#E1E7EF', margin: '22px 0' }
const link = { color: '#0F2A4A', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#7A889B', lineHeight: '1.6' }
