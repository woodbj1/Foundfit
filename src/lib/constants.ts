export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 5 // Start from 5 AM
  const minute = (i % 2) * 30
  const h = hour.toString().padStart(2, '0')
  const m = minute.toString().padStart(2, '0')
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return {
    value: `${h}:${m}`,
    label: `${displayHour}:${m.padStart(2, '0')} ${ampm}`,
  }
})

export const DEFAULT_SESSION_DURATION = 50 // minutes
export const DEFAULT_MAX_WEEKLY_BOOKINGS = 3
export const DEFAULT_TRAVEL_FEE = 2500 // $25.00 in cents
