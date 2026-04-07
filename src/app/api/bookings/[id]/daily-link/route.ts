import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildDailyJoinUrl,
  createDailyMeetingToken,
  getDailyJoinAvailability,
} from '@/lib/daily'
import { isVirtualService } from '@/lib/product-access'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [{ data: profile }, { data: booking }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email, role')
      .eq('id', user.id)
      .single(),
    supabase
      .from('bookings')
      .select('*, trainer:trainers(user_id), service:services(*)')
      .eq('id', id)
      .single(),
  ])

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const isAdmin = profile?.role === 'admin'
  const isAssignedTrainer = booking.trainer?.user_id === user.id
  const isClient = booking.client_id === user.id

  if (!isAdmin && !isAssignedTrainer && !isClient) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (booking.status !== 'approved') {
    return NextResponse.json({ error: 'Only approved sessions can be joined.' }, { status: 409 })
  }

  if (!isVirtualService(booking.service)) {
    return NextResponse.json({ error: 'This booking does not use Daily.' }, { status: 400 })
  }

  if (!booking.daily_room_name || !booking.daily_room_url) {
    return NextResponse.json(
      { error: 'Daily room is not ready for this booking yet.' },
      { status: 409 }
    )
  }

  const joinAvailability = getDailyJoinAvailability(booking.start_time, booking.end_time)
  if (!joinAvailability.canJoin) {
    return NextResponse.json({ error: joinAvailability.message }, { status: 409 })
  }

  const token = await createDailyMeetingToken({
    roomName: booking.daily_room_name,
    userName: profile?.full_name || profile?.email || 'FoundFit member',
    userId: user.id,
    isOwner: isAdmin || isAssignedTrainer,
    startTime: booking.start_time,
    endTime: booking.end_time,
  })

  return NextResponse.json({
    url: buildDailyJoinUrl(booking.daily_room_url, token.token),
  })
}
