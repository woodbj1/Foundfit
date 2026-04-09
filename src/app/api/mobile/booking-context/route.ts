import { NextRequest, NextResponse } from 'next/server'

import { getTrainerAwareBookableServiceOptions } from '@/lib/bookable-services'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getTotalRemainingSessions } from '@/lib/product-access'

const DEFAULT_BOOKING_WINDOW_DAYS = 14

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
  const rescheduleBookingId = searchParams.get('reschedule')

  const [{ data: subscriptions }, { data: packs }, { data: trainers }, { data: travelFeeSetting }, { data: bookingWindowSetting }] =
    await Promise.all([
      admin
        .from('subscriptions')
        .select('id, trainer_id, service_id, service:services(*)')
        .eq('client_id', user.id)
        .eq('status', 'active'),
      admin
        .from('session_packs')
        .select('id, trainer_id, service_id, total_sessions, used_sessions, expires_at, service:services(*)')
        .eq('client_id', user.id),
      admin
        .from('trainers')
        .select(
          'id, user_id, bio, is_active, onboarding_completed_at, profile:profiles!trainers_user_id_fkey(id, full_name, avatar_url, timezone)'
        )
        .eq('is_active', true)
        .not('onboarding_completed_at', 'is', null),
      admin.from('settings').select('value').eq('key', 'travel_fee').single(),
      admin.from('settings').select('value').eq('key', 'booking_window_days').single(),
    ])

  const normalizedSubscriptions = (subscriptions ?? []).map((subscription) => ({
    ...subscription,
    service: normalizeSingle(subscription.service),
  }))

  const normalizedPacks = (packs ?? []).map((pack) => ({
    ...pack,
    service: normalizeSingle(pack.service),
  }))

  const trainerOptions = (trainers ?? []).map((trainer) => ({
    id: trainer.id,
    userId: trainer.user_id,
    bio: trainer.bio,
    fullName: normalizeSingle(trainer.profile)?.full_name || 'Trainer',
    avatarUrl: normalizeSingle(trainer.profile)?.avatar_url || null,
    timezone: normalizeSingle(trainer.profile)?.timezone || 'America/New_York',
  }))

  const parsedBookingWindowDays = parseInt(
    bookingWindowSetting?.value || String(DEFAULT_BOOKING_WINDOW_DAYS),
    10
  )

  let rescheduleBooking = null
  if (rescheduleBookingId) {
    const { data: existingBooking } = await admin
      .from('bookings')
      .select(
        'id, start_time, end_time, status, location_type, travel_address, notes, trainer:trainers(id, profile:profiles!trainers_user_id_fkey(full_name, avatar_url, timezone)), service:services(id, name, is_session, fulfillment_type, access_url, session_count, duration_minutes)'
      )
      .eq('id', rescheduleBookingId)
      .eq('client_id', user.id)
      .in('status', ['pending', 'approved'])
      .gte('start_time', new Date().toISOString())
      .maybeSingle()

    if (existingBooking) {
      const trainer = normalizeSingle(existingBooking.trainer)
      const trainerProfile = trainer ? normalizeSingle(trainer.profile) : null
      const service = normalizeSingle(existingBooking.service)

      if (trainer && service) {
        rescheduleBooking = {
          id: existingBooking.id,
          startTime: existingBooking.start_time,
          endTime: existingBooking.end_time,
          status: existingBooking.status,
          locationType: existingBooking.location_type,
          travelAddress: existingBooking.travel_address,
          notes: existingBooking.notes,
          trainerName: trainerProfile?.full_name || 'Trainer',
          serviceName: service.name,
          serviceId: service.id,
          trainerId: trainer.id,
        }
      }
    }
  }

  const bookableServices = getTrainerAwareBookableServiceOptions(
    normalizedSubscriptions,
    normalizedPacks
  )

  return NextResponse.json({
    trainers: trainerOptions,
    services: bookableServices.map((option) => ({
      serviceId: option.service.id,
      name: option.service.name,
      description: option.service.description || null,
      accessType: option.accessType,
      remainingSessions: option.remainingSessions,
      trainerId: option.trainerId || null,
      durationMinutes: option.service.duration_minutes || 50,
      fulfillmentType: option.service.fulfillment_type || 'booking',
      isSession: option.service.is_session !== false,
    })),
    totalSessionsLeft: getTotalRemainingSessions(normalizedPacks),
    travelFeeCents: parseInt(travelFeeSetting?.value || '0', 10),
    bookingWindowDays:
      Number.isFinite(parsedBookingWindowDays) && parsedBookingWindowDays > 0
        ? parsedBookingWindowDays
        : DEFAULT_BOOKING_WINDOW_DAYS,
    virtualLocationEnabled: Boolean(process.env.DAILY_API_KEY),
    rescheduleBooking,
  })
}
