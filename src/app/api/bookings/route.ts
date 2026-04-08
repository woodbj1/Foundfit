import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { sendEmail, bookingRequestEmail, bookingApprovedEmail } from '@/lib/email'
import { createTrainerCalendarEvent } from '@/lib/google-calendar'
import { areIntervalsOverlapping, endOfWeek, format, startOfWeek } from 'date-fns'
import { createDailyRoomForBooking, isDailyConfigured } from '@/lib/daily'
import { isVirtualService } from '@/lib/product-access'
import type { Booking, Service, SessionPack, Subscription } from '@/lib/types'
import { getCurrentDateInTimeZone } from '@/lib/timezone'

type SubscriptionWithService = Subscription & { service?: Service | null }

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('bookings')
    .select('*, client:profiles!bookings_client_id_fkey(*)')
    .eq('client_id', user.id)
    .order('start_time', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const admin = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { start_time, location_type, travel_address, notes, trainer_id, service_id } = body

  if (!start_time || !service_id) {
    return NextResponse.json({ error: 'start_time and service_id are required' }, { status: 400 })
  }

  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', service_id)
    .eq('is_active', true)
    .single()

  if (!service || service.is_session === false) {
    return NextResponse.json({ error: 'This product is not bookable.' }, { status: 400 })
  }

  const isVirtualBooking = isVirtualService(service)
  if (isVirtualBooking && !isDailyConfigured()) {
    return NextResponse.json(
      { error: 'Virtual sessions are not available until Daily is configured.' },
      { status: 503 }
    )
  }

  const { data: bookingSettings } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['default_duration', 'booking_window_days'])

  const defaultDurationSetting = bookingSettings?.find((setting) => setting.key === 'default_duration')
  const bookingWindowSetting = bookingSettings?.find((setting) => setting.key === 'booking_window_days')
  const duration = service.duration_minutes || parseInt(defaultDurationSetting?.value || '50', 10)
  const bookingWindowDays = Math.max(parseInt(bookingWindowSetting?.value || '14', 10) || 14, 1)

  let targetTrainerId = trainer_id
  if (!targetTrainerId) {
    const { data: firstTrainer } = await admin
      .from('trainers')
      .select('id')
      .eq('is_active', true)
      .not('onboarding_completed_at', 'is', null)
      .limit(1)
      .single()
    if (!firstTrainer) {
      return NextResponse.json({ error: 'No active trainers available' }, { status: 400 })
    }
    targetTrainerId = firstTrainer.id
  }

  const hasAccess = await checkClientAccess(supabase, user.id, service.id, start_time)
  if (!hasAccess.allowed) {
    return NextResponse.json({ error: hasAccess.reason }, { status: 400 })
  }

  const { data: trainerRecord } = await admin
      .from('trainers')
      .select('id, user_id, is_active, onboarding_completed_at')
      .eq('id', targetTrainerId)
      .single()

  if (!trainerRecord) {
    return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })
  }

  if (!trainerRecord.is_active) {
    return NextResponse.json({ error: 'This trainer is not accepting bookings right now.' }, { status: 400 })
  }

  if (!trainerRecord.onboarding_completed_at) {
    return NextResponse.json(
      { error: 'This trainer is still finishing setup and cannot accept bookings yet.' },
      { status: 400 }
    )
  }

  const startDate = new Date(start_time)
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: 'Invalid start_time' }, { status: 400 })
  }

  if (startDate <= new Date()) {
    return NextResponse.json({ error: 'Bookings must be scheduled in the future.' }, { status: 400 })
  }

  const startDateString = startDate.toISOString().slice(0, 10)
  const currentBookingDate = getCurrentDateInTimeZone('America/New_York')
  const lastBookableDate = addDaysUtc(currentBookingDate, bookingWindowDays - 1)

  if (startDateString < currentBookingDate || startDateString > lastBookableDate) {
    return NextResponse.json(
      { error: `Bookings can only be made through ${lastBookableDate}.` },
      { status: 400 }
    )
  }

  const { data: trainerProfile } = await admin
    .from('profiles')
    .select('booking_preference, timezone')
    .eq('id', trainerRecord.user_id)
    .single()

  const shouldAutoApprove = trainerProfile?.booking_preference === 'instant_confirmation'
  const trainerTimezone = trainerProfile?.timezone || 'America/New_York'

  const endDate = new Date(startDate.getTime() + duration * 60000)

  const { data: conflictingBookings } = await admin
    .from('bookings')
    .select('id, start_time, end_time')
    .eq('trainer_id', targetTrainerId)
    .in('status', ['pending', 'approved'])
    .lt('start_time', endDate.toISOString())
    .gt('end_time', startDate.toISOString())

  const hasConflict = (conflictingBookings ?? []).some((booking) =>
    areIntervalsOverlapping(
      { start: startDate, end: endDate },
      { start: new Date(booking.start_time), end: new Date(booking.end_time) }
    )
  )

  if (hasConflict) {
    return NextResponse.json(
      { error: 'That time was just booked. Please choose another slot.' },
      { status: 409 }
    )
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      client_id: user.id,
      trainer_id: targetTrainerId,
      service_id: service.id,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      status: shouldAutoApprove ? 'approved' : 'pending',
      location_type: isVirtualBooking ? 'virtual' : (location_type || 'gym'),
      travel_address: isVirtualBooking ? null : (travel_address || null),
      notes: notes || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  try {
    const { data: trainer } = await admin
      .from('trainers')
      .select('*, profile:profiles!trainers_user_id_fkey(*)')
      .eq('id', targetTrainerId)
      .single()

    const { data: clientProfile } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    if (shouldAutoApprove) {
      let dailyRoomUrl: string | null = null
      let dailyRoomName: string | null = null

      if (isVirtualBooking) {
        try {
          const room = await createDailyRoomForBooking(booking.id)
          dailyRoomName = room.name
          dailyRoomUrl = room.url
        } catch (dailyError) {
          console.error('Failed to create Daily room for auto-approved booking:', dailyError)
          await supabase
            .from('bookings')
            .update({ status: 'pending' })
            .eq('id', booking.id)
          booking.status = 'pending'
        }
      }

      if (booking.status === 'approved') {
        try {
          const eventId = await createTrainerCalendarEvent(
            targetTrainerId,
            `${service.name}: ${clientProfile?.full_name || 'Client'}`,
            buildBookingCalendarDescription({
              clientName: clientProfile?.full_name || 'Client',
              serviceName: service.name,
              notes,
              dailyRoomUrl,
            }),
            startDate.toISOString(),
            endDate.toISOString(),
            isVirtualBooking
              ? 'Virtual session via Daily'
              : location_type === 'travel'
                ? travel_address || undefined
                : undefined,
            trainerTimezone
          )

          const updateData: Partial<
            Pick<Booking, 'google_calendar_event_id' | 'daily_room_name' | 'daily_room_url'>
          > = {}
          if (eventId) {
            updateData.google_calendar_event_id = eventId
            booking.google_calendar_event_id = eventId
          }
          if (dailyRoomName && dailyRoomUrl) {
            updateData.daily_room_name = dailyRoomName
            updateData.daily_room_url = dailyRoomUrl
            booking.daily_room_name = dailyRoomName
            booking.daily_room_url = dailyRoomUrl
          }

          if (Object.keys(updateData).length > 0) {
            await supabase
              .from('bookings')
              .update(updateData)
              .eq('id', booking.id)
          }
        } catch (calendarError) {
          console.error('Failed to create calendar event for auto-approved booking:', calendarError)
        }

        const { data: packs } = await supabase
          .from('session_packs')
          .select('*')
          .eq('client_id', user.id)
          .eq('service_id', service.id)
          .order('purchased_at', { ascending: true })

        const activePack = (packs as SessionPack[] | null)?.find(
          (pack) => pack.used_sessions < pack.total_sessions
        )
        if (activePack) {
          await supabase
            .from('session_packs')
            .update({ used_sessions: activePack.used_sessions + 1 })
            .eq('id', activePack.id)
        }

        if (clientProfile?.email) {
          const emailData = bookingApprovedEmail(
            clientProfile.full_name || 'there',
            format(startDate, 'EEEE, MMMM d, yyyy'),
            format(startDate, 'h:mm a'),
            dailyRoomUrl || undefined
          )
          await sendEmail({ to: clientProfile.email, ...emailData })
        }
      }
    }

    if (booking.status === 'pending' && trainer?.profile?.email) {
      const emailData = bookingRequestEmail(
        clientProfile?.full_name || 'A client',
        format(startDate, 'EEEE, MMMM d, yyyy'),
        format(startDate, 'h:mm a')
      )
      await sendEmail({
        to: trainer.profile.email,
        ...emailData,
      })
    }
  } catch (emailError) {
    console.error('Failed to send booking notification email:', emailError)
  }

  return NextResponse.json(booking)
}

