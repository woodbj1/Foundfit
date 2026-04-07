import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTrainerCalendarEvent, deleteTrainerCalendarEvent } from '@/lib/google-calendar'
import { sendEmail, bookingApprovedEmail, bookingDeclinedEmail, bookingCancelledEmail } from '@/lib/email'
import { format } from 'date-fns'
import { createDailyRoomForBooking, isDailyConfigured } from '@/lib/daily'
import { isVirtualService } from '@/lib/product-access'

// PATCH — approve or decline a booking (trainer/admin)
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

  // Get booking
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

  // Update booking status
  const updateData: {
    status: 'approved' | 'declined'
    daily_room_name?: string
    daily_room_url?: string
    google_calendar_event_id?: string
  } = { status }
  const isVirtualBooking = isVirtualService(booking.service)

  // If approving, add to Google Calendar
  if (status === 'approved') {
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

    // Decrement session pack if applicable
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

        const activePack = packs?.find((p) => p.used_sessions < p.total_sessions)
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

  // Send email notification to client
  try {
    if (booking.client?.email) {
      const startDate = new Date(booking.start_time)
      const dateStr = format(startDate, 'EEEE, MMMM d, yyyy')
      const timeStr = format(startDate, 'h:mm a')

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

// DELETE — cancel a booking (client)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, client:profiles!bookings_client_id_fkey(*), trainer:trainers(*, profile:profiles!trainers_user_id_fkey(*)), service:services(*)')
    .eq('id', id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.client_id !== user.id) {
    // Check if user is trainer/admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['trainer', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
  }

  // Update status to cancelled
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Remove from Google Calendar
  if (booking.google_calendar_event_id) {
    try {
      await deleteTrainerCalendarEvent(booking.trainer_id, booking.google_calendar_event_id)
    } catch (error) {
      console.error('Failed to delete calendar event:', error)
    }
  }

  // Return session credit if pack user and booking was approved
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
        .order('purchased_at', { ascending: false })
        .limit(1)

      if (packs && packs.length > 0) {
        await supabase
          .from('session_packs')
          .update({ used_sessions: packs[0].used_sessions - 1 })
          .eq('id', packs[0].id)
      }
    }
  }

  // Notify trainer
  try {
    const trainerEmail = booking.trainer?.profile?.email
    if (trainerEmail) {
      const startDate = new Date(booking.start_time)
      const emailData = bookingCancelledEmail(
        booking.trainer?.profile?.full_name || 'Trainer',
        booking.client?.full_name || 'A client',
        format(startDate, 'EEEE, MMMM d, yyyy'),
        format(startDate, 'h:mm a')
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
