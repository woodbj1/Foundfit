import { redirect } from 'next/navigation'
import { startOfMonth } from 'date-fns'
import { Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getAdminDashboardData } from '@/lib/admin-reporting'
import { createClient } from '@/lib/supabase/server'

export default async function AdminClientsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const data = await getAdminDashboardData(startOfMonth(new Date()))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Clients</h1>
        <p className="mt-1 text-muted-foreground">
          Full client register including trainer assignment, active services, and remaining sessions.
        </p>
      </div>

      {data.clients.length > 0 ? (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Client Directory</CardTitle>
            <CardDescription>
              This list includes every registered client, plus the services and sessions tied to their account.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Pack Usage</TableHead>
                  <TableHead className="text-right">Remaining Sessions</TableHead>
                  <TableHead className="text-right">This Month</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium">{client.fullName}</p>
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                        {client.phone ? (
                          <p className="text-xs text-muted-foreground">{client.phone}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.trainerNames.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {client.trainerNames.map((trainerName) => (
                            <Badge key={`${client.id}-${trainerName}`} variant="secondary">
                              {trainerName}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.services.length > 0 ? (
                        <div className="flex max-w-lg flex-wrap gap-2">
                          {client.services.map((service) => (
                            <Badge key={`${client.id}-${service}`} variant="outline">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No purchases yet</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.packUsage.length > 0 ? (
                        <div className="space-y-1.5">
                          {client.packUsage.map((pack) => (
                            <div key={`${client.id}-${pack.label}`} className="text-sm">
                              <p className="font-medium">{pack.label}</p>
                              <p className="text-muted-foreground">
                                {pack.used} used · {pack.remaining} remaining
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No packs</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{client.remainingSessions}</TableCell>
                    <TableCell className="text-right">{client.monthlySessions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="mb-1 text-lg font-medium">No Clients Yet</h3>
            <p className="text-muted-foreground">Clients will appear here once they register.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

