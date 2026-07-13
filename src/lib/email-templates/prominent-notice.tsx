import React from 'react'
import { Section, Text } from '@react-email/components'

const NAVY = '#0F2A4A'
const GOLD = '#D4A24C'

export const ProminentNotice = () => (
  <Section style={noticeBox}>
    <Text style={noticeHeading}>NOTICE</Text>
    <Text style={noticeText}>
      If you need any changes such as image ad, address, email, phone number, website, YouTube URL video link after your ad is approved — please email{' '}
      <a href="mailto:ad-changes@getbizmusic.com" style={noticeLink}>ad-changes@getbizmusic.com</a>
    </Text>
  </Section>
)

const noticeBox: React.CSSProperties = {
  backgroundColor: '#FFFBEB',
  border: `2px solid ${GOLD}`,
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '14px 0',
}
const noticeHeading: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#92400E',
  margin: '0 0 6px 0',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}
const noticeText: React.CSSProperties = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#78350F',
  margin: '0',
}
const noticeLink: React.CSSProperties = {
  color: NAVY,
  fontWeight: 700,
  textDecoration: 'underline',
}