async function checkClientAccess(
  supabase: SupabaseClient,
  clientId: string,
  serviceId: string,
  startTime: string
): Promise<{ allowed: boolean; reason?: string }> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*, service:services(*)')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .eq('service_id', serviceId)
    .limit(1)
    .maybeSingle()

  const normalizedSubscription = subscription as SubscriptionWithService | null

  if (normalizedSubscription) {
    const maxWeekly = normalizedSubscription.service?.max_weekly_bookings || 3
    const weekStart = startOfWeek(new Date(startTime))
    const weekEnd = endOfWeek(new Date(startTime))

    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('service_id', serviceId)
      .in('status', ['pending', 'approved'])
      .gte('start_time', weekStart.toISOString())
      .lte('start_time', weekEnd.toISOString())

    if ((count || 0) >= maxWeekly) {
      return { allowed: false, reason: `You've reached your weekly limit of ${maxWeekly} sessions` }
    }
    return { allowed: true }
  }

  const { data: packs } = await supabase
    .from('session_packs')
    .select('*')
    .eq('client_id', clientId)
    .eq('service_id', serviceId)
    .order('purchased_at', { ascending: true })

  const activePack = (packs as SessionPack[] | null)?.find(
    (pack) => pack.used_sessions < pack.total_sessions
  )

  if (activePack) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: 'No active subscription or available sessions. Please purchase a package first.',
  }
}

function addDaysUtc(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

function buildBookingCalendarDescription({
  clientName,
  serviceName,
  notes,
  dailyRoomUrl,
}: {
  clientName: string
  serviceName: string
  notes?: string
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
