import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  businessName?: string
  ownerName?: string
  dueDate?: string
  amountFormatted?: string
  renewUrl?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

const MembershipRenewalReminderEmail = ({
  businessName,
  ownerName,
  dueDate,
  amountFormatted,
  renewUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your AI Business Alliance membership is due in 30 days — renew manually</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Get Biz Music - AI Business Alliance</Heading>
        </Section>
        <Section style={content}>
          <Heading as="h2" style={h2}>Time to renew — no automatic charge</Heading>
          <Text style={p}>
            Hi {ownerName || 'there'}, your AI Business Alliance Membership
            {businessName ? ` for ${businessName}` : ''} is due on{' '}
            <strong>{dueDate || 'your renewal date'}</strong> (about 30 days from today).
          </Text>
          <Text style={p}>
            <strong>Your membership does not auto-renew and your payment method will not be
            charged automatically.</strong> To keep your ad placement, Knowledge Graph listing and
            directory presence active, please make a new payment before the due date.
          </Text>
          {amountFormatted ? (
            <Text style={p}>Renewal amount: <strong>{amountFormatted}</strong></Text>
          ) : null}
          {renewUrl ? (
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Button href={renewUrl} style={ctaButton}>Renew My Membership</Button>
            </Section>
          ) : null}
          <Text style={small}>
            If you'd rather not continue, no action is needed — simply ignore this email and your
            membership will lapse at the end of your paid term with no further charges.
          </Text>
          <Text style={small}>
            Explore the GetBizMusic AI Business Alliance directory and see other local businesses
            already building their AI visibility:{' '}
            <a href="https://www.getbizmusic.com/sdcounty" style={{ color: NAVY, fontWeight: 'bold' }}>
              https://www.getbizmusic.com/sdcounty
            </a>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#f4f4f5', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { margin: '0 auto', maxWidth: '600px', backgroundColor: '#ffffff' }
const header = { backgroundColor: NAVY, padding: '20px 24px' }
const h1 = { color: '#ffffff', fontSize: '18px', margin: '0' }
const content = { padding: '24px' }
const h2 = { color: NAVY, fontSize: '20px', margin: '0 0 12px' }
const p = { color: '#333333', fontSize: '14px', lineHeight: '22px', margin: '0 0 14px' }
const small = { color: '#666666', fontSize: '12px', lineHeight: '18px', margin: '16px 0 0' }
const ctaButton = {
  backgroundColor: GOLD,
  color: NAVY,
  fontWeight: 'bold',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
}

export const template: TemplateEntry = {
  component: MembershipRenewalReminderEmail,
  subject: (data) =>
    `Renewal reminder — your AI Business Alliance membership is due ${data?.dueDate ?? 'soon'}`,
  displayName: 'Membership Renewal Reminder',
  previewData: {
    businessName: 'Acme Coffee',
    ownerName: 'Ralph',
    dueDate: 'September 15, 2026',
    amountFormatted: '$49.95',
    renewUrl: 'https://getbizmusic.com/pricing',
  },
}

export default MembershipRenewalReminderEmail
