import { getLocationLabel } from '@/lib/format'
import type { MobileBooking } from '@/types/foundfit'

async function loadCalendarModule() {
  return await import('expo-calendar')
}

async function getWritableCalendarId(
  Calendar: Awaited<ReturnType<typeof loadCalendarModule>>
) {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  const preferredCalendar =
    calendars.find((calendar) => calendar.allowsModifications && calendar.isPrimary) ||
    calendars.find((calendar) => calendar.allowsModifications)

  return preferredCalendar?.id || null
}

export async function addSessionToCalendar(
  booking: MobileBooking,
  joinUrl?: string | null
) {
  const Calendar = await loadCalendarModule()
  const { status } = await Calendar.requestCalendarPermissionsAsync()

  if (status !== 'granted') {
    throw new Error('Calendar access was not granted.')
  }

  const calendarId = await getWritableCalendarId(Calendar)

  if (!calendarId) {
    throw new Error('No writable calendar is available on this device.')
  }

  const notes = [
    `Trainer: ${booking.trainerName}`,
    `Service: ${booking.serviceName}`,
    `Location: ${getLocationLabel(booking.locationType)}`,
    booking.notes ? `Notes: ${booking.notes}` : null,
    joinUrl ? `Join link: ${joinUrl}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  await Calendar.createEventAsync(calendarId, {
    title: `FoundFit - ${booking.serviceName}`,
    startDate: new Date(booking.startTime),
    endDate: new Date(booking.endTime),
    location:
      booking.locationType === 'travel'
        ? booking.travelAddress || "Client's Home"
        : getLocationLabel(booking.locationType),
    notes,
    timeZone: booking.trainerTimezone,
  })
}
