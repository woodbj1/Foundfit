import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, CreditCard, Package } from 'lucide-react'
import type { Profile, Service, SessionPack, Subscription } from '@/lib/types'

type SubscriptionWithService = Subscription & { service?: Pick<Service, 'name'> | null }
type SessionPackWithService = SessionPack & { service?: Pick<Service, 'name'> | null }

export default async function AdminClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: clients } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('full_name')

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*, service:services(name)')
    .eq('status', 'active')

  const { data: packs } = await supabase
    .from('session_packs')
    .select('*, service:services(name)')

  const subByClient: Record<string, SubscriptionWithService> = {}
  ;(subscriptions as SubscriptionWithService[] | null)?.forEach((subscription) => {
    subByClient[subscription.client_id] = subscription
  })

  const packsByClient: Record<string, SessionPackWithService[]> = {}
  ;(packs as SessionPackWithService[] | null)?.forEach((pack) => {
    if (!packsByClient[pack.client_id]) packsByClient[pack.client_id] = []
    packsByClient[pack.client_id].push(pack)
  })

  const clientRows = (clients as Profile[] | null) ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Clients</h1>
        <p className="mt-1 text-muted-foreground">{clientRows.length} total clients</p>
      </div>

      {clientRows.length > 0 ? (
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
                {clientRows.map((client) => {
                  const subscription = subByClient[client.id]
                  const clientPacks = packsByClient[client.id] || []
                  const activePacks = clientPacks.filter((pack) => pack.used_sessions < pack.total_sessions)
                  const totalRemaining = activePacks.reduce(
                    (sum, pack) => sum + (pack.total_sessions - pack.used_sessions),
                    0
                  )

                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {(client.full_name || 'C').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{client.full_name || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{client.email}</TableCell>
                      <TableCell className="text-muted-foreground">{client.phone || '-'}</TableCell>
                      <TableCell>
                        {subscription ? (
                          <Badge className="gap-1">
                            <CreditCard className="h-3 w-3" />
                            {subscription.service?.name}
                          </Badge>
                        ) : activePacks.length > 0 ? (
                          <Badge variant="secondary" className="gap-1">
                            <Package className="h-3 w-3" />
                            Pack
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {subscription ? (
                          <span className="text-sm">Unlimited</span>
                        ) : totalRemaining > 0 ? (
                          <span className="text-sm">{totalRemaining} remaining</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">0</span>
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
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="mb-1 text-lg font-medium">No Clients Yet</h3>
            <p className="text-muted-foreground">Clients will appear here once they sign up.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
