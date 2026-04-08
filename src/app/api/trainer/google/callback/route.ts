import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { ensureProfileAndRole } from '@/lib/supabase/auth-repair'
import { createTrainerCalendarEvent, exchangeTrainerGoogleCode } from '@/lib/google-calendar'

const TRAINER_GOOGLE_STATE_COOKIE = 'trainer_google_oauth_state'

function redirectToSetup(request: NextRequest, reason: string) {
  const url = new URL('/trainer-setup', request.url)
  url.searchParams.set('google', reason)
  const response = NextResponse.redirect(url)
  response.cookies.delete(TRAINER_GOOGLE_STATE_COOKIE)
  return response
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const returnedState = request.nextUrl.searchParams.get('state')

  if (!code || !returnedState) {
    return redirectToSetup(request, 'missing_code')
  }

  const cookieStore = await cookies()
  const rawStateCookie = cookieStore.get(TRAINER_GOOGLE_STATE_COOKIE)?.value

  if (!rawStateCookie) {
    return redirectToSetup(request, 'state_missing')
  }

  let parsedState: { state?: string; userId?: string } | null = null

  try {
    parsedState = JSON.parse(rawStateCookie) as { state?: string; userId?: string }
  } catch {
    return redirectToSetup(request, 'state_invalid')
  }

  if (!parsedState?.state || parsedState.state !== returnedState || !parsedState.userId) {
    return redirectToSetup(request, 'state_invalid')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== parsedState.userId) {
    return redirectToSetup(request, 'auth_required')
  }

  const profile = await ensureProfileAndRole(user)
  if (profile.role !== 'trainer') {
    return redirectToSetup(request, 'unauthorized')
  }

  try {
    const admin = createServiceRoleClient()
    const { data: trainer, error: trainerError } = await admin
      .from('trainers')
      .select(
        'id, password_updated_at, onboarding_completed_at, profile:profiles!trainers_user_id_fkey(full_name, timezone)'
      )
      .eq('user_id', user.id)
      .single()

    if (trainerError) {
      throw trainerError
    }

    const connection = await exchangeTrainerGoogleCode(code)
    const now = new Date().toISOString()

    const { error: connectionError } = await admin
      .from('trainer_calendar_connections')
      .upsert(
        {
          trainer_id: trainer.id,
          google_refresh_token: connection.googleRefreshToken,
          google_calendar_id: connection.googleCalendarId,
          updated_at: now,
        },
        { onConflict: 'trainer_id' }
      )

    if (connectionError) {
      throw connectionError
    }

    const trainerUpdate: Record<string, string | null> = {
      google_calendar_connected_at: now,
      google_calendar_email: connection.googleCalendarEmail,
    }

    if (!trainer.onboarding_completed_at && trainer.password_updated_at) {
      trainerUpdate.onboarding_completed_at = now
    }

    const { error: trainerUpdateError } = await admin
      .from('trainers')
      .update(trainerUpdate)
      .eq('id', trainer.id)

    if (trainerUpdateError) {
      throw trainerUpdateError
    }

    const normalizedTrainerProfile = Array.isArray(trainer.profile)
      ? trainer.profile[0]
      : trainer.profile

    const { data: upcomingApprovedBookings, error: upcomingApprovedBookingsError } = await admin
      .from('bookings')
      .select(
        'id, start_time, end_time, location_type, travel_address, notes, daily_room_url, google_calendar_event_id, client:profiles!bookings_client_id_fkey(full_name), service:services(name)'
      )
      .eq('trainer_id', trainer.id)
      .eq('status', 'approved')
      .is('google_calendar_event_id', null)
      .gte('start_time', now)
      .order('start_time', { ascending: true })

    if (upcomingApprovedBookingsError) {
      throw upcomingApprovedBookingsError
    }

    for (const booking of upcomingApprovedBookings ?? []) {
      const normalizedClient =
        Array.isArray(booking.client) ? booking.client[0] : booking.client
      const normalizedService =
        Array.isArray(booking.service) ? booking.service[0] : booking.service

      const eventId = await createTrainerCalendarEvent(
        trainer.id,
        `${normalizedService?.name || 'Training'}: ${normalizedClient?.full_name || 'Client'}`,
        buildBookingCalendarDescription({
          clientName: normalizedClient?.full_name || 'Client',
          serviceName: normalizedService?.name || 'Training Session',
          notes: booking.notes,
          dailyRoomUrl: booking.daily_room_url,
        }),
        booking.start_time,
        booking.end_time,
        booking.location_type === 'virtual'
          ? 'Virtual session via Daily'
          : booking.location_type === 'travel'
            ? booking.travel_address || undefined
            : undefined,
        normalizedTrainerProfile?.timezone || 'America/New_York'
      )

      if (eventId) {
        const { error: bookingUpdateError } = await admin
          .from('bookings')
          .update({ google_calendar_event_id: eventId })
          .eq('id', booking.id)

        if (bookingUpdateError) {
          throw bookingUpdateError
        }
      }
    }

    const finalRedirect = new URL(trainer.password_updated_at ? '/trainer' : '/trainer-setup', request.url)
    finalRedirect.searchParams.set('google', 'connected')
    const successResponse = NextResponse.redirect(finalRedirect)
    successResponse.cookies.delete(TRAINER_GOOGLE_STATE_COOKIE)
    return successResponse
  } catch (error) {
    console.error('[GET /api/trainer/google/callback]', error)
    const reason =
      error instanceof Error &&
      error.message.toLowerCase().includes('calendar permission was not granted')
        ? 'scope_missing'
        : 'connect_failed'
    return redirectToSetup(request, reason)
  }
}

function buildBookingCalendarDescription({
  clientName,
  serviceName,
  notes,
  dailyRoomUrl,
}: {
  clientName: string
  serviceName: string
  notes?: string | null
  dailyRoomUrl?: string | null
}) {
  const parts = [`FoundFit ${serviceName} with ${clientName}`]

  if (notes) {
    parts.push(`Notes: ${notes}`)
  }

  if (dailyRoomUrl) {
    parts.push(`Daily join link: ${dailyRoomUrl}`)
  }

  return parts.join('\n')
}
