import { NextResponse } from 'next/server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  getActiveSessionPacks,
  getLibraryAccessDetails,
  getPrimarySessionSubscription,
  getTotalRemainingSessions,
} from '@/lib/product-access'

function normalizeSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export async function GET() {
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
    .select('id, email, full_name, phone, address, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client') {
    return NextResponse.json({ error: 'Client access only.' }, { status: 403 })
  }

  const now = new Date().toISOString()

  const [{ data: subscriptions }, { data: packs }, { data: upcomingBookings }, { data: mealPlans }] =
    await Promise.all([
      admin
        .from('subscriptions')
        .select('*, service:services(*)')
        .eq('client_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      admin
        .from('session_packs')
        .select('*, service:services(*)')
        .eq('client_id', user.id)
        .order('purchased_at', { ascending: false }),
      admin
        .from('bookings')
        .select(
          'id, start_time, end_time, status, location_type, notes, trainer:trainers(id, profile:profiles!trainers_user_id_fkey(full_name, timezone)), service:services(name)'
        )
        .eq('client_id', user.id)
        .in('status', ['approved', 'pending'])
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(5),
      admin
        .from('meal_plans')
        .select('id')
        .eq('client_id', user.id),
    ])

  const normalizedSubscriptions = (subscriptions ?? []).map((subscription) => ({
    ...subscription,
    service: normalizeSingle(subscription.service),
  }))

  const normalizedPacks = (packs ?? []).map((pack) => ({
    ...pack,
    service: normalizeSingle(pack.service),
  }))

  const libraryAccess = getLibraryAccessDetails(
    normalizedSubscriptions,
    normalizedPacks,
    process.env.VIMEO_LIBRARY_URL || null
  )
  const primarySubscription = getPrimarySessionSubscription(normalizedSubscriptions)
  const activePacks = getActiveSessionPacks(normalizedPacks)

  const bookings = (upcomingBookings ?? []).map((booking) => {
    const trainer = normalizeSingle(booking.trainer)
    const trainerProfile = trainer ? normalizeSingle(trainer.profile) : null
    const service = normalizeSingle(booking.service)

    return {
      id: booking.id,
      startTime: booking.start_time,
      endTime: booking.end_time,
      status: booking.status,
      locationType: booking.location_type,
      notes: booking.notes,
      trainerName: trainerProfile?.full_name || 'Trainer',
      trainerTimezone: trainerProfile?.timezone || 'America/New_York',
      serviceName: service?.name || 'Training Session',
    }
  })

  const pendingCount = bookings.filter((booking) => booking.status === 'pending').length
  const confirmedCount = bookings.filter((booking) => booking.status === 'approved').length

  return NextResponse.json({
    profile,
    summary: {
      activePlanName:
        primarySubscription?.service?.name ||
        activePacks[0]?.service?.name ||
        libraryAccess?.service?.name ||
        null,
      sessionsLeft:
        primarySubscription
          ? null
          : getTotalRemainingSessions(normalizedPacks),
      confirmedCount,
      pendingCount,
      mealPlanCount: mealPlans?.length || 0,
    },
    access: {
      primarySubscription: primarySubscription
        ? {
            serviceName: primarySubscription.service?.name || 'Subscription',
            renewsAt: primarySubscription.current_period_end,
            unitAmountCents: primarySubscription.unit_amount_cents || null,
          }
        : null,
      activePacks: activePacks.map((pack) => ({
        id: pack.id,
        serviceName: pack.service?.name || 'Session Pack',
        remainingSessions: Math.max(pack.total_sessions - pack.used_sessions, 0),
        expiresAt: pack.expires_at,
      })),
      libraryAccess: libraryAccess
        ? {
            serviceName: libraryAccess.service.name,
            accessType: libraryAccess.accessType,
            accessUrl: libraryAccess.accessUrl,
            remainingSessions: libraryAccess.remainingSessions,
          }
        : null,
    },
    bookings,
  })
}
