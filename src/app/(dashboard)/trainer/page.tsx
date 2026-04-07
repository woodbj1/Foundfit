'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  List,
  LogOut,
  MapPin,
  Plus,
  RefreshCw,
  Settings,
  ToggleLeft,
  User,
  Video,
} from 'lucide-react'
import AvailabilityModal from '@/components/trainer/availability-modal'
import JoinDailyButton from '@/components/bookings/join-daily-button'
import { getBookingLocationLabel, isVirtualLocation } from '@/lib/booking-display'
import { toast } from 'sonner'
import type { BookingPreference, UserRole } from '@/lib/types'

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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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

type Availability = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
}

export default function TrainerDashboardPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const [user, setUser] = useState<{ id: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [trainer, setTrainer] = useState<TrainerRecord | null>(null)
  const [pendingBookings, setPendingBookings] = useState<BookingRow[]>([])
  const [confirmedSessions, setConfirmedSessions] = useState<BookingRow[]>([])
  const [availability, setAvailability] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [bookingPref, setBookingPref] = useState('request_system')
  const [updatingPref, setUpdatingPref] = useState(false)
  const [isUpdatingTimezone, setIsUpdatingTimezone] = useState(false)
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)

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
        .select('id, user_id, google_calendar_connected_at, google_calendar_email, onboarding_completed_at')
        .eq('user_id', userId)
        .single()

      setTrainer(trainerData as TrainerRecord | null)

      if (!trainerData) {
        setPendingBookings([])
        setConfirmedSessions([])
        setAvailability([])
        return
      }

      const [{ data: pendingData }, { data: confirmedData }, { data: availabilityData }] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, client_id, trainer_id, start_time, end_time, status, location_type, travel_address, notes, google_calendar_event_id, daily_room_url, client:profiles!bookings_client_id_fkey(full_name, email), service:services(name)')
          .eq('trainer_id', trainerData.id)
          .eq('status', 'pending')
          .order('start_time', { ascending: true }),
        supabase
          .from('bookings')
          .select('id, client_id, trainer_id, start_time, end_time, status, location_type, travel_address, notes, google_calendar_event_id, daily_room_url, client:profiles!bookings_client_id_fkey(full_name, email), service:services(name)')
          .eq('trainer_id', trainerData.id)
          .eq('status', 'approved')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true }),
        supabase
          .from('availability_blocks')
          .select('*')
          .eq('trainer_id', trainerData.id)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true }),
      ])

      const normalizeBookings = (rows: BookingQueryRow[] | null | undefined): BookingRow[] =>
        (rows ?? []).map((row) => ({
          ...row,
          client: Array.isArray(row.client) ? row.client[0] : row.client,
          service: Array.isArray(row.service) ? row.service[0] : row.service,
        }))

      setPendingBookings(normalizeBookings(pendingData as BookingQueryRow[] | null))
      setConfirmedSessions(normalizeBookings(confirmedData as BookingQueryRow[] | null))
      setAvailability((availabilityData as Availability[]) || [])
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
      const { error } = await supabase.from('profiles').update({ booking_preference: newPref }).eq('id', user.id)
      if (error) throw error
      setBookingPref(newPref)
      toast.success(`Booking mode set to ${newPref === 'instant_confirmation' ? 'Instant Confirmation' : 'Request System'}.`)
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
          Trainer Dashboard
        </h1>
        <div className="flex items-center gap-3">
          <Button onClick={handleLogout} variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner">
              <span className="text-2xl font-bold text-purple-600">
                {profile?.full_name?.charAt(0)?.toUpperCase() || <User className="h-8 w-8 text-purple-600" />}
              </span>
            </div>
            <div>
              <h2 className="text-3xl font-bold">Welcome, {profile?.full_name}!</h2>
              <p className="text-purple-100 mt-1">Manage your schedule and client sessions</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="text-white/80 text-sm">
              {trainer ? 'Trainer profile active' : 'You need to be added as a trainer to receive bookings'}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-white/50 backdrop-blur p-1 rounded-xl">
          <TabsTrigger value="bookings" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-3">
            <List className="w-4 h-4 mr-2" /> Bookings
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-3">
            <Calendar className="w-4 h-4 mr-2" /> My Schedule
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-3">
            <Settings className="w-4 h-4 mr-2" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-400">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" /> Pending Requests
            </h3>
            {!trainer ? (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">No trainer profile found yet.</div>
            ) : pendingBookings.length === 0 ? (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">No pending requests</div>
            ) : (
              <div className="space-y-4">
                {pendingBookings.map((booking) => (
                  <div key={booking.id} className="border border-yellow-100 bg-yellow-50/50 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div>
                        <p className="font-bold text-gray-900">{booking.client?.full_name || 'Client'}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(booking.start_time).toLocaleDateString()} &bull; {new Date(booking.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {booking.service?.name || 'Training Session'}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          {isVirtualLocation(booking.location_type) ? (
                            <>
                              <Video className="h-3.5 w-3.5" />
                              Virtual
                            </>
                          ) : booking.location_type === 'gym' ? (
                            <>
                              <Building2 className="h-3.5 w-3.5" />
                              Studio
                            </>
                          ) : (
                            <>
                              <MapPin className="h-3.5 w-3.5" />
                              {getBookingLocationLabel(booking.location_type, booking.travel_address)}
                            </>
                          )}
                        </p>
                        {booking.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{booking.notes}&rdquo;</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveRequest(booking)}
                          disabled={processingId === booking.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingId === booking.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeclineRequest(booking)}
                          disabled={processingId === booking.id}
                          className="text-red-600 border-red-200"
                        >
                          {processingId === booking.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Decline'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" /> Upcoming Sessions
            </h3>
            {!trainer ? (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">No trainer profile found yet.</div>
            ) : confirmedSessions.length === 0 ? (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">No confirmed sessions</div>
            ) : (
              <div className="space-y-3">
                {confirmedSessions.map((session) => (
                  <div key={session.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-xl hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">{session.client?.full_name || 'Client'}</p>
                      <div className="flex gap-3 text-sm text-gray-500 mt-1">
                        <span>{new Date(session.start_time).toLocaleDateString()}</span>
                        <span>
                          {new Date(session.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          {' - '}
                          {new Date(session.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {session.service?.name || 'Training Session'}
                        {isVirtualLocation(session.location_type) ? ' • Virtual session' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isVirtualLocation(session.location_type) ? (
                        <JoinDailyButton bookingId={session.id} />
                      ) : null}
                      {session.google_calendar_event_id && (
                        <span className="text-xs text-gray-400 flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1 text-blue-400" /> Calendar
                        </span>
                      )}
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Confirmed</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Weekly Availability</h3>
                <p className="text-sm text-gray-500 mt-1">These define the outer bounds of your schedule. Existing bookings and calendar conflicts are checked inside these windows.</p>
              </div>
              <Button onClick={() => setShowAvailabilityModal(true)} size="sm" disabled={!trainer}>
                <Plus className="h-4 w-4 mr-2" /> Add Time Block
              </Button>
            </div>
            {!trainer ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <p className="text-gray-500">You need a trainer profile before setting availability.</p>
              </div>
            ) : availability.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <p className="text-gray-500 mb-4">You haven&apos;t set your schedule yet.</p>
                <Button variant="outline" onClick={() => setShowAvailabilityModal(true)}>Set Availability</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {availability.map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-purple-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{DAY_NAMES[slot.day_of_week]}</p>
                        <p className="text-sm text-gray-500">{slot.start_time} &ndash; {slot.end_time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking Preferences</CardTitle>
                <CardDescription>
                  Choose how clients book your services. Request System means manual approval. Instant Confirmation is for direct booking.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Current mode:{' '}
                  <span className="font-semibold text-purple-700">
                    {bookingPref === 'instant_confirmation' ? 'Instant Confirmation' : 'Request System'}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Button
                    variant={bookingPref === 'instant_confirmation' ? 'default' : 'outline'}
                    onClick={toggleBookingPreference}
                    disabled={updatingPref}
                    className={`gap-2 ${bookingPref === 'instant_confirmation' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  >
                    {updatingPref ? (
                      'Updating...'
                    ) : bookingPref === 'instant_confirmation' ? (
                      <><CheckCircle className="w-4 h-4" /> Instant Active</>
                    ) : (
                      <><ToggleLeft className="w-4 h-4" /> Request System Active</>
                    )}
                  </Button>
                  <span className="text-xs text-gray-400">Click to toggle</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Google Calendar Settings
                </CardTitle>
                <CardDescription>
                  Your personal Google Calendar powers busy-slot checks and approved booking events.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className={`flex items-center justify-between p-4 rounded-lg border ${trainer?.google_calendar_connected_at ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div>
                    <h4 className="font-semibold text-gray-900">Calendar integration status</h4>
                    <p className="text-sm text-gray-500">
                      {trainer?.google_calendar_connected_at
                        ? `Connected as ${trainer.google_calendar_email || 'your primary Google Calendar'}.`
                        : 'Connect your Google Calendar to block off busy time and sync approved bookings.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={trainer?.google_calendar_connected_at ? 'default' : 'secondary'}>
                      {trainer?.google_calendar_connected_at ? 'Connected' : 'Setup required'}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => router.push('/trainer-setup')}>
                      {trainer?.google_calendar_connected_at ? 'Reconnect' : 'Finish setup'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Your Timezone</label>
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
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">This timezone is used for calendar-related display and scheduling.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {showAvailabilityModal && trainer && (
        <AvailabilityModal
          trainerId={trainer.id}
          onClose={() => setShowAvailabilityModal(false)}
          onSuccess={() => {
            if (user) fetchData(user.id)
          }}
        />
      )}
    </div>
  )
}
