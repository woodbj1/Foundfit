const DEFAULT_BOOKING_TIME_ZONE = 'America/New_York'
const FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>()

type DateInput = Date | string

function toDate(value: DateInput) {
  return value instanceof Date ? value : new Date(value)
}

function getCachedFormatter(timeZone: string, options: Intl.DateTimeFormatOptions) {
  const cacheKey = `${timeZone}:${JSON.stringify(options)}`
  const existing = FORMATTER_CACHE.get(cacheKey)
  if (existing) {
    return existing
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    ...options,
  })
  FORMATTER_CACHE.set(cacheKey, formatter)
  return formatter
}

function formatInTimeZone(value: DateInput, timeZone: string | null | undefined, options: Intl.DateTimeFormatOptions) {
  return getCachedFormatter(resolveBookingTimeZone(timeZone), options).format(toDate(value))
}

export function resolveBookingTimeZone(timeZone?: string | null) {
  return timeZone || DEFAULT_BOOKING_TIME_ZONE
}

export function formatBookingLongDate(value: DateInput, timeZone?: string | null) {
  return formatInTimeZone(value, timeZone, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatBookingShortDate(value: DateInput, timeZone?: string | null) {
  return formatInTimeZone(value, timeZone, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatBookingWeekdayDate(value: DateInput, timeZone?: string | null) {
  return formatInTimeZone(value, timeZone, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export function formatBookingShortWeekdayDate(value: DateInput, timeZone?: string | null) {
  return formatInTimeZone(value, timeZone, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatBookingTime(value: DateInput, timeZone?: string | null) {
  return formatInTimeZone(value, timeZone, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatBookingTimeRange(start: DateInput, end: DateInput, timeZone?: string | null) {
  return `${formatBookingTime(start, timeZone)} - ${formatBookingTime(end, timeZone)}`
}

export function getBookingBlockMinutes(durationMinutes: number) {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return 60
  }

  return durationMinutes <= 60 ? 60 : durationMinutes
}

export function getBufferedBookingEnd(start: DateInput, end: DateInput) {
  const startDate = toDate(start)
  const endDate = toDate(end)
  const durationMinutes = Math.max(
    Math.round((endDate.getTime() - startDate.getTime()) / 60000),
    0
  )
  const blockMinutes = getBookingBlockMinutes(durationMinutes)

  return new Date(startDate.getTime() + blockMinutes * 60000)
}
