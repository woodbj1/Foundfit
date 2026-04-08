'use client'

import type { ComponentType } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle,
  Clock,
  List,
  LogOut,
  MapPin,
  RefreshCw,
  Settings,
  ToggleLeft,
  User,
  Video,
} from 'lucide-react'
import JoinDailyButton from '@/components/bookings/join-daily-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getBookingLocationLabel, isVirtualLocation } from '@/lib/booking-display'
import {
  formatBookingLongDate,
  formatBookingTime,
  formatBookingTimeRange,
  formatBookingWeekdayDate,
} from '@/lib/booking-time'
import { createClient } from '@/lib/supabase/client'
import { formatScheduleTime, groupScheduleRulesByDay } from '@/lib/trainer-schedule'
import { getCurrentDateInTimeZone, getDateStringInTimeZone } from '@/lib/timezone'
import type { BookingPreference, TrainerScheduleRule, UserRole } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'America/Denver',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
]

const UPCOMING_WINDOW_DAYS = 7

type Profile = {
  id: string
  full_name: string
  email: string
  booking_preference: BookingPreference | null
  role: UserRole
  timezone?: string
}

type BookingRow = {
  id: string
  client_id: string
  trainer_id: string
  start_time: string
  end_time: string
  status: 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed'
  location_type: 'gym' | 'travel' | 'virtual'
  travel_address: string | null
  notes: string | null
  google_calendar_event_id: string | null
  daily_room_url: string | null
  service?: { name: string } | null
  client?: { full_name: string; email: string } | null
}

type BookingQueryRow = Omit<BookingRow, 'client'> & {
  client?: { full_name: string; email: string }[] | { full_name: string; email: string } | null
  service?: { name: string }[] | { name: string } | null
}

type TrainerRecord = {
  id: string
  user_id: string
  google_calendar_connected_at: string | null
  google_calendar_email: string | null
  onboarding_completed_at: string | null
}

type CalendarStatus = 'connected' | 'not_connected' | 'reconnect_required'

type UpcomingDay = {
  dateKey: string
  sessions: BookingRow[]
  isToday: boolean
}

