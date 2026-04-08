import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTrainerCalendarEvent, deleteTrainerCalendarEvent } from '@/lib/google-calendar'
import { sendEmail, bookingApprovedEmail, bookingDeclinedEmail, bookingCancelledEmail } from '@/lib/email'
import { areIntervalsOverlapping } from 'date-fns'
import {
  formatBookingLongDate,
  formatBookingTime,
  getBufferedBookingEnd,
} from '@/lib/booking-time'
import { createDailyRoomForBooking, isDailyConfigured } from '@/lib/daily'
import { isPackExpired, isVirtualService } from '@/lib/product-access'
import { getDateStringInTimeZone, getUtcRangeForDateInTimeZone } from '@/lib/timezone'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { status } = body

  if (!['approved', 'declined'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: actorTrainer } = await supabase
    .from('trainers')
    .select('id, user_id')
    .eq('user_id', user.id)
    .single()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, client:profiles!bookings_client_id_fkey(*), service:services(*), trainer:trainers(user_id, profile:profiles!trainers_user_id_fkey(timezone))')
    .eq('id', id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const isAdmin = actorProfile?.role === 'admin'
  const isOwningTrainer = !!actorTrainer && actorTrainer.id === booking.trainer_id

  if (!isAdmin && !isOwningTrainer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!['pending', 'approved'].includes(booking.status)) {
    return NextResponse.json({ error: 'Booking can no longer be updated' }, { status: 400 })
  }

  const updateData: {
    status: 'approved' | 'declined'
    daily_room_name?: string
    daily_room_url?: string
    google_calendar_event_id?: string
  } = { status }
  const isVirtualBooking = isVirtualService(booking.service)

  if (status === 'approved') {
    const startDate = new Date(booking.start_time)
    const endDate = new Date(booking.end_time)
    const trainerTimezone = booking.trainer?.profile?.timezone || 'America/New_York'
    const bookingBlockEnd = getBufferedBookingEnd(startDate, endDate)
    const bookingDateString = getDateStringInTimeZone(booking.start_time, trainerTimezone)

    if (startDate <= new Date()) {
      return NextResponse.json(
        { error: 'Past bookings can no longer be approved.' },
        { status: 400 }
      )
    }

    const { start: dayStart, end: dayEnd } = getUtcRangeForDateInTimeZone(
      bookingDateString,
      trainerTimezone
    )

    const { data: conflictingBookings } = await supabase
      .from('bookings')
      .select('id, start_time, end_time')
      .eq('trainer_id', booking.trainer_id)
      .in('status', ['pending', 'approved'])
      .neq('id', booking.id)
      .gte('start_time', dayStart.toISOString())
      .lt('start_time', dayEnd.toISOString())

    const hasConflict = (conflictingBookings ?? []).some((otherBooking) =>
      areIntervalsOverlapping(
        { start: startDate, end: bookingBlockEnd },
        {
          start: new Date(otherBooking.start_time),
          end: getBufferedBookingEnd(otherBooking.start_time, otherBooking.end_time),
        }
      )
    )

    if (hasConflict) {
      return NextResponse.json(
        { error: 'This time now overlaps another booking. Ask the client to pick a new slot.' },
        { status: 409 }
      )
    }

    if (isVirtualBooking && !booking.daily_room_url) {
      if (!isDailyConfigured()) {
        return NextResponse.json(
          { error: 'Daily is not configured for virtual sessions.' },
          { status: 503 }
        )
      }

      try {
        const room = await createDailyRoomForBooking(booking.id)
        updateData.daily_room_name = room.name
        updateData.daily_room_url = room.url
      } catch (dailyError) {
        console.error('Failed to create Daily room:', dailyError)
        return NextResponse.json(
          { error: 'Could not create the Daily meeting room for this booking.' },
          { status: 502 }
        )
      }
    }

    if (!booking.google_calendar_event_id) {
      try {
        const eventId = await createTrainerCalendarEvent(
          booking.trainer_id,
          `${booking.service?.name || 'Training'}: ${booking.client?.full_name || 'Client'}`,
          buildBookingCalendarDescription({
            clientName: booking.client?.full_name || 'Client',
            serviceName: booking.service?.name || 'Training Session',
            notes: booking.notes,
            dailyRoomUrl: updateData.daily_room_url || booking.daily_room_url,
          }),
          booking.start_time,
          booking.end_time,
          booking.location_type === 'virtual'
            ? 'Virtual session via Daily'
            : booking.location_type === 'travel'
              ? booking.travel_address || undefined
              : undefined,
          booking.trainer?.profile?.timezone || 'America/New_York'
        )
        if (eventId) {
          updateData.google_calendar_event_id = eventId
        }
      } catch (error) {
        console.error('Failed to create calendar event:', error)
      }
    }

    if (booking.status !== 'approved') {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('client_id', booking.client_id)
        .eq('status', 'active')
        .eq('service_id', booking.service_id)
        .limit(1)
        .maybeSingle()

      if (!subscription) {
        const { data: packs } = await supabase
          .from('session_packs')
          .select('*')
          .eq('client_id', booking.client_id)
          .eq('service_id', booking.service_id)
          .order('purchased_at', { ascending: true })

        const activePack = packs?.find(
          (p) => !isPackExpired(p) && p.used_sessions < p.total_sessions
        )
        if (activePack) {
          await supabase
            .from('session_packs')
            .update({ used_sessions: activePack.used_sessions + 1 })
            .eq('id', activePack.id)
        }
      }
    }
  }

  const { error } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  try {
    if (booking.client?.email) {
      const startDate = new Date(booking.start_time)
      const trainerTimezone = booking.trainer?.profile?.timezone || 'America/New_York'
      const dateStr = formatBookingLongDate(startDate, trainerTimezone)
      const timeStr = formatBookingTime(startDate, trainerTimezone)

      const emailData = status === 'approved'
        ? bookingApprovedEmail(
            booking.client.full_name || 'there',
            dateStr,
            timeStr,
            updateData.daily_room_url || booking.daily_room_url || undefined
          )
        : bookingDeclinedEmail(booking.client.full_name || 'there', dateStr, timeStr)

      await sendEmail({ to: booking.client.email, ...emailData })
    }
  } catch (emailError) {
    console.error('Failed to send booking status email:', emailError)
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, client:profiles!bookings_client_id_fkey(*), trainer:trainers(*, profile:profiles!trainers_user_id_fkey(*)), service:services(*)')
    .eq('id', id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.client_id !== user.id) {
    const [{ data: profile }, { data: actorTrainer }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('trainers').select('id').eq('user_id', user.id).maybeSingle(),
    ])

    const isAdmin = profile?.role === 'admin'
    const isOwningTrainer = actorTrainer?.id === booking.trainer_id

    if (!isAdmin && !isOwningTrainer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (booking.google_calendar_event_id) {
    try {
      await deleteTrainerCalendarEvent(booking.trainer_id, booking.google_calendar_event_id)
    } catch (error) {
      console.error('Failed to delete calendar event:', error)
    }
  }

  if (booking.status === 'approved') {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('client_id', booking.client_id)
      .eq('status', 'active')
      .eq('service_id', booking.service_id)
      .limit(1)
      .maybeSingle()

    if (!subscription) {
      const { data: packs } = await supabase
        .from('session_packs')
        .select('*')
        .eq('client_id', booking.client_id)
        .eq('service_id', booking.service_id)
        .gt('used_sessions', 0)
        .order('purchased_at', { ascending: true })
        .limit(1)

      if (packs && packs.length > 0) {
        await supabase
          .from('session_packs')
          .update({ used_sessions: packs[0].used_sessions - 1 })
          .eq('id', packs[0].id)
      }
    }
  }

  try {
    const trainerEmail = booking.trainer?.profile?.email
    if (trainerEmail) {
      const startDate = new Date(booking.start_time)
      const trainerTimezone = booking.trainer?.profile?.timezone || 'America/New_York'
      const emailData = bookingCancelledEmail(
        booking.trainer?.profile?.full_name || 'Trainer',
        booking.client?.full_name || 'A client',
        formatBookingLongDate(startDate, trainerTimezone),
        formatBookingTime(startDate, trainerTimezone)
      )
      await sendEmail({ to: trainerEmail, ...emailData })
    }
  } catch (emailError) {
    console.error('Failed to send cancellation email:', emailError)
  }

  return NextResponse.json({ success: true })
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

