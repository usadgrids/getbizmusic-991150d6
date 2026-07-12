import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  submitUrl?: string
  designUrl?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

const SubmitReminderEmail = ({ submitUrl, designUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your ad submission link — submit whenever your image is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Get Biz Music - National City, CA</Heading>
        </Section>
        <Section style={content}>
          <Heading as="h2" style={h2}>Take your time — your spot is saved</Heading>
          <Text style={p}>
            No problem! Your paid ad spot is reserved and waiting. When your image is ready,
            use the private link below to submit it. Bookmark this email.
          </Text>

          <Section style={ctaBox}>
            <Text style={ctaLabel}>Your private submission link</Text>
            {submitUrl ? (
              <>
                <Button href={submitUrl} style={ctaButton}>Submit My Ad</Button>
                <Text style={smallLink}>
                  Or copy this link:<br />
                  <span style={{ wordBreak: 'break-all' }}>{submitUrl}</span>
                </Text>
              </>
            ) : null}
          </Section>

          <Heading as="h3" style={h3}>Image requirements — please follow these</Heading>
          <Text style={p}>
            <strong>Size: 1216 × 896 px (4:3 ratio)</strong><br />
            Format: JPG, PNG, or WebP, under 2 MB<br />
            Include: your logo, business name, services, and phone number<br />
            Avoid tiny text — most viewers see the ad on a phone
          </Text>
          <Text style={p}>
            Not a designer? Any 4:3 image editor (Canva, Photoshop, Figma) can export at this size.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>Questions? Just reply to this email.</Text>
          <Text style={footerSmall}>USADGRIDS NOVELTY ADVERTISING — A WINALL MEDIA LLC CREATIVE</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubmitReminderEmail,
  subject: 'Your ad submission link — submit when ready',
  displayName: 'Submit Later Reminder',
  previewData: { submitUrl: 'https://www.getbizmusic.com/submit?token=example-token' },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: NAVY }
const container: React.CSSProperties = { maxWidth: '600px', margin: '0 auto' }
const header: React.CSSProperties = { backgroundColor: NAVY, padding: '20px 25px', borderBottom: `4px solid ${GOLD}` }
const h1: React.CSSProperties = { color: '#ffffff', fontSize: '22px', margin: 0 }
const content: React.CSSProperties = { padding: '25px', fontFamily: 'Arial, sans-serif' }
const h2: React.CSSProperties = { color: NAVY, fontSize: '20px', marginTop: 0 }
const h3: React.CSSProperties = { color: NAVY, fontSize: '15px', marginTop: '16px', marginBottom: '8px' }
const p: React.CSSProperties = { fontSize: '14px', lineHeight: '22px', color: '#374151', margin: '10px 0' }
const ctaBox: React.CSSProperties = {
  backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px',
  padding: '18px', margin: '18px 0', textAlign: 'center' as const,
}
const ctaLabel: React.CSSProperties = {
  fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em',
  color: NAVY, fontWeight: 700, margin: '0 0 6px 0',
}
const ctaButton: React.CSSProperties = {
  backgroundColor: GOLD, color: NAVY, fontWeight: 700, padding: '12px 22px',
  borderRadius: '6px', textDecoration: 'none', fontSize: '15px', display: 'inline-block', margin: '10px 0',
}
const smallLink: React.CSSProperties = { fontSize: '12px', color: '#6b7280', margin: '8px 0 0 0' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '22px 0' }
const footer: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '10px 0' }
const footerSmall: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }
