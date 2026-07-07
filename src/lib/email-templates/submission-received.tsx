import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  contactName?: string
  businessName?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

const SubmissionReceivedEmail = ({ contactName, businessName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your ad submission — review within 24 hours</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Get Biz Music - National City, CA</Heading>
        </Section>
        <Section style={content}>
          <Heading as="h2" style={h2}>Submission received!</Heading>
          <Text style={p}>Hi {contactName || 'there'},</Text>
          <Text style={p}>
            Thanks for submitting your ad{businessName ? <> for <strong>{businessName}</strong></> : null}.
            Our team reviews every submission within <strong>24 hours</strong>.
          </Text>
          <Text style={p}>
            Once approved, you'll get a follow-up email with your unique ad number and shareable link
            you can post anywhere — social media, your website, email signatures, and more.
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
  component: SubmissionReceivedEmail,
  subject: 'We received your ad — review within 24 hours',
  displayName: 'Submission Received',
  previewData: { contactName: 'Tony', businessName: "Tony's Pizzeria" },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: NAVY }
const container: React.CSSProperties = { maxWidth: '600px', margin: '0 auto' }
const header: React.CSSProperties = { backgroundColor: NAVY, padding: '20px 25px', borderBottom: `4px solid ${GOLD}` }
const h1: React.CSSProperties = { color: '#ffffff', fontSize: '22px', margin: 0 }
const content: React.CSSProperties = { padding: '25px', fontFamily: 'Arial, sans-serif' }
const h2: React.CSSProperties = { color: NAVY, fontSize: '20px', marginTop: 0 }
const p: React.CSSProperties = { fontSize: '14px', lineHeight: '22px', color: '#374151', margin: '10px 0' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '22px 0' }
const footer: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '10px 0' }
const footerSmall: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }
