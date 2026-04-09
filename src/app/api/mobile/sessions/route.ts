import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient, createClient } from '@/lib/supabase/server'

function normalizeSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const admin = await createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client') {
    return NextResponse.json({ error: 'Client access only.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = admin
    .from('bookings')
    .select(
      'id, start_time, end_time, status, location_type, travel_address, notes, trainer:trainers(id, profile:profiles!trainers_user_id_fkey(full_name, timezone)), service:services(name)'
    )
    .eq('client_id', user.id)
    .order('start_time', { ascending: true })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: bookings, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: (bookings ?? []).map((booking) => {
      const trainer = normalizeSingle(booking.trainer)
      const trainerProfile = trainer ? normalizeSingle(trainer.profile) : null
      const service = normalizeSingle(booking.service)

      return {
        id: booking.id,
        startTime: booking.start_time,
        endTime: booking.end_time,
        status: booking.status,
        locationType: booking.location_type,
        travelAddress: booking.travel_address,
        notes: booking.notes,
        trainerName: trainerProfile?.full_name || 'Trainer',
        trainerTimezone: trainerProfile?.timezone || 'America/New_York',
        serviceName: service?.name || 'Training Session',
      }
    }),
  })
}
