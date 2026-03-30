'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Check, X, Loader2, Clock, MapPin, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { loadBookings() }, [])

  async function loadBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('*, client:profiles!bookings_client_id_fkey(*), trainer:trainers(*, profile:profiles!trainers_user_id_fkey(*))')
      .order('start_time', { ascending: false })
      .limit(200)

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
        toast.error(`Failed to ${action}`)
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
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  const pending = bookings.filter(b => b.status === 'pending')
  const upcoming = bookings.filter(b => b.status === 'approved' && new Date(b.start_time) >= new Date())
  const past = bookings.filter(b => ['completed', 'cancelled', 'declined'].includes(b.status) || (b.status === 'approved' && new Date(b.start_time) < new Date()))

  function statusBadge(status: string) {
    const variants: Record<string, string> = {
      pending: 'secondary',
      approved: 'default',
      declined: 'destructive',
      cancelled: 'destructive',
      completed: 'outline',
    }
    return <Badge variant={variants[status] as any}>{status}</Badge>
  }

  function BookingTable({ items, showActions = false }: { items: any[]; showActions?: boolean }) {
    return (
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                {showActions && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.client?.full_name || '—'}</TableCell>
                  <TableCell>{b.trainer?.profile?.full_name || '—'}</TableCell>
                  <TableCell>{format(new Date(b.start_time), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    {format(new Date(b.start_time), 'h:mm a')} – {format(new Date(b.end_time), 'h:mm a')}
                  </TableCell>
                  <TableCell>
                    {b.location_type === 'travel' ? (
                      <span className="flex items-center gap-1 text-sm"><MapPin className="h-3.5 w-3.5" /> Travel</span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm"><Building2 className="h-3.5 w-3.5" /> Studio</span>
                    )}
                  </TableCell>
                  <TableCell>{statusBadge(b.status)}</TableCell>
                  {showActions && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction(b.id, 'approve')}
                          disabled={actionLoading === b.id}
                          className="h-8 w-8 p-0 text-green-600"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction(b.id, 'decline')}
                          disabled={actionLoading === b.id}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">All Bookings</h1>
        <p className="text-muted-foreground mt-1">Manage all client bookings across trainers</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pending.length > 0 ? (
            <BookingTable items={pending} showActions />
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No pending bookings 🎉</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6">
          {upcoming.length > 0 ? (
            <BookingTable items={upcoming} />
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No upcoming bookings</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {past.length > 0 ? (
            <BookingTable items={past} />
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No past bookings</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
