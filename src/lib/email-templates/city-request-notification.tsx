import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import { ProminentNotice } from './prominent-notice'
import type { TemplateEntry } from './registry'

interface Props {
  cityName?: string
  state?: string
  zip?: string
  email?: string
  message?: string
  submittedAt?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

const CityRequestNotificationEmail = ({ cityName, state, zip, email, message, submittedAt }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New city request: {cityName || 'Unknown'}{state ? `, ${state}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Get Biz Music — New City Request</Heading>
        </Section>
        <Section style={content}>
          <Heading as="h2" style={h2}>New city request submitted</Heading>
          <Text style={p}><strong>City:</strong> {cityName || '—'}</Text>
          <Text style={p}><strong>State:</strong> {state || '—'}</Text>
          {zip ? <Text style={p}><strong>ZIP:</strong> {zip}</Text> : null}
          <Text style={p}><strong>Requester email:</strong> {email || '—'}</Text>
          {message ? (
            <>
              <Text style={p}><strong>Message:</strong></Text>
              <Text style={quote}>{message}</Text>
            </>
          ) : null}
          {submittedAt ? <Text style={p}><strong>Submitted:</strong> {submittedAt}</Text> : null}
          <Hr style={hr} />
          <ProminentNotice />
          <Text style={footer}>View all requests in the Backend → Tables → city_requests.</Text>
          <Text style={footerSmall}>USADGRIDS NOVELTY ADVERTISING — A WINALL MEDIA LLC CREATIVE</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CityRequestNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New city request: ${data.cityName || 'Unknown'}${data.state ? `, ${data.state}` : ''}`,
  displayName: 'City Request Notification',
  previewData: {
    cityName: 'Austin',
    state: 'TX',
    zip: '78701',
    email: 'requester@example.com',
    message: 'Would love to see Austin on the platform!',
    submittedAt: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: NAVY }
const container: React.CSSProperties = { maxWidth: '600px', margin: '0 auto' }
const header: React.CSSProperties = { backgroundColor: NAVY, padding: '20px 25px', borderBottom: `4px solid ${GOLD}` }
const h1: React.CSSProperties = { color: '#ffffff', fontSize: '22px', margin: 0 }
const content: React.CSSProperties = { padding: '25px', fontFamily: 'Arial, sans-serif' }
const h2: React.CSSProperties = { color: NAVY, fontSize: '20px', marginTop: 0 }
const p: React.CSSProperties = { fontSize: '14px', lineHeight: '22px', color: '#374151', margin: '10px 0' }
const quote: React.CSSProperties = { fontSize: '14px', lineHeight: '22px', color: '#374151', margin: '10px 0', padding: '10px 14px', borderLeft: `3px solid ${GOLD}`, backgroundColor: '#f9fafb' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '22px 0' }
const footer: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '10px 0' }
const footerSmall: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }
