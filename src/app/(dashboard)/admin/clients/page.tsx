import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Mail, Phone, CreditCard, Package } from 'lucide-react'
import { formatPrice } from '@/lib/stripe'

export default async function AdminClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  // Get all clients
  const { data: clients } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('full_name')

  // Get active subscriptions
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*, service:services(name)')
    .eq('status', 'active')

  // Get session packs
  const { data: packs } = await supabase
    .from('session_packs')
    .select('*, service:services(name)')

  // Build lookup maps
  const subByClient: Record<string, any> = {}
  subscriptions?.forEach(s => { subByClient[s.client_id] = s })

  const packsByClient: Record<string, any[]> = {}
  packs?.forEach(p => {
    if (!packsByClient[p.client_id]) packsByClient[p.client_id] = []
    packsByClient[p.client_id].push(p)
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Clients</h1>
        <p className="text-muted-foreground mt-1">{clients?.length || 0} total clients</p>
      </div>

      {clients && clients.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => {
                  const sub = subByClient[client.id]
                  const clientPacks = packsByClient[client.id] || []
                  const activePacks = clientPacks.filter(p => p.used_sessions < p.total_sessions)
                  const totalRemaining = activePacks.reduce((s, p) => s + (p.total_sessions - p.used_sessions), 0)

                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                            {(client.full_name || 'C').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{client.full_name || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{client.email}</TableCell>
                      <TableCell className="text-muted-foreground">{client.phone || '—'}</TableCell>
                      <TableCell>
                        {sub ? (
                          <Badge className="gap-1">
                            <CreditCard className="h-3 w-3" />
                            {sub.service?.name}
                          </Badge>
                        ) : activePacks.length > 0 ? (
                          <Badge variant="secondary" className="gap-1">
                            <Package className="h-3 w-3" />
                            Pack
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sub ? (
                          <span className="text-sm">∞</span>
                        ) : totalRemaining > 0 ? (
                          <span className="text-sm">{totalRemaining} remaining</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">No Clients Yet</h3>
            <p className="text-muted-foreground">Clients will appear here once they sign up.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
