import { DEFAULT_SERVICES } from '@/lib/default-services'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { FulfillmentType, Service, ServiceType } from '@/lib/types'

export interface PublicService {
  name: string
  title: string
  description: string
  category: string
  type: ServiceType
  price: number
  session_count: number | null
  session_limit: number | null
  duration_minutes: number
  max_weekly_bookings: number
  is_popular: boolean
  is_session: boolean
  fulfillment_type: FulfillmentType
  access_url: string | null
}

const SERVICE_ORDER = DEFAULT_SERVICES.map((service) => service.title)

function normalizeService(service: Partial<Service>): PublicService {
  return {
    name: service.name ?? service.title ?? 'Service',
    title: service.title ?? service.name ?? 'Service',
    description: service.description ?? '',
    category: service.category ?? 'session',
    type: service.type ?? 'single',
    price: service.price ?? 0,
    session_count: service.session_count ?? null,
    session_limit: service.session_limit ?? null,
    duration_minutes: service.duration_minutes ?? 0,
    max_weekly_bookings: service.max_weekly_bookings ?? 0,
    is_popular: service.is_popular ?? false,
    is_session: service.is_session ?? true,
    fulfillment_type: service.fulfillment_type ?? 'booking',
    access_url: service.access_url ?? null,
  }
}

function compareServices(a: PublicService, b: PublicService) {
  const aIndex = SERVICE_ORDER.indexOf(a.title)
  const bIndex = SERVICE_ORDER.indexOf(b.title)

  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  }

  if (a.is_popular !== b.is_popular) {
    return a.is_popular ? -1 : 1
  }

  return a.price - b.price
}

export function getDefaultPublicServiceCatalog(): PublicService[] {
  return DEFAULT_SERVICES.map((service) =>
    normalizeService({
      ...service,
      category: service.category,
      type: service.type,
      price: service.price,
      session_count: service.session_count,
      session_limit: service.session_limit,
      duration_minutes: service.duration_minutes,
      max_weekly_bookings: service.max_weekly_bookings,
      is_popular: service.is_popular,
      is_session: service.is_session,
      fulfillment_type: service.fulfillment_type,
      access_url: service.access_url,
    })
  ).sort(compareServices)
}

export async function getPublicServiceCatalog(): Promise<PublicService[]> {
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createServiceRoleClient()
      const { data, error } = await admin
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      if (data.length) {
        return data.map(normalizeService).sort(compareServices)
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      if (data.length) {
        return data.map(normalizeService).sort(compareServices)
      }
    }

    return getDefaultPublicServiceCatalog()
  } catch (error) {
    console.error('[getPublicServiceCatalog]', error)
    return getDefaultPublicServiceCatalog()
  }
}
