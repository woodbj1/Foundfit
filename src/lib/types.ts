// ============================================
// FoundFit — Core Type Definitions
// ============================================

export type UserRole = 'client' | 'trainer' | 'admin'
export type ServiceType = 'unlimited' | 'pack' | 'single' | 'meal_plan'
export type BookingStatus = 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed'
export type LocationType = 'gym' | 'travel' | 'virtual'
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'expired'
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type BookingPreference = 'request_system' | 'instant_confirmation'
export type FulfillmentType = 'booking' | 'daily' | 'vimeo' | 'hybrid'
export type TrainerScheduleRuleType = 'work_hours' | 'blocked'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone: string | null
  address: string | null
  role: UserRole
  avatar_url: string | null
  timezone?: string
  booking_preference?: BookingPreference
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  name: string
  title?: string | null
  description: string | null
  category?: string | null
  type: ServiceType
  price: number // in cents
  session_count: number | null // null for unlimited
  session_limit?: number | null
  duration_minutes: number
  max_weekly_bookings: number
  is_active: boolean
  is_popular?: boolean
  is_session?: boolean
  fulfillment_type?: FulfillmentType
  access_url?: string | null
  stripe_product_id?: string | null
  stripe_price_id?: string | null
  created_at: string
  updated_at: string
}

export interface Trainer {
  id: string
  user_id: string
  bio: string | null
  is_active: boolean
  password_updated_at?: string | null
  google_calendar_connected_at?: string | null
  google_calendar_email?: string | null
  onboarding_completed_at?: string | null
  created_at: string
  profile?: Profile
}

export interface TrainerCalendarConnection {
  trainer_id: string
  google_refresh_token: string
  google_calendar_id: string
  created_at: string
  updated_at: string
}

export interface AvailabilityBlock {
  id: string
  trainer_id: string
  day_of_week: DayOfWeek
  start_time: string // HH:MM format
  end_time: string // HH:MM format
}

export interface TrainerScheduleRule {
  id: string
  trainer_id: string
  day_of_week: DayOfWeek
  start_time: string // HH:MM format
  end_time: string // HH:MM format
  rule_type: TrainerScheduleRuleType
  label?: string | null
  created_at?: string
  updated_at?: string
}

export interface Subscription {
  id: string
  client_id: string
  service_id: string
  trainer_id?: string | null
  stripe_subscription_id: string | null
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  auto_renew: boolean
  unit_amount_cents?: number | null
  created_at: string
  service?: Service
}

export interface SessionPack {
  id: string
  client_id: string
  service_id: string
  trainer_id?: string | null
  total_sessions: number
  used_sessions: number
  stripe_payment_id: string | null
  price_paid_cents?: number | null
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
  daily_room_name?: string | null
  daily_room_url?: string | null
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
  file_url: string // stored Supabase Storage path for the meal plan PDF
  created_at: string
  client?: Profile
  trainer?: Trainer
}

export interface MealPlanPurchase {
  id: string
  client_id: string
  service_id: string
  trainer_id?: string | null
  stripe_payment_id: string | null
  meal_plan_id: string | null
  price_paid_cents?: number | null
  purchased_at: string
  fulfilled_at: string | null
  created_at: string
  updated_at: string
  service?: Service
  meal_plan?: MealPlan | null
}

export interface TrainerEarning {
  id: string
  trainer_id: string
  client_id: string
  service_id: string | null
  service_name: string
  entry_type:
    | 'single_session_purchase'
    | 'pack_purchase'
    | 'meal_plan_purchase'
    | 'subscription_charge'
  source_reference: string
  amount_cents: number
  occurred_at: string
  created_at: string
  service?: Service | null
  client?: Profile | null
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
