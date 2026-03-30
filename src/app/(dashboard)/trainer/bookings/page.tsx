'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, X, Loader2, Clock, MapPin, Building2, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function TrainerBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadBookings()
  }, [])

  async function loadBookings() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: trainer } = await supabase.from('trainers').select('id').eq('user_id', user.id).single()
    if (!trainer) { setLoading(false); return }

    const { data } = await supabase
      .from('bookings')
      .select('*, client:profiles!bookings_client_id_fkey(*)')
      .eq('trainer_id', trainer.id)
      .order('start_time', { ascending: false })

    if (data) setBookings(data)
    setLoading(false)
  }

  async function handleAction(bookingId: string, action: 'approve' | 'decline') {
    setActionLoading(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'approve' ? 'approved' : 'declined' }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || `Failed to ${action}`)
      } else {
        toast.success(`Booking ${action}d!`)
        loadBookings()
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

  const pending = bookings.filter(b => b.status === 'pending')
  const upcoming = bookings.filter(b => b.status === 'approved' && new Date(b.start_time) >= new Date())
  const past = bookings.filter(b => ['completed', 'cancelled', 'declined'].includes(b.status) || (b.status === 'approved' && new Date(b.start_time) < new Date()))

  function BookingItem({ booking, showActions = false }: { booking: any; showActions?: boolean }) {
    return (
      <div className="flex items-start justify-between p-4 rounded-lg border bg-card">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{booking.client?.full_name || 'Unknown Client'}</p>
            <Badge variant={booking.status === 'approved' ? 'default' : booking.status === 'pending' ? 'secondary' : 'outline'}>
              {booking.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{format(new Date(booking.start_time), 'MMM d, yyyy')}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(booking.start_time), 'h:mm a')} – {format(new Date(booking.end_time), 'h:mm a')}
            </span>
            <span className="flex items-center gap-1">
              {booking.location_type === 'gym' ? (
                <><Building2 className="h-3.5 w-3.5" /> Studio</>
              ) : (
                <><MapPin className="h-3.5 w-3.5" /> {booking.travel_address || 'In-Home'}</>
              )}
            </span>
          </div>
          {booking.notes && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {booking.notes}
            </p>
          )}
        </div>
        {showActions && (
          <div className="flex gap-2 ml-4">
            <Button
              size="sm"
              onClick={() => handleAction(booking.id, 'approve')}
              disabled={actionLoading === booking.id}
              className="gap-1"
            >
              {actionLoading === booking.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction(booking.id, 'decline')}
              disabled={actionLoading === booking.id}
              className="gap-1 text-destructive"
            >
              <X className="h-3.5 w-3.5" />
              Decline
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Bookings</h1>
        <p className="text-muted-foreground mt-1">Manage session requests and view your schedule</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({past.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6 space-y-3">
          {pending.length > 0 ? (
            pending.map(b => <BookingItem key={b.id} booking={b} showActions />)
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No pending requests — you&apos;re all caught up! 🎉
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6 space-y-3">
          {upcoming.length > 0 ? (
            upcoming.map(b => <BookingItem key={b.id} booking={b} />)
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No upcoming sessions
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6 space-y-3">
          {past.length > 0 ? (
            past.map(b => <BookingItem key={b.id} booking={b} />)
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No past sessions
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
