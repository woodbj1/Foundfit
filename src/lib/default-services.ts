export type DefaultServiceSeed = {
  name: string
  title: string
  description: string
  category: 'subscription' | 'session' | 'plan' | 'meal_plan'
  type: 'unlimited' | 'single' | 'pack' | 'meal_plan'
  price: number
  session_count: number | null
  session_limit: number | null
  duration_minutes: number
  max_weekly_bookings: number
  is_popular: boolean
  is_session: boolean
  fulfillment_type: 'booking' | 'daily' | 'vimeo' | 'hybrid'
  access_url: string | null
  is_active: boolean
}

export const DEFAULT_SERVICES: DefaultServiceSeed[] = [
  {
    name: 'Unlimited Monthly',
    title: 'Unlimited Monthly',
    description: 'Unlimited training sessions per month. Up to 3 sessions per week.',
    category: 'subscription',
    type: 'unlimited',
    price: 29900,
    session_count: null,
    session_limit: 3,
    duration_minutes: 50,
    max_weekly_bookings: 3,
    is_popular: true,
    is_session: true,
    fulfillment_type: 'booking',
    access_url: null,
    is_active: true,
  },
  {
    name: 'Single Session',
    title: 'Single Session',
    description: 'One personal training session.',
    category: 'session',
    type: 'single',
    price: 7500,
    session_count: 1,
    session_limit: 1,
    duration_minutes: 50,
    max_weekly_bookings: 1,
    is_popular: false,
    is_session: true,
    fulfillment_type: 'booking',
    access_url: null,
    is_active: true,
  },
  {
    name: 'Virtual Session',
    title: 'Virtual Session',
    description: 'One live personal training session delivered over Daily video.',
    category: 'session',
    type: 'single',
    price: 7500,
    session_count: 1,
    session_limit: 1,
    duration_minutes: 50,
    max_weekly_bookings: 1,
    is_popular: false,
    is_session: true,
    fulfillment_type: 'daily',
    access_url: null,
    is_active: false,
  },
  {
    name: '6-Pack',
    title: '6-Pack',
    description: '6 personal training sessions. Use at your own pace.',
    category: 'plan',
    type: 'pack',
    price: 39900,
    session_count: 6,
    session_limit: 6,
    duration_minutes: 50,
    max_weekly_bookings: 3,
    is_popular: false,
    is_session: true,
    fulfillment_type: 'booking',
    access_url: null,
    is_active: true,
  },
  {
    name: '12-Pack',
    title: '12-Pack',
    description: '12 personal training sessions. Best value per session!',
    category: 'plan',
    type: 'pack',
    price: 69900,
    session_count: 12,
    session_limit: 12,
    duration_minutes: 50,
    max_weekly_bookings: 3,
    is_popular: true,
    is_session: true,
    fulfillment_type: 'booking',
    access_url: null,
    is_active: true,
  },
  {
    name: 'On-Demand Video Library',
    title: 'On-Demand Video Library',
    description: 'Monthly Vimeo library access for workouts, mobility, and recovery sessions.',
    category: 'subscription',
    type: 'unlimited',
    price: 2900,
    session_count: null,
    session_limit: null,
    duration_minutes: 0,
    max_weekly_bookings: 0,
    is_popular: false,
    is_session: false,
    fulfillment_type: 'vimeo',
    access_url: null,
    is_active: false,
  },
  {
    name: 'Monthly Meal Plan',
    title: 'Monthly Meal Plan',
    description: 'Custom monthly meal plan tailored to your goals.',
    category: 'meal_plan',
    type: 'meal_plan',
    price: 9900,
    session_count: null,
    session_limit: null,
    duration_minutes: 0,
    max_weekly_bookings: 0,
    is_popular: false,
    is_session: false,
    fulfillment_type: 'booking',
    access_url: null,
    is_active: true,
  },
]
