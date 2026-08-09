import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import { ProminentNotice } from './prominent-notice'
import type { TemplateEntry } from './registry'

interface Props {
  businessName?: string
  amountFormatted?: string
  memoCode?: string
  method?: string
  zellePhone?: string
  venmoHandle?: string
  zelleQrUrl?: string
}

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

const ActivationInstructionsEmail = ({
  businessName,
  amountFormatted,
  memoCode,
  method,
  zellePhone,
  venmoHandle,
  zelleQrUrl,
}: Props) => {
  const isVenmo = method === 'venmo'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Finish your ad activation — send your payment</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Get Biz Music — Finish Your Activation</Heading>
          </Section>
          <Section style={content}>
            <Heading as="h2" style={h2}>Your ad is reserved{businessName ? ` for ${businessName}` : ''}</Heading>
            <Text style={p}>
              Thanks for confirming your ad proof. Send your payment using the details below and we'll
              start perfecting your ad as soon as it clears.
            </Text>

            <Section style={box}>
              <Text style={row}><strong>Amount due:</strong> {amountFormatted || '—'}</Text>
              {isVenmo ? (
                <Text style={row}><strong>Venmo:</strong> {venmoHandle || '—'}</Text>
              ) : (
                <Text style={row}><strong>Zelle to:</strong> {zellePhone || '—'} (WINALL MEDIA LLC)</Text>
              )}
              <Text style={row}><strong>Put this in the memo/note:</strong> {memoCode || '—'}</Text>
              <Text style={small}>
                The memo code is how we match your payment to your ad — please include it exactly.
              </Text>
            </Section>

            {!isVenmo && zelleQrUrl ? (
              <table cellPadding={0} cellSpacing={0} style={{ margin: '16px auto 0', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'center', padding: '12px', background: '#ffffff', border: '2px solid #7c3aed', borderRadius: '12px' }}>
                      <Text style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6d28d9', fontWeight: 700, margin: '0 0 8px' }}>
                        Or scan to pay instantly
                      </Text>
                      <img src={zelleQrUrl} width={220} height={220} alt="Zelle QR code — WINALL MEDIA LLC" style={{ display: 'block', margin: '0 auto', width: '220px', height: '220px' }} />
                      <Text style={{ fontSize: '11px', color: '#6b7280', margin: '8px 0 0' }}>Open your bank's Zelle scanner</Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : null}

            <Text style={p}>
              Once we confirm your payment you'll receive a receipt, then a final email when your ad is
              live and activated on GetBizMusic.com.
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
}

export const template = {
  component: ActivationInstructionsEmail,
  subject: 'Finish your ad activation — payment instructions',
  displayName: 'Activation Payment Instructions',
  previewData: {
    businessName: 'AM Legal Services',
    amountFormatted: '$48.00',
    memoCode: 'AMLEGA-4F2C',
    method: 'zelle',
    zellePhone: '619-707-0467',
    venmoHandle: '@RTPosadas',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', color: NAVY }
const container: React.CSSProperties = { maxWidth: '600px', margin: '0 auto' }
const header: React.CSSProperties = { backgroundColor: NAVY, padding: '20px 25px', borderBottom: `4px solid ${GOLD}` }
const h1: React.CSSProperties = { color: '#ffffff', fontSize: '22px', margin: 0 }
const content: React.CSSProperties = { padding: '25px', fontFamily: 'Arial, sans-serif' }
const h2: React.CSSProperties = { color: NAVY, fontSize: '20px', marginTop: 0 }
const p: React.CSSProperties = { fontSize: '14px', lineHeight: '22px', color: '#374151', margin: '10px 0' }
const box: React.CSSProperties = { backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '8px', padding: '16px', margin: '18px 0' }
const row: React.CSSProperties = { fontSize: '14px', color: '#374151', margin: '4px 0' }
const small: React.CSSProperties = { fontSize: '12px', color: '#6b7280', margin: '8px 0 0 0' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: '22px 0' }
const footer: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '10px 0' }
const footerSmall: React.CSSProperties = { fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }
