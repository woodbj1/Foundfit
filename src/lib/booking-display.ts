import type { LocationType } from '@/lib/types'

export function isVirtualLocation(locationType?: LocationType | null) {
  return locationType === 'virtual'
}

export function getBookingLocationLabel(
  locationType?: LocationType | null,
  travelAddress?: string | null
) {
  switch (locationType) {
    case 'virtual':
      return 'Virtual'
    case 'travel':
      return travelAddress || 'In-home'
    case 'gym':
    default:
      return 'Studio'
  }
}
