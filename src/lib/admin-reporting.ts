import 'server-only'

import { addMonths, format, startOfMonth } from 'date-fns'

import { getGoogleAnalyticsSnapshot, type GoogleAnalyticsSnapshot } from '@/lib/google-analytics'
import { createAdminClient } from '@/lib/supabase/server'

type RelationOne<T> = T | T[] | null

type TrainerProfileRow = {
  id: string
  full_name: string | null
  email: string
}

type TrainerRow = {
  id: string
  user_id: string
  is_active: boolean
  onboarding_completed_at: string | null
  google_calendar_connected_at: string | null
  google_calendar_email: string | null
  profile?: RelationOne<TrainerProfileRow>
}

type ClientRow = {
  id: string
  full_name: string | null
  email: string
  phone: string | null
}

type BookingRow = {
  id: string
  client_id: string
  trainer_id: string
  status: 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed'
  location_type: 'gym' | 'travel' | 'virtual'
  start_time: string
  service?: RelationOne<{ name: string }>
}

type SubscriptionRow = {
  id: string
  client_id: string
  service_id: string
  status: string
  service?: RelationOne<{ id: string; name: string; price: number }>
}

type SessionPackRow = {
  id: string
  client_id: string
  service_id: string
  total_sessions: number
  used_sessions: number
  expires_at: string | null
  service?: RelationOne<{ id: string; name: string; price: number }>
}

type MealPlanPurchaseRow = {
  id: string
  client_id: string
  service_id: string
  fulfilled_at: string | null
  purchased_at: string
  service?: RelationOne<{ id: string; name: string; price: number }>
}

type ServiceRow = {
  id: string
  name: string
  title: string | null
  price: number
  is_active: boolean
  is_session: boolean
  fulfillment_type: string | null
  description: string | null
}

type TrainerEarningRow = {
  id: string
  trainer_id: string
  client_id: string
  service_id: string | null
  service_name: string
  entry_type: 'single_session_purchase' | 'pack_purchase' | 'meal_plan_purchase' | 'subscription_charge'
  amount_cents: number
  occurred_at: string
}

export type AdminOverviewMetrics = {
  monthLabel: string
  totalRevenueCents: number
  recurringRevenueCents: number
  oneTimeRevenueCents: number
  bookedSessions: number
  pendingSessions: number
  confirmedSessions: number
  completedSessions: number
  registeredClients: number
  activeTrainers: number
  activeServices: number
  pendingMealPlans: number
  locationMix: {
    studio: number
    home: number
    virtual: number
  }
}

export type AdminTrainerRegisterRow = {
  id: string
  fullName: string
  email: string
  isActive: boolean
  onboardingCompleted: boolean
  calendarConnected: boolean
  pendingSessions: number
  confirmedSessions: number
  completedSessions: number
  activeClients: number
  earningsCents: number
}

export type AdminClientRegisterRow = {
  id: string
  fullName: string
  email: string
  phone: string | null
  trainerNames: string[]
  services: string[]
  packUsage: Array<{
    label: string
    used: number
    remaining: number
  }>
  remainingSessions: number
  monthlySessions: number
}

export type AdminServiceRegisterRow = {
  id: string
  name: string
  description: string | null
  price: number
  fulfillmentType: string | null
  isSession: boolean
  enrolledClients: number
  activeSubscriptions: number
  activePacks: number
  pendingMealPlans: number
}

export type AdminDashboardData = {
  metrics: AdminOverviewMetrics
  trainers: AdminTrainerRegisterRow[]
  clients: AdminClientRegisterRow[]
  services: AdminServiceRegisterRow[]
  analytics: GoogleAnalyticsSnapshot
}

