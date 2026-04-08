'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { VariantProps } from 'class-variance-authority'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, badgeVariants } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Check, X, Loader2, MapPin, Building2, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import JoinDailyButton from '@/components/bookings/join-daily-button'
import { getBookingLocationLabel, isVirtualLocation } from '@/lib/booking-display'
import { formatBookingShortDate, formatBookingTimeRange } from '@/lib/booking-time'
import { toast } from 'sonner'
import type { Booking, BookingStatus, Profile, Service, Trainer } from '@/lib/types'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>
type AdminBooking = Booking & {
  client?: Profile | null
  trainer?: (Trainer & { profile?: Profile | null }) | null
  service?: Pick<Service, 'name'> | null
}

async function fetchAdminBookings(supabase: SupabaseClient): Promise<AdminBooking[]> {
  const { data } = await supabase
    .from('bookings')
    .select('*, client:profiles!bookings_client_id_fkey(*), trainer:trainers(*, profile:profiles!trainers_user_id_fkey(*)), service:services(name)')
    .order('start_time', { ascending: false })
    .limit(200)

  return (data as AdminBooking[] | null) ?? []
}

function statusBadge(status: BookingStatus) {
  const variants: Record<BookingStatus, BadgeVariant> = {
    pending: 'secondary',
    approved: 'default',
    declined: 'destructive',
    cancelled: 'destructive',
    completed: 'outline',
  }

  return <Badge variant={variants[status]}>{status}</Badge>
}

function BookingTable({
  items,
  showActions = false,
  actionLoading,
  onAction,
}: {
  items: AdminBooking[]
  showActions?: boolean
  actionLoading: string | null
  onAction: (bookingId: string, action: 'approve' | 'decline') => void
}) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Trainer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Join</TableHead>
              {showActions && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((booking) => {
              const trainerTimezone = booking.trainer?.profile?.timezone || 'America/New_York'

              return (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.client?.full_name || '-'}</TableCell>
                  <TableCell>{booking.trainer?.profile?.full_name || '-'}</TableCell>
                  <TableCell>{booking.service?.name || '-'}</TableCell>
                  <TableCell>{formatBookingShortDate(booking.start_time, trainerTimezone)}</TableCell>
                  <TableCell>{formatBookingTimeRange(booking.start_time, booking.end_time, trainerTimezone)}</TableCell>
                  <TableCell>
                    {isVirtualLocation(booking.location_type) ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Video className="h-3.5 w-3.5" />
                        Virtual
                      </span>
                    ) : booking.location_type === 'travel' ? (
                      <span className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3.5 w-3.5" />
                        {getBookingLocationLabel(booking.location_type, booking.travel_address)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm">
                        <Building2 className="h-3.5 w-3.5" />
                        Studio
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{statusBadge(booking.status)}</TableCell>
                  <TableCell>
                    {booking.status === 'approved' && isVirtualLocation(booking.location_type) ? (
                      <JoinDailyButton bookingId={booking.id} label="Join" />
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onAction(booking.id, 'approve')}
                          disabled={actionLoading === booking.id}
                          className="h-8 w-8 p-0 text-green-600"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onAction(booking.id, 'decline')}
                          disabled={actionLoading === booking.id}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

export default function AdminBookingsPage() {
  const [supabase] = useState(() => createClient())
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      const nextBookings = await fetchAdminBookings(supabase)
      if (!active) return
      setBookings(nextBookings)
      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [supabase])

  async function handleAction(bookingId: string, action: 'approve' | 'decline') {
    setActionLoading(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'approve' ? 'approved' : 'declined' }),
      })

      if (!res.ok) {
        toast.error(`Failed to ${action}`)
      } else {
        const nextBookings = await fetchAdminBookings(supabase)
        setBookings(nextBookings)
        toast.success(`Booking ${action}d!`)
      }
    } catch {
      toast.error('Something went wrong')
    }

    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const pending = bookings.filter((booking) => booking.status === 'pending')
  const upcoming = bookings.filter(
    (booking) => booking.status === 'approved' && new Date(booking.start_time) >= new Date()
  )
  const past = bookings.filter(
    (booking) =>
      ['completed', 'cancelled', 'declined'].includes(booking.status) ||
      (booking.status === 'approved' && new Date(booking.start_time) < new Date())
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">All Bookings</h1>
        <p className="mt-1 text-muted-foreground">Manage all client bookings across trainers</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pending.length > 0 ? (
            <BookingTable
              items={pending}
              showActions
              actionLoading={actionLoading}
              onAction={handleAction}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No pending bookings yet.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6">
          {upcoming.length > 0 ? (
            <BookingTable items={upcoming} actionLoading={actionLoading} onAction={handleAction} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No upcoming bookings.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {past.length > 0 ? (
            <BookingTable items={past} actionLoading={actionLoading} onAction={handleAction} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No past bookings.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
