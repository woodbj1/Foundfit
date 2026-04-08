import 'server-only'

import { google } from 'googleapis'
import { SITE } from '@/lib/site-config'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getUtcRangeForDateInTimeZone } from '@/lib/timezone'
import type { TrainerCalendarConnection } from '@/lib/types'

const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
]

export type TrainerCalendarConnectionStatus = 'not_connected' | 'connected' | 'reconnect_required'

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

function hasCalendarScope(scope: string | string[] | null | undefined) {
  if (!scope) {
    return false
  }

  const normalizedScopes = Array.isArray(scope) ? scope : scope.split(/\s+/)
  return normalizedScopes.includes('https://www.googleapis.com/auth/calendar')
}

function getGoogleErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return ''
  }

  const response = 'response' in error ? (error as { response?: { data?: unknown } }).response : undefined
  const responseData = response?.data

  if (!responseData) {
    return error.message.toLowerCase()
  }

  if (typeof responseData === 'string') {
    return `${error.message} ${responseData}`.toLowerCase()
  }

  try {
    return `${error.message} ${JSON.stringify(responseData)}`.toLowerCase()
  } catch {
    return error.message.toLowerCase()
  }
}

function isReconnectRequiredGoogleError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const message = getGoogleErrorMessage(error)

  return (
    message.includes('invalid_grant') ||
    message.includes('insufficient authentication scopes') ||
    message.includes('access_token_scope_insufficient') ||
    message.includes('scope') ||
    message.includes('invalid credentials')
  )
}

async function getGoogleTokenScope(refreshToken: string) {
  const oauth2Client = createGoogleOAuthClient(refreshToken)
  const tokenResponse = await oauth2Client.getAccessToken()

  if (!tokenResponse.token) {
    throw new Error('Google did not return an access token for this trainer connection.')
  }

  const oauth2 = google.oauth2({
    version: 'v2',
    auth: oauth2Client,
  })

  const { data } = await oauth2.tokeninfo({
    access_token: tokenResponse.token,
  })

  return data.scope ?? ''
}

async function markTrainerCalendarConnectionNeedsReconnect(trainerId: string) {
  const admin = createServiceRoleClient()

  await Promise.all([
    admin.from('trainer_calendar_connections').delete().eq('trainer_id', trainerId),
    admin
      .from('trainers')
      .update({
        google_calendar_connected_at: null,
        google_calendar_email: null,
      })
      .eq('id', trainerId),
  ])
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

  const accessToken = tokens.access_token ?? (await oauth2Client.getAccessToken()).token
  if (!accessToken) {
    throw new Error('Google did not return an access token. Please try connecting again.')
  }

  const oauth2 = google.oauth2({
    version: 'v2',
    auth: oauth2Client,
  })

  const tokenInfo = await oauth2.tokeninfo({
    access_token: accessToken,
  })

  if (!hasCalendarScope(tokenInfo.data.scope)) {
    throw new Error('Google Calendar permission was not granted. Please reconnect and allow calendar access.')
  }

  const { data } = await oauth2.userinfo.get()

  return {
    googleRefreshToken: tokens.refresh_token,
    googleCalendarId: 'primary',
    googleCalendarEmail: data.email ?? null,
  }
}

export async function getTrainerCalendarConnectionStatus(
  trainerId: string,
  options?: { repair?: boolean }
): Promise<{
  status: TrainerCalendarConnectionStatus
  email: string | null
}> {
  const admin = createServiceRoleClient()
  const { data: trainer, error } = await admin
    .from('trainers')
    .select('google_calendar_connected_at, google_calendar_email')
    .eq('id', trainerId)
    .single()

  if (error) {
    throw error
  }

  const connection = await getTrainerCalendarConnection(trainerId)

  if (!trainer.google_calendar_connected_at || !connection) {
    if (options?.repair && (trainer.google_calendar_connected_at || connection)) {
      await markTrainerCalendarConnectionNeedsReconnect(trainerId)
    }

    return {
      status: 'not_connected',
      email: null,
    }
  }

  try {
    const grantedScope = await getGoogleTokenScope(connection.google_refresh_token)

    if (!hasCalendarScope(grantedScope)) {
      if (options?.repair) {
        await markTrainerCalendarConnectionNeedsReconnect(trainerId)
      }

      return {
        status: 'reconnect_required',
        email: trainer.google_calendar_email ?? null,
      }
    }

    return {
      status: 'connected',
      email: trainer.google_calendar_email ?? null,
    }
  } catch (error) {
    if (!isReconnectRequiredGoogleError(error)) {
      throw error
    }

    if (options?.repair) {
      await markTrainerCalendarConnectionNeedsReconnect(trainerId)
    }

    return {
      status: 'reconnect_required',
      email: trainer.google_calendar_email ?? null,
    }
  }
}

export async function getTrainerCalendarBusySlots(
  date: string,
  trainerId: string,
  timeZone = 'America/New_York'
): Promise<{ start: string; end: string }[]> {
  const connection = await getTrainerCalendarConnection(trainerId)
  if (!connection) {
    return []
  }

  const resolvedCalendarId = getCalendarId(connection.google_calendar_id)
  const { start: startOfDay, end: endOfDay } = getUtcRangeForDateInTimeZone(date, timeZone)

  let response

  try {
    response = await getCalendarApi(connection).freebusy.query({
      requestBody: {
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        timeZone,
        items: [{ id: resolvedCalendarId }],
      },
    })
  } catch (error) {
    if (isReconnectRequiredGoogleError(error)) {
      console.warn(`[google-calendar] Trainer ${trainerId} needs to reconnect Google Calendar`)
      await markTrainerCalendarConnectionNeedsReconnect(trainerId)
      return []
    }

    throw error
  }

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

  try {
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
  } catch (error) {
    if (isReconnectRequiredGoogleError(error)) {
      console.warn(`[google-calendar] Trainer ${trainerId} needs to reconnect Google Calendar`)
      await markTrainerCalendarConnectionNeedsReconnect(trainerId)
      return null
    }

    throw error
  }
}

export async function updateTrainerCalendarEvent(
  trainerId: string,
  eventId: string,
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

  try {
    const response = await getCalendarApi(connection).events.update({
      calendarId: getCalendarId(connection.google_calendar_id),
      eventId,
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
  } catch (error) {
    if (isReconnectRequiredGoogleError(error)) {
      console.warn(`[google-calendar] Trainer ${trainerId} needs to reconnect Google Calendar`)
      await markTrainerCalendarConnectionNeedsReconnect(trainerId)
      return null
    }

    throw error
  }
}

export async function deleteTrainerCalendarEvent(trainerId: string, eventId: string): Promise<void> {
  const connection = await getTrainerCalendarConnection(trainerId)
  if (!connection) {
    return
  }

  try {
    await getCalendarApi(connection).events.delete({
      calendarId: getCalendarId(connection.google_calendar_id),
      eventId,
    })
  } catch (error) {
    if (isReconnectRequiredGoogleError(error)) {
      console.warn(`[google-calendar] Trainer ${trainerId} needs to reconnect Google Calendar`)
      await markTrainerCalendarConnectionNeedsReconnect(trainerId)
      return
    }

    throw error
  }
}
