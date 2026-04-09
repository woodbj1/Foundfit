import { format } from 'date-fns'

import type { LocationType } from '@/types/foundfit'

export function formatPrice(cents: number | null | undefined) {
  if (cents == null) return null

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function formatDateInTimeZone(value: string, timeZone = 'America/New_York') {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone,
  }).format(new Date(value))
}

export function formatTimeInTimeZone(value: string, timeZone = 'America/New_York') {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(value))
}

export function formatTimeRangeInTimeZone(
  start: string,
  end: string,
  timeZone = 'America/New_York'
) {
  return `${formatTimeInTimeZone(start, timeZone)} - ${formatTimeInTimeZone(end, timeZone)}`
}

export function formatRelativeMonthLabel(date: Date) {
  return format(date, 'EEE, MMM d')
}

export function getLocationLabel(locationType: LocationType) {
  switch (locationType) {
    case 'travel':
      return "Client's Home"
    case 'virtual':
      return 'Virtual'
    default:
      return 'Studio'
  }
}
