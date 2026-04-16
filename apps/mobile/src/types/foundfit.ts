export type BookingStatus = 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed'
export type LocationType = 'gym' | 'travel' | 'virtual'
export type AccessType = 'subscription' | 'pack'

export type MobileProfile = {
  id: string
  email: string
  full_name: string
  phone: string | null
  address: string | null
  role: 'client'
}

export type MobileBooking = {
  id: string
  startTime: string
  endTime: string
  status: BookingStatus
  locationType: LocationType
  travelAddress?: string | null
  notes?: string | null
  trainerName: string
  trainerTimezone: string
  serviceName: string
}

export type MobileDashboardResponse = {
  profile: MobileProfile
  summary: {
    activePlanName: string | null
    sessionsLeft: number | null
    confirmedCount: number
    pendingCount: number
    mealPlanCount: number
  }
  access: {
    primarySubscription: {
      serviceName: string
      renewsAt: string
      unitAmountCents: number | null
    } | null
    activePacks: Array<{
      id: string
      serviceName: string
      remainingSessions: number
      expiresAt: string | null
    }>
    libraryAccess: {
      serviceName: string
      accessType: AccessType
      accessUrl: string
      remainingSessions: number | null
    } | null
  }
  bookings: MobileBooking[]
}

export type MobileTrainerOption = {
  id: string
  userId: string
  bio: string | null
  fullName: string
  avatarUrl: string | null
  timezone: string
}

export type MobileBookableService = {
  serviceId: string
  name: string
  description: string | null
  accessType: AccessType
  remainingSessions: number | null
  trainerId: string | null
  durationMinutes: number
  fulfillmentType: 'booking' | 'daily' | 'vimeo' | 'hybrid'
  isSession: boolean
}

export type RescheduleBookingState = {
  id: string
  startTime: string
  endTime: string
  status: 'pending' | 'approved'
  locationType: LocationType
  travelAddress: string | null
  notes: string | null
  trainerName: string
  serviceName: string
  serviceId: string
  trainerId: string
}

export type MobileBookingContextResponse = {
  trainers: MobileTrainerOption[]
  services: MobileBookableService[]
  totalSessionsLeft: number
  travelFeeCents: number
  bookingWindowDays: number
  virtualLocationEnabled: boolean
  rescheduleBooking: RescheduleBookingState | null
}

export type MobileSessionsResponse = {
  data: MobileBooking[]
}

export type MobileLibraryResponse =
  | {
      hasAccess: false
      message: string
    }
  | {
      hasAccess: true
      access: {
        accessUrl: string
        accessType: AccessType
        serviceName: string
        remainingSessions: number | null
      }
    }

export type MobileSubscriptionStatusResponse =
  | {
      isSubscribed: false
      message: string
    }
  | {
      isSubscribed: true
      subscription: {
        id: string
        serviceName: string
        renewsAt: string
        pricePerMonth: number
      }
    }

export type LiveWorkoutInfo = {
  id: string
  title: string
  description: string | null
  scheduledDate: string
  scheduledTime: string
  durationMinutes: number
  status: 'scheduled' | 'live' | 'ended' | 'cancelled'
  startTime: string
  endTime: string
  trainerName: string
  trainerTimezone: string
}

export type MobileLiveWorkoutResponse =
  | {
      hasLiveWorkout: false
      message: string
    }
  | {
      hasLiveWorkout: true
      liveWorkout: LiveWorkoutInfo
      joinUrl?: string
      joinAvailability?: {
        canJoin: boolean
        message: string | null
      }
    }
