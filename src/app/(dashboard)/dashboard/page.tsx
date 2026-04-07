import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Dumbbell,
  ExternalLink,
  Library,
  Package,
  ShoppingCart,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react'

import JoinDailyButton from '@/components/bookings/join-daily-button'
import BillingPortalButton from '@/components/nav/billing-portal-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { isVirtualLocation } from '@/lib/booking-display'
import {
  getActiveSessionPacks,
  getActiveSessionSubscriptions,
  getLibraryAccessDetails,
  getPrimarySessionSubscription,
} from '@/lib/product-access'
import { formatPrice } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export default async function ClientDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*, service:services(*)')
    .eq('client_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const { data: packs } = await supabase
    .from('session_packs')
    .select('*, service:services(*)')
    .eq('client_id', user.id)
    .order('purchased_at', { ascending: false })

  const normalizedSubscriptions = (subscriptions ?? []).map((subscription) => ({
    ...subscription,
    service: Array.isArray(subscription.service) ? subscription.service[0] : subscription.service,
  }))

  const normalizedPacks = (packs ?? []).map((pack) => ({
    ...pack,
    service: Array.isArray(pack.service) ? pack.service[0] : pack.service,
  }))

  const sessionSubscriptions = getActiveSessionSubscriptions(normalizedSubscriptions)
  const primarySessionSubscription = getPrimarySessionSubscription(normalizedSubscriptions)
  const activePacks = getActiveSessionPacks(normalizedPacks)
  const totalSessionsLeft = activePacks.reduce(
    (sum, pack) => sum + (pack.total_sessions - pack.used_sessions),
    0
  )
  const hasBookableAccess = sessionSubscriptions.length > 0 || activePacks.length > 0
  const libraryAccess = getLibraryAccessDetails(
    normalizedSubscriptions,
    normalizedPacks,
    process.env.VIMEO_LIBRARY_URL || null
  )

  const now = new Date().toISOString()
  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select('*, trainer:trainers(*, profile:profiles(*)), service:services(name)')
    .eq('client_id', user.id)
    .in('status', ['approved', 'pending'])
    .gte('start_time', now)
    .order('start_time', { ascending: true })
    .limit(5)

  const pendingCount = upcomingBookings?.filter((booking) => booking.status === 'pending').length ?? 0
  const confirmedCount = upcomingBookings?.filter((booking) => booking.status === 'approved').length ?? 0

  const { data: cancelledBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('client_id', user.id)
    .eq('status', 'cancelled')
    .order('start_time', { ascending: false })
    .limit(3)

  const { data: mealPlans } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })

  const sessionServices = services?.filter((service) => service.is_session !== false) ?? []

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">
            Hey{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-muted-foreground mt-1">Here&apos;s your training overview</p>
        </div>
        <BillingPortalButton />
      </div>

      {!hasBookableAccess && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-900">No active booking package</p>
              <p className="text-sm text-amber-700 mt-0.5">
                You don&apos;t have an active subscription or session pack for live training yet.
              </p>
              <Link href="/account">
                <Button size="sm" className="mt-3 gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                  <ShoppingCart className="h-4 w-4" />
                  Browse Packages
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Plan</p>
                <p className="text-lg font-semibold truncate max-w-[140px]">
                  {primarySessionSubscription
                    ? primarySessionSubscription.service?.name
                    : activePacks.length > 0
                      ? 'Session Pack'
                      : libraryAccess
                        ? libraryAccess.service.name
                        : 'None'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sessions Left</p>
                <p className="text-lg font-semibold">
                  {primarySessionSubscription ? 'Unlimited' : totalSessionsLeft > 0 ? totalSessionsLeft : '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-lg font-semibold">{confirmedCount} upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-lg font-semibold">{pendingCount} requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingBookings && upcomingBookings.length > 0 ? (
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {format(new Date(booking.start_time), 'EEEE, MMM d')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(booking.start_time), 'h:mm a')} -{' '}
                          {format(new Date(booking.end_time), 'h:mm a')}
                          {booking.trainer?.profile?.full_name ? (
                            <> &middot; {booking.trainer.profile.full_name}</>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {booking.service?.name || 'Training Session'}
                          {isVirtualLocation(booking.location_type) ? ' • Virtual session' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Badge variant={booking.status === 'approved' ? 'default' : 'secondary'}>
                          {booking.status === 'approved' ? 'Confirmed' : 'Pending'}
                        </Badge>
                        {booking.status === 'approved' && isVirtualLocation(booking.location_type) ? (
                          <JoinDailyButton bookingId={booking.id} />
                        ) : null}
                      </div>
                    </div>
                  ))}
                  <div className="pt-1">
                    <Link href="/sessions">
                      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                        View all sessions {'>'}
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Dumbbell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No upcoming sessions</p>
                  {hasBookableAccess ? (
                    <Link href="/book">
                      <Button variant="link" className="mt-1">Book your first session {'>'}</Button>
                    </Link>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          {cancelledBookings && cancelledBookings.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                  <XCircle className="h-4 w-4" />
                  Recently Cancelled
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cancelledBookings.map((booking, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.start_time), 'EEEE, MMM d - h:mm a')}
                      </p>
                      <Badge variant="destructive" className="text-xs">Cancelled</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {mealPlans && mealPlans.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5" />
                  Your Meal Plans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mealPlans.map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{plan.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(plan.created_at), 'MMMM d, yyyy')}
                        </p>
                      </div>
                      <a href={`/api/meal-plans/${plan.id}/download`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Current Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {primarySessionSubscription ? (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm">{primarySessionSubscription.service?.name}</p>
                    <Badge>Active</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(primarySessionSubscription.service?.price ?? 0)}/month
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Renews {format(new Date(primarySessionSubscription.current_period_end), 'MMM d, yyyy')}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active live-training subscription</p>
              )}

              {activePacks.length > 0 ? (
                <>
                  {primarySessionSubscription ? <Separator /> : null}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Session Packs</p>
                    {activePacks.map((pack) => (
                      <div key={pack.id} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium">{pack.service?.name}</p>
                        <Badge variant="secondary">
                          {pack.total_sessions - pack.used_sessions} left
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {libraryAccess ? (
                <>
                  {primarySessionSubscription || activePacks.length > 0 ? <Separator /> : null}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Video Library</p>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-sm font-medium">{libraryAccess.service.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {libraryAccess.accessType === 'subscription'
                          ? 'Subscription access is active.'
                          : `${libraryAccess.remainingSessions || 0} session${libraryAccess.remainingSessions === 1 ? '' : 's'} remaining with library access.`}
                      </p>
                    </div>
                  </div>
                </>
              ) : null}

              {!primarySessionSubscription && activePacks.length === 0 && !libraryAccess ? (
                <Link href="/account">
                  <Button variant="outline" size="sm" className="w-full gap-2 mt-1">
                    <ShoppingCart className="h-4 w-4" />
                    Buy a Package
                  </Button>
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/book" className="block">
                <Button
                  className="w-full justify-start gap-3"
                  size="default"
                  disabled={!hasBookableAccess}
                >
                  <Calendar className="h-4 w-4" />
                  Book a Session
                </Button>
              </Link>
              <Link href="/sessions" className="block">
                <Button variant="outline" className="w-full justify-start gap-3" size="default">
                  <Clock className="h-4 w-4" />
                  View All Sessions
                </Button>
              </Link>
              {libraryAccess ? (
                <Link href="/library" className="block">
                  <Button variant="outline" className="w-full justify-start gap-3" size="default">
                    <Library className="h-4 w-4" />
                    Open Video Library
                  </Button>
                </Link>
              ) : null}
              {mealPlans && mealPlans.length > 0 ? (
                <Link href="/meal-plans" className="block">
                  <Button variant="outline" className="w-full justify-start gap-3" size="default">
                    <UtensilsCrossed className="h-4 w-4" />
                    Meal Plans ({mealPlans.length})
                  </Button>
                </Link>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {sessionServices.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Available Packages</h2>
              <p className="text-sm text-muted-foreground">Purchase a package to start booking sessions</p>
            </div>
            <Link href="/account">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sessionServices.map((service) => (
              <Card key={service.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="pt-5">
                  <h4 className="font-semibold">{service.name}</h4>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatPrice(service.price)}
                    {service.type === 'unlimited' ? (
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    ) : null}
                  </p>
                  {service.session_count ? (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {service.session_count} session{service.session_count !== 1 ? 's' : ''}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground mt-1 mb-3 line-clamp-2">
                    {service.description}
                  </p>
                  <Link href="/account">
                    <Button size="sm" variant="outline" className="w-full">
                      Purchase
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
