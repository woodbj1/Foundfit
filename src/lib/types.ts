// ============================================
// FoundFit — Core Type Definitions
// ============================================

export type UserRole = 'client' | 'trainer' | 'admin'
export type ServiceType = 'unlimited' | 'pack' | 'single' | 'meal_plan'
export type BookingStatus = 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed'
export type LocationType = 'gym' | 'travel'
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'expired'
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Profile {
  id: string
  email: string
  full_name: string
  phone: string | null
  address: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  name: string
  description: string | null
  type: ServiceType
  price: number // in cents
  session_count: number | null // null for unlimited
  duration_minutes: number
  max_weekly_bookings: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Trainer {
  id: string
  user_id: string
  bio: string | null
  is_active: boolean
  created_at: string
  profile?: Profile
}

export interface AvailabilityBlock {
  id: string
  trainer_id: string
  day_of_week: DayOfWeek
  start_time: string // HH:MM format
  end_time: string // HH:MM format
}

export interface Subscription {
  id: string
  client_id: string
  service_id: string
  stripe_subscription_id: string | null
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  auto_renew: boolean
  created_at: string
  service?: Service
}

export interface SessionPack {
  id: string
  client_id: string
  service_id: string
  total_sessions: number
  used_sessions: number
  stripe_payment_id: string | null
  purchased_at: string
  expires_at: string | null
  service?: Service
}

export interface Booking {
  id: string
  client_id: string
  trainer_id: string
  service_id: string | null
  start_time: string
  end_time: string
  status: BookingStatus
  location_type: LocationType
  travel_address: string | null
  google_calendar_event_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  client?: Profile
  trainer?: Trainer & { profile?: Profile }
  service?: Service
}

export interface MealPlan {
  id: string
  client_id: string
  trainer_id: string
  title: string
  file_url: string
  created_at: string
  client?: Profile
  trainer?: Profile
}

export interface AppSettings {
  travel_fee: number // in cents
  default_duration: number // minutes
  max_weekly_bookings: number
  business_name: string
  business_address: string
  business_phone: string
  business_email: string
}

export interface TimeSlot {
  start: string // ISO datetime
  end: string // ISO datetime
}

export interface BookingRequest {
  trainer_id: string
  service_id?: string
  start_time: string
  location_type: LocationType
  travel_address?: string
  notes?: string
}
