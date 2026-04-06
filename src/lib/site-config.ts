export const SITE = {
  name: 'FoundFit',
  tagline: 'Personal Training in Acworth, GA',
  description:
    'Transform your fitness journey with personalized training, flexible scheduling, and expert coaching in Acworth, GA.',
  location: 'Acworth, GA',
  addressLine1: '6184 Mortimer CT NW',
  addressLine2: 'Acworth, GA 30101',
  fullAddress: '6184 Mortimer CT NW, Acworth, GA 30101',
  email: 'info@foundfit.net',
  phone: '',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://foundfit.net',
  travelFeeCents: 2500,
  trainerName: 'Caroline',
} as const

export const SITE_KEYWORDS = [
  'personal training',
  'fitness coaching',
  'Acworth GA',
  'virtual training',
  'meal plans',
  'strength training',
  'FoundFit',
] as const

export function formatPrice(cents: number): string {
  const hasWholeDollarAmount = cents % 100 === 0

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasWholeDollarAmount ? 0 : 2,
    maximumFractionDigits: hasWholeDollarAmount ? 0 : 2,
  }).format(cents / 100)
}
