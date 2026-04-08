import type { FulfillmentType, Service, ServiceType } from '@/lib/types'

type ServiceCopyLike = Pick<
  Service,
  'description' | 'fulfillment_type' | 'is_session' | 'max_weekly_bookings' | 'name' | 'session_count' | 'type'
>

function normalizeFulfillmentType(fulfillmentType?: FulfillmentType | string | null) {
  switch (fulfillmentType) {
    case 'daily':
    case 'vimeo':
    case 'hybrid':
      return fulfillmentType
    default:
      return 'booking'
  }
}

function isStandaloneVirtualSession(service: ServiceCopyLike) {
  return (
    service.is_session !== false &&
    service.type === 'single' &&
    normalizeFulfillmentType(service.fulfillment_type) === 'daily'
  )
}

function supportsFlexibleSessionLocations(service: ServiceCopyLike) {
  return service.is_session !== false && !isStandaloneVirtualSession(service)
}

function getFlexibleLocationDescription(service: ServiceCopyLike) {
  switch (service.type as ServiceType) {
    case 'unlimited':
      return `Unlimited training sessions per month with studio, in-home, or virtual booking options.${service.max_weekly_bookings > 0 ? ` Up to ${service.max_weekly_bookings} sessions per week.` : ''}`
    case 'pack':
      return `${service.session_count || 'Multiple'} personal training sessions to use at your own pace in studio, at home, or virtually.`
    case 'single':
      return 'One personal training session. Book it in studio, at home, or virtually.'
    default:
      return service.description || ''
  }
}

export function getServiceSalesDescription(service: ServiceCopyLike) {
  if (isStandaloneVirtualSession(service)) {
    return 'One live personal training session delivered over Daily video.'
  }

  if (supportsFlexibleSessionLocations(service)) {
    return getFlexibleLocationDescription(service)
  }

  return service.description || ''
}

