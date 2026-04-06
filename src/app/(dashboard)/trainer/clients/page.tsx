import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Mail, Phone } from 'lucide-react'
import type { Profile } from '@/lib/types'

type BookingClientRow = {
  client_id: string
}

export default async function TrainerClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trainer } = await supabase.from('trainers').select('id').eq('user_id', user.id).single()
  if (!trainer) redirect('/trainer')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('client_id')
    .eq('trainer_id', trainer.id)

  const clientIds = [...new Set(((bookings as BookingClientRow[] | null) ?? []).map((booking) => booking.client_id))]

  let clients: Profile[] = []
  if (clientIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('id', clientIds)
      .order('full_name')
    if (data) clients = data as Profile[]
  }

  const clientStats: Record<string, number> = {}
  if (bookings) {
    ;(bookings as BookingClientRow[]).forEach((booking) => {
      clientStats[booking.client_id] = (clientStats[booking.client_id] || 0) + 1
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Clients</h1>
        <p className="mt-1 text-muted-foreground">Your client roster</p>
      </div>

      {clients.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {(client.full_name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{client.full_name || 'Unknown'}</h3>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        {client.email}
                      </p>
                      {client.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" />
                          {client.phone}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="mt-3">
                      {clientStats[client.id] || 0} sessions
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="mb-1 text-lg font-medium">No Clients Yet</h3>
            <p className="text-muted-foreground">Clients will appear here once they book sessions with you.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
