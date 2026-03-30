import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, MapPin, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import CancelBookingButton from '@/components/bookings/cancel-button'

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

  function statusColor(status: string) {
    switch (status) {
      case 'approved': return 'default'
      case 'pending': return 'secondary'
      case 'completed': return 'outline'
      case 'cancelled': return 'destructive'
      case 'declined': return 'destructive'
      default: return 'secondary'
    }
  }

  function BookingCard({ booking }: { booking: any }) {
    return (
      <div className="flex items-start justify-between p-4 rounded-lg border bg-card">
        <div className="space-y-1">
          <p className="font-medium">
            {format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(booking.start_time), 'h:mm a')} – {format(new Date(booking.end_time), 'h:mm a')}
            </span>
            <span className="flex items-center gap-1">
              {booking.location_type === 'gym' ? (
                <><Building2 className="h-3.5 w-3.5" /> Studio</>
              ) : (
                <><MapPin className="h-3.5 w-3.5" /> In-Home</>
              )}
            </span>
          </div>
          {booking.notes && (
            <p className="text-xs text-muted-foreground mt-1">Note: {booking.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusColor(booking.status) as any}>
            {booking.status}
          </Badge>
          {['pending', 'approved'].includes(booking.status) && (
            <CancelBookingButton bookingId={booking.id} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Sessions</h1>
        <p className="text-muted-foreground mt-1">View and manage your training sessions</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcoming?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({past?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {upcoming && upcoming.length > 0 ? (
            <div className="space-y-3">
              {upcoming.map((b) => <BookingCard key={b.id} booking={b} />)}
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
          {past && past.length > 0 ? (
            <div className="space-y-3">
              {past.map((b) => <BookingCard key={b.id} booking={b} />)}
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
