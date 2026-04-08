import { redirect } from 'next/navigation'
import { Mail, Phone, Users } from 'lucide-react'

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
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

type ClientProfile = Pick<Profile, 'id' | 'full_name' | 'email' | 'phone'>
type ClientSubscription = {
  id: string
  client_id: string
  status: string
  service?: { name: string } | null
}
type ClientPack = {
  id: string
  client_id: string
  total_sessions: number
  used_sessions: number
  service?: { name: string } | null
}
type ClientMealPlanPurchase = {
  id: string
  client_id: string
  service?: { name: string } | null
}
type ClientBooking = {
  client_id: string
}

export default async function TrainerClientsPage() {
  const supabase = await createClient()
  const admin = await createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trainer } = await admin
    .from('trainers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!trainer) redirect('/trainer')

  const [subscriptionsRes, packsRes, mealPlansRes, bookingsRes] = await Promise.all([
    admin
      .from('subscriptions')
      .select('*, service:services(name)')
      .eq('trainer_id', trainer.id)
      .order('created_at', { ascending: false }),
    admin
      .from('session_packs')
      .select('*, service:services(name)')
      .eq('trainer_id', trainer.id)
      .order('purchased_at', { ascending: false }),
    admin
      .from('meal_plan_purchases')
      .select('*, service:services(name)')
      .eq('trainer_id', trainer.id)
      .order('purchased_at', { ascending: false }),
    admin.from('bookings').select('client_id').eq('trainer_id', trainer.id),
  ])

  const subscriptions = ((subscriptionsRes.data ?? []) as ClientSubscription[]).map((subscription) => ({
    ...subscription,
    service: Array.isArray(subscription.service) ? subscription.service[0] : subscription.service,
  }))
  const packs = ((packsRes.data ?? []) as ClientPack[]).map((pack) => ({
    ...pack,
    service: Array.isArray(pack.service) ? pack.service[0] : pack.service,
  }))
  const mealPlanPurchases = ((mealPlansRes.data ?? []) as ClientMealPlanPurchase[]).map((purchase) => ({
    ...purchase,
    service: Array.isArray(purchase.service) ? purchase.service[0] : purchase.service,
  }))
  const bookings = (bookingsRes.data ?? []) as ClientBooking[]

  const clientIds = Array.from(
    new Set([
      ...subscriptions.map((subscription) => subscription.client_id),
      ...packs.map((pack) => pack.client_id),
      ...mealPlanPurchases.map((purchase) => purchase.client_id),
      ...bookings.map((booking) => booking.client_id),
    ])
  )

  const { data: clientRows } = clientIds.length > 0
    ? await admin
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', clientIds)
        .order('full_name')
    : { data: [] }

  const clients = (clientRows ?? []) as ClientProfile[]

  const bookingCounts = new Map<string, number>()
  for (const booking of bookings) {
    bookingCounts.set(booking.client_id, (bookingCounts.get(booking.client_id) ?? 0) + 1)
  }

  const subscriptionsByClient = new Map<string, ClientSubscription[]>()
  for (const subscription of subscriptions) {
    subscriptionsByClient.set(subscription.client_id, [
      ...(subscriptionsByClient.get(subscription.client_id) ?? []),
      subscription,
    ])
  }

  const packsByClient = new Map<string, ClientPack[]>()
  for (const pack of packs) {
    packsByClient.set(pack.client_id, [...(packsByClient.get(pack.client_id) ?? []), pack])
  }

  const mealPlansByClient = new Map<string, ClientMealPlanPurchase[]>()
  for (const purchase of mealPlanPurchases) {
    mealPlansByClient.set(purchase.client_id, [
      ...(mealPlansByClient.get(purchase.client_id) ?? []),
      purchase,
    ])
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Clients</h1>
        <p className="mt-1 text-muted-foreground">
          Clients assigned to you through bookings, packages, subscriptions, and meal plans.
        </p>
      </div>

      {clients.length > 0 ? (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Client Roster</CardTitle>
            <CardDescription>
              View who has purchased with you and how much of each package they have used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Pack Usage</TableHead>
                  <TableHead className="text-right">Booked Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => {
                  const clientSubscriptions = subscriptionsByClient.get(client.id) ?? []
                  const clientPacks = packsByClient.get(client.id) ?? []
                  const clientMealPlans = mealPlansByClient.get(client.id) ?? []
                  const bookedSessions = bookingCounts.get(client.id) ?? 0

                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{client.full_name || 'Unnamed client'}</p>
                          <p className="text-xs text-muted-foreground">Client account</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5" />
                            {client.email}
                          </p>
                          {client.phone ? (
                            <p className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5" />
                              {client.phone}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-md flex-wrap gap-2">
                          {clientSubscriptions.map((subscription) => (
                            <Badge key={subscription.id} variant="secondary">
                              {subscription.service?.name || 'Subscription'} · {subscription.status}
                            </Badge>
                          ))}
                          {clientPacks.map((pack) => (
                            <Badge key={pack.id} variant="outline">
                              {pack.service?.name || 'Pack'}
                            </Badge>
                          ))}
                          {clientMealPlans.map((purchase) => (
                            <Badge key={purchase.id} variant="outline">
                              {purchase.service?.name || 'Meal Plan'}
                            </Badge>
                          ))}
                          {clientSubscriptions.length === 0 &&
                          clientPacks.length === 0 &&
                          clientMealPlans.length === 0 ? (
                            <span className="text-sm text-muted-foreground">
                              No attributed purchases yet
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {clientPacks.length > 0 ? (
                          <div className="space-y-1.5">
                            {clientPacks.map((pack) => {
                              const remaining = Math.max(pack.total_sessions - pack.used_sessions, 0)

                              return (
                                <div key={pack.id} className="text-sm">
                                  <p className="font-medium">
                                    {pack.service?.name || 'Pack'}
                                  </p>
                                  <p className="text-muted-foreground">
                                    {pack.used_sessions} used · {remaining} remaining
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {bookedSessions}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="mb-1 text-lg font-medium">No Clients Yet</h3>
            <p className="text-muted-foreground">
              Clients will appear here once purchases or bookings are assigned to you.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
