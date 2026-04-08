import Link from 'next/link'
import { redirect } from 'next/navigation'
import { addMonths, format, startOfMonth, subMonths } from 'date-fns'
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CalendarRange,
  CreditCard,
  DollarSign,
  Globe,
  Package,
  Settings,
  UserSquare2,
  Users,
} from 'lucide-react'

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

function formatDuration(seconds: number) {
  if (!seconds) return '0m 00s'

  const totalSeconds = Math.round(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60
  return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`
}

const quickLinks = [
  {
    href: '/admin/bookings',
    label: 'Bookings',
    description: 'Approve sessions, manage issues, and review schedule changes.',
    icon: CalendarRange,
  },
  {
    href: '/admin/trainers',
    label: 'Trainers',
    description: 'Add trainers, verify onboarding, and monitor calendar connection status.',
    icon: UserSquare2,
  },
  {
    href: '/admin/clients',
    label: 'Clients',
    description: 'Review every client, their services, and session usage in one place.',
    icon: Users,
  },
  {
    href: '/admin/services',
    label: 'Services',
    description: 'Adjust pricing, activate offers, and manage the live catalog.',
    icon: Package,
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    description: 'Check integrations, business rules, and launch readiness.',
    icon: Settings,
  },
]

export default async function AdminDashboardPage({
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            Business-wide snapshot for {data.metrics.monthLabel}. This view is focused on revenue,
            trainer performance, client activity, service adoption, and site traffic.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin?month=${toMonthValue(previousMonth)}`}>
            <Button variant="outline" size="sm">
              {format(previousMonth, 'MMM yyyy')}
            </Button>
          </Link>
          {toMonthValue(monthStart) !== toMonthValue(currentMonth) ? (
            <Link href="/admin">
              <Button variant="outline" size="sm">
                Current Month
              </Button>
            </Link>
          ) : null}
          {monthStart < currentMonth ? (
            <Link href={`/admin?month=${toMonthValue(nextMonth)}`}>
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
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-semibold">{formatPrice(data.metrics.totalRevenueCents)}</p>
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
                <p className="text-2xl font-semibold">{formatPrice(data.metrics.recurringRevenueCents)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <CalendarClock className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Booked Sessions</p>
                <p className="text-2xl font-semibold">{data.metrics.bookedSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <Users className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registered Clients</p>
                <p className="text-2xl font-semibold">{data.metrics.registeredClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                <Activity className="h-5 w-5 text-rose-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
                <p className="text-2xl font-semibold">{data.metrics.pendingSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100">
                <BarChart3 className="h-5 w-5 text-cyan-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed Sessions</p>
                <p className="text-2xl font-semibold">{data.metrics.completedSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                <UserSquare2 className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Trainers</p>
                <p className="text-2xl font-semibold">{data.metrics.activeTrainers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                <Package className="h-5 w-5 text-indigo-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Services</p>
                <p className="text-2xl font-semibold">{data.metrics.activeServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Trainer Register</CardTitle>
            <CardDescription>
              Monthly session load, client counts, onboarding state, and earnings by trainer.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Confirmed</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Clients</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.trainers.map((trainer) => (
                  <TableRow key={trainer.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium">{trainer.fullName}</p>
                        <p className="text-xs text-muted-foreground">{trainer.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={trainer.isActive ? 'default' : 'secondary'}>
                          {trainer.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant={trainer.onboardingCompleted ? 'default' : 'secondary'}>
                          {trainer.onboardingCompleted ? 'Setup complete' : 'Setup pending'}
                        </Badge>
                        <Badge variant={trainer.calendarConnected ? 'default' : 'secondary'}>
                          {trainer.calendarConnected ? 'Calendar connected' : 'Calendar pending'}
                        </Badge>
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Booking Mix</CardTitle>
              <CardDescription>Where sessions are being delivered this month.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span>Studio</span>
                <span className="font-semibold">{data.metrics.locationMix.studio}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span>In-home</span>
                <span className="font-semibold">{data.metrics.locationMix.home}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span>Virtual</span>
                <span className="font-semibold">{data.metrics.locationMix.virtual}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span>Pending meal plans</span>
                <span className="font-semibold">{data.metrics.pendingMealPlans}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Jump straight into the operational pages.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-start justify-between rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                      <link.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{link.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>Google Analytics</CardTitle>
          </div>
          <CardDescription>Last 30 days of traffic and engagement from your site.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.analytics.configured && !data.analytics.error ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Sessions</p>
                  <p className="mt-1 text-2xl font-semibold">{data.analytics.sessions.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="mt-1 text-2xl font-semibold">{data.analytics.totalUsers.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">New Users</p>
                  <p className="mt-1 text-2xl font-semibold">{data.analytics.newUsers.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Page Views</p>
                  <p className="mt-1 text-2xl font-semibold">{data.analytics.pageViews.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_260px]">
                <div className="rounded-xl border p-4">
                  <p className="mb-3 text-sm font-medium">Top Pages</p>
                  <div className="space-y-2">
                    {data.analytics.topPages.length > 0 ? (
                      data.analytics.topPages.map((page) => (
                        <div
                          key={page.title}
                          className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
                        >
                          <span className="truncate pr-4">{page.title}</span>
                          <span className="font-semibold">{page.pageViews.toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No page-level analytics returned yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">Average session duration</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatDuration(data.analytics.averageSessionDurationSeconds)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12">
              <h3 className="text-lg font-medium">Google Analytics is not connected yet</h3>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Add GA4 Data API credentials and a property ID to load visits, users, page views, and
                top pages here. {data.analytics.error ? `Current status: ${data.analytics.error}` : ''}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Client Register</CardTitle>
              <CardDescription>
                Every registered client, their assigned trainer, purchased services, and remaining sessions.
              </CardDescription>
            </div>
            <Link href="/admin/clients">
              <Button variant="outline" size="sm">
                Open Clients Tab
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Pack Usage</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium">{client.fullName}</p>
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.trainerNames.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {client.trainerNames.map((trainerName) => (
                            <Badge key={trainerName} variant="secondary">
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
                        <div className="flex max-w-md flex-wrap gap-2">
                          {client.services.map((service) => (
                            <Badge key={service} variant="outline">
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Active Services</CardTitle>
            <CardDescription>
              Current pricing plus how many clients are actively enrolled in each offer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.services.map((service) => (
              <div key={service.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPrice(service.price)}</p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {service.fulfillmentType || 'booking'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Clients enrolled</span>
                    <p className="font-semibold">{service.enrolledClients}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Subscriptions</span>
                    <p className="font-semibold">{service.activeSubscriptions}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Active packs</span>
                    <p className="font-semibold">{service.activePacks}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Pending meal plans</span>
                    <p className="font-semibold">{service.pendingMealPlans}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

