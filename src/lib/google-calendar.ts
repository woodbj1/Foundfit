import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
)

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
})

const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

export async function getCalendarBusySlots(
  date: Date,
  calendarId?: string
): Promise<{ start: string; end: string }[]> {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      timeZone: 'America/New_York',
      items: [{ id: calendarId || process.env.GOOGLE_CALENDAR_ID! }],
    },
  })

  const busy =
    response.data.calendars?.[calendarId || process.env.GOOGLE_CALENDAR_ID!]?.busy || []

  return busy.map((slot) => ({
    start: slot.start!,
    end: slot.end!,
  }))
}

export async function createCalendarEvent(
  summary: string,
  description: string,
  startTime: string,
  endTime: string,
  location?: string,
  calendarId?: string
): Promise<string | null> {
  const response = await calendar.events.insert({
    calendarId: calendarId || process.env.GOOGLE_CALENDAR_ID!,
    requestBody: {
      summary,
      description,
      location,
      start: {
        dateTime: startTime,
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: endTime,
        timeZone: 'America/New_York',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
        ],
      },
    },
  })

  return response.data.id || null
}

export async function deleteCalendarEvent(
  eventId: string,
  calendarId?: string
): Promise<void> {
  await calendar.events.delete({
    calendarId: calendarId || process.env.GOOGLE_CALENDAR_ID!,
    eventId,
  })
}
