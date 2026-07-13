import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import { ProminentNotice } from './prominent-notice'
import type { TemplateEntry } from './registry'

interface Props {
  contactName?: string
  businessName?: string
  adNumber?: number | string
  shareUrl?: string
  editUrl?: string
  isEdit?: boolean
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

const AdApprovedEmail = ({ contactName, businessName, adNumber, shareUrl, editUrl, isEdit }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{isEdit ? 'Your ad edits are live' : 'Your ad is live — share your unique link anywhere'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Get Biz Music</Heading>
        </Section>
        <Section style={content}>
          <Heading as="h2" style={h2}>
            {isEdit ? 'Your ad edits are live! ✅' : 'Your ad is live! 🎉'}
          </Heading>
          <Text style={p}>Hi {contactName || 'there'},</Text>
          <Text style={p}>
            {isEdit ? (
              <>Your recent edits{businessName ? <> to <strong>{businessName}</strong></> : null} have been reviewed and approved. Your ad is updated on Get Biz Music — the ad number and remaining runtime stay the same.</>
            ) : (
              <>Great news — your ad{businessName ? <> for <strong>{businessName}</strong></> : null} has been approved and is now rotating on Get Biz Music.</>
            )}
          </Text>

          <Section style={ctaBox}>
            <Text style={ctaLabel}>Your unique ad number</Text>
            <Text style={adNumberStyle}>#{adNumber ?? '—'}</Text>
            {shareUrl ? (
              <>
                <Button href={shareUrl} style={ctaButton}>View & Share Your Ad</Button>
                <Text style={smallLink}>
                  Your shareable link:<br />
                  <span style={{ wordBreak: 'break-all' }}>{shareUrl}</span>
                </Text>
              </>
            ) : null}
          </Section>

          {editUrl ? (
            <Section style={editBox}>
              <Text style={ctaLabel}>Need to change something?</Text>
              <Text style={p}>
                You can update your image, phone number, tagline, website, or contact info at
                any time using your private edit link. Any changes go through admin review
                before going live — you'll get another confirmation email once approved.
              </Text>
              <Button href={editUrl} style={editButton}>Edit My Ad</Button>
              <Text style={smallLink}>
                Bookmark this link — it's your permanent editor:<br />
                <span style={{ wordBreak: 'break-all' }}>{editUrl}</span>
              </Text>
            </Section>
          ) : null}

          <Heading as="h3" style={h3}>Share it anywhere</Heading>
          <Text style={p}>
            Post your shareable link on Facebook, Instagram, X, LinkedIn, your website, email
            signatures, business cards — anywhere your customers can find you.
          </Text>

          <Hr style={hr} />
          <ProminentNotice />
          <Text style={footer}>Questions? Just reply to this email.</Text>
          <Text style={footerSmall}>USADGRIDS NOVELTY ADVERTISING — A WINALL MEDIA LLC CREATIVE</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdApprovedEmail,
  subject: (data: Record<string, any>) =>
    data?.isEdit ? 'Your ad edits are live' : 'Your ad is live — share your unique link',
  displayName: 'Ad Approved & Shareable Link',
  previewData: {
    contactName: 'Tony',
    businessName: "Tony's Pizzeria",
    adNumber: 42,
    shareUrl: 'https://www.getbizmusic.com/ad/42',
    editUrl: 'https://www.getbizmusic.com/edit-ad?token=example-edit-token',
    isEdit: false,
  },
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
const editBox: React.CSSProperties = {
  backgroundColor: '#FFF8E9', border: `1px solid ${GOLD}`, borderRadius: '8px',
  padding: '18px', margin: '18px 0', textAlign: 'center' as const,
}
const ctaLabel: React.CSSProperties = {
  fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em',
  color: NAVY, fontWeight: 700, margin: '0 0 6px 0',
}
const adNumberStyle: React.CSSProperties = { fontSize: '32px', fontWeight: 700, color: NAVY, margin: '4px 0 12px' }
const ctaButton: React.CSSProperties = {
  backgroundColor: GOLD, color: NAVY, fontWeight: 700, padding: '12px 22px',
  borderRadius: '6px', textDecoration: 'none', fontSize: '15px', display: 'inline-block', margin: '10px 0',
}
const editButton: React.CSSProperties = {
  backgroundColor: NAVY, color: '#ffffff', fontWeight: 700, padding: '10px 20px',
  borderRadius: '6px', textDecoration: 'none', fontSize: '14px', display: 'inline-block', margin: '10px 0',
}
const smallLink: React.CSSProperties = { fontSize: '12px', color: '#6b7280', margin: '8px 0 0 0' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '22px 0' }
const footer: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '10px 0' }
const footerSmall: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }
