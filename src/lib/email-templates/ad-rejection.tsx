import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components'
import { ProminentNotice } from './prominent-notice'
import type { TemplateEntry } from './registry'

interface Props {
  businessName?: string
  contactName?: string
  reason?: string
  plan?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

const AdRejectionEmail = ({ businessName, contactName, reason, plan }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your BizSpot Directory ad submission was not approved</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Get Biz Music - National City, CA</Heading>
        </Section>

        <Section style={content}>
          <Heading as="h2" style={h2}>Your ad submission was not approved</Heading>
          <Text style={p}>
            Hi {contactName || 'there'},
          </Text>
          <Text style={p}>
            Thank you for submitting <strong>{businessName || 'your business ad'}</strong> to
            Get Biz Music - National City, CA. Unfortunately, after review, our admin team
            was unable to approve your submission at this time.
          </Text>

          <Section style={reasonBox}>
            <Text style={reasonLabel}>Reason for rejection</Text>
            <Text style={reasonText}>
              {reason && reason.trim().length > 0
                ? reason
                : 'Your submitted image or content did not meet our content and advertising guidelines.'}
            </Text>
          </Section>

          <Hr style={hr} />

          <Heading as="h3" style={h3}>Important — Refund Policy</Heading>
          <Text style={p}>
            As stated in the content agreement you accepted at submission, payments
            for ads that do not pass admin review are <strong>non-refundable</strong>.
            This policy exists to protect our platform against submissions containing
            adult, illegal, misleading, hateful, or copyright-infringing material.
          </Text>
          <Text style={p}>
            {plan ? `Your ${plan} plan payment has been retained per this agreement. ` : ''}
            You are welcome to submit a new, compliant ad in the future by purchasing
            a fresh plan at your convenience.
          </Text>

          <Hr style={hr} />
          <ProminentNotice />
          <Text style={footer}>
            Questions? Reply to this email and our team will respond within 24 hours.
          </Text>
          <Text style={footerSmall}>
            USADGRIDS NOVELTY ADVERTISING — A WINALL MEDIA LLC CREATIVE
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdRejectionEmail,
  subject: (data) =>
    `Your BizSpot Directory ad${data?.businessName ? ` for ${data.businessName}` : ''} was not approved`,
  displayName: 'Ad Rejection Notice',
  previewData: {
    businessName: "Tony's Pizzeria",
    contactName: 'Tony Romano',
    reason: 'Image contained text that violates our content policy.',
    plan: 'Standard Image Ad ($12)',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: 'Georgia, "Times New Roman", serif',
  color: '#0F2A4A',
}
const container: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '0',
}
const header: React.CSSProperties = {
  backgroundColor: NAVY,
  padding: '20px 25px',
  borderBottom: `4px solid ${GOLD}`,
}
const h1: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '22px',
  margin: '0',
}
const content: React.CSSProperties = {
  padding: '25px',
  fontFamily: 'Arial, sans-serif',
}
const h2: React.CSSProperties = {
  color: NAVY,
  fontSize: '20px',
  marginTop: '0',
}
const h3: React.CSSProperties = {
  color: NAVY,
  fontSize: '15px',
  marginTop: '16px',
  marginBottom: '8px',
}
const p: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#374151',
  margin: '10px 0',
}
const reasonBox: React.CSSProperties = {
  backgroundColor: '#FEF3C7',
  border: '1px solid #F59E0B',
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '18px 0',
}
const reasonLabel: React.CSSProperties = {
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#92400E',
  fontWeight: 700,
  margin: '0 0 6px 0',
}
const reasonText: React.CSSProperties = {
  fontSize: '14px',
  color: '#78350F',
  margin: '0',
  lineHeight: '20px',
}
const hr: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '22px 0',
}
const footer: React.CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '10px 0',
}
const footerSmall: React.CSSProperties = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: '4px 0 0 0',
}
