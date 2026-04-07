import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { Building2, Clock, MapPin, Video } from 'lucide-react'
import type { VariantProps } from 'class-variance-authority'

import CancelBookingButton from '@/components/bookings/cancel-button'
import JoinDailyButton from '@/components/bookings/join-daily-button'
import { Badge, badgeVariants } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getBookingLocationLabel, isVirtualLocation } from '@/lib/booking-display'
import { createClient } from '@/lib/supabase/server'
import type { Booking, BookingStatus, Profile, Service, Trainer } from '@/lib/types'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>
type SessionBooking = Booking & {
  trainer?: (Trainer & { profile?: Profile | null }) | null
  service?: Pick<Service, 'name'> | null
}

function statusColor(status: BookingStatus): BadgeVariant {
  switch (status) {
    case 'approved':
      return 'default'
    case 'pending':
      return 'secondary'
    case 'completed':
      return 'outline'
    case 'cancelled':
    case 'declined':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function BookingCard({ booking }: { booking: SessionBooking }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="font-medium">
            {format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
            </span>
            <span className="flex items-center gap-1">
              {isVirtualLocation(booking.location_type) ? (
                <>
                  <Video className="h-3.5 w-3.5" />
                  Virtual
                </>
              ) : booking.location_type === 'gym' ? (
                <>
                  <Building2 className="h-3.5 w-3.5" />
                  Studio
                </>
              ) : (
                <>
                  <MapPin className="h-3.5 w-3.5" />
                  {getBookingLocationLabel(booking.location_type, booking.travel_address)}
                </>
              )}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {booking.service?.name || 'Training Session'}
            {booking.trainer?.profile?.full_name ? ` • ${booking.trainer.profile.full_name}` : ''}
          </p>
          {booking.notes ? (
            <p className="mt-1 text-xs text-muted-foreground">Note: {booking.notes}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusColor(booking.status)}>{booking.status}</Badge>
          {booking.status === 'approved' && isVirtualLocation(booking.location_type) ? (
            <JoinDailyButton bookingId={booking.id} />
          ) : null}
          {['pending', 'approved'].includes(booking.status) ? (
            <CancelBookingButton bookingId={booking.id} />
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default async function SessionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const now = new Date().toISOString()

  const { data: upcoming } = await supabase
    .from('bookings')
    .select('*, trainer:trainers(*, profile:profiles(*)), service:services(name)')
    .eq('client_id', user.id)
    .in('status', ['approved', 'pending'])
    .gte('start_time', now)
    .order('start_time', { ascending: true })

  const { data: past } = await supabase
    .from('bookings')
    .select('*, trainer:trainers(*, profile:profiles(*)), service:services(name)')
    .eq('client_id', user.id)
    .in('status', ['completed', 'cancelled', 'declined'])
    .order('start_time', { ascending: false })
    .limit(50)

  const upcomingBookings = (upcoming as SessionBooking[] | null) ?? []
  const pastBookings = (past as SessionBooking[] | null) ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Sessions</h1>
        <p className="mt-1 text-muted-foreground">View and manage your training sessions</p>
      </div>

      <div className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Upcoming ({upcomingBookings.length})</h2>
            <Link href="/book">
              <span className="text-sm text-muted-foreground underline underline-offset-4">Book another session</span>
            </Link>
          </div>
          {upcomingBookings.length > 0 ? (
            <div className="space-y-3">
              {upcomingBookings.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No upcoming sessions. Book one from the{' '}
                <a href="/book" className="text-primary underline">booking page</a>.
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Past ({pastBookings.length})</h2>
          {pastBookings.length > 0 ? (
            <div className="space-y-3">
              {pastBookings.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No past sessions yet.
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}
