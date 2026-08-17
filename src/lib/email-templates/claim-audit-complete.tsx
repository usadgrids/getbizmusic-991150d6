import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  ownerName?: string
  businessName?: string
  businessCategory?: string
  auditScore?: string
  hubUrl?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'
const EXPLORE_URL = 'https://www.getbizmusic.com/sdcounty'

const ClaimAuditCompleteEmail = ({
  ownerName,
  businessName,
  businessCategory,
  auditScore,
  hubUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your AI Visibility Audit is ready for {businessName || 'your business'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>GetBizMusic</Text>
          <Text style={brandSub}>AI Business Alliance</Text>
        </Section>

        <Heading style={h1}>Your AI Visibility Audit is Complete</Heading>

        <Text style={text}>
          Hi {ownerName || 'there'},
        </Text>

        <Text style={text}>
          Great news — the AI Visibility Audit for{' '}
          <strong>{businessName || 'your business'}</strong>
          {businessCategory ? ` (${businessCategory})` : ''} is ready. Our team has
          reviewed your business across major AI answer engines (Google AI, ChatGPT, Perplexity,
          and others) and prepared a detailed report on how visible you are today.
        </Text>

        {auditScore ? (
          <Section style={scoreBox}>
            <Text style={scoreLabel}>Your AI Visibility Score</Text>
            <Text style={scoreValue}>{auditScore}</Text>
          </Section>
        ) : null}

        <Section style={note}>
          <Text style={noteText}>
            <strong>What happens next:</strong> Reply to this email or visit the link below to
            schedule your audit review. We&rsquo;ll walk you through the findings and show you how
            GetBizMusic AI Business Alliance membership can improve your visibility in AI search
            results — with no obligation.
          </Text>
        </Section>

        {hubUrl ? (
          <Section style={{ textAlign: 'center', margin: '22px 0' }}>
            <Button href={hubUrl} style={ctaButton}>View Your Audit & Explore the Directory</Button>
          </Section>
        ) : null}

        <Hr style={hr} />

        <Text style={text}>
          Explore the GetBizMusic AI Business Alliance directory and see other local businesses
          already building their AI visibility:{' '}
          <a href={EXPLORE_URL} style={link}>{EXPLORE_URL}</a>
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
  component: ClaimAuditCompleteEmail,
  subject: (data: Record<string, any>) =>
    `Your AI Visibility Audit is ready${data?.businessName ? ` for ${data.businessName}` : ''}`,
  displayName: 'Claim Audit Complete — Notify Owner',
  previewData: {
    ownerName: 'Maria',
    businessName: "Maria's Kitchen",
    businessCategory: 'Restaurants',
    auditScore: '42 / 100',
    hubUrl: 'https://www.getbizmusic.com/sdcounty',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 26px', maxWidth: '600px' }
const header = { borderBottom: '3px solid #D4A24C', paddingBottom: '10px', marginBottom: '18px' }
const brand = { margin: '0', fontSize: '22px', fontWeight: 'bold', color: NAVY }
const brandSub = { margin: '2px 0 0', fontSize: '12px', color: GOLD, letterSpacing: '1px' }
const h1 = { fontSize: '22px', color: NAVY, margin: '0 0 12px' }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#333333' }
const scoreBox = {
  backgroundColor: '#F7F9FC',
  border: '1px solid #E1E7EF',
  borderRadius: '10px',
  padding: '18px',
  margin: '18px 0',
  textAlign: 'center' as const,
}
const scoreLabel = { margin: '0 0 6px', fontSize: '13px', fontWeight: 'bold', color: '#5B6B80', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const scoreValue = { margin: '0', fontSize: '36px', fontWeight: 'bold', color: NAVY }
const note = {
  backgroundColor: '#FFF7E6',
  border: '1px solid #F0DDB4',
  borderRadius: '8px',
  padding: '12px 14px',
  margin: '18px 0',
}
const noteText = { fontSize: '14px', lineHeight: '1.6', color: NAVY }
const hr = { borderColor: '#E1E7EF', margin: '22px 0' }
const link = { color: NAVY, fontWeight: 'bold' as const }
const ctaButton = {
  backgroundColor: GOLD,
  color: NAVY,
  fontWeight: 'bold',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
}
const footer = { fontSize: '12px', color: '#7A889B', lineHeight: '1.6' }
