import Link from 'next/link'
import { redirect } from 'next/navigation'
import { addMonths, format, startOfMonth, subMonths } from 'date-fns'
import { CreditCard, DollarSign, Package, UserSquare2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getAdminDashboardData } from '@/lib/admin-reporting'
import { formatPrice } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

function parseMonthValue(value?: string) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return startOfMonth(new Date())
  }

  const parsed = new Date(`${value}-01T12:00:00Z`)
  if (Number.isNaN(parsed.getTime())) {
    return startOfMonth(new Date())
  }

  return startOfMonth(parsed)
}

function toMonthValue(date: Date) {
  return format(date, 'yyyy-MM')
}

export default async function AdminEarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const resolvedSearchParams = await searchParams
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

  const monthStart = parseMonthValue(resolvedSearchParams.month)
  const previousMonth = subMonths(monthStart, 1)
  const nextMonth = addMonths(monthStart, 1)
  const currentMonth = startOfMonth(new Date())

  const data = await getAdminDashboardData(monthStart)
  const trainerAttributedRevenueCents = data.trainers.reduce(
    (sum, trainer) => sum + trainer.earningsCents,
    0
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Earnings</h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            Financial overview for {data.metrics.monthLabel}. This page tracks revenue,
            trainer-attributed earnings, and active service enrollment for the selected month.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/earnings?month=${toMonthValue(previousMonth)}`}>
            <Button variant="outline" size="sm">
              {format(previousMonth, 'MMM yyyy')}
            </Button>
          </Link>
          {toMonthValue(monthStart) !== toMonthValue(currentMonth) ? (
            <Link href="/admin/earnings">
              <Button variant="outline" size="sm">
                Current Month
              </Button>
            </Link>
          ) : null}
          {monthStart < currentMonth ? (
            <Link href={`/admin/earnings?month=${toMonthValue(nextMonth)}`}>
              <Button variant="outline" size="sm">
                Next Month
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                <DollarSign className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-semibold">
                  {formatPrice(data.metrics.totalRevenueCents)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                <CreditCard className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recurring Revenue</p>
                <p className="text-2xl font-semibold">
                  {formatPrice(data.metrics.recurringRevenueCents)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <Package className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">One-Time Revenue</p>
                <p className="text-2xl font-semibold">
                  {formatPrice(data.metrics.oneTimeRevenueCents)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <UserSquare2 className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reconciled to Trainers</p>
                <p className="text-2xl font-semibold">
                  {formatPrice(trainerAttributedRevenueCents)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Trainer Earnings Register</CardTitle>
            <CardDescription>
              Session load and earnings by trainer for the selected month. Revenue is currently
              attributed fully to the assigned trainer.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trainer</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Confirmed</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Active Clients</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.trainers.length > 0 ? (
                  data.trainers.map((trainer) => (
                    <TableRow key={trainer.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{trainer.fullName}</p>
                          <p className="text-xs text-muted-foreground">{trainer.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{trainer.pendingSessions}</TableCell>
                      <TableCell className="text-right">{trainer.confirmedSessions}</TableCell>
                      <TableCell className="text-right">{trainer.completedSessions}</TableCell>
                      <TableCell className="text-right">{trainer.activeClients}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPrice(trainer.earningsCents)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No trainer earnings recorded for this month yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Service Revenue Snapshot</CardTitle>
            <CardDescription>
              Active offers and how many clients are currently enrolled in each.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.services.length > 0 ? (
              data.services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl border border-border/70 bg-muted/20 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">{service.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {service.enrolledClients} client
                        {service.enrolledClients === 1 ? '' : 's'} enrolled
                      </p>
                    </div>
                    <p className="font-semibold text-foreground">{formatPrice(service.price)}</p>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                    <div className="rounded-lg bg-white px-3 py-2">
                      Subscriptions: <span className="font-medium text-foreground">{service.activeSubscriptions}</span>
                    </div>
                    <div className="rounded-lg bg-white px-3 py-2">
                      Packs: <span className="font-medium text-foreground">{service.activePacks}</span>
                    </div>
                    <div className="rounded-lg bg-white px-3 py-2">
                      Meal plans: <span className="font-medium text-foreground">{service.pendingMealPlans}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-muted-foreground">
                No active services found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
