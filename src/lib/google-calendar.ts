import 'server-only'

import { google } from 'googleapis'
import { SITE } from '@/lib/site-config'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { TrainerCalendarConnection } from '@/lib/types'

const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
]

type StoredTrainerCalendarConnection = Pick<
  TrainerCalendarConnection,
  'trainer_id' | 'google_refresh_token' | 'google_calendar_id'
>

function hasConfiguredValue(value: string | undefined) {
  return Boolean(value && value.trim() && value.trim().toLowerCase() !== 'placeholder')
}

function getGoogleClientId() {
  const value = process.env.GOOGLE_CLIENT_ID

  if (!hasConfiguredValue(value)) {
    throw new Error('GOOGLE_CLIENT_ID is not set')
  }

  return value
}

function getGoogleClientSecret() {
  const value = process.env.GOOGLE_CLIENT_SECRET

  if (!hasConfiguredValue(value)) {
    throw new Error('GOOGLE_CLIENT_SECRET is not set')
  }

  return value
}

function getGoogleRedirectUri() {
  return new URL('/api/trainer/google/callback', process.env.NEXT_PUBLIC_APP_URL || SITE.url).toString()
}

function createGoogleOAuthClient(refreshToken?: string) {
  const oauth2Client = new google.auth.OAuth2(
    getGoogleClientId(),
    getGoogleClientSecret(),
    getGoogleRedirectUri()
  )

  if (refreshToken) {
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })
  }

  return oauth2Client
}

function getCalendarApi(connection: StoredTrainerCalendarConnection) {
  return google.calendar({
    version: 'v3',
    auth: createGoogleOAuthClient(connection.google_refresh_token),
  })
}

function getCalendarId(calendarId?: string | null) {
  return calendarId || 'primary'
}

async function getTrainerCalendarConnection(trainerId: string): Promise<StoredTrainerCalendarConnection | null> {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from('trainer_calendar_connections')
    .select('trainer_id, google_refresh_token, google_calendar_id')
    .eq('trainer_id', trainerId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as StoredTrainerCalendarConnection | null) ?? null
}

export function isTrainerGoogleCalendarConfigured() {
  return hasConfiguredValue(process.env.GOOGLE_CLIENT_ID) && hasConfiguredValue(process.env.GOOGLE_CLIENT_SECRET)
}

export function getTrainerGoogleAuthUrl(state: string) {
  const oauth2Client = createGoogleOAuthClient()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    include_granted_scopes: true,
    prompt: 'consent',
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  })
}

export async function exchangeTrainerGoogleCode(code: string) {
  const oauth2Client = createGoogleOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.refresh_token) {
    throw new Error('Google did not return a refresh token. Please try connecting again.')
  }

  oauth2Client.setCredentials(tokens)

  const oauth2 = google.oauth2({
    version: 'v2',
    auth: oauth2Client,
  })

  const { data } = await oauth2.userinfo.get()

  return {
    googleRefreshToken: tokens.refresh_token,
    googleCalendarId: 'primary',
    googleCalendarEmail: data.email ?? null,
  }
}

export async function getTrainerCalendarBusySlots(
  date: Date,
  trainerId: string,
  timeZone = 'America/New_York'
): Promise<{ start: string; end: string }[]> {
  const connection = await getTrainerCalendarConnection(trainerId)
  if (!connection) {
    return []
  }

  const resolvedCalendarId = getCalendarId(connection.google_calendar_id)
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const response = await getCalendarApi(connection).freebusy.query({
    requestBody: {
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      timeZone,
      items: [{ id: resolvedCalendarId }],
    },
  })

  const busy = response.data.calendars?.[resolvedCalendarId]?.busy || []

  return busy.map((slot) => ({
    start: slot.start!,
    end: slot.end!,
  }))
}

export async function createTrainerCalendarEvent(
  trainerId: string,
  summary: string,
  description: string,
  startTime: string,
  endTime: string,
  location?: string,
  timeZone = 'America/New_York'
): Promise<string | null> {
  const connection = await getTrainerCalendarConnection(trainerId)
  if (!connection) {
    return null
  }

  const response = await getCalendarApi(connection).events.insert({
    calendarId: getCalendarId(connection.google_calendar_id),
    requestBody: {
      summary,
      description,
      location,
      start: {
        dateTime: startTime,
        timeZone,
      },
      end: {
        dateTime: endTime,
        timeZone,
      },
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 30 }],
      },
    },
  })

  return response.data.id || null
}

export async function deleteTrainerCalendarEvent(trainerId: string, eventId: string): Promise<void> {
  const connection = await getTrainerCalendarConnection(trainerId)
  if (!connection) {
    return
  }

  await getCalendarApi(connection).events.delete({
    calendarId: getCalendarId(connection.google_calendar_id),
    eventId,
  })
}