function addDaysToDateString(dateString: string, days: number) {
  const next = new Date(`${dateString}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

function SummaryCard({
  title,
  value,
  detail,
  icon: Icon,
  accentClassName,
}: {
  title: string
  value: string
  detail: string
  icon: ComponentType<{ className?: string }>
  accentClassName: string
}) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', accentClassName)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function TrainerDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [supabase] = useState(() => createClient())

  const [user, setUser] = useState<{ id: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [trainer, setTrainer] = useState<TrainerRecord | null>(null)
  const [pendingBookings, setPendingBookings] = useState<BookingRow[]>([])
  const [confirmedSessions, setConfirmedSessions] = useState<BookingRow[]>([])
  const [scheduleRules, setScheduleRules] = useState<TrainerScheduleRule[]>([])
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>('not_connected')
  const [calendarEmail, setCalendarEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [bookingPref, setBookingPref] = useState('request_system')
  const [updatingPref, setUpdatingPref] = useState(false)
  const [isUpdatingTimezone, setIsUpdatingTimezone] = useState(false)
  const [connectingGoogle, setConnectingGoogle] = useState(false)

  const groupedSchedule = useMemo(() => groupScheduleRulesByDay(scheduleRules), [scheduleRules])
  const displayTimezone = profile?.timezone || 'America/New_York'
  const upcomingWeek = useMemo<UpcomingDay[]>(() => {
    const todayKey = getCurrentDateInTimeZone(displayTimezone)

    return Array.from({ length: UPCOMING_WINDOW_DAYS }, (_, index) => {
      const dateKey = addDaysToDateString(todayKey, index)

      return {
        dateKey,
        isToday: index === 0,
        sessions: confirmedSessions.filter(
          (session) => getDateStringInTimeZone(session.start_time, displayTimezone) === dateKey
        ),
      }
    })
  }, [confirmedSessions, displayTimezone])
  const nextSession = confirmedSessions[0] ?? null
  const upcomingWeekSessionCount = upcomingWeek.reduce((count, day) => count + day.sessions.length, 0)
  const activeWorkDays = groupedSchedule.filter((day) => day.workHours.length > 0).length
  const totalBlockedRules = groupedSchedule.reduce((count, day) => count + day.blocked.length, 0)

  const fetchData = useCallback(async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email, booking_preference, role, timezone')
        .eq('id', userId)
        .single()

      setProfile(profileData as Profile | null)
      if (profileData?.booking_preference) {
        setBookingPref(profileData.booking_preference)
      }

      const { data: trainerData } = await supabase
        .from('trainers')
        .select(
          'id, user_id, google_calendar_connected_at, google_calendar_email, onboarding_completed_at'
        )
        .eq('user_id', userId)
        .single()

      setTrainer(trainerData as TrainerRecord | null)

      if (!trainerData) {
        setCalendarStatus('not_connected')
        setCalendarEmail(null)
        setPendingBookings([])
        setConfirmedSessions([])
        setScheduleRules([])
        return
      }

      const scheduleRulesPromise = fetch('/api/trainer/availability', { cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) {
            return [] as TrainerScheduleRule[]
          }

          const payload = (await response.json()) as { data?: TrainerScheduleRule[] }
          return payload.data ?? []
        })
        .catch(() => [] as TrainerScheduleRule[])

      const calendarStatusPromise = fetch('/api/trainer/google/status', { cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) {
            return {
              status: 'not_connected' as CalendarStatus,
              email: null as string | null,
            }
          }

          return (await response.json()) as {
            status: CalendarStatus
            email: string | null
          }
        })
        .catch(() => ({
          status: 'not_connected' as CalendarStatus,
          email: null as string | null,
        }))

      const [{ data: pendingData }, { data: confirmedData }, nextScheduleRules, nextCalendarStatus] = await Promise.all([
        supabase
          .from('bookings')
          .select(
            'id, client_id, trainer_id, start_time, end_time, status, location_type, travel_address, notes, google_calendar_event_id, daily_room_url, client:profiles!bookings_client_id_fkey(full_name, email), service:services(name)'
          )
          .eq('trainer_id', trainerData.id)
          .eq('status', 'pending')
          .order('start_time', { ascending: true }),
        supabase
          .from('bookings')
          .select(
            'id, client_id, trainer_id, start_time, end_time, status, location_type, travel_address, notes, google_calendar_event_id, daily_room_url, client:profiles!bookings_client_id_fkey(full_name, email), service:services(name)'
          )
          .eq('trainer_id', trainerData.id)
          .eq('status', 'approved')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true }),
        scheduleRulesPromise,
        calendarStatusPromise,
      ])

      const normalizeBookings = (rows: BookingQueryRow[] | null | undefined): BookingRow[] =>
        (rows ?? []).map((row) => ({
          ...row,
          client: Array.isArray(row.client) ? row.client[0] : row.client,
          service: Array.isArray(row.service) ? row.service[0] : row.service,
        }))

      setPendingBookings(normalizeBookings(pendingData as BookingQueryRow[] | null))
      setConfirmedSessions(normalizeBookings(confirmedData as BookingQueryRow[] | null))
      setScheduleRules(nextScheduleRules)
      setCalendarStatus(nextCalendarStatus.status)
      setCalendarEmail(nextCalendarStatus.email)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) {
        router.push('/login')
        return
      }
      setUser(authUser)
      fetchData(authUser.id)
    })
  }, [router, supabase, fetchData])

  useEffect(() => {
    if (searchParams.get('google') !== 'connected') {
      return
    }

    toast.success('Google Calendar connected successfully.')
    router.replace('/trainer')
  }, [router, searchParams])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true)

    try {
      const response = await fetch('/api/trainer/google/connect', {
        method: 'POST',
      })

      const data = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Could not start Google Calendar setup.')
      }

      window.location.href = data.url
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not start Google Calendar setup.'
      )
      setConnectingGoogle(false)
    }
  }

  const handleApproveRequest = async (booking: BookingRow) => {
    setProcessingId(booking.id)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to approve booking.')
      toast.success('Booking approved and client notified.')
      if (user) await fetchData(user.id)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve booking.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeclineRequest = async (booking: BookingRow) => {
    setProcessingId(booking.id)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'declined' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to decline booking.')
      toast.success('Booking declined.')
      if (user) await fetchData(user.id)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to decline booking.')
    } finally {
      setProcessingId(null)
    }
  }

  const toggleBookingPreference = async () => {
    if (!user) return
    setUpdatingPref(true)
    const newPref = bookingPref === 'request_system' ? 'instant_confirmation' : 'request_system'
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ booking_preference: newPref })
        .eq('id', user.id)
      if (error) throw error
      setBookingPref(newPref)
      toast.success(
        `Booking mode set to ${newPref === 'instant_confirmation' ? 'Instant Confirmation' : 'Request System'}.`
      )
    } catch {
      toast.error('Could not update booking preference.')
    } finally {
      setUpdatingPref(false)
    }
  }

  const handleTimezoneChange = async (value: string | null) => {
    if (!user || !value) return
    setIsUpdatingTimezone(true)
    const { error } = await supabase.from('profiles').update({ timezone: value }).eq('id', user.id)
    if (error) {
      toast.error('Could not update timezone.')
    } else {
      toast.success('Timezone updated.')
      fetchData(user.id)
    }
    setIsUpdatingTimezone(false)
  }

  if (loading && !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-purple-600" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Trainer Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Trainer Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Keep your week organized, review requests quickly, and stay on top of your live schedule.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={handleConnectGoogle}
            className="gap-2"
            disabled={!trainer || connectingGoogle}
          >
            {connectingGoogle ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            {calendarStatus === 'connected' || calendarStatus === 'reconnect_required'
              ? 'Reconnect Calendar'
              : 'Connect Calendar'}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/trainer/availability')}
            className="gap-2"
            disabled={!trainer}
          >
            <CalendarClock className="h-4 w-4" />
            Manage Availability
          </Button>
          <Button onClick={handleLogout} variant="outline" className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))]">
        <Card className="border-none bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white shadow-xl xl:col-span-1">
          <CardContent className="flex h-full flex-col justify-between gap-6 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-purple-600 shadow-inner">
                {profile?.full_name?.charAt(0)?.toUpperCase() || (
                  <User className="h-8 w-8 text-purple-600" />
                )}
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold">{profile?.full_name || 'Trainer'}</h2>
                <p className="text-sm text-white/85">
                  {trainer
                    ? 'Your schedule, pending requests, and calendar sync all live here.'
                    : 'You need to be added as a trainer before bookings can flow into your portal.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white/20 text-white hover:bg-white/20">
                {bookingPref === 'instant_confirmation' ? 'Instant confirmation' : 'Request system'}
              </Badge>
              <Badge className="bg-white/20 text-white hover:bg-white/20">
                {calendarStatus === 'connected'
                  ? 'Calendar connected'
                  : calendarStatus === 'reconnect_required'
                    ? 'Reconnect required'
                    : 'Calendar setup needed'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <SummaryCard
          title="Pending"
          value={String(pendingBookings.length)}
          detail={pendingBookings.length === 0 ? 'Nothing waiting on approval' : 'Requests ready for review'}
          icon={Clock}
          accentClassName="bg-amber-100 text-amber-700"
        />
        <SummaryCard
          title="Upcoming Week"
          value={String(upcomingWeekSessionCount)}
          detail={
            nextSession
              ? `Next: ${formatBookingWeekdayDate(nextSession.start_time, displayTimezone)}`
              : 'No confirmed sessions yet'
          }
          icon={Calendar}
          accentClassName="bg-emerald-100 text-emerald-700"
        />
        <SummaryCard
          title="Availability"
          value={`${activeWorkDays}/7`}
          detail={`${totalBlockedRules} blocked rule${totalBlockedRules === 1 ? '' : 's'} this week`}
          icon={CalendarClock}
          accentClassName="bg-purple-100 text-purple-700"
        />
      </div>

      <Tabs defaultValue="bookings" className="w-full space-y-6">
        <div className="rounded-3xl border border-border/60 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Your week at a glance</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Start with bookings, then jump into schedule or settings only when you need them.
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <TabsList className="h-auto w-full justify-start rounded-2xl bg-muted/70 p-1 sm:w-fit">
                <TabsTrigger
                  value="bookings"
                  className="rounded-xl px-3 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <List className="mr-2 h-4 w-4" />
                  Bookings
                </TabsTrigger>
                <TabsTrigger
                  value="schedule"
                  className="rounded-xl px-3 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  My Schedule
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="rounded-xl px-3 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>
              <p className="text-xs text-muted-foreground">Times shown in {displayTimezone}</p>
            </div>
          </div>
        </div>

        <TabsContent value="bookings" className="mt-0">
          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="text-2xl">Upcoming Week</CardTitle>
                    <CardDescription className="mt-1">
                      Review every confirmed booking day by day for the next seven days.
                    </CardDescription>
                  </div>
                  <Badge className="w-fit bg-purple-100 text-purple-700 hover:bg-purple-100">
                    {upcomingWeekSessionCount} session{upcomingWeekSessionCount === 1 ? '' : 's'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {!trainer ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center text-muted-foreground">
                    No trainer profile found yet.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-7">
                    {upcomingWeek.map((day) => (
                      <div
                        key={day.dateKey}
                        className={cn(
                          'rounded-2xl border p-4 shadow-sm transition-colors',
                          day.isToday ? 'border-purple-300 bg-purple-50/80' : 'border-border/70 bg-white'
                        )}
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {formatBookingWeekdayDate(`${day.dateKey}T12:00:00.000Z`, displayTimezone)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {day.isToday
                                ? 'Today'
                                : formatBookingLongDate(`${day.dateKey}T12:00:00.000Z`, displayTimezone)}
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-white/80 text-foreground shadow-sm">
                            {day.sessions.length}
                          </Badge>
                        </div>

                        {day.sessions.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-8 text-center">
                            <p className="text-sm font-medium text-foreground">Open for bookings</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              No confirmed sessions on this day.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {day.sessions.map((session) => (
                              <div
                                key={session.id}
                                className="rounded-xl border border-border/70 bg-muted/20 p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-foreground">
                                      {session.client?.full_name || 'Client'}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {formatBookingTimeRange(
                                        session.start_time,
                                        session.end_time,
                                        displayTimezone
                                      )}
                                    </p>
                                  </div>
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                    Confirmed
                                  </Badge>
                                </div>

                                <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                  {session.service?.name || 'Training Session'}
                                </p>

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="gap-1 border-border/70 bg-white/80">
                                    {isVirtualLocation(session.location_type) ? (
                                      <>
                                        <Video className="h-3.5 w-3.5" />
                                        Virtual
                                      </>
                                    ) : session.location_type === 'gym' ? (
                                      <>
                                        <Building2 className="h-3.5 w-3.5" />
                                        Studio
                                      </>
                                    ) : (
                                      <>
                                        <MapPin className="h-3.5 w-3.5" />
                                        Travel
                                      </>
                                    )}
                                  </Badge>
                                  {session.google_calendar_event_id ? (
                                    <Badge variant="outline" className="gap-1 border-border/70 bg-white/80">
                                      <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                                      Synced
                                    </Badge>
                                  ) : null}
                                </div>

                                {isVirtualLocation(session.location_type) ? (
                                  <div className="mt-3">
                                    <JoinDailyButton bookingId={session.id} />
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="border-yellow-200 bg-yellow-50/70 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">Pending Session Requests</CardTitle>
                      <CardDescription className="mt-1">
                        Approve or decline new client requests quickly.
                      </CardDescription>
                    </div>
                    <Badge className="bg-yellow-200 text-yellow-900 hover:bg-yellow-200">
                      {pendingBookings.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {!trainer ? (
                    <div className="rounded-2xl border border-dashed border-yellow-200 bg-white/80 px-4 py-8 text-center text-sm text-muted-foreground">
                      No trainer profile found yet.
                    </div>
                  ) : pendingBookings.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-yellow-200 bg-white/80 px-4 py-8 text-center">
                      <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        New booking requests will show up here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">
                                {booking.client?.full_name || 'Client'}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {formatBookingLongDate(booking.start_time, displayTimezone)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatBookingTime(booking.start_time, displayTimezone)}
                              </p>
                            </div>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              Pending
                            </Badge>
                          </div>

                          <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            {booking.service?.name || 'Training Session'}
                          </p>
                          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            {isVirtualLocation(booking.location_type) ? (
                              <>
                                <Video className="h-4 w-4" />
                                Virtual
                              </>
                            ) : booking.location_type === 'gym' ? (
                              <>
                                <Building2 className="h-4 w-4" />
                                Studio
                              </>
                            ) : (
                              <>
                                <MapPin className="h-4 w-4" />
                                {getBookingLocationLabel(
                                  booking.location_type,
                                  booking.travel_address
                                )}
                              </>
                            )}
                          </p>
                          {booking.notes ? (
                            <p className="mt-2 text-sm italic text-muted-foreground">
                              &ldquo;{booking.notes}&rdquo;
                            </p>
                          ) : null}

                          <div className="mt-4 flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveRequest(booking)}
                              disabled={processingId === booking.id}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              {processingId === booking.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                'Approve'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeclineRequest(booking)}
                              disabled={processingId === booking.id}
                              className="flex-1 border-red-200 text-red-600"
                            >
                              {processingId === booking.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                'Decline'
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">Availability Snapshot</CardTitle>
                      <CardDescription className="mt-1">
                        Keep an eye on open work days and recurring blocks.
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push('/trainer/availability')}
                      disabled={!trainer}
                    >
                      Manage
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {groupedSchedule.map(({ day, workHours, blocked }) => (
                    <div
                      key={day}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">{day}</p>
                        {workHours.length > 0 ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {workHours
                              .map(
                                (rule) =>
                                  `${formatScheduleTime(rule.start_time)} - ${formatScheduleTime(rule.end_time)}`
                              )
                              .join(', ')}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground">Unavailable</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Blocks
                        </p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {blocked.length === 0
                            ? 'None'
                            : `${blocked.length} block${blocked.length === 1 ? '' : 's'}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="mt-0">
          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-2xl">Weekly Availability</CardTitle>
                    <CardDescription className="mt-1">
                      Set work hours to control client booking windows, then layer in recurring
                      blocks for lunch, errands, pickups, and other protected time.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => router.push('/trainer/availability')}
                    size="sm"
                    disabled={!trainer}
                    className="gap-2"
                  >
                    <CalendarClock className="h-4 w-4" />
                    Manage Availability
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!trainer ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-14 text-center">
                    <p className="text-muted-foreground">
                      You need a trainer profile before setting availability.
                    </p>
                  </div>
                ) : scheduleRules.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-14 text-center">
                    <p className="mb-4 text-muted-foreground">You haven&apos;t set work hours yet.</p>
                    <Button variant="outline" onClick={() => router.push('/trainer/availability')}>
                      Set Work Hours
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {groupedSchedule.map(({ day, workHours, blocked }) => (
                      <div
                        key={day}
                        className="rounded-2xl border border-border/70 bg-muted/20 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold text-foreground">{day}</p>
                          <Badge variant="outline" className="border-border/70 bg-white/80">
                            {blocked.length === 0
                              ? 'No blocks'
                              : `${blocked.length} block${blocked.length === 1 ? '' : 's'}`}
                          </Badge>
                        </div>

                        {workHours.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {workHours.map((rule) => (
                              <Badge
                                key={rule.id}
                                className="bg-purple-100 text-purple-700 hover:bg-purple-100"
                              >
                                {formatScheduleTime(rule.start_time)} - {formatScheduleTime(rule.end_time)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">Unavailable for bookings</p>
                        )}

                        {blocked.length > 0 ? (
                          <div className="mt-4 space-y-2">
                            {blocked.map((rule) => (
                              <div
                                key={rule.id}
                                className="rounded-xl border border-border/70 bg-white px-3 py-2"
                              >
                                <p className="text-sm font-medium text-foreground">
                                  {rule.label || 'Blocked'}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatScheduleTime(rule.start_time)} - {formatScheduleTime(rule.end_time)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle>Next Confirmed Session</CardTitle>
                  <CardDescription>Your upcoming appointment at a glance.</CardDescription>
                </CardHeader>
                <CardContent>
                  {nextSession ? (
                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <p className="font-semibold text-foreground">
                        {nextSession.client?.full_name || 'Client'}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {formatBookingLongDate(nextSession.start_time, displayTimezone)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatBookingTimeRange(
                          nextSession.start_time,
                          nextSession.end_time,
                          displayTimezone
                        )}
                      </p>
                      <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {nextSession.service?.name || 'Training Session'}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {getBookingLocationLabel(nextSession.location_type, nextSession.travel_address)}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                      No confirmed sessions yet.
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle>Calendar Sync</CardTitle>
                  <CardDescription>
                    Google Calendar keeps busy time and approved events aligned.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className={cn(
                      'rounded-2xl border px-4 py-4',
                      calendarStatus === 'connected'
                        ? 'border-green-200 bg-green-50'
                        : 'border-amber-200 bg-amber-50'
                    )}
                  >
                    <p className="font-semibold text-foreground">
                      {calendarStatus === 'connected'
                        ? 'Calendar connected'
                        : calendarStatus === 'reconnect_required'
                          ? 'Reconnect Google Calendar'
                          : 'Calendar setup needed'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {calendarStatus === 'connected'
                        ? `Connected as ${calendarEmail || 'your primary Google Calendar'}.`
                        : calendarStatus === 'reconnect_required'
                          ? 'This saved Google connection no longer has calendar permission. Reconnect it so approved bookings create events on your calendar again.'
                          : 'Connect Google Calendar so external events block booking conflicts automatically.'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleConnectGoogle}
                    className="w-full"
                    disabled={connectingGoogle}
                  >
                    {connectingGoogle
                      ? 'Connecting...'
                      : calendarStatus === 'connected' || calendarStatus === 'reconnect_required'
                      ? 'Reconnect Google Calendar'
                      : 'Connect Google Calendar'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Trainer Settings</CardTitle>
                <CardDescription>
                  Update how requests are approved and keep your calendar connection healthy.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 2xl:grid-cols-2">
                <div className="space-y-4 rounded-3xl border border-border/70 bg-muted/20 p-5">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Booking Preferences</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Choose whether client sessions require approval or confirm instantly.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-white p-4">
                    <p className="text-sm text-muted-foreground">Current mode</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {bookingPref === 'instant_confirmation'
                        ? 'Instant Confirmation'
                        : 'Request System'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {bookingPref === 'instant_confirmation'
                        ? 'Clients can book open times without waiting for approval.'
                        : 'You review new requests before they appear as confirmed sessions.'}
                    </p>
                  </div>
                  <Button
                    variant={bookingPref === 'instant_confirmation' ? 'default' : 'outline'}
                    onClick={toggleBookingPreference}
                    disabled={updatingPref}
                    className={cn(
                      'w-full gap-2',
                      bookingPref === 'instant_confirmation' && 'bg-green-600 hover:bg-green-700'
                    )}
                  >
                    {updatingPref ? (
                      'Updating...'
                    ) : bookingPref === 'instant_confirmation' ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Instant Confirmation Active
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-4 w-4" />
                        Request System Active
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-6 rounded-3xl border border-border/70 bg-muted/20 p-5">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      Calendar and Timezone
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your personal Google Calendar powers busy-slot checks and approved booking
                      events.
                    </p>
                  </div>

                  <div
                    className={cn(
                      'rounded-2xl border p-4',
                      calendarStatus === 'connected'
                        ? 'border-green-200 bg-green-50'
                        : 'border-amber-200 bg-amber-50'
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground">Calendar integration status</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {calendarStatus === 'connected'
                            ? `Connected as ${calendarEmail || 'your primary Google Calendar'}.`
                            : calendarStatus === 'reconnect_required'
                              ? 'Your Google account needs to be reconnected with Calendar permission before FoundFit can create events for approved sessions.'
                              : 'Connect your Google Calendar to block off busy time and sync approved bookings.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={calendarStatus === 'connected' ? 'default' : 'secondary'}>
                          {calendarStatus === 'connected'
                            ? 'Connected'
                            : calendarStatus === 'reconnect_required'
                              ? 'Reconnect required'
                              : 'Setup required'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleConnectGoogle}
                          disabled={connectingGoogle}
                        >
                          {connectingGoogle
                            ? 'Connecting...'
                            : calendarStatus === 'connected' ||
                                calendarStatus === 'reconnect_required'
                              ? 'Reconnect'
                              : 'Connect'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Your Timezone</label>
                    <Select
                      value={profile?.timezone || 'America/New_York'}
                      onValueChange={handleTimezoneChange}
                      disabled={isUpdatingTimezone}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      This timezone is used for dashboard display, emails, and booking times.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
