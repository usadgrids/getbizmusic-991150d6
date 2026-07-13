import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import { ProminentNotice } from './prominent-notice'
import type { TemplateEntry } from './registry'

interface Props {
  businessName?: string
  ownerName?: string
  ownerEmail?: string
  businessEmail?: string
  customerEmail?: string
  phone?: string
  websiteUrl?: string
  services?: string
  tagline?: string
  colorPreferences?: string
  logoPath?: string
  imagePaths?: string[]
  designBrief?: string
  notes?: string
  sessionId?: string
  submittedAt?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

const Row = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <Text style={p}>
      <strong>{label}:</strong> {value}
    </Text>
  ) : null

const DesignOrderNotificationEmail = ({
  businessName,
  ownerName,
  ownerEmail,
  businessEmail,
  customerEmail,
  phone,
  websiteUrl,
  services,
  tagline,
  colorPreferences,
  logoPath,
  imagePaths,
  designBrief,
  notes,
  sessionId,
  submittedAt,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New custom design order: {businessName || 'Unnamed business'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Get Biz Music — New Custom Design Order</Heading>
        </Section>
        <Section style={content}>
          <Section style={badge}>
            <Text style={badgeText}>PRO AD DESIGN — $49.95 · PAID</Text>
          </Section>
          <Heading as="h2" style={h2}>{businessName || 'New design intake submitted'}</Heading>

          <Text style={sectionLabel}>Customer</Text>
          <Row label="Billing email" value={customerEmail} />
          <Row label="Owner name" value={ownerName} />
          <Row label="Owner email" value={ownerEmail} />
          <Row label="Business email" value={businessEmail} />
          <Row label="Phone" value={phone} />
          <Row label="Website" value={websiteUrl} />

          <Hr style={hr} />
          <Text style={sectionLabel}>Business & brief</Text>
          <Row label="Services" value={services} />
          <Row label="Tagline" value={tagline} />
          <Row label="Color preferences" value={colorPreferences} />
          {designBrief ? (
            <>
              <Text style={p}><strong>Design brief:</strong></Text>
              <Text style={quote}>{designBrief}</Text>
            </>
          ) : null}
          {notes ? (
            <>
              <Text style={p}><strong>Notes:</strong></Text>
              <Text style={quote}>{notes}</Text>
            </>
          ) : null}

          <Hr style={hr} />
          <Text style={sectionLabel}>Assets (ad-uploads bucket)</Text>
          <Row label="Logo path" value={logoPath} />
          {imagePaths && imagePaths.length > 0 ? (
            <>
              <Text style={p}><strong>Image paths:</strong></Text>
              {imagePaths.map((path, i) => (
                <Text key={i} style={mono}>{path}</Text>
              ))}
            </>
          ) : (
            <Text style={p}><em>No reference images uploaded.</em></Text>
          )}

          <Hr style={hr} />
          <Row label="Order session" value={sessionId} />
          <Row label="Submitted" value={submittedAt} />

          <Hr style={hr} />
          <ProminentNotice />
          <Text style={footer}>Review this order in the Admin Console → Custom Design Orders.</Text>
          <Text style={footerSmall}>USADGRIDS NOVELTY ADVERTISING — A WINALL MEDIA LLC CREATIVE</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DesignOrderNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New custom design order: ${data.businessName || 'Unnamed business'}`,
  displayName: 'Custom Design Order — Admin Notification',
  previewData: {
    businessName: 'General Ministries LLC',
    ownerName: 'Jane Doe',
    ownerEmail: 'jane@example.com',
    businessEmail: 'hello@genmin.example',
    customerEmail: 'billing@genmin.example',
    phone: '619-555-1234',
    websiteUrl: 'https://generalministries.example',
    services: 'Community outreach, Sunday services, youth programs',
    tagline: 'Faith. Family. Forward.',
    colorPreferences: 'Navy + gold, warm accents',
    logoPath: 'design-intake/sess_123/logo-abc.png',
    imagePaths: ['design-intake/sess_123/image-0-abc.jpg', 'design-intake/sess_123/image-1-def.jpg'],
    designBrief: 'Warm, welcoming ad highlighting Sunday services and youth programs.',
    notes: 'Please avoid stock imagery.',
    sessionId: 'cs_test_abc123',
    submittedAt: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: NAVY }
const container: React.CSSProperties = { maxWidth: '640px', margin: '0 auto' }
const header: React.CSSProperties = { backgroundColor: NAVY, padding: '20px 25px', borderBottom: `4px solid ${GOLD}` }
const h1: React.CSSProperties = { color: '#ffffff', fontSize: '22px', margin: 0 }
const content: React.CSSProperties = { padding: '25px', fontFamily: 'Arial, sans-serif' }
const badge: React.CSSProperties = { backgroundColor: GOLD, borderRadius: '6px', padding: '8px 12px', marginBottom: '14px' }
const badgeText: React.CSSProperties = { color: NAVY, fontSize: '12px', fontWeight: 700, margin: 0, letterSpacing: '0.05em' }
const h2: React.CSSProperties = { color: NAVY, fontSize: '20px', marginTop: 0 }
const sectionLabel: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 6px 0' }
const p: React.CSSProperties = { fontSize: '14px', lineHeight: '22px', color: '#374151', margin: '6px 0' }
const mono: React.CSSProperties = { fontSize: '12px', lineHeight: '18px', color: '#374151', margin: '2px 0', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }
const quote: React.CSSProperties = { fontSize: '14px', lineHeight: '22px', color: '#374151', margin: '6px 0', padding: '10px 14px', borderLeft: `3px solid ${GOLD}`, backgroundColor: '#f9fafb' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '18px 0' }
const footer: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '10px 0' }
const footerSmall: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }
