import { redirect } from 'next/navigation'
import type { VariantProps } from 'class-variance-authority'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge, badgeVariants } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, MapPin, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import CancelBookingButton from '@/components/bookings/cancel-button'
import type { Booking, BookingStatus } from '@/lib/types'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>
type SessionBooking = Booking

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
    <div className="flex items-start justify-between rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <p className="font-medium">
          {format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
          </span>
          <span className="flex items-center gap-1">
            {booking.location_type === 'gym' ? (
              <>
                <Building2 className="h-3.5 w-3.5" />
                Studio
              </>
            ) : (
              <>
                <MapPin className="h-3.5 w-3.5" />
                In-Home
              </>
            )}
          </span>
        </div>
        {booking.notes && (
          <p className="mt-1 text-xs text-muted-foreground">Note: {booking.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={statusColor(booking.status)}>{booking.status}</Badge>
        {['pending', 'approved'].includes(booking.status) && (
          <CancelBookingButton bookingId={booking.id} />
        )}
      </div>
    </div>
  )
}

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date().toISOString()

  const { data: upcoming } = await supabase
    .from('bookings')
    .select('*')
    .eq('client_id', user.id)
    .in('status', ['approved', 'pending'])
    .gte('start_time', now)
    .order('start_time', { ascending: true })

  const { data: past } = await supabase
    .from('bookings')
    .select('*')
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

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
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
        </TabsContent>

        <TabsContent value="past" className="mt-6">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
