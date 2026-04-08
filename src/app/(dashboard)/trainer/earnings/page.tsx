import Link from 'next/link'
import { redirect } from 'next/navigation'
import { addMonths, format, startOfMonth, subMonths } from 'date-fns'
import { BarChart3, CreditCard, DollarSign, RefreshCcw, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPrice } from '@/lib/stripe'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { TrainerEarning } from '@/lib/types'

type EarningRow = TrainerEarning & {
  client?: { full_name: string | null; email: string } | null
}

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

function getEntryLabel(entryType: EarningRow['entry_type']) {
  switch (entryType) {
    case 'subscription_charge':
      return 'Subscription'
    case 'pack_purchase':
      return 'Session Pack'
    case 'single_session_purchase':
      return 'Single Session'
    case 'meal_plan_purchase':
      return 'Meal Plan'
    default:
      return 'Payment'
  }
}

export default async function TrainerEarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const resolvedSearchParams = await searchParams
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

  const monthStart = parseMonthValue(resolvedSearchParams.month)
  const nextMonth = addMonths(monthStart, 1)
  const previousMonth = subMonths(monthStart, 1)
  const currentMonthStart = startOfMonth(new Date())

  const [{ data: earningsRows }, { data: allMonthRows }] = await Promise.all([
    admin
      .from('trainer_earnings')
      .select('*, client:profiles!trainer_earnings_client_id_fkey(full_name, email)')
      .eq('trainer_id', trainer.id)
      .gte('occurred_at', monthStart.toISOString())
      .lt('occurred_at', nextMonth.toISOString())
      .order('occurred_at', { ascending: false }),
    admin
      .from('trainer_earnings')
      .select('occurred_at')
      .eq('trainer_id', trainer.id)
      .order('occurred_at', { ascending: false }),
  ])

  const earnings = ((earningsRows ?? []) as EarningRow[]).map((row) => ({
    ...row,
    client: Array.isArray(row.client) ? row.client[0] : row.client,
  }))

  const availableMonthValues = new Set<string>([toMonthValue(currentMonthStart)])
  for (const row of allMonthRows ?? []) {
    if (row?.occurred_at) {
      availableMonthValues.add(toMonthValue(new Date(row.occurred_at)))
    }
  }

  const availableMonths = Array.from(availableMonthValues)
    .sort((left, right) => right.localeCompare(left))
    .map((value) => ({
      value,
      label: format(new Date(`${value}-01T12:00:00Z`), 'MMMM yyyy'),
    }))

  const totalRevenue = earnings.reduce((sum, entry) => sum + entry.amount_cents, 0)
  const subscriptionRevenue = earnings
    .filter((entry) => entry.entry_type === 'subscription_charge')
    .reduce((sum, entry) => sum + entry.amount_cents, 0)
  const oneTimeRevenue = earnings
    .filter((entry) => entry.entry_type !== 'subscription_charge')
    .reduce((sum, entry) => sum + entry.amount_cents, 0)
  const clientCount = new Set(earnings.map((entry) => entry.client_id)).size

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Earnings</h1>
          <p className="mt-1 text-muted-foreground">
            Revenue assigned to you from client purchases and subscription renewals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/trainer/earnings?month=${toMonthValue(previousMonth)}`}>
            <Button variant="outline" size="sm">
              {format(previousMonth, 'MMM yyyy')}
            </Button>
          </Link>
          {toMonthValue(monthStart) !== toMonthValue(currentMonthStart) ? (
            <Link href="/trainer/earnings">
              <Button variant="outline" size="sm">
                Current Month
              </Button>
            </Link>
          ) : null}
          {monthStart < currentMonthStart ? (
            <Link href={`/trainer/earnings?month=${toMonthValue(addMonths(monthStart, 1))}`}>
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
                <p className="text-2xl font-semibold">{formatPrice(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                <RefreshCcw className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Subscription Revenue</p>
                <p className="text-2xl font-semibold">{formatPrice(subscriptionRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <CreditCard className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">One-Time Purchases</p>
                <p className="text-2xl font-semibold">{formatPrice(oneTimeRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <Users className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paying Clients</p>
                <p className="text-2xl font-semibold">{clientCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_300px]">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>{format(monthStart, 'MMMM yyyy')} Revenue</CardTitle>
            <CardDescription>
              Every purchase and renewal assigned to your trainer account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {earnings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.occurred_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{entry.client?.full_name || 'Client'}</p>
                          <p className="text-xs text-muted-foreground">{entry.client?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{entry.service_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getEntryLabel(entry.entry_type)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPrice(entry.amount_cents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
                <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                <h3 className="text-lg font-medium">No earnings recorded for this month</h3>
                <p className="mt-1 text-muted-foreground">
                  Revenue will appear here once clients purchase services with you selected as the trainer.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Months</CardTitle>
            <CardDescription>Jump to a previous month of earnings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {availableMonths.map((month) => (
              <Link key={month.value} href={month.value === toMonthValue(currentMonthStart) ? '/trainer/earnings' : `/trainer/earnings?month=${month.value}`} className="block">
                <Button
                  variant={month.value === toMonthValue(monthStart) ? 'default' : 'outline'}
                  className="w-full justify-between"
                >
                  <span>{month.label}</span>
                  {month.value === toMonthValue(currentMonthStart) ? (
                    <Badge variant="secondary">Current</Badge>
                  ) : null}
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
