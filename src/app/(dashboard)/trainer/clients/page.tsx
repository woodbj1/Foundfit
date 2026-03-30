import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Mail, Phone } from 'lucide-react'

export default async function TrainerClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trainer } = await supabase.from('trainers').select('id').eq('user_id', user.id).single()
  if (!trainer) redirect('/trainer')

  // Get unique client IDs from bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('client_id')
    .eq('trainer_id', trainer.id)

  const clientIds = [...new Set(bookings?.map(b => b.client_id) || [])]

  let clients: any[] = []
  if (clientIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('id', clientIds)
      .order('full_name')
    if (data) clients = data
  }

  // Get session counts per client
  const clientStats: Record<string, number> = {}
  if (bookings) {
    bookings.forEach(b => {
      clientStats[b.client_id] = (clientStats[b.client_id] || 0) + 1
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Clients</h1>
        <p className="text-muted-foreground mt-1">Your client roster</p>
      </div>

      {clients.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
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
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">No Clients Yet</h3>
            <p className="text-muted-foreground">Clients will appear here once they book sessions with you.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
