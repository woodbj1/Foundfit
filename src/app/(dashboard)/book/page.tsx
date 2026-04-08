import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import BookingFlow, {
  type BookingServiceOption,
  type RescheduleBookingState,
} from '@/components/bookings/booking-flow'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { getBookableServiceOptions, getTotalRemainingSessions } from '@/lib/product-access'

const DEFAULT_BOOKING_WINDOW_DAYS = 14

interface BookingTrainer {
  id: string
  user_id: string
  bio: string | null
  is_active: boolean
  onboarding_completed_at: string | null
  profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'timezone'>
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ reschedule?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const admin = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rescheduleBookingId = resolvedSearchParams.reschedule ?? null

  let rescheduleBooking: RescheduleBookingState | null = null
  let rescheduleServiceOption: BookingServiceOption | null = null
  let rescheduleTrainer: BookingTrainer | null = null

  if (rescheduleBookingId) {
    const { data: existingBooking } = await admin
      .from('bookings')
      .select('id, start_time, end_time, status, location_type, travel_address, notes, trainer:trainers(*, profile:profiles!trainers_user_id_fkey(id, full_name, avatar_url, timezone)), service:services(id, name, is_session, fulfillment_type, access_url, session_count)')
      .eq('id', rescheduleBookingId)
      .eq('client_id', user.id)
      .in('status', ['pending', 'approved'])
      .gte('start_time', new Date().toISOString())
      .maybeSingle()

    const trainerRelation = existingBooking?.trainer
      ? Array.isArray(existingBooking.trainer)
        ? existingBooking.trainer[0]
        : existingBooking.trainer
      : null

    const normalizedTrainer = trainerRelation
      ? {
          ...trainerRelation,
          profile: Array.isArray(trainerRelation.profile)
            ? trainerRelation.profile[0]
            : trainerRelation.profile,
        }
      : null

    const normalizedService = existingBooking?.service
      ? Array.isArray(existingBooking.service)
        ? existingBooking.service[0]
        : existingBooking.service
      : null

    if (!existingBooking || !normalizedTrainer || !normalizedService) {
      redirect('/sessions')
    }

    rescheduleBooking = {
      id: existingBooking.id,
      startTime: existingBooking.start_time,
      endTime: existingBooking.end_time,
      status: existingBooking.status,
      locationType: existingBooking.location_type,
      travelAddress: existingBooking.travel_address,
      notes: existingBooking.notes,
      trainerName: normalizedTrainer.profile?.full_name || 'Trainer',
      serviceName: normalizedService.name,
    }

    rescheduleServiceOption = {
      service: normalizedService,
      accessType: 'existing',
      remainingSessions: null,
    }

    rescheduleTrainer = normalizedTrainer as BookingTrainer
  }

  // Check for active subscription
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, service_id, service:services(*)')
    .eq('client_id', user.id)
    .eq('status', 'active')

  // Check for active session packs
  const { data: packs } = await supabase
    .from('session_packs')
    .select('id, service_id, total_sessions, used_sessions, expires_at, service:services(*)')
    .eq('client_id', user.id)

  const normalizedSubscriptions = (subscriptions ?? []).map((subscription) => ({
    ...subscription,
    service: Array.isArray(subscription.service) ? subscription.service[0] : subscription.service,
  }))

  const normalizedPacks = (packs ?? []).map((pack) => ({
    ...pack,
    service: Array.isArray(pack.service) ? pack.service[0] : pack.service,
  }))

  const activeBookableServices = getBookableServiceOptions(normalizedSubscriptions, normalizedPacks)
  const totalSessionsLeft = getTotalRemainingSessions(normalizedPacks)
  const bookableServices = rescheduleServiceOption ? [rescheduleServiceOption] : activeBookableServices
  const hasActiveAccess = bookableServices.length > 0

  // Get active trainers
  const { data: trainers } = await admin
    .from('trainers')
    .select('id, user_id, bio, is_active, onboarding_completed_at, profile:profiles!trainers_user_id_fkey(id, full_name, avatar_url, timezone)')
    .eq('is_active', true)
    .not('onboarding_completed_at', 'is', null)
  const activeTrainers = ((trainers ?? []).map((trainer) => ({
    ...trainer,
    profile: Array.isArray(trainer.profile) ? trainer.profile[0] : trainer.profile,
  })) as BookingTrainer[])
  const trainerOptions = rescheduleTrainer ? [rescheduleTrainer] : activeTrainers
  const hasAvailableTrainers = trainerOptions.length > 0

  // Get travel fee
  const { data: travelFeeSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'travel_fee')
    .single()
  const travelFee = parseInt(travelFeeSetting?.value || '0', 10)

  const { data: bookingWindowSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'booking_window_days')
    .single()
  const parsedBookingWindowDays = parseInt(
    bookingWindowSetting?.value || String(DEFAULT_BOOKING_WINDOW_DAYS),
    10
  )
  const bookingWindowDays = Number.isFinite(parsedBookingWindowDays) && parsedBookingWindowDays > 0
    ? parsedBookingWindowDays
    : DEFAULT_BOOKING_WINDOW_DAYS

  if (!hasActiveAccess && !rescheduleBooking) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Book a Session</h1>
          <p className="text-muted-foreground mt-1">Choose a date and time that works for you</p>
        </div>
        <Card className="border-amber-200 bg-amber-50 max-w-lg">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">No active package</p>
              <p className="text-sm text-amber-700 mt-1">
                You need an active subscription or session pack to book a session. Purchase a package to get started.
              </p>
              <Link href="/account">
                <Button size="sm" className="mt-4 gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                  <ShoppingCart className="h-4 w-4" />
                  Browse Packages
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasAvailableTrainers) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">
            {rescheduleBooking ? 'Reschedule Session' : 'Book a Session'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {rescheduleBooking
              ? 'Choose a new date and time for your existing session.'
              : 'Choose a date and time that works for you'}
          </p>
        </div>
        <Card className="border-amber-200 bg-amber-50 max-w-lg">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">No trainers available yet</p>
              <p className="text-sm text-amber-700 mt-1">
                Your package is active, but no trainers are currently bookable. Finish trainer onboarding or reactivate a trainer in the admin dashboard to reopen booking.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/account">
                  <Button size="sm" variant="outline" className="gap-2 border-amber-300 text-amber-900 hover:bg-amber-100">
                    <ShoppingCart className="h-4 w-4" />
                    View Packages
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          {rescheduleBooking ? 'Reschedule Session' : 'Book a Session'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {rescheduleBooking
            ? 'Choose a new time for your existing session.'
            : 'Choose a trainer, date, and time that works for you'}
        </p>
      </div>

      {/* Sessions remaining notice */}
      {!rescheduleBooking && totalSessionsLeft > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2.5 w-fit">
          <ShoppingCart className="h-4 w-4" />
          <span>
            You have <strong>{totalSessionsLeft}</strong> session{totalSessionsLeft !== 1 ? 's' : ''} remaining in your pack
          </span>
        </div>
      )}

      <BookingFlow
        trainers={trainerOptions}
        travelFee={travelFee}
        bookingWindowDays={bookingWindowDays}
        bookableServices={bookableServices}
        rescheduleBooking={rescheduleBooking}
      />
    </div>
  )
}
