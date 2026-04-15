const DEFAULT_LOCATION = 'FoundFit Studio'
const DEFAULT_APP_URL = 'https://foundfit.net'

type SessionCalendarInviteOptions = {
  bookingId: string
  startTime: string
  endTime: string
  serviceName: string
  trainerName?: string | null
  locationType?: 'gym' | 'travel' | 'virtual' | string | null
  travelAddress?: string | null
  joinUrl?: string | null
  notes?: string | null
}

function formatCalendarDateTime(value: string | Date) {
  const date = new Date(value)

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

function escapeIcsText(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;')
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL
}

function getSessionTitle(serviceName: string) {
  return `FoundFit ${serviceName}`
}

function getSessionLocation({
  locationType,
  travelAddress,
  joinUrl,
}: Pick<SessionCalendarInviteOptions, 'locationType' | 'travelAddress' | 'joinUrl'>) {
  if (locationType === 'virtual') {
    return joinUrl || 'Virtual session via Daily'
  }

  if (locationType === 'travel' && travelAddress) {
    return travelAddress
  }

  return DEFAULT_LOCATION
}

function getSessionDescription({
  serviceName,
  trainerName,
  joinUrl,
  notes,
}: Pick<SessionCalendarInviteOptions, 'serviceName' | 'trainerName' | 'joinUrl' | 'notes'>) {
  const lines = [`FoundFit ${serviceName}`]

  if (trainerName) {
    lines.push(`Trainer: ${trainerName}`)
  }

  if (joinUrl) {
    lines.push(`Join link: ${joinUrl}`)
  }

  if (notes) {
    lines.push(`Notes: ${notes}`)
  }

  lines.push(`Manage booking: ${new URL('/sessions', getAppUrl()).toString()}`)

  return lines.join('\n')
}

function getCalendarFileName(serviceName: string, startTime: string) {
  const date = new Date(startTime).toISOString().slice(0, 10)
  const slug = serviceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'session'}-${date}.ics`
}

export function createSessionCalendarInvite({
  bookingId,
  startTime,
  endTime,
  serviceName,
  trainerName,
  locationType,
  travelAddress,
  joinUrl,
  notes,
}: SessionCalendarInviteOptions) {
  const title = getSessionTitle(serviceName)
  const location = getSessionLocation({ locationType, travelAddress, joinUrl })
  const description = getSessionDescription({ serviceName, trainerName, joinUrl, notes })
  const googleUrl = new URL('https://calendar.google.com/calendar/render')

  googleUrl.searchParams.set('action', 'TEMPLATE')
  googleUrl.searchParams.set('text', title)
  googleUrl.searchParams.set(
    'dates',
    `${formatCalendarDateTime(startTime)}/${formatCalendarDateTime(endTime)}`
  )
  googleUrl.searchParams.set('details', description)
  googleUrl.searchParams.set('location', location)

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FoundFit//FoundFit//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${bookingId}@foundfit.net`,
    `DTSTAMP:${formatCalendarDateTime(new Date())}`,
    `DTSTART:${formatCalendarDateTime(startTime)}`,
    `DTEND:${formatCalendarDateTime(endTime)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `URL:${getAppUrl()}/sessions`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')

  return {
    addToCalendarUrl: googleUrl.toString(),
    attachment: {
      filename: getCalendarFileName(serviceName, startTime),
      content: Buffer.from(icsContent, 'utf8'),
    },
  }
}