function normalizeRelation<T>(value: RelationOne<T> | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function getServiceName(value: RelationOne<{ name: string }> | undefined, fallback: string) {
  return normalizeRelation(value)?.name || fallback
}

function isPackActive(pack: Pick<SessionPackRow, 'expires_at' | 'total_sessions' | 'used_sessions'>) {
  if (pack.used_sessions >= pack.total_sessions) {
    return false
  }

  if (!pack.expires_at) {
    return true
  }

  const expiresAt = new Date(pack.expires_at)
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > Date.now()
}

export async function getAdminDashboardData(monthStart = startOfMonth(new Date())): Promise<AdminDashboardData> {
  const admin = await createAdminClient()
  const nextMonth = addMonths(monthStart, 1)

  const [
    trainersResponse,
    clientsResponse,
    bookingsResponse,
    allBookingsResponse,
    subscriptionsResponse,
    packsResponse,
    mealPlansResponse,
    servicesResponse,
    earningsResponse,
    analytics,
  ] = await Promise.all([
    admin
      .from('trainers')
      .select(
        'id, user_id, is_active, onboarding_completed_at, google_calendar_connected_at, google_calendar_email, profile:profiles!trainers_user_id_fkey(id, full_name, email)'
      )
      .order('created_at'),
    admin
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('role', 'client')
      .order('full_name'),
    admin
      .from('bookings')
      .select('id, client_id, trainer_id, status, location_type, start_time, service:services(name)')
      .gte('start_time', monthStart.toISOString())
      .lt('start_time', nextMonth.toISOString())
      .order('start_time'),
    admin
      .from('bookings')
      .select('id, client_id, trainer_id, status, location_type, start_time, service:services(name)')
      .order('start_time', { ascending: false }),
    admin
      .from('subscriptions')
      .select('id, client_id, service_id, status, service:services(id, name, price)')
      .eq('status', 'active'),
    admin
      .from('session_packs')
      .select('id, client_id, service_id, total_sessions, used_sessions, expires_at, service:services(id, name, price)'),
    admin
      .from('meal_plan_purchases')
      .select('id, client_id, service_id, fulfilled_at, purchased_at, service:services(id, name, price)')
      .order('purchased_at', { ascending: false }),
    admin
      .from('services')
      .select('id, name, title, price, is_active, is_session, fulfillment_type, description')
      .eq('is_active', true)
      .order('price'),
    admin
      .from('trainer_earnings')
      .select('id, trainer_id, client_id, service_id, service_name, entry_type, amount_cents, occurred_at')
      .gte('occurred_at', monthStart.toISOString())
      .lt('occurred_at', nextMonth.toISOString()),
    getGoogleAnalyticsSnapshot(),
  ])

  if (trainersResponse.error) throw trainersResponse.error
  if (clientsResponse.error) throw clientsResponse.error
  if (bookingsResponse.error) throw bookingsResponse.error
  if (allBookingsResponse.error) throw allBookingsResponse.error
  if (subscriptionsResponse.error) throw subscriptionsResponse.error
  if (packsResponse.error) throw packsResponse.error
  if (mealPlansResponse.error) throw mealPlansResponse.error
  if (servicesResponse.error) throw servicesResponse.error

  const earnings = earningsResponse.error
    ? []
    : ((earningsResponse.data ?? []) as TrainerEarningRow[])

  if (earningsResponse.error) {
    console.error('Failed to load trainer earnings for admin dashboard:', earningsResponse.error)
  }

  const trainers = ((trainersResponse.data ?? []) as TrainerRow[]).map((trainer) => ({
    ...trainer,
    profile: normalizeRelation(trainer.profile),
  }))
  const clients = (clientsResponse.data ?? []) as ClientRow[]
  const bookings = ((bookingsResponse.data ?? []) as BookingRow[]).map((booking) => ({
    ...booking,
    service: normalizeRelation(booking.service),
  }))
  const allBookings = ((allBookingsResponse.data ?? []) as BookingRow[]).map((booking) => ({
    ...booking,
    service: normalizeRelation(booking.service),
  }))
  const subscriptions = ((subscriptionsResponse.data ?? []) as SubscriptionRow[]).map((subscription) => ({
    ...subscription,
    service: normalizeRelation(subscription.service),
  }))
  const packs = ((packsResponse.data ?? []) as SessionPackRow[]).map((pack) => ({
    ...pack,
    service: normalizeRelation(pack.service),
  }))
  const mealPlanPurchases = ((mealPlansResponse.data ?? []) as MealPlanPurchaseRow[]).map((purchase) => ({
    ...purchase,
    service: normalizeRelation(purchase.service),
  }))
  const services = (servicesResponse.data ?? []) as ServiceRow[]

  const trainersById = new Map(
    trainers.map((trainer) => [
      trainer.id,
      {
        fullName: trainer.profile?.full_name || 'Trainer',
        email: trainer.profile?.email || '',
      },
    ])
  )

  const monthlyRevenue = earnings.reduce((sum, entry) => sum + entry.amount_cents, 0)
  const recurringRevenue = earnings
    .filter((entry) => entry.entry_type === 'subscription_charge')
    .reduce((sum, entry) => sum + entry.amount_cents, 0)
  const oneTimeRevenue = earnings
    .filter((entry) => entry.entry_type !== 'subscription_charge')
    .reduce((sum, entry) => sum + entry.amount_cents, 0)

  const locationMix = bookings.reduce(
    (mix, booking) => {
      if (booking.location_type === 'travel') mix.home += 1
      else if (booking.location_type === 'virtual') mix.virtual += 1
      else mix.studio += 1
      return mix
    },
    { studio: 0, home: 0, virtual: 0 }
  )

  const bookingsByTrainer = new Map<string, BookingRow[]>()
  const allBookingsByTrainer = new Map<string, BookingRow[]>()
  const bookingsByClient = new Map<string, BookingRow[]>()

  for (const booking of bookings) {
    bookingsByTrainer.set(booking.trainer_id, [...(bookingsByTrainer.get(booking.trainer_id) ?? []), booking])
  }

  for (const booking of allBookings) {
    allBookingsByTrainer.set(
      booking.trainer_id,
      [...(allBookingsByTrainer.get(booking.trainer_id) ?? []), booking]
    )
    bookingsByClient.set(booking.client_id, [...(bookingsByClient.get(booking.client_id) ?? []), booking])
  }

  const monthlyEarningsByTrainer = new Map<string, number>()
  for (const earning of earnings) {
    monthlyEarningsByTrainer.set(
      earning.trainer_id,
      (monthlyEarningsByTrainer.get(earning.trainer_id) ?? 0) + earning.amount_cents
    )
  }

  const activeSubscriptionsByClient = new Map<string, SubscriptionRow[]>()
  for (const subscription of subscriptions) {
    activeSubscriptionsByClient.set(subscription.client_id, [
      ...(activeSubscriptionsByClient.get(subscription.client_id) ?? []),
      subscription,
    ])
  }

  const packsByClient = new Map<string, SessionPackRow[]>()
  for (const pack of packs) {
    packsByClient.set(pack.client_id, [...(packsByClient.get(pack.client_id) ?? []), pack])
  }

  const mealPlansByClient = new Map<string, MealPlanPurchaseRow[]>()
  for (const purchase of mealPlanPurchases) {
    mealPlansByClient.set(purchase.client_id, [
      ...(mealPlansByClient.get(purchase.client_id) ?? []),
      purchase,
    ])
  }

  const trainerRegister: AdminTrainerRegisterRow[] = trainers.map((trainer) => {
    const monthlyBookings = bookingsByTrainer.get(trainer.id) ?? []
    const assignedClients = new Set(
      (allBookingsByTrainer.get(trainer.id) ?? []).map((booking) => booking.client_id)
    )

    return {
      id: trainer.id,
      fullName: trainer.profile?.full_name || 'Trainer',
      email: trainer.profile?.email || '',
      isActive: trainer.is_active,
      onboardingCompleted: Boolean(trainer.onboarding_completed_at),
      calendarConnected: Boolean(trainer.google_calendar_connected_at),
      pendingSessions: monthlyBookings.filter((booking) => booking.status === 'pending').length,
      confirmedSessions: monthlyBookings.filter((booking) => booking.status === 'approved').length,
      completedSessions: monthlyBookings.filter((booking) => booking.status === 'completed').length,
      activeClients: assignedClients.size,
      earningsCents: monthlyEarningsByTrainer.get(trainer.id) ?? 0,
    }
  })

  const clientRegister: AdminClientRegisterRow[] = clients.map((client) => {
    const clientSubscriptions = activeSubscriptionsByClient.get(client.id) ?? []
    const clientPacks = packsByClient.get(client.id) ?? []
    const clientMealPlans = mealPlansByClient.get(client.id) ?? []
    const clientBookings = bookingsByClient.get(client.id) ?? []
    const monthlySessions = bookings.filter((booking) => booking.client_id === client.id).length

    const trainerNames = Array.from(
      new Set(
        clientBookings
          .map((booking) => trainersById.get(booking.trainer_id)?.fullName || null)
          .filter((value): value is string => Boolean(value))
      )
    )

    const services = Array.from(
      new Set([
        ...clientSubscriptions.map((subscription) => getServiceName(subscription.service, 'Subscription')),
        ...clientPacks.map((pack) => getServiceName(pack.service, 'Session Pack')),
        ...clientMealPlans.map((purchase) => getServiceName(purchase.service, 'Meal Plan')),
      ])
    )

    const packUsage = clientPacks.map((pack) => ({
      label: getServiceName(pack.service, 'Session Pack'),
      used: pack.used_sessions,
      remaining: Math.max(pack.total_sessions - pack.used_sessions, 0),
    }))

    const remainingSessions = clientPacks
      .filter((pack) => isPackActive(pack))
      .reduce((sum, pack) => sum + Math.max(pack.total_sessions - pack.used_sessions, 0), 0)

    return {
      id: client.id,
      fullName: client.full_name || 'Unnamed client',
      email: client.email,
      phone: client.phone,
      trainerNames,
      services,
      packUsage,
      remainingSessions,
      monthlySessions,
    }
  })

  const serviceRegister: AdminServiceRegisterRow[] = services.map((service) => {
    const subscriptionClients = new Set(
      subscriptions
        .filter((subscription) => subscription.service_id === service.id)
        .map((subscription) => subscription.client_id)
    )
    const activePackClients = new Set(
      packs
        .filter((pack) => pack.service_id === service.id && isPackActive(pack))
        .map((pack) => pack.client_id)
    )
    const pendingMealPlanClients = new Set(
      mealPlanPurchases
        .filter((purchase) => purchase.service_id === service.id && !purchase.fulfilled_at)
        .map((purchase) => purchase.client_id)
    )
    const enrolledClients = new Set([
      ...subscriptionClients,
      ...activePackClients,
      ...pendingMealPlanClients,
    ])

    return {
      id: service.id,
      name: service.title || service.name,
      description: service.description,
      price: service.price,
      fulfillmentType: service.fulfillment_type,
      isSession: service.is_session,
      enrolledClients: enrolledClients.size,
      activeSubscriptions: subscriptionClients.size,
      activePacks: activePackClients.size,
      pendingMealPlans: pendingMealPlanClients.size,
    }
  })

  return {
    metrics: {
      monthLabel: format(monthStart, 'MMMM yyyy'),
      totalRevenueCents: monthlyRevenue,
      recurringRevenueCents: recurringRevenue,
      oneTimeRevenueCents: oneTimeRevenue,
      bookedSessions: bookings.length,
      pendingSessions: bookings.filter((booking) => booking.status === 'pending').length,
      confirmedSessions: bookings.filter((booking) => booking.status === 'approved').length,
      completedSessions: bookings.filter((booking) => booking.status === 'completed').length,
      registeredClients: clients.length,
      activeTrainers: trainers.filter((trainer) => trainer.is_active).length,
      activeServices: services.length,
      pendingMealPlans: mealPlanPurchases.filter((purchase) => !purchase.fulfilled_at).length,
      locationMix,
    },
    trainers: trainerRegister,
    clients: clientRegister,
    services: serviceRegister,
    analytics,
  }
}

