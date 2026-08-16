import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  ownerName?: string
  businessName?: string
  businessCategory?: string
  address?: string
  wantsAiAudit?: boolean
  wantsAdDesign?: boolean
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

const BusinessClaimConfirmationEmail = ({
  ownerName,
  businessName,
  businessCategory,
  address,
  wantsAiAudit,
  wantsAdDesign,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your listing claim for {businessName || 'your business'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Get Biz Music — Listing Claim Received</Heading>
        </Section>
        <Section style={content}>
          <Text style={p}>Hi {ownerName || 'there'},</Text>
          <Text style={p}>
            Thank you for claiming <strong>{businessName || 'your business'}</strong> on GetBizMusic.
            We&rsquo;ll prepare your free materials within <strong>3–5 business days</strong>, and
            you&rsquo;ll get to review everything first.
          </Text>
          <Hr style={hr} />
          <Text style={p}><strong>Business:</strong> {businessName || '—'}</Text>
          {businessCategory ? <Text style={p}><strong>Category:</strong> {businessCategory}</Text> : null}
          {address ? <Text style={p}><strong>Address:</strong> {address}</Text> : null}
          <Text style={p}>
            <strong>FREE AI Visibility Audit Report:</strong> {wantsAiAudit ? 'Yes' : 'No'}
          </Text>
          <Text style={p}>
            <strong>FREE Professional Ad Design:</strong> {wantsAdDesign ? 'Yes' : 'No'}
          </Text>
          <Hr style={hr} />
          <Text style={p}>
            Once you&rsquo;ve seen your free audit and ad design, you&rsquo;ll have the option — never
            a requirement — to AI Answer Engine optimize your business and publish your approved ad
            online as a GetBizMusic.com AI Business Alliance Member. Your AI Visibility Audit and
            professional ad design normally run $149.95 — but as one of our by-invitation local
            businesses, you get full AI Business Alliance Membership, including publishing and AI
            Answer Engine optimization, for just $49.95/year (pricing subject to change without
            notice). The audit and design are yours to see for free either way.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            Questions? Just reply to this email and we&rsquo;ll help you out.
          </Text>
          <Text style={footerSmall}>USADGRIDS NOVELTY ADVERTISING — A WINALL MEDIA LLC CREATIVE</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BusinessClaimConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `We received your claim for ${data.businessName || 'your business'}`,
  displayName: 'Business Claim Confirmation',
  previewData: {
    ownerName: 'Maria',
    businessName: "Maria's Kitchen",
    businessCategory: 'Restaurants',
    address: '123 Main St, San Diego, CA 92101',
    wantsAiAudit: true,
    wantsAdDesign: false,
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: NAVY }
const container: React.CSSProperties = { maxWidth: '600px', margin: '0 auto' }
const header: React.CSSProperties = { backgroundColor: NAVY, padding: '20px 25px', borderBottom: `4px solid ${GOLD}` }
const h1: React.CSSProperties = { color: '#ffffff', fontSize: '22px', margin: 0 }
const content: React.CSSProperties = { padding: '25px', fontFamily: 'Arial, sans-serif' }
const p: React.CSSProperties = { fontSize: '14px', lineHeight: '22px', color: '#374151', margin: '10px 0' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '22px 0' }
const footer: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '10px 0' }
const footerSmall: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }
