'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Building2,
  Check,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Video,
  X,
} from 'lucide-react'

import JoinDailyButton from '@/components/bookings/join-daily-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getBookingLocationLabel, isVirtualLocation } from '@/lib/booking-display'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Booking, Profile, Service } from '@/lib/types'

type TrainerBooking = Booking & {
  client?: Profile | null
  service?: Pick<Service, 'name'> | null
}

async function fetchTrainerBookings(supabase: SupabaseClient): Promise<TrainerBooking[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: trainer } = await supabase.from('trainers').select('id').eq('user_id', user.id).single()
  if (!trainer) return []

  const { data } = await supabase
    .from('bookings')
    .select('*, client:profiles!bookings_client_id_fkey(*), service:services(name)')
    .eq('trainer_id', trainer.id)
    .order('start_time', { ascending: false })

  return (data as TrainerBooking[] | null) ?? []
}

function BookingItem({
  booking,
  showActions = false,
  actionLoading,
  isHighlighted = false,
  onAction,
}: {
  booking: TrainerBooking
  showActions?: boolean
  actionLoading: string | null
  isHighlighted?: boolean
  onAction: (bookingId: string, action: 'approve' | 'decline') => void
}) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${isHighlighted ? 'border-primary ring-2 ring-primary/20' : ''}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{booking.client?.full_name || 'Unknown Client'}</p>
            <Badge variant={booking.status === 'approved' ? 'default' : booking.status === 'pending' ? 'secondary' : 'outline'}>
              {booking.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{format(new Date(booking.start_time), 'MMM d, yyyy')}</span>
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
          <p className="text-sm text-muted-foreground">{booking.service?.name || 'Training Session'}</p>
          {booking.notes ? (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              {booking.notes}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {booking.status === 'approved' && isVirtualLocation(booking.location_type) ? (
            <JoinDailyButton bookingId={booking.id} />
          ) : null}
          {showActions ? (
            <>
              <Button
                size="sm"
                onClick={() => onAction(booking.id, 'approve')}
                disabled={actionLoading === booking.id}
                className="gap-1"
              >
                {actionLoading === booking.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(booking.id, 'decline')}
                disabled={actionLoading === booking.id}
                className="gap-1 text-destructive"
              >
                <X className="h-3.5 w-3.5" />
                Decline
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function TrainerBookingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [supabase] = useState(() => createClient())
  const [bookings, setBookings] = useState<TrainerBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'upcoming' | 'past'>('pending')
  const processedActionRef = useRef<string | null>(null)
  const bookingFromEmail = searchParams.get('booking')
  const actionFromEmail = searchParams.get('action')
  const tabFromEmail = searchParams.get('tab')

  useEffect(() => {
    let active = true

    async function load() {
      const nextBookings = await fetchTrainerBookings(supabase)
      if (!active) return
      setBookings(nextBookings)
      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [supabase])

  useEffect(() => {
    if (tabFromEmail === 'pending' || tabFromEmail === 'upcoming' || tabFromEmail === 'past') {
      setActiveTab(tabFromEmail)
    }
  }, [tabFromEmail])

  const handleAction = useCallback(async (
    bookingId: string,
    action: 'approve' | 'decline',
    options?: { silentSuccess?: boolean }
  ) => {
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
        return false
      } else {
        const nextBookings = await fetchTrainerBookings(supabase)
        setBookings(nextBookings)
        if (!options?.silentSuccess) {
          toast.success(`Booking ${action}d!`)
        }
        return true
      }
    } catch {
      toast.error('Something went wrong')
      return false
    } finally {
      setActionLoading(null)
    }
  }, [supabase])

  useEffect(() => {
    if (loading || !bookingFromEmail || !actionFromEmail) {
      return
    }

    if (actionFromEmail !== 'approve' && actionFromEmail !== 'decline') {
      return
    }

    const actionKey = `${actionFromEmail}:${bookingFromEmail}`
    if (processedActionRef.current === actionKey) {
      return
    }
    processedActionRef.current = actionKey

    void (async () => {
      const success = await handleAction(bookingFromEmail, actionFromEmail, { silentSuccess: true })
      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.delete('action')

      if (success) {
        nextParams.set('tab', actionFromEmail === 'approve' ? 'upcoming' : 'past')
        toast.success(`Booking ${actionFromEmail}d!`)
      } else {
        nextParams.set('tab', 'pending')
      }

      const nextQuery = nextParams.toString()
      router.replace(nextQuery ? `/trainer/bookings?${nextQuery}` : '/trainer/bookings')
    })()
  }, [actionFromEmail, bookingFromEmail, handleAction, loading, router, searchParams])

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
        <h1 className="text-3xl font-bold">Bookings</h1>
        <p className="mt-1 text-muted-foreground">Manage session requests and view your schedule</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'upcoming' | 'past')}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6 space-y-3">
          {pending.length > 0 ? (
            pending.map((booking) => (
              <BookingItem
                key={booking.id}
                booking={booking}
                showActions
                actionLoading={actionLoading}
                isHighlighted={booking.id === bookingFromEmail}
                onAction={handleAction}
              />
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No pending requests. You&apos;re all caught up.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6 space-y-3">
          {upcoming.length > 0 ? (
            upcoming.map((booking) => (
              <BookingItem
                key={booking.id}
                booking={booking}
                actionLoading={actionLoading}
                isHighlighted={booking.id === bookingFromEmail}
                onAction={handleAction}
              />
            ))
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
            past.map((booking) => (
              <BookingItem
                key={booking.id}
                booking={booking}
                actionLoading={actionLoading}
                isHighlighted={booking.id === bookingFromEmail}
                onAction={handleAction}
              />
            ))
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
